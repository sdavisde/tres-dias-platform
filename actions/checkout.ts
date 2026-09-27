'use server'

import { isNil } from 'lodash'
import { stripe } from '@/lib/stripe'
import { logger } from '@/lib/logger'
import type { Result } from '@/lib/results'
import { err, isErr, ok } from '@/lib/results'
import {
  CHECKOUT_REFUSAL_MESSAGES,
  toStripeAmount,
  type CheckoutTarget,
} from '@/lib/payments/checkout-price'
import { buildCheckoutMetadata } from '@/lib/payments/checkout-metadata'
import { getLoggedInUser } from '@/services/identity/user'
import {
  getCheckoutQuote,
  resolveFeeProductId,
} from '@/services/payment/payment-service'

const GENERIC_ERROR =
  "We couldn't start the payment. Please try again, or contact the community if it keeps happening."

/**
 * Begins an embedded Stripe checkout for a fee. The amount comes from the
 * payer's weekend group on the server — the browser only says who the
 * payment is for.
 *
 * Returns an error message safe to show the payer when checkout can't start
 * (thrown messages are hidden from the browser in production).
 *
 * @param target Who the payment is for: a candidate, or a team member
 * @param returnUrl Where Stripe returns to; may contain {CHECKOUT_SESSION_ID}
 * @returns The client secret for the checkout session
 */
export async function beginCheckout(
  target: CheckoutTarget,
  returnUrl: string
): Promise<Result<string, string>> {
  const quoteResult = await getCheckoutQuote(target)
  if (isErr(quoteResult)) {
    logger.error({ target, error: quoteResult.error }, 'Checkout quote failed')
    return err(GENERIC_ERROR)
  }
  const quote = quoteResult.data
  const feeType = target.kind

  if (isErr(quote.price)) {
    return err(CHECKOUT_REFUSAL_MESSAGES[feeType][quote.price.error])
  }
  const price = quote.price.data

  // A team fee is paid by the team member themselves, signed in.
  let userEmail: string | null = null
  if (target.kind === 'team') {
    const userResult = await getLoggedInUser()
    if (isErr(userResult) || isNil(userResult.data)) {
      return err('Please sign in to pay your team fee.')
    }
    const user = userResult.data
    if (user.id !== quote.userId) {
      logger.warn(
        { groupMemberId: target.groupMemberId, userId: user.id },
        'Team fee checkout attempted for another member'
      )
      return err(GENERIC_ERROR)
    }
    userEmail = user.email ?? null
  }

  const productResult = resolveFeeProductId(feeType)
  if (isErr(productResult)) {
    logger.error(
      { feeType, error: productResult.error },
      'Checkout product missing'
    )
    return err(GENERIC_ERROR)
  }

  // The webhook reads these keys back; see lib/payments/checkout-metadata.ts.
  const metadata = buildCheckoutMetadata(target, quote, { userEmail })

  let session
  try {
    session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product: productResult.data,
            unit_amount: toStripeAmount(price.chargeAmount),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata,
      payment_intent_data: {
        metadata,
      },
      return_url: returnUrl,
    })
  } catch (error) {
    logger.error({ target, error }, 'Stripe checkout session creation failed')
    return err(GENERIC_ERROR)
  }

  if (isNil(session.client_secret)) {
    return err(GENERIC_ERROR)
  }

  return ok(session.client_secret)
}
