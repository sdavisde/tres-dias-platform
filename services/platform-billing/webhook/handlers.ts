import 'server-only'

import { isNil } from 'lodash'
import type Stripe from 'stripe'
import type { Result } from '@/lib/results'
import { isErr, ok } from '@/lib/results'
import { logger } from '@/lib/logger'
import type {
  HandlerSuccess,
  WebhookError,
  WebhookHandler,
  WebhookHandlerContext,
} from '@/services/stripe/handlers/types'
import { WebhookErrorCodes } from '@/services/stripe/handlers/types'
import {
  createHandlerContext,
  webhookErr,
} from '@/services/stripe/webhook-context'
import * as BillingRepository from '../repository'
import {
  applySubscriptionEvent,
  locateBillingAccount,
  snapshotFromSubscription,
  syncSubscription,
  toBillingAccount,
} from '../platform-billing-service'
import type { RawBillingAccount, WebhookEventOutcome } from '../types'

/**
 * Handlers for the PLATFORM Stripe account's webhook
 * (/api/webhooks/platform-billing). They reuse the existing webhook plumbing
 * (`WebhookHandler`, `WebhookError`, Sentry context) but never touch the fee
 * payment handlers in services/stripe/handlers.
 *
 * Idempotency: every handler claims the event id in `billing_webhook_events`
 * BEFORE writing `billing_account`. A primary-key conflict is a replay and is
 * acknowledged (200) without doing anything. If a write after the claim fails,
 * the claim is released so Stripe's retry is processed instead of skipped.
 *
 * Ordering: subscription events carry `event.created`; one older than the
 * newest already applied is recorded as `skipped_stale` and ignored, so
 * out-of-order deliveries converge on the latest state.
 */

type HandlerResult = Promise<Result<WebhookError, HandlerSuccess>>

const REPLAY: HandlerSuccess = { processed: false, details: { replay: true } }

/**
 * Claims the event. `ok(true)` means proceed, `ok(false)` means replay.
 * A database error is severity `error` (400) so Stripe retries.
 */
async function claimEvent(
  event: Stripe.Event,
  outcome: WebhookEventOutcome,
  ctx: WebhookHandlerContext
): Promise<Result<WebhookError, boolean>> {
  const claim = await BillingRepository.recordWebhookEvent(
    ctx.adminClient,
    event,
    outcome
  )
  if (isErr(claim)) {
    if (claim.error === 'duplicate') {
      logger.info(
        { eventId: event.id, eventType: event.type },
        'Replayed platform billing event; already handled'
      )
      return ok(false)
    }
    return webhookErr(
      WebhookErrorCodes.PROCESSING_ERROR,
      `Failed to record webhook event: ${claim.error.message}`,
      'database_lookup',
      'error',
      ctx.paymentContext
    )
  }
  return ok(true)
}

/** Undoes a claim after a failed write so the retry is not treated as a replay. */
async function releaseClaim(event: Stripe.Event, ctx: WebhookHandlerContext) {
  const released = await BillingRepository.releaseWebhookEvent(
    ctx.adminClient,
    event.id
  )
  if (isErr(released)) {
    logger.error(
      { eventId: event.id, error: released.error },
      'Failed to release a platform billing event claim after a write error'
    )
  }
}

function notFound(
  what: string,
  ctx: WebhookHandlerContext
): Result<WebhookError, never> {
  // A retry cannot conjure the account, so this is a warning (200).
  return webhookErr(
    WebhookErrorCodes.BILLING_ACCOUNT_NOT_FOUND,
    `No billing account matches ${what}`,
    'database_lookup',
    'warning',
    ctx.paymentContext
  )
}

// ---------------------------------------------------------------------------
// checkout.session.completed
// ---------------------------------------------------------------------------

