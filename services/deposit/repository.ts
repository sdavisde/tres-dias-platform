import 'server-only'

import { isNil } from 'lodash'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Result } from '@/lib/results'
import { err, fromSupabase, ok } from '@/lib/results'
import type {
  ServiceOptions,
  DepositRow,
  DepositInsert,
  DepositUpdate,
  DepositPaymentRow,
  DepositPaymentInsert,
  RawDepositWithPayments,
  RawDepositPaymentWithTransaction,
} from './types'

// ============================================================================
// Client Selection Helper
// ============================================================================

/**
 * Returns the appropriate Supabase client based on service options.
 * When dangerouslyBypassRLS is true, returns an admin client that bypasses RLS.
 * Otherwise, returns a regular client that respects RLS policies.
 */
async function getClient(options?: ServiceOptions) {
  if (options?.dangerouslyBypassRLS === true) {
    return createAdminClient()
  }
  return createClient()
}

// ============================================================================
// Query Constants
// ============================================================================

/**
 * Query for fetching deposits with linked payment transactions.
 * Includes join to deposit_payments and payment_transaction for summary data.
 */
export const DepositWithPaymentsQuery = `
  id,
  deposit_type,
  amount,
  status,
  arrival_date,
  transaction_count,
  payout_id,
  notes,
  created_at,
  deposit_payments(
    id,
    payment_transaction_id,
    payment_transaction(
      id,
      type,
      gross_amount,
      payment_method,
      created_at
    )
  )
`

/**
 * Query for fetching deposit payments with payment transaction data.
 */
export const DepositPaymentWithTransactionQuery = `
  id,
  deposit_id,
  payment_transaction_id,
  created_at,
  payment_transaction(
    id,
    type,
    target_type,
    target_id,
    gross_amount,
    net_amount,
    stripe_fee,
    payment_method,
    created_at
  )
`

// ============================================================================
// Deposit Repository Functions
// ============================================================================

/**
 * Creates a new deposit record.
 * @param data - The deposit data to insert
 * @param options - Service options including RLS bypass flag
 * @returns Result containing the created deposit or an error
 */
export async function createDeposit(
  data: DepositInsert,
  options?: ServiceOptions
): Promise<Result<string, DepositRow>> {
  const supabase = await getClient(options)
  const response = await supabase
    .from('deposits')
    .insert(data)
    .select()
    .single()
  return fromSupabase(response)
}

/**
 * Gets a deposit by its ID with linked payment transactions.
 * @param id - The deposit ID
 * @param options - Service options including RLS bypass flag
 * @returns Result containing the deposit with payments or an error
 */
export async function getDepositById(
  id: string,
  options?: ServiceOptions
): Promise<Result<string, RawDepositWithPayments | null>> {
  const supabase = await getClient(options)
  const response = await supabase
    .from('deposits')
    .select(DepositWithPaymentsQuery)
    .eq('id', id)
    .maybeSingle()
  // Type assertion needed because Supabase SDK doesn't recognize nested joins
  return fromSupabase(response) as Result<string, RawDepositWithPayments | null>
}

/**
 * Gets a deposit by Stripe payout ID.
 * @param payoutId - The Stripe payout ID
 * @param options - Service options including RLS bypass flag
 * @returns Result containing the deposit or an error
 */
export async function getDepositByPayoutId(
  payoutId: string,
  options?: ServiceOptions
): Promise<Result<string, DepositRow | null>> {
  const supabase = await getClient(options)
  const response = await supabase
    .from('deposits')
    .select('*')
    .eq('payout_id', payoutId)
    .maybeSingle()
  return fromSupabase(response)
}

/**
 * Gets all deposits with linked payment count.
 * @param options - Service options including RLS bypass flag
 * @returns Result containing array of deposits with payments or an error
 */
export async function getAllDeposits(
  options?: ServiceOptions
): Promise<Result<string, RawDepositWithPayments[]>> {
  const supabase = await getClient(options)
  const response = await supabase
    .from('deposits')
    .select(DepositWithPaymentsQuery)
    .order('created_at', { ascending: false })
  // Type assertion needed because Supabase SDK doesn't recognize nested joins
  return fromSupabase(response) as Result<string, RawDepositWithPayments[]>
}

