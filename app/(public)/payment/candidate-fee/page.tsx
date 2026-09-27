import PublicCheckout from '@/components/public-checkout'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import * as Results from '@/lib/results'
import { getUrl } from '@/lib/url'
import { Errors } from '@/lib/error'
import { isEmpty, isNil } from 'lodash'
import { getCheckoutQuote } from '@/services/payment/payment-service'
import type { CheckoutTarget } from '@/lib/payments/checkout-price'

interface CandidateFeesPaymentPageProps {
  searchParams: Promise<{
    candidate_id?: string
  }>
}

const candidateIdSchema = z.uuid()

/**
 * This page renders a stripe checkout page.
 * Since we accept payment for either candidate fees or team fees,
 * we need to pass the candidate_id to the page.
 *
 * The visitor is usually not logged in, so everything the page needs comes
 * from the admin-backed checkout quote: it validates that the candidate exists
 * and still owes the fee, and who the sponsorship form says is paying.
 * If the candidate is not awaiting payment, the page redirects home with a reason.
 *
 * If the candidate is awaiting payment, the page will render a stripe checkout page.
 *
 */
export default async function CandidateFeesPaymentPage({
  searchParams,
}: CandidateFeesPaymentPageProps) {
  const { candidate_id } = await searchParams

  if (isNil(candidate_id) || isEmpty(candidate_id)) {
    logger.error({
      path: '/payment/candidate-fee',
      error: Errors.MISSING_CANDIDATE_ID,
      msg: 'Payment page accessed without candidate_id',
    })
    redirect(`/home?error=${Errors.MISSING_CANDIDATE_ID}`)
  }

  const parsedId = candidateIdSchema.safeParse(candidate_id)
  if (!parsedId.success) {
    logger.error({
      path: '/payment/candidate-fee',
      candidate_id,
      error: Errors.INVALID_CANDIDATE,
      msg: 'Payment page accessed with a malformed candidate_id',
    })
    redirect(`/home?error=${Errors.INVALID_CANDIDATE}`)
  }

  // The price comes from the candidate's weekend group, worked out on the
  // server along with what's already been paid.
  const target: CheckoutTarget = {
    kind: 'candidate',
    candidateId: parsedId.data,
  }
  const quoteResult = await getCheckoutQuote(target)
  if (Results.isErr(quoteResult)) {
    const notFound = quoteResult.error === 'Candidate not found'
    logger.error({
      path: '/payment/candidate-fee',
      candidate_id,
      error: notFound
        ? Errors.INVALID_CANDIDATE
        : Errors.FAILED_TO_FETCH_CANDIDATE,
      errorMessage: quoteResult.error,
      msg: notFound
        ? 'Candidate not found for payment page'
        : 'Failed to price candidate fee checkout',
    })
    redirect(
      `/home?error=${notFound ? Errors.INVALID_CANDIDATE : Errors.FAILED_TO_FETCH_CANDIDATE}`
    )
  }

  const { price, paymentOwner } = quoteResult.data
  if (Results.isErr(price)) {
    logger.info({
      path: '/payment/candidate-fee',
      candidate_id,
      reason: price.error,
      msg: 'Candidate fee checkout not available',
    })
    redirect(
      `/home?error=${
        price.error === 'already-paid'
          ? Errors.CANDIDATE_FEES_ALREADY_PAID
          : Errors.INVALID_CANDIDATE_STATUS
      }`
    )
  }

  // Validate payment_owner parameter
  if (isNil(paymentOwner) || !['candidate', 'sponsor'].includes(paymentOwner)) {
    logger.error({
      path: '/payment/candidate-fee',
      candidate_id,
      payment_owner: paymentOwner,
      error: Errors.INVALID_PAYMENT_OWNER,
      msg: 'Invalid payment_owner value',
    })
    redirect(`/home?error=${Errors.INVALID_PAYMENT_OWNER}`)
  }

  return (
    <div className="payment-page">
      <PublicCheckout
        target={target}
        returnUrl={getUrl(
          '/payment/candidate-fee/success?session_id={CHECKOUT_SESSION_ID}'
        )}
      />
    </div>
  )
}
