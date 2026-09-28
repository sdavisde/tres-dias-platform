import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import type Stripe from 'stripe'
import { isNil } from 'lodash'
import { logger } from '@/lib/logger'
import { isErr } from '@/lib/results'
import {
  getPlatformStripe,
  getPlatformWebhookSecret,
} from '@/lib/platform-stripe'
import { WebhookErrorCodes } from '@/services/stripe/handlers/types'
import {
  withWebhookScope,
  reportWebhookError,
  logWebhookSuccess,
} from '@/services/stripe/webhook-context'
import { routePlatformBillingEvent } from '@/services/platform-billing/webhook/handlers'

/**
 * Webhook endpoint for the PLATFORM Stripe account: the one that bills the
 * community its monthly subscription. Events from the community's own Stripe
 * account (fee payments) go to /api/webhooks/stripe and must never be pointed
 * here, and vice versa.
 *
 * Handles:
 * - checkout.session.completed (subscription mode only)
 * - customer.subscription.created / updated / deleted
 * - invoice.paid / invoice.payment_failed
 *
 * This deliberately duplicates the shape of app/(public)/api/webhooks/stripe/
 * route.ts rather than sharing a helper: extracting one would have meant
 * touching the fee webhook, whose behaviour must not change. The differences
 * are the Stripe client, the secret, the not-configured log level, and the
 * revalidation of the Billing page after a successful write.
 */
export async function POST(request: NextRequest) {
  const webhookSecret = getPlatformWebhookSecret()
  const stripeResult = getPlatformStripe()

  if (isNil(webhookSecret) || isErr(stripeResult)) {
    // Expected on local and preview deployments without platform keys, so a
    // warning (not an error) keeps Sentry quiet.
    logger.warn(
      'Platform billing webhook received but PLATFORM_STRIPE_WEBHOOK_SECRET / PLATFORM_STRIPE_SECRET_KEY are not configured'
    )
    return NextResponse.json(
      {
        error: 'Webhook not configured',
        code: WebhookErrorCodes.WEBHOOK_NOT_CONFIGURED,
      },
      { status: 500 }
    )
  }
  const stripe = stripeResult.data

  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (isNil(signature)) {
      // Scanners and probes hit public URLs without a signature; that is
      // expected noise, not a fault, so it must not become a Sentry event.
      logger.warn(
        'Missing Stripe signature in platform billing webhook request'
      )
      return NextResponse.json(
        {
          error: 'Missing signature',
          code: WebhookErrorCodes.MISSING_SIGNATURE,
        },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      logger.warn(err, 'Platform billing webhook signature verification failed')
      return NextResponse.json(
        {
          error: 'Invalid signature',
          code: WebhookErrorCodes.INVALID_SIGNATURE,
        },
        { status: 400 }
      )
    }

    const paymentContext = {
      eventId: event.id,
      eventType: event.type,
    }

    const result = await withWebhookScope(paymentContext, () =>
      routePlatformBillingEvent(event)
    )

    if (isErr(result)) {
      const error = result.error
      reportWebhookError(error)

      // warning: acknowledged (200), a retry could not help.
      // error / fatal: 400 so Stripe retries.
      const status = error.severity === 'warning' ? 200 : 400

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          stage: error.stage,
        },
        { status }
      )
    }

    logWebhookSuccess(result.data, paymentContext)

    if (result.data.processed) {
      // The Billing page and the dashboard alert both read the mirror.
      revalidatePath('/admin/billing')
      revalidatePath('/admin')
    }

    return NextResponse.json({
      received: true,
      processed: result.data.processed,
      entityType: result.data.entityType,
      entityId: result.data.entityId,
    })
  } catch (error) {
    logger.error(error, 'Platform billing webhook processing error')
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        code: WebhookErrorCodes.PROCESSING_ERROR,
      },
      { status: 500 }
    )
  }
}
