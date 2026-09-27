import 'server-only'

import type { Result } from '@/lib/results'
import { err, isErr, isOk, map, ok, unwrapOr } from '@/lib/results'
import * as PaymentRepository from './repository'
import * as WeekendRepository from '@/services/weekend/repository'
import * as GroupMemberRepository from '@/services/weekend-group-member/repository'
import {
  computeActiveWeekendFinancials,
  type ActiveWeekendFinancials,
} from '@/lib/payments/compute-totals'
import {
  buildFeeAccounts,
  deriveFeeBalances,
  type FeeAccount,
  type FeeBalances,
  type FeeWeekend,
} from '@/lib/payments/fee-balances'
import {
  candidateOwesFee,
  groupFeesFromColumns,
  isFeeExemptRole,
  type TrackedGroup,
} from '@/lib/payments/group-fees'
import {
  priceCheckout,
  type CheckoutFeeType,
  type CheckoutPrice,
  type CheckoutRefusal,
  type CheckoutTarget,
} from '@/lib/payments/checkout-price'
import * as FeesService from '@/services/fees/fees-service'
import { pickRoleForWeekend, type RosterRoleRow } from '@/lib/payments/roles'
import { WAIVED_PAID_BY, isWaived } from '@/lib/payments/waived'
import { isNil } from 'lodash'
import { logger } from '@/lib/logger'
import { getLoggedInUser } from '@/services/identity/user'
import { formatWeekendGroupTitle, formatWeekendLabelFor } from '@/lib/weekend'
import type { Weekend } from '@/lib/weekend/types'
import type {
  ServiceOptions,
  TargetIdentity,
  CreatePaymentInput,
  BackfillStripeDataInput,
  PaymentTargetOption,
  PaymentTransactionDTO,
  PaymentTransactionRow,
  PaymentTransactionUpdate,
  PaymentTransactionWithWeekend,
  ReassignPaymentInput,
  TargetType,
  PaymentType,
  PaymentMethod,
  RecordAdminPaymentInput,
  UpdatePaymentDetailsInput,
  VoidPaymentInput,
} from './types'
import {
  RecordAdminPaymentSchema,
  CreatePaymentSchema,
  BackfillStripeDataSchema,
  ReassignPaymentSchema,
  UpdatePaymentDetailsSchema,
  VoidPaymentSchema,
} from './types'

// ============================================================================
// Checkout pricing
// ============================================================================

export type CheckoutQuote = {
  /** What to charge, or why checkout won't start. */
  price: Result<CheckoutRefusal, CheckoutPrice>
  /** Recorded as the payment's payer. */
  payerName: string
  groupId: string | null
  groupNumber: number | null
  /** The team member's user; null for a candidate. */
  userId: string | null
  /**
   * Who the sponsorship form says pays ('candidate' | 'sponsor'); null for a
   * team member. Lets the public fee page work without a candidate read.
   */
  paymentOwner: string | null
}

/**
 * Prices an online payment from the payer's group fees and what is already
 * on record, with the same rules outstanding fees use: candidates owe once
 * approved, spiritual directors owe nothing, dropped members owe nothing.
 */
export async function getCheckoutQuote(
  target: CheckoutTarget
): Promise<Result<string, CheckoutQuote>> {
  if (target.kind === 'candidate') {
    const rowResult = await PaymentRepository.findCandidateCheckoutRow(
      target.candidateId
    )
    if (isErr(rowResult)) return rowResult
    const row = rowResult.data
    if (isNil(row)) return err('Candidate not found')

    const coveredResult = await PaymentRepository.sumLivePaymentsForTargets([
      row.id,
    ])
    if (isErr(coveredResult)) return coveredResult

    return ok({
      price: priceCheckout({
        feeType: 'candidate',
        fees: isNil(row.group) ? null : groupFeesFromColumns(row.group),
        owes: candidateOwesFee(row.status),
        coveredSoFar: coveredResult.data,
      }),
      // The sponsorship form records who is paying: the sponsor or the
      // candidate themselves.
      payerName:
        (row.paymentOwner === 'sponsor'
          ? row.sponsorName
          : row.candidateName) ??
        row.candidateName ??
        'Unknown',
      groupId: row.groupId,
      groupNumber: row.group?.number ?? null,
      userId: null,
      paymentOwner: row.paymentOwner,
    })
  }

  const rowResult = await PaymentRepository.findGroupMemberCheckoutRow(
    target.groupMemberId
  )
  if (isErr(rowResult)) return rowResult
  const row = rowResult.data
  if (isNil(row)) return err('Team member not found')

  // Older payments were recorded against roster rows; they still count.
  const coveredResult = await PaymentRepository.sumLivePaymentsForTargets([
    row.id,
    ...row.rosterRows.map((r) => r.id),
  ])
  if (isErr(coveredResult)) return coveredResult

  const active = row.rosterRows.filter((r) => r.status !== 'drop')
  return ok({
    price: priceCheckout({
      feeType: 'team',
      fees: isNil(row.group) ? null : groupFeesFromColumns(row.group),
      owes:
        active.length > 0 && !active.every((r) => isFeeExemptRole(r.chaRole)),
      coveredSoFar: coveredResult.data,
    }),
    payerName: row.name ?? 'Unknown',
    groupId: row.groupId,
    groupNumber: row.group?.number ?? null,
    userId: row.userId,
    paymentOwner: null,
  })
}

