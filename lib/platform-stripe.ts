import 'server-only'

import Stripe from 'stripe'
import { isNil } from 'lodash'
import type { Result } from '@/lib/results'
import { err, ok } from '@/lib/results'

/**
 * The platform's own Stripe account: the one that bills the community its
 * monthly subscription. It is a different account from `lib/stripe.ts`, which
 * is the community's account that collects candidate and team fees — a Stripe
 * account cannot charge itself, so the two never share keys.
 *
 * Unlike `lib/stripe.ts`, nothing here throws at import time: local and preview
 * deployments routinely run without platform keys and must degrade to a clear
 * "not set up on this deployment" state instead of crashing.
 */

/** The API version stripe-node 18.x pins; kept explicit so a bump is a diff. */
export const PLATFORM_STRIPE_API_VERSION: Stripe.LatestApiVersion =
  '2025-08-27.basil'

let client: Stripe | null = null

function isSet(value: string | undefined): value is string {
  return !isNil(value) && value !== ''
}

/**
 * Lazily constructs and memoises the platform Stripe client. Returns `err`
 * with a developer-facing message when `PLATFORM_STRIPE_SECRET_KEY` is
 * missing; callers turn that into the not-configured state.
 */
export function getPlatformStripe(): Result<string, Stripe> {
  if (!isNil(client)) return ok(client)

  const key = process.env.PLATFORM_STRIPE_SECRET_KEY
  if (!isSet(key)) {
    return err('PLATFORM_STRIPE_SECRET_KEY is not configured')
  }

  client = new Stripe(key, { apiVersion: PLATFORM_STRIPE_API_VERSION })
  return ok(client)
}

/** The Price the subscription is sold under, or null when not configured. */
export function getPlatformPriceId(): string | null {
  const priceId = process.env.PLATFORM_STRIPE_PRICE_ID
  return isSet(priceId) ? priceId : null
}

/** The signing secret of the platform webhook endpoint, or null. */
export function getPlatformWebhookSecret(): string | null {
  const secret = process.env.PLATFORM_STRIPE_WEBHOOK_SECRET
  return isSet(secret) ? secret : null
}

/**
 * True when every platform billing variable is present. The Billing page and
 * its actions treat anything less as "not set up on this deployment".
 */
export function isPlatformBillingConfigured(): boolean {
  return (
    isSet(process.env.PLATFORM_STRIPE_SECRET_KEY) &&
    isSet(process.env.PLATFORM_STRIPE_WEBHOOK_SECRET) &&
    isSet(process.env.PLATFORM_STRIPE_PRICE_ID)
  )
}
