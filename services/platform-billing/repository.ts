import 'server-only'

import { isNil } from 'lodash'
import type { Result } from '@/lib/results'
import { err, ok } from '@/lib/results'
import type { DbClient } from '@/lib/supabase/server'
import type {
  BillingAccountPatch,
  RawBillingAccount,
  WebhookEventOutcome,
} from './types'

/**
 * Data access for the platform billing mirror. Reads take whichever client the
 * caller chose (the session client so RLS enforces MANAGE_BILLING on the
 * Billing page; the admin client from the webhook and the actions). Writes
 * always take the admin client: the tables have no write policies at all.
 */

/** Postgres unique_violation. */
const UNIQUE_VIOLATION = '23505'

/**
 * The community's single billing account (one row until the multitenancy
 * retrofit). Null when the row is missing or RLS hides it.
 */
export async function getBillingAccount(
  client: DbClient
): Promise<Result<string, RawBillingAccount | null>> {
  const { data, error } = await client
    .from('billing_account')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!isNil(error)) return err(error.message)
  return ok(data)
}

export async function findBillingAccountBySubscriptionId(
  adminClient: DbClient,
  stripeSubscriptionId: string
): Promise<Result<string, RawBillingAccount | null>> {
  const { data, error } = await adminClient
    .from('billing_account')
    .select('*')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .maybeSingle()

  if (!isNil(error)) return err(error.message)
  return ok(data)
}

export async function findBillingAccountByCustomerId(
  adminClient: DbClient,
  stripeCustomerId: string
): Promise<Result<string, RawBillingAccount | null>> {
  const { data, error } = await adminClient
    .from('billing_account')
    .select('*')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle()

  if (!isNil(error)) return err(error.message)
  return ok(data)
}

export async function findBillingAccountById(
  adminClient: DbClient,
  id: string
): Promise<Result<string, RawBillingAccount | null>> {
  const { data, error } = await adminClient
    .from('billing_account')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!isNil(error)) return err(error.message)
  return ok(data)
}

/** Applies a patch and stamps `updated_at`. Returns the row as written. */
export async function updateBillingAccount(
  adminClient: DbClient,
  id: string,
  patch: BillingAccountPatch
): Promise<Result<string, RawBillingAccount>> {
  const { data, error } = await adminClient
    .from('billing_account')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (!isNil(error)) return err(error.message)
  if (isNil(data)) return err(`Billing account ${id} not found`)
  return ok(data)
}

/** Why recording a webhook event failed: a replay, or a real database error. */
export type RecordWebhookEventError = 'duplicate' | { message: string }

/**
 * Claims a Stripe event id before any write to `billing_account`. A primary-key
 * conflict is the replay signal (`'duplicate'`), not a failure.
 */
export async function recordWebhookEvent(
  adminClient: DbClient,
  event: { id: string; type: string },
  outcome: WebhookEventOutcome
): Promise<Result<RecordWebhookEventError, void>> {
  const { error } = await adminClient.from('billing_webhook_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    outcome,
  })

  if (isNil(error)) return ok(undefined)
  if (error.code === UNIQUE_VIOLATION) return err('duplicate')
  return err({ message: error.message })
}

/**
 * Gives an event id back after a write that followed it failed, so Stripe's
 * retry of the same event is processed instead of being treated as a replay.
 */
export async function releaseWebhookEvent(
  adminClient: DbClient,
  eventId: string
): Promise<Result<string, void>> {
  const { error } = await adminClient
    .from('billing_webhook_events')
    .delete()
    .eq('stripe_event_id', eventId)

  if (!isNil(error)) return err(error.message)
  return ok(undefined)
}