/**
 * The Stripe product a fee is sold under (TEAM_FEE_PRODUCT_ID /
 * CANDIDATE_FEE_PRODUCT_ID). The amount comes from the group's fees; the
 * product only keeps Stripe reports grouped by fee type.
 */
export function resolveFeeProductId(
  feeType: CheckoutFeeType
): Result<string, string> {
  const productId =
    feeType === 'team'
      ? process.env.TEAM_FEE_PRODUCT_ID
      : process.env.CANDIDATE_FEE_PRODUCT_ID
  return isNil(productId) || productId === ''
    ? err(`No Stripe product configured for the ${feeType} fee`)
    : ok(productId)
}

// ============================================================================
// Payment Transaction Normalization
// ============================================================================

/**
 * Key for the target identity map. target_id alone is not unique across the
 * different tables target_type can point at.
 */
function targetKey(
  targetType: string | null,
  targetId: string | null
): string | null {
  if (isNil(targetType) || isNil(targetId)) return null
  return `${targetType}:${targetId}`
}

/**
 * Resolves the person each payment was made *for* (its target).
 *
 * target_id is a polymorphic UUID with no FK constraint, so it cannot be
 * joined in the payment query. Instead we bucket the IDs by target_type and
 * issue one lookup per bucket, then index the results by `type:id`.
 *
 * Note this is distinct from payment_owner, which records who *paid* — for a
 * candidate whose sponsor covers the fee, those are two different people.
 */
async function buildTargetIdentityMap(
  rows: PaymentTransactionWithWeekend[],
  options?: ServiceOptions
): Promise<Map<string, TargetIdentity>> {
  const idsByType = new Map<string, Set<string>>()
  for (const row of rows) {
    if (isNil(row.target_type) || isNil(row.target_id)) continue
    const ids = idsByType.get(row.target_type) ?? new Set<string>()
    ids.add(row.target_id)
    idsByType.set(row.target_type, ids)
  }

  const idsFor = (targetType: string) => [
    ...(idsByType.get(targetType) ?? new Set<string>()),
  ]

  const [candidates, groupMembers, rosterMembers] = await Promise.all([
    PaymentRepository.getCandidateIdentities(idsFor('candidate'), options),
    PaymentRepository.getGroupMemberIdentities(
      idsFor('weekend_group_member'),
      options
    ),
    PaymentRepository.getRosterIdentities(idsFor('weekend_roster'), options),
  ])

  const identities = new Map<string, TargetIdentity>()
  const collect = (
    targetType: string,
    result: Result<string, TargetIdentity[]>
  ) => {
    for (const identity of unwrapOr(result, [])) {
      const key = targetKey(targetType, identity.id)
      if (!isNil(key)) identities.set(key, identity)
    }
  }

  collect('candidate', candidates)
  collect('weekend_group_member', groupMembers)
  collect('weekend_roster', rosterMembers)

  return identities
}

/**
 * Resolves the CHA role each payment's person served in, keyed by payment ID.
 *
 * Kept separate from the identity map on purpose: the two answer different
 * questions and either can come back empty without spoiling the other. Like
 * the identity map it batches — two queries whatever the number of payments,
 * one per target table that can carry a role.
 *
 * A payment against a roster row takes that row's role. A payment against a
 * group membership is group-scoped, so the roster row for the payment's own
 * weekend decides — see `pickRoleForWeekend`. Candidates have no CHA role.
 */
async function buildTargetRoleMap(
  rows: PaymentTransactionWithWeekend[],
  options?: ServiceOptions
): Promise<Map<string, string>> {
  const rosterIds = new Set<string>()
  const groupMemberIds = new Set<string>()
  for (const row of rows) {
    if (isNil(row.target_id)) continue
    if (row.target_type === 'weekend_roster') rosterIds.add(row.target_id)
    if (row.target_type === 'weekend_group_member') {
      groupMemberIds.add(row.target_id)
    }
  }

  const [rosterRolesResult, memberRolesResult] = await Promise.all([
    PaymentRepository.getRosterRolesByRosterId([...rosterIds], options),
    PaymentRepository.getRosterRolesByGroupMemberId(
      [...groupMemberIds],
      options
    ),
  ])

  const roleByRosterId = new Map<string, string | null>()
  for (const record of unwrapOr(rosterRolesResult, [])) {
    roleByRosterId.set(record.rosterId, record.chaRole)
  }

  const rosterRowsByMember = new Map<string, RosterRoleRow[]>()
  for (const record of unwrapOr(memberRolesResult, [])) {
    if (isNil(record.groupMemberId)) continue
    const existing = rosterRowsByMember.get(record.groupMemberId) ?? []
    existing.push({ weekendId: record.weekendId, chaRole: record.chaRole })
    rosterRowsByMember.set(record.groupMemberId, existing)
  }

  const roles = new Map<string, string>()
  for (const row of rows) {
    if (isNil(row.target_id)) continue
    const role =
      row.target_type === 'weekend_roster'
        ? (roleByRosterId.get(row.target_id) ?? null)
        : row.target_type === 'weekend_group_member'
          ? pickRoleForWeekend(
              rosterRowsByMember.get(row.target_id) ?? [],
              row.weekend_id
            )
          : null
    if (!isNil(role)) roles.set(row.id, role)
  }

  return roles
}

