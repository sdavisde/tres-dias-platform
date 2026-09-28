import { test as base } from '@playwright/test'
import { isNil } from 'lodash'
import type { Database } from '@/database.types'
import { adminClient } from './supabase'

/**
 * Cleanup for the payments specs (FR-4.3, FR-4.4, FR-4.8). Every test that
 * imports `test` from here gets an automatic fixture that, after the test:
 *
 * - deletes `payment_transaction` rows whose `payment_intent_id` starts with
 *   `pi_e2e_` (the prefix ./stripe-events.ts gives every synthetic payment);
 * - sets every candidate passed to `restoreCandidate(id)` back to
 *   `awaiting_payment`, the status the seed gives them (S4);
 * - deletes `email_log` rows created since the test started: the handlers'
 *   notification emails fail on the dummy Resend key and log a `failed` row.
 *
 * The `pi_e2e_` rows are also deleted before the test, so a run that was
 * killed half way cannot leave a persona looking paid.
 */

type PaymentRow = Database['public']['Tables']['payment_transaction']['Row']

export const E2E_PAYMENT_INTENT_PATTERN = 'pi_e2e_%'

async function deleteE2EPayments(): Promise<void> {
  const { error } = await adminClient()
    .from('payment_transaction')
    .delete()
    .like('payment_intent_id', E2E_PAYMENT_INTENT_PATTERN)
  if (!isNil(error)) {
    throw new Error(`Failed to delete pi_e2e_ payments: ${error.message}`)
  }
}

async function resetCandidates(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await adminClient()
    .from('candidates')
    .update({ status: 'awaiting_payment' })
    .in('id', ids)
  if (!isNil(error)) {
    throw new Error(
      `Failed to reset candidates ${ids.join(', ')} to awaiting_payment: ${error.message}`
    )
  }
}

async function deleteEmailLogSince(since: string): Promise<void> {
  const { error } = await adminClient()
    .from('email_log')
    .delete()
    .gte('created_at', since)
  if (!isNil(error)) {
    throw new Error(`Failed to delete email_log rows: ${error.message}`)
  }
}

type PaymentsFixtures = {
  /** Registers a candidate to be set back to `awaiting_payment` after the test. */
  restoreCandidate: (candidateId: string) => void
  paymentsCleanup: void
}

export const test = base.extend<PaymentsFixtures>({
  restoreCandidate: async ({}, use) => {
    const ids = new Set<string>()
    await use((candidateId) => {
      ids.add(candidateId)
    })
    // Torn down after paymentsCleanup (which depends on this fixture), so the
    // pi_e2e_ payments are gone before the candidate owes again.
    await resetCandidates([...ids])
  },
  paymentsCleanup: [
    // Depends on restoreCandidate only to order the teardowns.
    async ({ restoreCandidate }, use) => {
      const startedAt = new Date().toISOString()
      await deleteE2EPayments()
      await use()
      await deleteE2EPayments()
      await deleteEmailLogSince(startedAt)
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'

/** Every non-voided payment on a target, oldest first. */
export async function paymentRows(targetId: string): Promise<PaymentRow[]> {
  const { data, error } = await adminClient()
    .from('payment_transaction')
    .select('*')
    .eq('target_id', targetId)
    .is('voided_at', null)
    .order('created_at', { ascending: true })
  if (!isNil(error)) {
    throw new Error(`Failed to read payments for ${targetId}: ${error.message}`)
  }
  return data ?? []
}

/** The sum of a target's non-voided gross payments, in dollars. */
export async function livePaymentsFor(targetId: string): Promise<number> {
  const rows = await paymentRows(targetId)
  const cents = rows.reduce(
    (sum, row) => sum + Math.round(Number(row.gross_amount) * 100),
    0
  )
  return cents / 100
}

/** A candidate's current status. */
export async function candidateStatus(candidateId: string): Promise<string> {
  const { data, error } = await adminClient()
    .from('candidates')
    .select('status')
    .eq('id', candidateId)
    .single()
  if (!isNil(error)) {
    throw new Error(`Failed to read candidate ${candidateId}: ${error.message}`)
  }
  if (isNil(data)) throw new Error(`Candidate ${candidateId} not found`)
  return data.status
}

/**
 * Who pays a candidate's fee, as `getCheckoutQuote` works it out
 * (services/payment/payment-service.ts, which is server-only): the sponsor's
 * or the candidate's name from the sponsorship form, per `payment_owner`.
 */
export async function candidatePayerName(candidateId: string): Promise<string> {
  const { data, error } = await adminClient()
    .from('candidate_sponsorship_info')
    .select('candidate_name, sponsor_name, payment_owner')
    .eq('candidate_id', candidateId)
    .limit(1)
    .maybeSingle()
  if (!isNil(error)) {
    throw new Error(
      `Failed to read sponsorship info for ${candidateId}: ${error.message}`
    )
  }
  return (
    (data?.payment_owner === 'sponsor'
      ? data.sponsor_name
      : data?.candidate_name) ??
    data?.candidate_name ??
    'Unknown'
  )
}
