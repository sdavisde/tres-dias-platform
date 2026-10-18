import 'server-only'

import type { Result } from '@/lib/results'
import { err, isErr, ok } from '@/lib/results'
import * as DepositRepository from './repository'
import * as PaymentRepository from '@/services/payment/repository'
import type {
  ServiceOptions,
  CreateDepositInput,
  UpdateDepositInput,
  RecordStripePayoutInput,
  RawDepositWithPayments,
  DepositDTO,
  DepositPaymentDTO,
  DepositRow,
  DepositType,
  DepositStatus,
  RawDepositPaymentWithTransaction,
} from './types'
import {
  CreateDepositSchema,
  UpdateDepositSchema,
  RecordStripePayoutSchema,
} from './types'
import { isNil, sumBy } from 'lodash'
import { logger } from '@/lib/logger'

// ============================================================================
// Deposit Normalization
// ============================================================================

/**
 * Normalizes a raw deposit with payments into a DepositDTO.
 * Computes derived fields like payment_count and total_gross_amount.
 */
function normalizeDeposit(raw: RawDepositWithPayments): DepositDTO {
  const payments = raw.deposit_payments ?? []
  const totalGrossAmount = sumBy(
    payments,
    (dp) => dp.payment_transaction?.gross_amount ?? 0
  )

  return {
    id: raw.id,
    deposit_type: raw.deposit_type as DepositType,
    amount: raw.amount,
    status: raw.status as DepositStatus,
    arrival_date: !isNil(raw.arrival_date) ? new Date(raw.arrival_date) : null,
    transaction_count: raw.transaction_count,
    payout_id: raw.payout_id,
    notes: raw.notes,
    created_at: new Date(raw.created_at ?? new Date().toISOString()),
    // Computed fields
    payment_count: payments.length,
    total_gross_amount: totalGrossAmount,
  }
}

/**
 * Normalizes a raw deposit row (without payments) into a DepositDTO.
 * Used when we only have the deposit row without joined payment data.
 */
function normalizeDepositRow(raw: DepositRow): DepositDTO {
  return {
    id: raw.id,
    deposit_type: raw.deposit_type as DepositType,
    amount: raw.amount,
    status: raw.status as DepositStatus,
    arrival_date: !isNil(raw.arrival_date) ? new Date(raw.arrival_date) : null,
    transaction_count: raw.transaction_count,
    payout_id: raw.payout_id,
    notes: raw.notes,
    created_at: new Date(raw.created_at ?? new Date().toISOString()),
    // Computed fields - use transaction_count from DB since we don't have joined data
    payment_count: raw.transaction_count,
    total_gross_amount: 0, // Unknown without payment data
  }
}

/**
 * Normalizes a raw deposit payment with transaction into a DepositPaymentDTO.
 */
function normalizeDepositPayment(
  raw: RawDepositPaymentWithTransaction
): DepositPaymentDTO {
  return {
    id: raw.id,
    deposit_id: raw.deposit_id,
    payment_transaction_id: raw.payment_transaction_id,
    created_at: new Date(raw.created_at ?? new Date().toISOString()),
    // Payment info
    payment_type: raw.payment_transaction?.type ?? 'unknown',
    payment_gross_amount: raw.payment_transaction?.gross_amount ?? 0,
    payment_method: raw.payment_transaction?.payment_method ?? 'unknown',
    payment_created_at: new Date(
      raw.payment_transaction?.created_at ?? new Date().toISOString()
    ),
  }
}

// ============================================================================
// Deposit Service Functions
// ============================================================================

/**
 * Records a new deposit with validation.
 * This is the primary function for creating deposits.
 *
 * @param data - The deposit data to validate and insert
 * @param options - Service options including RLS bypass flag
 * @returns Result containing the created deposit row or a validation/database error
 */
export async function recordDeposit(
  data: CreateDepositInput,
  options?: ServiceOptions
): Promise<Result<string, DepositRow>> {
  // Validate input using Zod schema
  const parseResult = CreateDepositSchema.safeParse(data)
  if (!parseResult.success) {
    return err(parseResult.error.message)
  }

  const validatedData = parseResult.data

  // Create the deposit
  return DepositRepository.createDeposit(
    {
      deposit_type: validatedData.deposit_type,
      amount: validatedData.amount,
      status: validatedData.status,
      arrival_date: validatedData.arrival_date ?? null,
      transaction_count: validatedData.transaction_count ?? 0,
      payout_id: validatedData.payout_id ?? null,
      notes: validatedData.notes ?? null,
    },
    options
  )
}