/**
 * Normalizes a payment transaction row into a PaymentTransactionDTO.
 *
 * Two different people are tracked on a payment:
 * - `payment_owner` is who paid (set during payment creation from Stripe
 *   checkout metadata or the manual-entry form). For a candidate whose
 *   sponsor covers the fee, this is the sponsor.
 * - `target_name` is who the payment was for, resolved from target_type +
 *   target_id via `buildTargetIdentityMap`. Null when the payment has no
 *   target (donations) or the target record no longer exists.
 */
function normalizePaymentTransaction(
  raw: PaymentTransactionWithWeekend,
  targetIdentities: Map<string, TargetIdentity>,
  targetRoles: Map<string, string>
): PaymentTransactionDTO {
  const key = targetKey(raw.target_type, raw.target_id)
  const identity = isNil(key) ? undefined : targetIdentities.get(key)

  return {
    id: raw.id,
    type: raw.type as PaymentType,
    target_type: raw.target_type as TargetType,
    target_id: raw.target_id,
    weekend_id: raw.weekend_id,
    payment_intent_id: raw.payment_intent_id,
    gross_amount: raw.gross_amount,
    net_amount: raw.net_amount,
    stripe_fee: raw.stripe_fee,
    payment_method: raw.payment_method as PaymentMethod,
    payment_owner: raw.payment_owner,
    notes: raw.notes,
    charge_id: raw.charge_id,
    balance_transaction_id: raw.balance_transaction_id,
    created_at: raw.created_at ?? new Date().toISOString(),
    updated_at: raw.updated_at,
    voided_at: raw.voided_at,
    void_reason: raw.void_reason,
    target_name: identity?.name ?? null,
    target_email: identity?.email ?? null,
    weekend_number: raw.weekends?.weekend_groups?.number ?? null,
    weekend_type: (raw.weekends?.type as 'MENS' | 'WOMENS') ?? null,
    cha_role: targetRoles.get(raw.id) ?? null,
  }
}

// ============================================================================
// Payment Transaction Service Functions
// ============================================================================

/**
 * Records a new payment transaction with validation.
 * This is the primary function for creating payments from webhooks and manual entry.
 *
 * The payment's weekend is derived here from the target — callers cannot
 * supply it. A team-fee payment for a member who is on no roster fails
 * loudly rather than guessing a weekend.
 *
 * @param data - The payment data to validate and insert
 * @param options - Service options including RLS bypass flag
 * @returns Result containing the created payment transaction or a validation/database error
 */
export async function recordPayment(
  data: CreatePaymentInput,
  options?: ServiceOptions
): Promise<Result<string, PaymentTransactionRow>> {
  // Validate input using Zod schema
  const parseResult = CreatePaymentSchema.safeParse(data)
  if (!parseResult.success) {
    return err(parseResult.error.message)
  }

  const validatedData = parseResult.data

  // Derive the weekend from the target. Donations have no target and no
  // weekend; fees always have a target (enforced by the schema).
  let weekendId: string | null = null
  if (!isNil(validatedData.target_type) && !isNil(validatedData.target_id)) {
    const weekendResult = await resolveTargetWeekend(
      validatedData.target_type,
      validatedData.target_id,
      options
    )
    if (isErr(weekendResult)) return weekendResult
    weekendId = weekendResult.data
  }

  // A team fee with no derivable weekend means the member is on no roster.
  // Never guess a weekend for money — surface the real problem instead.
  // (Candidate fees may legitimately have no weekend while unassigned.)
  if (
    validatedData.type === 'fee' &&
    validatedData.target_type === 'weekend_group_member' &&
    isNil(weekendId)
  ) {
    return err(
      'This team member is not on a weekend roster, so the payment cannot be assigned to a weekend. Add them to a roster first.'
    )
  }

  // Create the payment transaction
  return PaymentRepository.createPayment(
    {
      type: validatedData.type,
      target_type: validatedData.target_type,
      target_id: validatedData.target_id,
      weekend_id: weekendId,
      payment_intent_id: validatedData.payment_intent_id ?? null,
      gross_amount: validatedData.gross_amount,
      net_amount: validatedData.net_amount ?? null,
      stripe_fee: validatedData.stripe_fee ?? null,
      payment_method: validatedData.payment_method,
      // A waived fee is always covered by the community, whatever was passed.
      payment_owner: isWaived(validatedData)
        ? WAIVED_PAID_BY
        : (validatedData.payment_owner ?? null),
      notes: validatedData.notes ?? null,
      charge_id: validatedData.charge_id ?? null,
      balance_transaction_id: validatedData.balance_transaction_id ?? null,
    },
    options
  )
}

/**
 * Gets all payments for a specific target (candidate or weekend roster member).
 *
 * @param targetType - The type of target ('candidate' or 'weekend_roster')
 * @param targetId - The ID of the target entity
 * @param options - Service options including RLS bypass flag
 * @returns Result containing array of payment transactions or an error
 */