export const billingCheckoutCompletedHandler: WebhookHandler<Stripe.CheckoutSessionCompletedEvent> =
  {
    eventType: 'checkout.session.completed',
    handle: async (event, ctx) => {
      const session = event.data.object

      if (session.mode !== 'subscription') {
        // A payment-mode session on this endpoint can only be a misrouted fee
        // checkout. Not an error: record it and move on.
        logger.warn(
          { sessionId: session.id, mode: session.mode },
          'Non-subscription checkout session on the platform billing webhook; ignoring'
        )
        const claimed = await claimEvent(event, 'ignored', ctx)
        if (isErr(claimed)) return claimed
        return ok(
          claimed.data
            ? { processed: false, details: { mode: session.mode } }
            : REPLAY
        )
      }

      const customerId =
        typeof session.customer === 'string'
          ? session.customer
          : (session.customer?.id ?? null)
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : (session.subscription?.id ?? null)

      if (isNil(subscriptionId)) {
        return webhookErr(
          WebhookErrorCodes.BILLING_SYNC_FAILED,
          'Subscription checkout session has no subscription',
          'validation',
          'warning',
          ctx.paymentContext
        )
      }

      const accountResult = await locateBillingAccount(ctx.adminClient, {
        billingAccountId:
          session.metadata?.billing_account_id ?? session.client_reference_id,
        subscriptionId,
        customerId,
      })
      if (isErr(accountResult)) {
        return webhookErr(
          WebhookErrorCodes.PROCESSING_ERROR,
          `Failed to look up billing account: ${accountResult.error}`,
          'database_lookup',
          'error',
          ctx.paymentContext
        )
      }
      if (isNil(accountResult.data)) {
        return notFound(`checkout session ${session.id}`, ctx)
      }
      const account = accountResult.data

      const claimed = await claimEvent(event, 'applied', ctx)
      if (isErr(claimed)) return claimed
      if (!claimed.data) return ok(REPLAY)

      const stored = await BillingRepository.updateBillingAccount(
        ctx.adminClient,
        account.id,
        {
          stripe_customer_id: customerId ?? account.stripe_customer_id,
          stripe_subscription_id: subscriptionId,
        }
      )
      if (isErr(stored)) {
        await releaseClaim(event, ctx)
        return webhookErr(
          WebhookErrorCodes.BILLING_SYNC_FAILED,
          `Failed to store checkout result: ${stored.error}`,
          'billing_sync',
          'error',
          ctx.paymentContext
        )
      }

      // The live subscription read fills in status, period and price. A
      // failure here is retryable, so release the claim and ask for a retry.
      const synced = await syncSubscription(ctx.adminClient, subscriptionId)
      if (isErr(synced)) {
        await releaseClaim(event, ctx)
        return webhookErr(
          WebhookErrorCodes.BILLING_SYNC_FAILED,
          synced.error,
          'billing_sync',
          'error',
          ctx.paymentContext
        )
      }

      logger.info(
        { billingAccountId: account.id, subscriptionId },
        'Platform subscription checkout completed'
      )
      return ok({
        processed: true,
        entityType: 'billing_account',
        entityId: account.id,
        details: { subscriptionId, status: synced.data.status },
      })
    },
  }

// ---------------------------------------------------------------------------
// customer.subscription.created / updated / deleted
// ---------------------------------------------------------------------------

type SubscriptionEvent =
  | Stripe.CustomerSubscriptionCreatedEvent
  | Stripe.CustomerSubscriptionUpdatedEvent
  | Stripe.CustomerSubscriptionDeletedEvent

async function handleSubscriptionEvent(
  event: SubscriptionEvent,
  ctx: WebhookHandlerContext
): HandlerResult {
  const subscription = event.data.object
  const snapshot = snapshotFromSubscription(subscription)

  const accountResult = await locateBillingAccount(ctx.adminClient, {
    billingAccountId: subscription.metadata?.billing_account_id,
    subscriptionId: snapshot.stripeSubscriptionId,
    customerId: snapshot.stripeCustomerId,
  })
  if (isErr(accountResult)) {
    return webhookErr(
      WebhookErrorCodes.PROCESSING_ERROR,
      `Failed to look up billing account: ${accountResult.error}`,
      'database_lookup',
      'error',
      ctx.paymentContext
    )
  }
  if (isNil(accountResult.data)) {
    return notFound(`subscription ${snapshot.stripeSubscriptionId}`, ctx)
  }
  const account: RawBillingAccount = accountResult.data

  const outcome = applySubscriptionEvent(
    toBillingAccount(account),
    snapshot,
    event.created
  )

  if (outcome.kind === 'stale') {
    logger.info(
      {
        eventId: event.id,
        eventCreated: event.created,
        lastEventCreated: account.last_event_created,
      },
      'Stale platform subscription event; skipping'
    )
    const claimed = await claimEvent(event, 'skipped_stale', ctx)
    if (isErr(claimed)) return claimed
    return ok(
      claimed.data
        ? {
            processed: false,
            entityType: 'billing_account',
            entityId: account.id,
            details: { stale: true },
          }
        : REPLAY
    )
  }

  const claimed = await claimEvent(event, 'applied', ctx)
  if (isErr(claimed)) return claimed
  if (!claimed.data) return ok(REPLAY)

  const written = await BillingRepository.updateBillingAccount(
    ctx.adminClient,
    account.id,
    outcome.patch
  )
  if (isErr(written)) {
    await releaseClaim(event, ctx)
    return webhookErr(
      WebhookErrorCodes.BILLING_SYNC_FAILED,
      `Failed to write subscription state: ${written.error}`,
      'billing_sync',
      'error',
      ctx.paymentContext
    )
  }

  logger.info(
    {
      billingAccountId: account.id,
      status: snapshot.status,
      eventType: event.type,
    },
    'Platform subscription state updated'
  )
  return ok({
    processed: true,
    entityType: 'billing_account',
    entityId: account.id,
    details: { status: snapshot.status, eventType: event.type },
  })
}

export const billingSubscriptionCreatedHandler: WebhookHandler<Stripe.CustomerSubscriptionCreatedEvent> =
  {
    eventType: 'customer.subscription.created',
    handle: handleSubscriptionEvent,
  }

export const billingSubscriptionUpdatedHandler: WebhookHandler<Stripe.CustomerSubscriptionUpdatedEvent> =
  {
    eventType: 'customer.subscription.updated',
    handle: handleSubscriptionEvent,
  }

