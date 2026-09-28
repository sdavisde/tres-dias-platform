import 'server-only'

import type Stripe from 'stripe'
import type { Result } from '@/lib/results'
import type { createAdminClient } from '@/lib/supabase/server'

/**
 * Context for tracking payment-related information in webhook processing.
 * Used for Sentry tagging and error context.
 */
export type WebhookPaymentContext = {
  eventId: string
  eventType: string
  paymentIntentId?: string
  chargeId?: string
  candidateId?: string
  userId?: string
  weekendId?: string
  weekendRosterId?: string
  amount?: number
}

/**
 * Stages of webhook processing for error tracking.
 */
export type ProcessingStage =
  | 'signature_verification'
  | 'event_parsing'
  | 'validation'
  | 'database_lookup'
  | 'payment_recording'
  | 'status_update'
  | 'notification'
  | 'fee_backfill'
  | 'payout_processing'
  | 'billing_sync'

/**
 * Structured webhook error with context for Sentry reporting.
 */
export type WebhookError = {
  message: string
  code: string
  stage: ProcessingStage
  severity: 'warning' | 'error' | 'fatal'
  context: Partial<WebhookPaymentContext>
  cause?: unknown
}

/**
 * Successful handler result.
 */
export type HandlerSuccess = {
  processed: boolean
  entityType?:
    | 'candidate_payment'
    | 'team_payment'
    | 'payout'
    | 'fee_backfill'
    | 'billing_account'
  entityId?: string | number
  /** Additional details for logging */
  details?: Record<string, unknown>
}

/**
 * Context passed to webhook handlers.
 */
export type WebhookHandlerContext = {
  /** Admin Supabase client (bypasses RLS) */
  adminClient: ReturnType<typeof createAdminClient>
  /** Payment context for Sentry */
  paymentContext: WebhookPaymentContext
  /** Update the payment context as processing progresses */
  updateContext: (updates: Partial<WebhookPaymentContext>) => void
}

/**
 * Base type for webhook handlers.
 * Each handler processes a specific Stripe event type.
 */
export type WebhookHandler<T extends Stripe.Event = Stripe.Event> = {
  /** The Stripe event type this handler processes (e.g., 'checkout.session.completed') */
  eventType: string
  /** Process the event and return a Result */
  handle: (
    event: T,
    ctx: WebhookHandlerContext
  ) => Promise<Result<WebhookError, HandlerSuccess>>
}

/**
 * Error codes for structured error handling.
 */
export const WebhookErrorCodes = {
  // Signature & parsing errors
  MISSING_SIGNATURE: 'MISSING_SIGNATURE',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  EVENT_PARSE_ERROR: 'EVENT_PARSE_ERROR',

  // Validation errors
  MISSING_PAYMENT_INTENT: 'MISSING_PAYMENT_INTENT',
  MISSING_CANDIDATE_ID: 'MISSING_CANDIDATE_ID',
  MISSING_USER_ID: 'MISSING_USER_ID',
  MISSING_WEEKEND_ID: 'MISSING_WEEKEND_ID',

  // Status errors
  CANDIDATE_NOT_AWAITING_PAYMENT: 'CANDIDATE_NOT_AWAITING_PAYMENT',
  CANDIDATE_NOT_FOUND: 'CANDIDATE_NOT_FOUND',
  WEEKEND_ROSTER_NOT_FOUND: 'WEEKEND_ROSTER_NOT_FOUND',
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',

  // Processing errors
  PAYMENT_RECORD_FAILED: 'PAYMENT_RECORD_FAILED',
  STATUS_UPDATE_FAILED: 'STATUS_UPDATE_FAILED',
  FEE_FETCH_FAILED: 'FEE_FETCH_FAILED',
  PAYOUT_RECORD_FAILED: 'PAYOUT_RECORD_FAILED',
  TRANSACTION_FETCH_FAILED: 'TRANSACTION_FETCH_FAILED',

  // Platform billing (services/platform-billing/webhook)
  BILLING_SYNC_FAILED: 'BILLING_SYNC_FAILED',
  BILLING_ACCOUNT_NOT_FOUND: 'BILLING_ACCOUNT_NOT_FOUND',

  // General
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  WEBHOOK_NOT_CONFIGURED: 'WEBHOOK_NOT_CONFIGURED',
  UNSUPPORTED_EVENT: 'UNSUPPORTED_EVENT',
} as const

export type WebhookErrorCode =
  (typeof WebhookErrorCodes)[keyof typeof WebhookErrorCodes]