export async function getPaymentForTarget(
  targetType: NonNullable<TargetType>,
  targetId: string,
  options?: ServiceOptions
): Promise<Result<string, PaymentTransactionRow[]>> {
  return PaymentRepository.getPaymentsByTargetId(targetType, targetId, options)
}

/**
 * Gets the payments of several targets of one type in one round-trip,
 * grouped by target id. A target with no payments maps to an empty list,
 * exactly as `getPaymentForTarget` would return for it.
 *
 * @param targetType - The type of every target
 * @param targetIds - The IDs of the target entities
 * @param options - Service options including RLS bypass flag
 * @returns Result containing a map of target id to its payments, newest first
 */
export async function getPaymentsForTargets(
  targetType: NonNullable<TargetType>,
  targetIds: string[],
  options?: ServiceOptions
): Promise<Result<string, Map<string, PaymentTransactionRow[]>>> {
  return map(
    await PaymentRepository.getPaymentsByTargetIds(
      targetType,
      targetIds,
      options
    ),
    (rows) => {
      const byTarget = new Map<string, PaymentTransactionRow[]>(
        targetIds.map((id) => [id, []])
      )
      for (const row of rows) {
        if (isNil(row.target_id)) continue
        byTarget.get(row.target_id)?.push(row)
      }
      return byTarget
    }
  )
}

/**
 * Reassigns all of a target's payment transactions to a different weekend.
 * Used when a candidate is moved between weekends so their payments follow them.
 *
 * @param targetType - The type of target ('candidate' or 'weekend_roster')
 * @param targetId - The ID of the target entity
 * @param weekendId - The weekend to reassign the payments to
 * @param options - Service options including RLS bypass flag
 * @returns Result containing the updated payment transactions
 */
export async function movePaymentsToWeekend(
  targetType: NonNullable<TargetType>,
  targetId: string,
  weekendId: string,
  options?: ServiceOptions
): Promise<Result<string, PaymentTransactionRow[]>> {
  return PaymentRepository.updatePaymentsWeekendByTarget(
    targetType,
    targetId,
    weekendId,
    options
  )
}

/**
 * Auto-follow: re-points a group member's payments at the weekend they are
 * actually rostered on, after a roster change.
 *
 * Only acts when the member resolves to exactly ONE active weekend — a
 * dual-server's attribution is ambiguous and a rosterless member has no
 * weekend, so both are left alone. Only live (non-voided) payments whose
 * weekend differs are touched; a voided payment records a refund or mistake
 * and must not follow anyone.
 *
 * Runs with RLS bypassed for the payment write: this is a system-level
 * consequence of a roster change authorized upstream, not a user-initiated
 * payment edit — payment writes require WRITE_PAYMENTS, which a roster
 * editor need not have. The acting user (when there is one) is stamped on
 * updated_by so the change stays auditable.
 *
 * @param groupMemberId - The weekend_group_members row whose payments to sync
 * @returns Result containing the payments that were moved (often empty)
 */
export async function syncGroupMemberPaymentsToRoster(
  groupMemberId: string
): Promise<Result<string, PaymentTransactionRow[]>> {
  const resolutionResult =
    await GroupMemberRepository.getGroupMemberWeekendResolution(groupMemberId)
  if (isErr(resolutionResult)) return resolutionResult

  const { rosterWeekendIds, weekendId } = resolutionResult.data
  if (rosterWeekendIds.length !== 1 || isNil(weekendId)) {
    return ok([])
  }

  // Stamp the acting user when available; webhook/system contexts have none.
  const actorResult = await getActorId()
  const actorId = isErr(actorResult) ? null : actorResult.data

  const moveResult = await PaymentRepository.updatePaymentsWeekendByTarget(
    'weekend_group_member',
    groupMemberId,
    weekendId,
    { dangerouslyBypassRLS: true },
    { onlyLiveMismatched: true, actorId }
  )
  if (isErr(moveResult)) return moveResult

  if (moveResult.data.length > 0) {
    logger.info(
      {
        groupMemberId,
        weekendId,
        paymentIds: moveResult.data.map((p) => p.id),
        actorId,
      },
      'Payments auto-followed group member to rostered weekend'
    )
  }

  return moveResult
}

/**
 * Checks if any payment exists for a specific target.
 *
 * @param targetType - The type of target ('candidate' or 'weekend_roster')
 * @param targetId - The ID of the target entity
 * @param options - Service options including RLS bypass flag
 * @returns Result containing boolean indicating if payment exists
 */
export async function hasPaymentForTarget(
  targetType: NonNullable<TargetType>,
  targetId: string,
  options?: ServiceOptions
): Promise<Result<string, boolean>> {
  const result = await PaymentRepository.getPaymentsByTargetId(
    targetType,
    targetId,
    options
  )
  if (isErr(result)) {
    return result
  }
  return ok(result.data.length > 0)
}

/**
 * Gets all payment transactions with normalized DTOs for frontend display.
 *
 * @param options - Service options including RLS bypass flag
 * @returns Result containing array of normalized payment DTOs sorted by date
 */
