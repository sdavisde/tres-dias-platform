import 'server-only'

import { isNil } from 'lodash'
import type Stripe from 'stripe'
import type { Result } from '@/lib/results'
import { ok } from '@/lib/results'
import { logger } from '@/lib/logger'
import { checkoutSessionCompletedHandler } from './checkout-session-completed'
import { chargeUpdatedHandler } from './charge-updated'
import { payoutPaidHandler } from './payout-paid'
import type { WebhookHandler, WebhookError, HandlerSuccess } from './types'
import { WebhookHandlerContext, WebhookErrorCodes } from './types'
import { webhookErr, createHandlerContext } from '../webhook-context'

// Handler registry - maps event types to their handlers
const handlers = new Map<string, WebhookHandler<Stripe.Event>>([
  [
    checkoutSessionCompletedHandler.eventType,
    checkoutSessionCompletedHandler as WebhookHandler<Stripe.Event>,
  ],
  [
    chargeUpdatedHandler.eventType,
    chargeUpdatedHandler as WebhookHandler<Stripe.Event>,
  ],
  [
    payoutPaidHandler.eventType,
    payoutPaidHandler as WebhookHandler<Stripe.Event>,
  ],
])

/**
 * Routes a Stripe webhook event to the appropriate handler.
 *
 * @param event - The Stripe event to process
 * @returns Result with handler success or error
 */
export async function routeWebhookEvent(
  event: Stripe.Event
): Promise<Result<WebhookError, HandlerSuccess>> {
  const handler = handlers.get(event.type)

  if (isNil(handler)) {
    logger.info(
      { eventType: event.type, eventId: event.id },
      `No handler for event type: ${event.type}`
    )
    // Unsupported events are not errors - just return not processed
    return ok({ processed: false })
  }

  // Create handler context with payment context
  const ctx = createHandlerContext({
    eventId: event.id,
    eventType: event.type,
  })

  logger.info(
    { eventType: event.type, eventId: event.id },
    `Routing event to handler: ${handler.eventType}`
  )

  return handler.handle(event, ctx)
}

// Re-export types
export * from './types'

// Re-export individual handlers for testing
export { checkoutSessionCompletedHandler } from './checkout-session-completed'
export { chargeUpdatedHandler } from './charge-updated'
export { payoutPaidHandler } from './payout-paid'