/**
 * Updates a deposit record by ID.
 * @param id - The deposit ID to update
 * @param data - The fields to update
 * @param options - Service options including RLS bypass flag
 * @returns Result containing the updated deposit or an error
 */
export async function updateDeposit(
  id: string,
  data: DepositUpdate,
  options?: ServiceOptions
): Promise<Result<string, DepositRow>> {
  const supabase = await getClient(options)
  const response = await supabase
    .from('deposits')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  return fromSupabase(response)
}

/**
 * Updates a deposit record by Stripe payout ID.
 * Used for updating deposit status from webhook events.
 * @param payoutId - The Stripe payout ID
 * @param data - The fields to update
 * @param options - Service options including RLS bypass flag
 * @returns Result containing the updated deposit or an error
 */
export async function updateDepositByPayoutId(
  payoutId: string,
  data: DepositUpdate,
  options?: ServiceOptions
): Promise<Result<string, DepositRow>> {
  const supabase = await getClient(options)
  const response = await supabase
    .from('deposits')
    .update(data)
    .eq('payout_id', payoutId)
    .select()
    .single()
  return fromSupabase(response)
}

// ============================================================================
// Deposit Payments Repository Functions
// ============================================================================

/**
 * Links a payment transaction to a deposit.
 * @param depositId - The deposit ID
 * @param paymentTransactionId - The payment transaction ID
 * @param options - Service options including RLS bypass flag
 * @returns Result containing the created link or an error
 */
export async function linkPaymentToDeposit(
  depositId: string,
  paymentTransactionId: string,
  options?: ServiceOptions
): Promise<Result<string, DepositPaymentRow>> {
  const supabase = await getClient(options)
  const data: DepositPaymentInsert = {
    deposit_id: depositId,
    payment_transaction_id: paymentTransactionId,
  }
  // Upsert so a retried payout webhook can relink without a duplicate error.
  const response = await supabase
    .from('deposit_payments')
    .upsert(data, { onConflict: 'deposit_id,payment_transaction_id' })
    .select()
    .single()
  return fromSupabase(response)
}

/**
 * Unlinks a payment transaction from a deposit.
 * @param depositId - The deposit ID
 * @param paymentTransactionId - The payment transaction ID
 * @param options - Service options including RLS bypass flag
 * @returns Result containing void or an error
 */
export async function unlinkPaymentFromDeposit(
  depositId: string,
  paymentTransactionId: string,
  options?: ServiceOptions
): Promise<Result<string, null>> {
  const supabase = await getClient(options)
  const response = await supabase
    .from('deposit_payments')
    .delete()
    .eq('deposit_id', depositId)
    .eq('payment_transaction_id', paymentTransactionId)
  return fromSupabase(response)
}

/**
 * Gets all payment transactions linked to a deposit.
 * @param depositId - The deposit ID
 * @param options - Service options including RLS bypass flag
 * @returns Result containing array of deposit payments with transaction data or an error
 */
export async function getPaymentsForDeposit(
  depositId: string,
  options?: ServiceOptions
): Promise<Result<string, RawDepositPaymentWithTransaction[]>> {
  const supabase = await getClient(options)
  const response = await supabase
    .from('deposit_payments')
    .select(DepositPaymentWithTransactionQuery)
    .eq('deposit_id', depositId)
    .order('created_at', { ascending: false })
  // Type assertion needed because Supabase SDK doesn't recognize nested joins
  return fromSupabase(response) as Result<
    string,
    RawDepositPaymentWithTransaction[]
  >
}

/**
 * Gets the deposit associated with a payment transaction.
 * @param paymentTransactionId - The payment transaction ID
 * @param options - Service options including RLS bypass flag
 * @returns Result containing the deposit or an error
 */
export async function getDepositForPayment(
  paymentTransactionId: string,
  options?: ServiceOptions
): Promise<Result<string, DepositRow | null>> {
  const supabase = await getClient(options)
  const response = await supabase
    .from('deposit_payments')
    .select(
      `
      deposit_id,
      deposits(*)
    `
    )
    .eq('payment_transaction_id', paymentTransactionId)
    .maybeSingle()

  if (!isNil(response.error)) {
    return err(response.error.message)
  }

  // Extract the deposit from the joined data
  const depositData = response.data as unknown as {
    deposit_id: string
    deposits: DepositRow
  } | null

  return ok(depositData?.deposits ?? null)
}