export async function getAllPayments(
  options?: ServiceOptions
): Promise<Result<string, PaymentTransactionDTO[]>> {
  const result = await PaymentRepository.getAllPayments(options)
  if (isErr(result)) {
    return result
  }

  const [targetIdentities, targetRoles] = await Promise.all([
    buildTargetIdentityMap(result.data, options),
    buildTargetRoleMap(result.data, options),
  ])
  const normalizedPayments = result.data.map((raw) =>
    normalizePaymentTransaction(raw, targetIdentities, targetRoles)
  )

  // Sort by creation date (newest first) - already sorted by repository but ensure consistency
  normalizedPayments.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return ok(normalizedPayments)
}

/**
 * Gets all payment transactions including voided ones, for the admin payments
 * table. Voided payments are excluded from every total, so this must not be
 * used to compute one — see getAllPayments.
 *
 * @param options - Service options including RLS bypass flag
 * @returns Result containing array of normalized payment DTOs sorted by date
 */
export async function getAllPaymentsIncludingVoided(
  options?: ServiceOptions
): Promise<Result<string, PaymentTransactionDTO[]>> {
  const result = await PaymentRepository.getAllPaymentsIncludingVoided(options)
  if (isErr(result)) {
    return result
  }

  const [targetIdentities, targetRoles] = await Promise.all([
    buildTargetIdentityMap(result.data, options),
    buildTargetRoleMap(result.data, options),
  ])
  const normalizedPayments = result.data.map((raw) =>
    normalizePaymentTransaction(raw, targetIdentities, targetRoles)
  )

  normalizedPayments.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return ok(normalizedPayments)
}

/**
 * Backfills Stripe data onto an existing payment transaction.
 * Used by charge.updated webhook to add fee information after initial payment.
 *
 * @param paymentIntentId - The Stripe payment intent ID to find the payment
 * @param stripeData - The Stripe data to backfill (net_amount, stripe_fee, charge_id, balance_transaction_id)
 * @param options - Service options including RLS bypass flag
 * @returns Result containing the updated payment transaction or an error
 */
export async function backfillStripeData(
  paymentIntentId: string,
  stripeData: BackfillStripeDataInput,
  options?: ServiceOptions
): Promise<Result<string, PaymentTransactionRow>> {
  // Validate input
  const parseResult = BackfillStripeDataSchema.safeParse(stripeData)
  if (!parseResult.success) {
    return err(parseResult.error.message)
  }

  const validatedData = parseResult.data

  // Update the payment by payment intent ID
  return PaymentRepository.updatePaymentByPaymentIntentId(
    paymentIntentId,
    {
      net_amount: validatedData.net_amount ?? undefined,
      stripe_fee: validatedData.stripe_fee ?? undefined,
      charge_id: validatedData.charge_id ?? undefined,
      balance_transaction_id: validatedData.balance_transaction_id ?? undefined,
    },
    options
  )
}

// ============================================================================
// Active Weekend Financial Health
// ============================================================================

/**
 * Error value the fee calculations return when a group has no fees set, so
 * callers can say "fees aren't set for this group" instead of showing $0.
 */
export const FEES_NOT_SET = 'fees-not-set'

/**
 * Computes financial health metrics for the active weekend group, priced from
 * the group's stored fees. Expected counts follow the same rules as
 * outstanding fees: approved candidates only, spiritual directors exempt.
 *
 * Returns `err(FEES_NOT_SET)` when the active group has no fees.
 */
export async function getActiveWeekendFinancials(
  payments: PaymentTransactionDTO[],
  activeWeekends: Record<'MENS' | 'WOMENS', Weekend>
): Promise<Result<string, ActiveWeekendFinancials>> {
  const mensWeekend = activeWeekends.MENS
  const womensWeekend = activeWeekends.WOMENS
  const groupId = mensWeekend.groupId ?? womensWeekend.groupId

  const [
    mensRoster,
    womensRoster,
    candidatesResult,
    groupMembersResult,
    feesResult,
  ] = await Promise.all([
    WeekendRepository.findWeekendRoster(mensWeekend.id),
    WeekendRepository.findWeekendRoster(womensWeekend.id),
    PaymentRepository.findCandidateFeeTargets([
      mensWeekend.id,
      womensWeekend.id,
    ]),
    !isNil(groupId)
      ? GroupMemberRepository.findGroupMembersByGroupId(groupId)
      : Promise.resolve(null),
    isNil(groupId)
      ? Promise.resolve(ok(null))
      : FeesService.getGroupFees(groupId),
  ])

  if (isErr(feesResult)) return feesResult
  if (isNil(feesResult.data)) return err(FEES_NOT_SET)
  const fees = feesResult.data

  // findWeekendRoster excludes dropped members; exempt roles owe nothing, so
  // they are neither expected nor counted as paying.
  const owingRoster = (result: typeof mensRoster) =>
    unwrapOr(result, []).filter((m) => !isFeeExemptRole(m.cha_role))
  const activeMensRoster = owingRoster(mensRoster)
  const activeWomensRoster = owingRoster(womensRoster)

  const rosterCounts: Record<string, number> = {
    [mensWeekend.id]: activeMensRoster.length,
    [womensWeekend.id]: activeWomensRoster.length,
  }

  const owingCandidates = unwrapOr(candidatesResult, []).filter((c) =>
    candidateOwesFee(c.status)
  )
  const candidateCounts: Record<string, number> = {
    [mensWeekend.id]: owingCandidates.filter(
      (c) => c.weekendId === mensWeekend.id
    ).length,
    [womensWeekend.id]: owingCandidates.filter(
      (c) => c.weekendId === womensWeekend.id
    ).length,
  }

  // Build set of active team target IDs (group member IDs for active roster users)
  // so paid counts only reflect active (non-dropped) members
  const activeUserIds = new Set([
    ...activeMensRoster.map((m) => m.user_id).filter(Boolean),
    ...activeWomensRoster.map((m) => m.user_id).filter(Boolean),
  ])
  const activeTeamTargetIds = new Set<string>()
  if (groupMembersResult !== null && isOk(groupMembersResult)) {
    for (const gm of groupMembersResult.data) {
      if (activeUserIds.has(gm.user_id)) {
        activeTeamTargetIds.add(gm.id)
      }
    }
  }

  const activeCandidateTargetIds = new Set(owingCandidates.map((c) => c.id))

  return ok(
    computeActiveWeekendFinancials(
      payments,
      { MENS: mensWeekend.id, WOMENS: womensWeekend.id },
      rosterCounts,
      candidateCounts,
      fees.teamFee,
      fees.candidateFee,
      activeTeamTargetIds,
      activeCandidateTargetIds
    )
  )
}