/**
 * Records a Stripe payout deposit and links associated payments.
 * This is a convenience function for the payout.paid webhook handler.
 *
 * @param payoutData - The payout data including payment intent IDs to link
 * @param options - Service options including RLS bypass flag
 * @returns Result containing the created deposit or an error
 */
export async function recordStripePayoutDeposit(
  payoutData: RecordStripePayoutInput,
  options?: ServiceOptions
): Promise<Result<string, DepositDTO>> {
  // Validate input
  const parseResult = RecordStripePayoutSchema.safeParse(payoutData)
  if (!parseResult.success) {
    return err(parseResult.error.message)
  }

  const validatedData = parseResult.data

  // A retried payout.paid reuses the deposit an earlier delivery created
  // (payout_id is unique) and finishes linking its payments.
  const existingResult = await DepositRepository.getDepositByPayoutId(
    validatedData.payout_id,
    options
  )
  if (isErr(existingResult)) {
    return existingResult
  }

  let deposit = existingResult.data
  if (isNil(deposit)) {
    const depositResult = await DepositRepository.createDeposit(
      {
        deposit_type: 'stripe_payout',
        amount: validatedData.amount,
        status: validatedData.status,
        arrival_date: validatedData.arrival_date ?? null,
        transaction_count: validatedData.payment_intent_ids.length,
        payout_id: validatedData.payout_id,
        notes: null,
      },
      options
    )

    if (isErr(depositResult)) {
      return depositResult
    }
    deposit = depositResult.data
  }

  // Link each payment to the deposit
  for (const paymentIntentId of validatedData.payment_intent_ids) {
    // Look up the payment transaction by payment intent ID
    const paymentResult = await PaymentRepository.getPaymentByPaymentIntentId(
      paymentIntentId,
      options
    )

    if (isErr(paymentResult)) {
      // Log but continue - we don't want to fail the whole deposit if one payment link fails
      logger.error(
        { paymentIntentId, error: paymentResult.error },
        'Failed to look up payment for payout deposit'
      )
      continue
    }

    if (paymentResult.data === null) {
      // Payment not found - this can happen if the payment was created before migration
      logger.warn({ paymentIntentId }, 'No payment recorded for payout charge')
      continue
    }

    // Link the payment to the deposit
    const linkResult = await DepositRepository.linkPaymentToDeposit(
      deposit.id,
      paymentResult.data.id,
      options
    )

    if (isErr(linkResult)) {
      logger.error(
        {
          paymentId: paymentResult.data.id,
          depositId: deposit.id,
          error: linkResult.error,
        },
        'Failed to link payment to payout deposit'
      )
    }
  }

  // Fetch the deposit with linked payments to return
  const depositWithPayments = await DepositRepository.getDepositById(
    deposit.id,
    options
  )

  if (isErr(depositWithPayments)) {
    // Return the deposit without payment data rather than failing
    return ok(normalizeDepositRow(deposit))
  }

  if (depositWithPayments.data === null) {
    return ok(normalizeDepositRow(deposit))
  }

  return ok(normalizeDeposit(depositWithPayments.data))
}

/**
 * Gets a deposit by ID with normalized DTO.
 *
 * @param id - The deposit ID
 * @param options - Service options including RLS bypass flag
 * @returns Result containing the normalized deposit DTO or an error
 */
export async function getDepositById(
  id: string,
  options?: ServiceOptions
): Promise<Result<string, DepositDTO | null>> {
  const result = await DepositRepository.getDepositById(id, options)
  if (isErr(result)) {
    return result
  }

  if (result.data === null) {
    return ok(null)
  }

  return ok(normalizeDeposit(result.data))
}

/**
 * Gets all deposits with normalized DTOs for frontend display.
 *
 * @param options - Service options including RLS bypass flag
 * @returns Result containing array of normalized deposit DTOs sorted by date
 */
export async function getAllDeposits(
  options?: ServiceOptions
): Promise<Result<string, DepositDTO[]>> {
  const result = await DepositRepository.getAllDeposits(options)
  if (isErr(result)) {
    return result
  }

  const normalizedDeposits = result.data.map(normalizeDeposit)

  // Sort by creation date (newest first) - already sorted by repository but ensure consistency
  normalizedDeposits.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return ok(normalizedDeposits)
}

