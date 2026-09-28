import { randomUUID } from 'node:crypto'
import type { APIRequestContext, APIResponse } from '@playwright/test'
import { isNil } from 'lodash'
import Stripe from 'stripe'
import {
  buildCheckoutMetadata,
  type CheckoutMetadataQuote,
} from '@/lib/payments/checkout-metadata'
import type { CheckoutTarget } from '@/lib/payments/checkout-price'

/**
 * FR-4.2: synthetic, signed `checkout.session.completed` events for the
 * webhook at /api/webhooks/stripe. No Stripe account is involved: the event is
 * built here, signed with the shared STRIPE_WEBHOOK_SECRET, and POSTed raw.
 *
 * The metadata comes from `buildCheckoutMetadata`, the same function
 * `beginCheckout` (actions/checkout.ts) uses, so a renamed key breaks this
 * suite rather than production. The quote is passed in by the spec, built from
 * personas.json and the seeded rows, because `getCheckoutQuote` lives behind
 * `server-only` and cannot be imported into the Playwright process.
 */

// Only used for its offline signing helper; never makes a request.
const stripe = new Stripe('sk_test_e2e_dummy')

const WEBHOOK_PATH = '/api/webhooks/stripe'

function shortId(): string {
  return randomUUID().replaceAll('-', '').slice(0, 24)
}

function webhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (isNil(secret) || secret === '') {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET is not set. The payments specs sign their webhook ' +
        'events with it, and it must match the dev server value (see ' +
        'docs/e2e-testing.md)'
    )
  }
  return secret
}

export type SignedCheckoutCompletedInput = {
  target: CheckoutTarget
  quote: CheckoutMetadataQuote
  /** The signed-in team member's email; recorded as `user_email`. */
  userEmail?: string | null
  /** What Stripe charged, in integer cents. */
  amountTotalCents: number
  customerEmail: string | null
}

export type SignedEvent = {
  /** The exact bytes that were signed; POST them unchanged. */
  payload: string
  signature: string
  paymentIntentId: string
  eventId: string
}

/** Signs a payload the way Stripe does, with any secret. */
export function signWithSecret(payload: string, secret: string): string {
  return stripe.webhooks.generateTestHeaderString({ payload, secret })
}

/**
 * Builds and signs a minimal `checkout.session.completed` event carrying the
 * fields the handler reads (`payment_intent`, `amount_total`, `metadata`).
 * Every call gets fresh `cs_test_e2e_`, `pi_e2e_` and `evt_e2e_` ids; cleanup
 * in ./payments.ts keys on the `pi_e2e_` prefix.
 */
export function signedCheckoutCompleted({
  target,
  quote,
  userEmail,
  amountTotalCents,
  customerEmail,
}: SignedCheckoutCompletedInput): SignedEvent {
  const created = Math.floor(Date.now() / 1000)
  const paymentIntentId = `pi_e2e_${shortId()}`
  const eventId = `evt_e2e_${shortId()}`

  const session = {
    id: `cs_test_e2e_${shortId()}`,
    object: 'checkout.session',
    payment_intent: paymentIntentId,
    payment_status: 'paid',
    status: 'complete',
    mode: 'payment',
    amount_total: amountTotalCents,
    currency: 'usd',
    customer_details: { email: customerEmail },
    metadata: buildCheckoutMetadata(target, quote, { userEmail }),
    livemode: false,
    created,
  } as unknown as Stripe.Checkout.Session

  const event = {
    id: eventId,
    object: 'event',
    type: 'checkout.session.completed',
    created,
    livemode: false,
    // The version the installed stripe-node pins (Stripe.API_VERSION).
    api_version: Stripe.API_VERSION,
    data: { object: session },
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
  } as unknown as Stripe.CheckoutSessionCompletedEvent

  const payload = JSON.stringify(event)
  return {
    payload,
    signature: signWithSecret(payload, webhookSecret()),
    paymentIntentId,
    eventId,
  }
}

/**
 * POSTs a raw payload to the webhook. The body is sent as the string itself so
 * its bytes match what was signed. Omit `signature` to send no header.
 */
export function postWebhook(
  request: APIRequestContext,
  { payload, signature }: { payload: string; signature?: string }
): Promise<APIResponse> {
  return request.post(WEBHOOK_PATH, {
    data: payload,
    headers: {
      'content-type': 'application/json',
      ...(isNil(signature) ? {} : { 'stripe-signature': signature }),
    },
  })
}