// ============================================================================
// Fee balances (calculated, never stored)
// ============================================================================

/**
 * Every fee account across every weekend group whose fees are set: who owes,
 * who is settled, and who paid more than they owe. Groups without fees are
 * skipped — that is what keeps groups from before fee tracking out.
 *
 * @param payments - All payments; voided rows are ignored, waived rows count
 * as covering the fee
 * @param groupsOverride - Price these groups instead of every tracked group
 * (used to preview a fee change)
 */
export async function getFeeAccounts(
  payments: PaymentTransactionDTO[],
  groupsOverride?: TrackedGroup[]
): Promise<Result<string, FeeAccount[]>> {
  let groups = groupsOverride
  if (isNil(groups)) {
    const groupsResult = await FeesService.getTrackedGroups()
    if (isErr(groupsResult)) return groupsResult
    groups = groupsResult.data
  }
  if (groups.length === 0) return ok([])

  const groupIds = groups.map((g) => g.groupId)
  const weekendsResult =
    await WeekendRepository.findWeekendsByGroupIds(groupIds)
  if (isErr(weekendsResult)) return weekendsResult

  const weekends: FeeWeekend[] = weekendsResult.data.flatMap((w) =>
    isNil(w.group_id)
      ? []
      : [
          {
            id: w.id,
            groupId: w.group_id,
            number: w.weekend_groups?.number ?? null,
            type: w.type,
          },
        ]
  )
  const weekendIds = weekends.map((w) => w.id)

  const [rosterResult, candidatesResult, groupMembersResult] =
    await Promise.all([
      WeekendRepository.findRosterRowsForFees(weekendIds),
      PaymentRepository.findCandidateFeeTargets(weekendIds),
      GroupMemberRepository.findGroupMembersByGroupIds(groupIds),
    ])
  if (isErr(rosterResult)) return rosterResult
  if (isErr(candidatesResult)) return candidatesResult
  if (isErr(groupMembersResult)) return groupMembersResult

  return ok(
    buildFeeAccounts({
      groups,
      weekends,
      rosterRows: rosterResult.data.map((row) => {
        const name =
          `${row.users?.first_name ?? ''} ${row.users?.last_name ?? ''}`.trim()
        return {
          id: row.id,
          weekendId: row.weekend_id,
          userId: row.user_id,
          chaRole: row.cha_role,
          status: row.status,
          name: name !== '' ? name : null,
        }
      }),
      candidates: candidatesResult.data,
      groupMembers: groupMembersResult.data.map((m) => ({
        id: m.id,
        groupId: m.group_id,
        userId: m.user_id,
      })),
      payments,
    })
  )
}

/** Who still owes, and who paid more than they owe, across tracked groups. */
export async function getFeeBalances(
  payments: PaymentTransactionDTO[]
): Promise<Result<string, FeeBalances>> {
  return map(await getFeeAccounts(payments), deriveFeeBalances)
}

// ============================================================================
// Manual Entry (admin Payments page)
// ============================================================================

/**
 * Records a payment entered by hand: cash, a check, or a waived fee.
 *
 * Goes through recordPayment, so the weekend is derived from the target and a
 * waiver is always owned by the community. The `manual_` intent prefix is what
 * the fee helpers key on to apply the cash price rather than the online one —
 * a waiver covers the cash price too.
 */