/**
 * Updates a deposit's status with validation.
 *
 * @param id - The deposit ID
 * @param data - The fields to update
 * @param options - Service options including RLS bypass flag
 * @returns Result containing the updated deposit row or an error
 */
export async function updateDeposit(
  id: string,
  data: UpdateDepositInput,
  options?: ServiceOptions
): Promise<Result<string, DepositRow>> {
  // Validate input
  const parseResult = UpdateDepositSchema.safeParse(data)
  if (!parseResult.success) {
    return err(parseResult.error.message)
  }

  const validatedData = parseResult.data

  return DepositRepository.updateDeposit(
    id,
    {
      amount: validatedData.amount,
      status: validatedData.status,
      arrival_date: validatedData.arrival_date,
      transaction_count: validatedData.transaction_count,
      notes: validatedData.notes,
    },
    options
  )
}

/**
 * Updates a deposit by Stripe payout ID.
 * Used for updating deposit status from webhook events.
 *
 * @param payoutId - The Stripe payout ID
 * @param data - The fields to update
 * @param options - Service options including RLS bypass flag
 * @returns Result containing the updated deposit row or an error
 */
export async function updateDepositByPayoutId(
  payoutId: string,
  data: UpdateDepositInput,
  options?: ServiceOptions
): Promise<Result<string, DepositRow>> {
  // Validate input
  const parseResult = UpdateDepositSchema.safeParse(data)
  if (!parseResult.success) {
    return err(parseResult.error.message)
  }

  const validatedData = parseResult.data

  return DepositRepository.updateDepositByPayoutId(
    payoutId,
    {
      amount: validatedData.amount,
      status: validatedData.status,
      arrival_date: validatedData.arrival_date,
      transaction_count: validatedData.transaction_count,
      notes: validatedData.notes,
    },
    options
  )
}

/**
 * Links a payment transaction to a deposit with validation.
 *
 * @param depositId - The deposit ID
 * @param paymentTransactionId - The payment transaction ID
 * @param options - Service options including RLS bypass flag
 * @returns Result containing the created link or an error
 */
export async function linkPaymentToDeposit(
  depositId: string,
  paymentTransactionId: string,
  options?: ServiceOptions
): Promise<Result<string, DepositPaymentDTO>> {
  const result = await DepositRepository.linkPaymentToDeposit(
    depositId,
    paymentTransactionId,
    options
  )

  if (isErr(result)) {
    return result
  }

  // Fetch the full payment data for the DTO
  const paymentsResult = await DepositRepository.getPaymentsForDeposit(
    depositId,
    options
  )

  if (isErr(paymentsResult)) {
    // Return minimal DTO if we can't fetch payment data
    return ok({
      id: result.data.id,
      deposit_id: result.data.deposit_id,
      payment_transaction_id: result.data.payment_transaction_id,
      created_at: new Date(result.data.created_at ?? new Date().toISOString()),
      payment_type: 'unknown',
      payment_gross_amount: 0,
      payment_method: 'unknown',
      payment_created_at: new Date(),
    })
  }

  // Find the specific payment we just linked
  const linkedPayment = paymentsResult.data.find(
    (p) => p.payment_transaction_id === paymentTransactionId
  )

  if (isNil(linkedPayment)) {
    // Return minimal DTO
    return ok({
      id: result.data.id,
      deposit_id: result.data.deposit_id,
      payment_transaction_id: result.data.payment_transaction_id,
      created_at: new Date(result.data.created_at ?? new Date().toISOString()),
      payment_type: 'unknown',
      payment_gross_amount: 0,
      payment_method: 'unknown',
      payment_created_at: new Date(),
    })
  }

  return ok(normalizeDepositPayment(linkedPayment))
}

/**
 * Gets all payments linked to a deposit.
 *
 * @param depositId - The deposit ID
 * @param options - Service options including RLS bypass flag
 * @returns Result containing array of deposit payment DTOs or an error
 */
export async function getPaymentsForDeposit(
  depositId: string,
  options?: ServiceOptions
): Promise<Result<string, DepositPaymentDTO[]>> {
  const result = await DepositRepository.getPaymentsForDeposit(
    depositId,
    options
  )
  if (isErr(result)) {
    return result
  }

  return ok(result.data.map(normalizeDepositPayment))
}
