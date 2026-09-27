import type { Page } from '@playwright/test'
import { Errors } from '@/lib/error'
import {
  candidatePayerName,
  candidateStatus,
  expect,
  livePaymentsFor,
  paymentRows,
  test,
} from './fixtures/payments'
import {
  readPersonas,
  type CandidatePersona,
  type Personas,
} from './fixtures/personas'
import {
  postWebhook,
  signedCheckoutCompleted,
  signWithSecret,
  type SignedEvent,
} from './fixtures/stripe-events'

/**
 * FR-4.4, FR-4.5, FR-4.6 and FR-4.7 for the candidate fee, logged out: the
 * candidate-fee page is public. Payments are synthetic signed webhooks; the
 * candidates are the seeded `awaiting_payment` ones (S4). Each test that pays
 * registers its candidate with `restoreCandidate` before posting, so the
 * fixture sets them back to `awaiting_payment` and deletes the pi_e2e_ rows.
 *
 * Not serial: every test stands alone, so one failure does not skip the rest.
 */

test.use({ storageState: { cookies: [], origins: [] } })

// The codes from services/stripe/handlers/types.ts (WebhookErrorCodes), which
// is server-only and cannot be imported here.
const MISSING_SIGNATURE = 'MISSING_SIGNATURE'
const INVALID_SIGNATURE = 'INVALID_SIGNATURE'

let personas: Personas

test.beforeAll(() => {
  personas = readPersonas()
})

/** The page redirects to /home?error=…, and the proxy sends anonymous visitors to /login. */
async function expectLoginRedirectWithError(page: Page, error: Errors) {
  await page.waitForURL(/\/login/)
  const url = new URL(page.url())
  expect(url.pathname).toBe('/login')
  expect(url.searchParams.get('redirectTo')).toContain(`error=${error}`)
}

async function candidateEvent(
  candidate: CandidatePersona,
  amountTotalCents: number
): Promise<SignedEvent> {
  return signedCheckoutCompleted({
    target: { kind: 'candidate', candidateId: candidate.candidateId },
    quote: {
      payerName: await candidatePayerName(candidate.candidateId),
      groupId: personas.group.id,
      userId: null,
    },
    amountTotalCents,
    customerEmail: candidate.email,
  })
}

async function postAndExpect(
  request: Parameters<typeof postWebhook>[0],
  event: SignedEvent,
  processed: boolean
) {
  const started = Date.now()
  const response = await postWebhook(request, event)
  console.info(
    `candidate fee webhook (processed: ${processed}): ${Date.now() - started}ms`
  )
  expect(response.status()).toBe(200)
  expect(await response.json()).toMatchObject({ received: true, processed })
}

test('the candidate fee page without a candidate id ends on sign in with MISSING_CANDIDATE_ID', async ({
  page,
}) => {
  await page.goto('/payment/candidate-fee')
  await expectLoginRedirectWithError(page, Errors.MISSING_CANDIDATE_ID)
})

test('the candidate fee page renders for a candidate awaiting payment', async ({
  page,
}) => {
  const path = `/payment/candidate-fee?candidate_id=${personas.candidates.full.candidateId}`
  await page.goto(path)

  // The page is only the PublicCheckout shell. With the dummy Stripe key
  // beginCheckout fails, so it shows "Something went wrong" rather than
  // #checkout-container; the spec asserts the shell, not the checkout.
  await expect(page.locator('.payment-page')).toBeVisible()
  const url = new URL(page.url())
  expect(`${url.pathname}${url.search}`).toBe(path)
})

test('a signed checkout event confirms the candidate once, and a replay records nothing', async ({
  page,
  request,
  restoreCandidate,
}) => {
  test.setTimeout(90_000)
  const candidate = personas.candidates.full
  const expectedTotal = candidate.fee + candidate.surcharge
  restoreCandidate(candidate.candidateId)

  const event = await candidateEvent(candidate, expectedTotal * 100)

  await test.step('the webhook accepts and processes the event', async () => {
    await postAndExpect(request, event, true)
  })

  await test.step('the candidate is confirmed with one payment row', async () => {
    expect(await candidateStatus(candidate.candidateId)).toBe('confirmed')
    const rows = await paymentRows(candidate.candidateId)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      payment_intent_id: event.paymentIntentId,
      target_type: 'candidate',
      target_id: candidate.candidateId,
      payment_method: 'stripe',
    })
    expect(Number(rows[0].gross_amount)).toBe(expectedTotal)
  })

  await test.step('replaying the identical event records nothing', async () => {
    await postAndExpect(request, event, false)
    expect(await paymentRows(candidate.candidateId)).toHaveLength(1)
    expect(await candidateStatus(candidate.candidateId)).toBe('confirmed')
  })

  await test.step('revisiting the page reports the fee already paid', async () => {
    await page.goto(
      `/payment/candidate-fee?candidate_id=${candidate.candidateId}`
    )
    await expectLoginRedirectWithError(page, Errors.CANDIDATE_FEES_ALREADY_PAID)
  })
})

test('a partly paid candidate is confirmed by paying the remainder', async ({
  request,
  restoreCandidate,
}) => {
  test.setTimeout(90_000)
  const candidate = personas.candidates.partial
  const remainder = candidate.fee - candidate.covered + candidate.surcharge
  restoreCandidate(candidate.candidateId)

  const event = await candidateEvent(candidate, remainder * 100)
  await postAndExpect(request, event, true)

  expect(await candidateStatus(candidate.candidateId)).toBe('confirmed')
  expect(await livePaymentsFor(candidate.candidateId)).toBe(
    candidate.fee + candidate.surcharge
  )
})

test('the webhook rejects a missing or wrong signature', async ({
  request,
  restoreCandidate,
}) => {
  const candidate = personas.candidates.full
  const expectedTotal = candidate.fee + candidate.surcharge
  // Nothing should be recorded, but restore anyway if something is.
  restoreCandidate(candidate.candidateId)
  const event = await candidateEvent(candidate, expectedTotal * 100)

  const unsigned = await postWebhook(request, { payload: event.payload })
  expect(unsigned.status()).toBe(400)
  expect(await unsigned.json()).toMatchObject({ code: MISSING_SIGNATURE })

  const wronglySigned = await postWebhook(request, {
    payload: event.payload,
    signature: signWithSecret(event.payload, 'whsec_wrong'),
  })
  expect(wronglySigned.status()).toBe(400)
  expect(await wronglySigned.json()).toMatchObject({ code: INVALID_SIGNATURE })

  expect(await paymentRows(candidate.candidateId)).toHaveLength(0)
  expect(await candidateStatus(candidate.candidateId)).toBe('awaiting_payment')
})