export async function recordAdminPayment(
  input: RecordAdminPaymentInput
): Promise<Result<string, PaymentTransactionRow>> {
  const parseResult = RecordAdminPaymentSchema.safeParse(input)
  if (!parseResult.success) {
    return err(parseResult.error.message)
  }
  const { targetType, targetId, amount, method, paidBy, notes } =
    parseResult.data

  const actorResult = await getActorId()
  if (isErr(actorResult)) return actorResult

  const result = await recordPayment({
    type: 'fee',
    target_type: targetType,
    target_id: targetId,
    payment_intent_id: `manual_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    gross_amount: amount,
    payment_method: method,
    payment_owner: isNil(paidBy) || paidBy === '' ? null : paidBy,
    notes: isNil(notes) || notes === '' ? null : notes,
  })
  if (isErr(result)) return result

  logger.info(
    {
      paymentId: result.data.id,
      targetType,
      targetId,
      amount,
      method,
      actorId: actorResult.data,
    },
    method === 'waived' ? 'Fee waived' : 'Manual payment recorded'
  )

  return result
}

// ============================================================================
// Payment Corrections
// ============================================================================

/**
 * Resolves the weekend a payment target belongs to, and confirms the target
 * exists. This is the single derivation every payment write goes through —
 * recordPayment and reassignPayment both use it, so no caller can supply a
 * wrong weekend.
 *
 * The weekend is derived rather than accepted from the caller because
 * `weekend_id` is what the payment report and the active-weekend financials
 * group on. A wrong or stale weekend skews per-weekend totals with nothing
 * on screen to explain it.
 */
export async function resolveTargetWeekend(
  targetType: NonNullable<TargetType>,
  targetId: string,
  options?: ServiceOptions
): Promise<Result<string, string | null>> {
  switch (targetType) {
    case 'candidate': {
      const result = await PaymentRepository.findCandidateWeekend(
        targetId,
        options
      )
      if (isErr(result)) return result
      if (!result.data.found) return err('Candidate not found')
      return ok(result.data.weekendId)
    }
    case 'weekend_group_member': {
      // Group members belong to a group covering both weekends; this resolves
      // the weekend the member is actively rostered on (gender only breaks a
      // dual-server tie). Uses the admin client internally.
      const result = await GroupMemberRepository.getGroupMemberById(targetId)
      if (isErr(result)) return err('Team member not found')
      return ok(result.data.weekendId)
    }
    case 'weekend_roster': {
      const result = await PaymentRepository.findRosterWeekend(
        targetId,
        options
      )
      if (isErr(result)) return result
      if (!result.data.found) return err('Roster entry not found')
      return ok(result.data.weekendId)
    }
  }
}

/**
 * Loads a payment for correction, rejecting anything that cannot be corrected.
 */
async function loadCorrectablePayment(
  paymentId: string
): Promise<Result<string, PaymentTransactionRow>> {
  const result = await PaymentRepository.getPaymentById(paymentId)
  if (isErr(result)) return err(`Failed to load payment: ${result.error}`)
  if (isNil(result.data)) return err('Payment not found')
  if (!isNil(result.data.voided_at)) {
    return err('This payment is voided and can no longer be changed')
  }
  return ok(result.data)
}

/**
 * Resolves the acting user for a correction, used to stamp the audit columns.
 */
async function getActorId(): Promise<Result<string, string>> {
  const userResult = await getLoggedInUser()
  if (isErr(userResult)) return err('Unauthorized: User not authenticated')
  return ok(userResult.data.id)
}

/**
 * Reassigns a payment to a different candidate or team member.
 *
 * This is the fix for a payment recorded against the wrong person — the money
 * arrived, only the credit is misfiled. It applies to Stripe payments as well
 * as cash and check, since checkout metadata can be wrong too.
 *
 * @param input - The payment to move and its new target
 * @returns Result containing the reassigned payment or an error
 */
export async function reassignPayment(
  input: ReassignPaymentInput
): Promise<Result<string, PaymentTransactionRow>> {
  const parseResult = ReassignPaymentSchema.safeParse(input)
  if (!parseResult.success) {
    return err(parseResult.error.message)
  }
  const { paymentId, targetType, targetId } = parseResult.data

  const actorResult = await getActorId()
  if (isErr(actorResult)) return actorResult

  const paymentResult = await loadCorrectablePayment(paymentId)
  if (isErr(paymentResult)) return paymentResult
  const payment = paymentResult.data

  if (isNil(payment.target_type)) {
    return err('This payment has no target and cannot be reassigned')
  }

  if (payment.target_type === targetType && payment.target_id === targetId) {
    return err('This payment is already assigned to that person')
  }

  const weekendResult = await resolveTargetWeekend(targetType, targetId)
  if (isErr(weekendResult)) return weekendResult

  // Mirror recordPayment: a fee cannot land on a team member who is on no
  // roster — there would be no weekend to count it under.
  if (
    payment.type === 'fee' &&
    targetType === 'weekend_group_member' &&
    isNil(weekendResult.data)
  ) {
    return err(
      'That team member is not on a weekend roster, so the payment cannot be assigned to a weekend. Add them to a roster first.'
    )
  }

  const updateResult = await PaymentRepository.updatePaymentTarget(
    paymentId,
    { targetType, targetId, weekendId: weekendResult.data },
    actorResult.data
  )
  if (isErr(updateResult)) {
    return err(`Failed to reassign payment: ${updateResult.error}`)
  }

  logger.info(
    {
      paymentId,
      from: { targetType: payment.target_type, targetId: payment.target_id },
      to: { targetType, targetId },
      weekendId: weekendResult.data,
      actorId: actorResult.data,
    },
    'Payment reassigned'
  )

  return ok(updateResult.data)
}

/**
 * Voids a payment without deleting it.
 *
 * Voided payments drop out of balances and totals but stay on the record, so
 * a bounced check or a duplicate entry leaves an explanation behind rather
 * than an unexplained change in someone's balance.
 *
 * @param input - The payment to void and the reason why
 * @returns Result containing the voided payment or an error
 */
export async function voidPayment(
  input: VoidPaymentInput
): Promise<Result<string, PaymentTransactionRow>> {
  const parseResult = VoidPaymentSchema.safeParse(input)
  if (!parseResult.success) {
    return err(parseResult.error.message)
  }
  const { paymentId, reason } = parseResult.data

  const actorResult = await getActorId()
  if (isErr(actorResult)) return actorResult

  const paymentResult = await loadCorrectablePayment(paymentId)
  if (isErr(paymentResult)) return paymentResult

  const voidResult = await PaymentRepository.voidPayment(
    paymentId,
    reason,
    actorResult.data
  )
  if (isErr(voidResult)) {
    return err(`Failed to void payment: ${voidResult.error}`)
  }

  logger.info(
    {
      paymentId,
      grossAmount: paymentResult.data.gross_amount,
      reason,
      actorId: actorResult.data,
    },
    'Payment voided'
  )

  return ok(voidResult.data)
}

/**
 * Corrects a payment's details — a mistyped amount, the wrong method, a
 * misspelled payer name, or notes.
 *
 * @param input - The payment to correct and the fields to change
 * @returns Result containing the corrected payment or an error
 */
export async function updatePaymentDetails(
  input: UpdatePaymentDetailsInput
): Promise<Result<string, PaymentTransactionRow>> {
  const parseResult = UpdatePaymentDetailsSchema.safeParse(input)
  if (!parseResult.success) {
    return err(parseResult.error.message)
  }
  const { paymentId, grossAmount, paymentMethod, paymentOwner, notes } =
    parseResult.data

  const actorResult = await getActorId()
  if (isErr(actorResult)) return actorResult

  const paymentResult = await loadCorrectablePayment(paymentId)
  if (isErr(paymentResult)) return paymentResult

  // Waived is not a method correction: flipping a row between money and a
  // waiver would silently move it in or out of every collected total. Void
  // it and record the right thing instead.
  if (
    !isNil(paymentMethod) &&
    paymentMethod !== paymentResult.data.payment_method &&
    (paymentMethod === 'waived' || isWaived(paymentResult.data))
  ) {
    return err(
      'A payment cannot be changed to or from Waived. Void it and record a new one instead.'
    )
  }

  const changes: PaymentTransactionUpdate = {}
  if (!isNil(grossAmount)) changes.gross_amount = grossAmount
  if (!isNil(paymentMethod)) changes.payment_method = paymentMethod
  if (paymentOwner !== undefined) changes.payment_owner = paymentOwner
  if (notes !== undefined) changes.notes = notes

  const updateResult = await PaymentRepository.updatePaymentDetails(
    paymentId,
    changes,
    actorResult.data
  )
  if (isErr(updateResult)) {
    return err(`Failed to update payment: ${updateResult.error}`)
  }

  logger.info(
    { paymentId, changes, actorId: actorResult.data },
    'Payment details corrected'
  )

  return ok(updateResult.data)
}

// ============================================================================
// Reassign Target Options
// ============================================================================

/**
 * Lists every candidate and team member a payment can be reassigned to,
 * sorted by name. Labelled with the weekend so two people with the same name
 * are distinguishable in the picker.
 */
export async function getPaymentTargetOptions(): Promise<
  Result<string, PaymentTargetOption[]>
> {
  const [candidatesResult, groupMembersResult] = await Promise.all([
    PaymentRepository.findCandidateTargets(),
    PaymentRepository.findGroupMemberTargets(),
  ])

  if (isErr(candidatesResult)) {
    return err(`Failed to load candidates: ${candidatesResult.error}`)
  }
  if (isErr(groupMembersResult)) {
    return err(`Failed to load team members: ${groupMembersResult.error}`)
  }

  const candidateOptions: PaymentTargetOption[] = candidatesResult.data
    .filter((candidate) => !isNil(candidate.name))
    .map((candidate) => ({
      targetType: 'candidate' as const,
      targetId: candidate.id,
      name: candidate.name as string,
      weekendLabel:
        isNil(candidate.weekendNumber) && isNil(candidate.weekendType)
          ? null
          : formatWeekendLabelFor({
              number: candidate.weekendNumber,
              gender: candidate.weekendType as 'MENS' | 'WOMENS' | null,
            }),
    }))

  const teamOptions: PaymentTargetOption[] = groupMembersResult.data
    .filter((member) => !isNil(member.name))
    .map((member) => ({
      targetType: 'weekend_group_member' as const,
      targetId: member.id,
      name: member.name as string,
      weekendLabel: isNil(member.groupNumber)
        ? null
        : formatWeekendGroupTitle(member.groupNumber),
    }))

  const options = [...candidateOptions, ...teamOptions].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  return ok(options)
}