export const billingSubscriptionDeletedHandler: WebhookHandler<Stripe.CustomerSubscriptionDeletedEvent> =
  {
    eventType: 'customer.subscription.deleted',
    handle: handleSubscriptionEvent,
  }

// ---------------------------------------------------------------------------
// invoice.paid / invoice.payment_failed
// ---------------------------------------------------------------------------

type InvoiceEvent = Stripe.InvoicePaidEvent | Stripe.InvoicePaymentFailedEvent

/** The subscription an invoice bills, in the basil shape (`invoice.parent`). */
function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const ref = invoice.parent?.subscription_details?.subscription
  if (isNil(ref)) return null
  return typeof ref === 'string' ? ref : (ref.id ?? null)
}

async function handleInvoiceEvent(
  event: InvoiceEvent,
  ctx: WebhookHandlerContext
): HandlerResult {
  const invoice = event.data.object
  const subscriptionId = invoiceSubscriptionId(invoice)
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : (invoice.customer?.id ?? null)

  const accountResult = await locateBillingAccount(ctx.adminClient, {
    billingAccountId:
      invoice.parent?.subscription_details?.metadata?.billing_account_id,
    subscriptionId,
    customerId,
  })
  if (isErr(accountResult)) {
    return webhookErr(
      WebhookErrorCodes.PROCESSING_ERROR,
      `Failed to look up billing account: ${accountResult.error}`,
      'database_lookup',
      'error',
      ctx.paymentContext
    )
  }
  if (isNil(accountResult.data)) {
    return notFound(`invoice ${invoice.id ?? '(no id)'}`, ctx)
  }
  const account = accountResult.data

  const claimed = await claimEvent(event, 'applied', ctx)
  if (isErr(claimed)) return claimed
  if (!claimed.data) return ok(REPLAY)

  const written = await BillingRepository.updateBillingAccount(
    ctx.adminClient,
    account.id,
    {
      latest_invoice_id: invoice.id ?? account.latest_invoice_id,
      latest_invoice_status: invoice.status,
    }
  )
  if (isErr(written)) {
    await releaseClaim(event, ctx)
    return webhookErr(
      WebhookErrorCodes.BILLING_SYNC_FAILED,
      `Failed to record invoice status: ${written.error}`,
      'billing_sync',
      'error',
      ctx.paymentContext
    )
  }

  // The subscription's own status (active ↔ past_due) is what the page shows,
  // so refresh it — but the invoice update above stands even if Stripe cannot
  // be reached (a CI run with dummy keys must still pass).
  let subscriptionRefreshed = false
  if (!isNil(subscriptionId)) {
    const synced = await syncSubscription(ctx.adminClient, subscriptionId)
    if (isErr(synced)) {
      logger.warn(
        { subscriptionId, error: synced.error },
        'Invoice recorded but the subscription could not be refreshed from Stripe'
      )
    } else {
      subscriptionRefreshed = true
    }
  }

  logger.info(
    {
      billingAccountId: account.id,
      invoiceId: invoice.id,
      invoiceStatus: invoice.status,
      eventType: event.type,
    },
    'Platform invoice event recorded'
  )
  return ok({
    processed: true,
    entityType: 'billing_account',
    entityId: account.id,
    details: {
      invoiceId: invoice.id,
      invoiceStatus: invoice.status,
      subscriptionRefreshed,
    },
  })
}

export const billingInvoicePaidHandler: WebhookHandler<Stripe.InvoicePaidEvent> =
  {
    eventType: 'invoice.paid',
    handle: handleInvoiceEvent,
  }

export const billingInvoicePaymentFailedHandler: WebhookHandler<Stripe.InvoicePaymentFailedEvent> =
  {
    eventType: 'invoice.payment_failed',
    handle: handleInvoiceEvent,
  }

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const handlers = new Map<string, WebhookHandler<Stripe.Event>>(
  [
    billingCheckoutCompletedHandler,
    billingSubscriptionCreatedHandler,
    billingSubscriptionUpdatedHandler,
    billingSubscriptionDeletedHandler,
    billingInvoicePaidHandler,
    billingInvoicePaymentFailedHandler,
  ].map((handler) => [
    handler.eventType,
    handler as WebhookHandler<Stripe.Event>,
  ])
)

/** The event types the platform webhook endpoint should be subscribed to. */
export function getPlatformBillingEventTypes(): string[] {
  return Array.from(handlers.keys())
}

/**
 * Routes a platform Stripe event to its handler. Unknown event types are
 * acknowledged and not processed, like the fee webhook.
 */
export async function routePlatformBillingEvent(
  event: Stripe.Event
): Promise<Result<WebhookError, HandlerSuccess>> {
  const handler = handlers.get(event.type)

  if (isNil(handler)) {
    logger.info(
      { eventType: event.type, eventId: event.id },
      `No platform billing handler for event type: ${event.type}`
    )
    return ok({ processed: false })
  }

  const ctx = createHandlerContext({
    eventId: event.id,
    eventType: event.type,
  })

  logger.info(
    { eventType: event.type, eventId: event.id },
    `Routing platform billing event to handler: ${handler.eventType}`
  )

  return handler.handle(event, ctx)
}
