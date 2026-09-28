import 'server-only'

import { isNil } from 'lodash'
import type Stripe from 'stripe'
import type { Result } from '@/lib/results'
import { err, isErr, ok, Results } from '@/lib/results'
import { logger } from '@/lib/logger'
import { getUrl } from '@/lib/url'
import {
  getPlatformPriceId,
  getPlatformStripe,
  isPlatformBillingConfigured,
} from '@/lib/platform-stripe'
import { createClient, type DbClient } from '@/lib/supabase/server'
import { COMMUNITY_DISPLAY_NAME } from '@/lib/weekend/constants'
import { isLiveStatus } from '@/lib/billing/format'
import type { User } from '@/lib/users/types'
import * as BillingRepository from './repository'
import type {
  BillingAccount,
  BillingAccountPatch,
  BillingOverview,
  BillingStatus,
  InvoiceStatus,
  InvoiceSummary,
  PaymentMethodSummary,
  RawBillingAccount,
  SubscriptionSnapshot,
} from './types'
import { BILLING_STATUSES, INVOICE_STATUSES } from './types'

// ---------------------------------------------------------------------------
// Normalisation (pure)
// ---------------------------------------------------------------------------

function asBillingStatus(value: string | null): BillingStatus | null {
  if (isNil(value)) return null
  return (BILLING_STATUSES as readonly string[]).includes(value)
    ? (value as BillingStatus)
    : null
}

function asInvoiceStatus(
  value: string | null | undefined
): InvoiceStatus | null {
  if (isNil(value)) return null
  return (INVOICE_STATUSES as readonly string[]).includes(value)
    ? (value as InvoiceStatus)
    : null
}

/** Stripe epoch seconds → ISO string; null stays null. */
function epochToIso(seconds: number | null | undefined): string | null {
  if (isNil(seconds)) return null
  return new Date(seconds * 1000).toISOString()
}

/** Camel-cases a row for the rest of the app. */
export function toBillingAccount(raw: RawBillingAccount): BillingAccount {
  return {
    id: raw.id,
    communityId: raw.community_id,
    stripeCustomerId: raw.stripe_customer_id,
    stripeSubscriptionId: raw.stripe_subscription_id,
    status: asBillingStatus(raw.status),
    priceId: raw.price_id,
    planAmountCents: raw.plan_amount_cents,
    planInterval: raw.plan_interval,
    currency: raw.currency,
    currentPeriodStart: raw.current_period_start,
    currentPeriodEnd: raw.current_period_end,
    cancelAtPeriodEnd: raw.cancel_at_period_end,
    canceledAt: raw.canceled_at,
    latestInvoiceId: raw.latest_invoice_id,
    latestInvoiceStatus: asInvoiceStatus(raw.latest_invoice_status),
    lastEventCreated: raw.last_event_created,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

/** The id of a Stripe reference that may arrive as an id or an expanded object. */
function idOf(ref: string | { id?: string } | null | undefined): string | null {
  if (isNil(ref)) return null
  return typeof ref === 'string' ? ref : (ref.id ?? null)
}

/**
 * Extracts the mirror's view of a subscription. Pure.
 *
 * On the basil API version `current_period_start/end` live on the subscription
 * item, not the subscription, and the price (amount, currency, interval) is the
 * first item's price. A subscription with no items yields nulls, never throws.
 */
export function snapshotFromSubscription(
  sub: Stripe.Subscription
): SubscriptionSnapshot {
  const item = sub.items.data[0] as Stripe.SubscriptionItem | undefined
  const price = item?.price
  const latestInvoice = sub.latest_invoice

  return {
    stripeSubscriptionId: sub.id,
    stripeCustomerId: idOf(sub.customer),
    status: sub.status,
    priceId: price?.id ?? null,
    planAmountCents: price?.unit_amount ?? null,
    planInterval: price?.recurring?.interval ?? null,
    currency: price?.currency ?? null,
    currentPeriodStart: epochToIso(item?.current_period_start),
    currentPeriodEnd: epochToIso(item?.current_period_end),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    canceledAt: epochToIso(sub.canceled_at),
    latestInvoiceId: idOf(latestInvoice),
    latestInvoiceStatus:
      !isNil(latestInvoice) && typeof latestInvoice !== 'string'
        ? asInvoiceStatus(latestInvoice.status)
        : null,
  }
}

/** The row write a snapshot amounts to. Pure. */
export function snapshotToPatch(
  snapshot: SubscriptionSnapshot
): BillingAccountPatch {
  const patch: BillingAccountPatch = {
    stripe_subscription_id: snapshot.stripeSubscriptionId,
    status: snapshot.status,
    price_id: snapshot.priceId,
    plan_amount_cents: snapshot.planAmountCents,
    plan_interval: snapshot.planInterval,
    currency: snapshot.currency,
    current_period_start: snapshot.currentPeriodStart,
    current_period_end: snapshot.currentPeriodEnd,
    cancel_at_period_end: snapshot.cancelAtPeriodEnd,
    canceled_at: snapshot.canceledAt,
  }
  // Only overwrite what the subscription actually told us: a subscription
  // without an expanded invoice must not blank an invoice status an
  // invoice.* event already recorded.
  if (!isNil(snapshot.stripeCustomerId)) {
    patch.stripe_customer_id = snapshot.stripeCustomerId
  }
  if (!isNil(snapshot.latestInvoiceId)) {
    patch.latest_invoice_id = snapshot.latestInvoiceId
  }
  if (!isNil(snapshot.latestInvoiceStatus)) {
    patch.latest_invoice_status = snapshot.latestInvoiceStatus
  }
  return patch
}

export type ApplySubscriptionOutcome =
  { kind: 'stale' } | { kind: 'apply'; patch: BillingAccountPatch }

/**
 * Decides what a subscription event does to the mirror. Pure.
 *
 * Stripe does not guarantee delivery order, so an event older than the newest
 * one already applied (`lastEventCreated`) is stale and skipped. Equal
 * timestamps apply: two events can share a second.
 */
export function applySubscriptionEvent(
  account: Pick<BillingAccount, 'lastEventCreated'>,
  snapshot: SubscriptionSnapshot,
  eventCreated: number
): ApplySubscriptionOutcome {
  if (
    !isNil(account.lastEventCreated) &&
    eventCreated < account.lastEventCreated
  ) {
    return { kind: 'stale' }
  }
  return {
    kind: 'apply',
    patch: { ...snapshotToPatch(snapshot), last_event_created: eventCreated },
  }
}

// ---------------------------------------------------------------------------
// Stripe access
// ---------------------------------------------------------------------------

/** Runs one Stripe call, turning a throw into an error Result. */
async function stripeCall<T>(
  label: string,
  fn: (stripe: Stripe) => Promise<T>
): Promise<Result<string, T>> {
  const stripeResult = getPlatformStripe()
  if (isErr(stripeResult)) return stripeResult
  try {
    return ok(await fn(stripeResult.data))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return err(`${label}: ${message}`)
  }
}

// ---------------------------------------------------------------------------
// Locating the account
// ---------------------------------------------------------------------------

export type AccountLocator = {
  billingAccountId?: string | null
  subscriptionId?: string | null
  customerId?: string | null
}

/**
 * Finds the account a Stripe object belongs to: by our own id when Stripe
 * echoes it back in metadata, then by subscription, then by customer, and
 * finally the single row when it has no subscription yet (the first checkout
 * of a community that has never subscribed).
 */
export async function locateBillingAccount(
  adminClient: DbClient,
  locator: AccountLocator
): Promise<Result<string, RawBillingAccount | null>> {
  if (!isNil(locator.billingAccountId) && locator.billingAccountId !== '') {
    const byId = await BillingRepository.findBillingAccountById(
      adminClient,
      locator.billingAccountId
    )
    if (isErr(byId) || !isNil(byId.data)) return byId
  }

  if (!isNil(locator.subscriptionId) && locator.subscriptionId !== '') {
    const bySub = await BillingRepository.findBillingAccountBySubscriptionId(
      adminClient,
      locator.subscriptionId
    )
    if (isErr(bySub) || !isNil(bySub.data)) return bySub
  }

  if (!isNil(locator.customerId) && locator.customerId !== '') {
    const byCustomer = await BillingRepository.findBillingAccountByCustomerId(
      adminClient,
      locator.customerId
    )
    if (isErr(byCustomer) || !isNil(byCustomer.data)) return byCustomer
  }

  const single = await BillingRepository.getBillingAccount(adminClient)
  if (isErr(single)) return single
  if (isNil(single.data) || !isNil(single.data.stripe_subscription_id)) {
    return ok(null)
  }
  return ok(single.data)
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

/**
 * Reads a subscription from Stripe and writes it to the mirror unconditionally.
 * Used where there is no event ordering to respect (the checkout return, the
 * manual refresh, and after invoice events): a live read always wins, so
 * `last_event_created` becomes "now" and any older in-flight event is stale.
 */
export async function syncSubscription(
  adminClient: DbClient,
  subscriptionId: string
): Promise<Result<string, BillingAccount>> {
  const subResult = await stripeCall('Failed to read subscription', (stripe) =>
    stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice'],
    })
  )
  if (isErr(subResult)) return subResult

  const snapshot = snapshotFromSubscription(subResult.data)
  const accountResult = await locateBillingAccount(adminClient, {
    billingAccountId: subResult.data.metadata?.billing_account_id,
    subscriptionId,
    customerId: snapshot.stripeCustomerId,
  })
  if (isErr(accountResult)) return accountResult
  if (isNil(accountResult.data)) {
    return err(`No billing account matches subscription ${subscriptionId}`)
  }

  const patch: BillingAccountPatch = {
    ...snapshotToPatch(snapshot),
    last_event_created: Math.floor(Date.now() / 1000),
  }
  return Results.map(
    await BillingRepository.updateBillingAccount(
      adminClient,
      accountResult.data.id,
      patch
    ),
    toBillingAccount
  )
}

// ---------------------------------------------------------------------------
// Customer, checkout and portal
// ---------------------------------------------------------------------------

/**
 * The Stripe Customer the platform bills, created on first use. Idempotent:
 * an account that already has one is returned as is. The acting admin's email
 * is where Stripe sends receipts and failed-payment notices; it is editable in
 * the Customer Portal afterwards.
 */
export async function ensureCustomer(
  adminClient: DbClient,
  account: BillingAccount,
  actingUser: Pick<User, 'email'>
): Promise<Result<string, string>> {
  if (!isNil(account.stripeCustomerId)) return ok(account.stripeCustomerId)

  const customerResult = await stripeCall(
    'Failed to create Stripe customer',
    (stripe) =>
      stripe.customers.create({
        name: COMMUNITY_DISPLAY_NAME,
        email: actingUser.email,
        metadata: { billing_account_id: account.id },
      })
  )
  if (isErr(customerResult)) return customerResult

  const saved = await BillingRepository.updateBillingAccount(
    adminClient,
    account.id,
    { stripe_customer_id: customerResult.data.id }
  )
  if (isErr(saved)) {
    return err(`Failed to store Stripe customer id: ${saved.error}`)
  }
  return ok(customerResult.data.id)
}

/** Reads the single account through the admin client, as the actions need. */
export async function getBillingAccountAdmin(
  adminClient: DbClient
): Promise<Result<string, BillingAccount>> {
  const raw = await BillingRepository.getBillingAccount(adminClient)
  if (isErr(raw)) return raw
  if (isNil(raw.data)) return err('The billing account row is missing')
  return ok(toBillingAccount(raw.data))
}

/**
 * Starts a hosted Stripe Checkout for the monthly plan and returns its URL.
 * Refuses when billing is not configured on this deployment or the community
 * already has a live subscription (anything but canceled / incomplete_expired).
 */
export async function createSubscriptionCheckout(
  adminClient: DbClient,
  actingUser: Pick<User, 'email'>
): Promise<Result<string, string>> {
  const priceId = getPlatformPriceId()
  if (!isPlatformBillingConfigured() || isNil(priceId)) {
    return err("Platform billing isn't set up on this deployment.")
  }

  const accountResult = await getBillingAccountAdmin(adminClient)
  if (isErr(accountResult)) return accountResult
  const account = accountResult.data

  if (isLiveStatus(account.status)) {
    return err(
      'The community already has a subscription. Use Manage subscription to change it.'
    )
  }

  const customerResult = await ensureCustomer(adminClient, account, actingUser)
  if (isErr(customerResult)) return customerResult

  const sessionResult = await stripeCall('Failed to start checkout', (stripe) =>
    stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerResult.data,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: account.id,
      metadata: { billing_account_id: account.id },
      subscription_data: { metadata: { billing_account_id: account.id } },
      success_url: getUrl(
        '/admin/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}'
      ),
      cancel_url: getUrl('/admin/billing?checkout=canceled'),
      allow_promotion_codes: false,
    })
  )
  if (isErr(sessionResult)) return sessionResult

  return Results.fromNullable(
    sessionResult.data.url,
    'Stripe did not return a checkout URL'
  )
}

/** A Stripe Customer Portal session for card changes, invoices and cancellation. */
export async function createPortalSession(
  adminClient: DbClient
): Promise<Result<string, string>> {
  if (!isPlatformBillingConfigured()) {
    return err("Platform billing isn't set up on this deployment.")
  }

  const accountResult = await getBillingAccountAdmin(adminClient)
  if (isErr(accountResult)) return accountResult
  const customerId = accountResult.data.stripeCustomerId
  if (isNil(customerId)) {
    return err('The community has no Stripe customer yet. Subscribe first.')
  }

  const sessionResult = await stripeCall(
    'Failed to open the billing portal',
    (stripe) =>
      stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: getUrl('/admin/billing'),
      })
  )
  return Results.map(sessionResult, (session) => session.url)
}

/**
 * Re-reads the subscription from Stripe on request. A no-op success when the
 * community has never subscribed.
 */
export async function refreshFromStripe(
  adminClient: DbClient
): Promise<Result<string, BillingAccount>> {
  const accountResult = await getBillingAccountAdmin(adminClient)
  if (isErr(accountResult)) return accountResult
  const subscriptionId = accountResult.data.stripeSubscriptionId
  if (isNil(subscriptionId)) return accountResult
  return syncSubscription(adminClient, subscriptionId)
}

/**
 * The checkout return: when Stripe sends the admin back with a session id,
 * read the session and sync its subscription before the page renders, so the
 * page is right even if the webhook has not landed yet.
 */
export async function syncFromCheckoutSession(
  adminClient: DbClient,
  sessionId: string
): Promise<Result<string, BillingAccount | null>> {
  const sessionResult = await stripeCall(
    'Failed to read checkout session',
    (stripe) => stripe.checkout.sessions.retrieve(sessionId)
  )
  if (isErr(sessionResult)) return sessionResult

  const subscriptionId = sessionResult.data.subscription
  if (isNil(subscriptionId) || typeof subscriptionId !== 'string') {
    return ok(null)
  }
  return syncSubscription(adminClient, subscriptionId)
}

// ---------------------------------------------------------------------------
// The Billing page read model
// ---------------------------------------------------------------------------

function summarisePaymentMethod(
  method: string | Stripe.PaymentMethod | null | undefined
): PaymentMethodSummary | null {
  if (isNil(method) || typeof method === 'string') return null

  if (!isNil(method.card)) {
    const card = method.card
    return {
      kind: 'card',
      brand: card.display_brand ?? card.brand,
      last4: card.last4,
      expMonth: card.exp_month,
      expYear: card.exp_year,
    }
  }
  if (method.type === 'link') {
    return { kind: 'link', email: method.link?.email ?? null }
  }
  if (!isNil(method.us_bank_account)) {
    return {
      kind: 'us_bank_account',
      bankName: method.us_bank_account.bank_name ?? null,
      last4: method.us_bank_account.last4 ?? null,
    }
  }
  // Anything else Checkout accepted (Cash App Pay, Amazon Pay, …): name it
  // rather than pretend nothing is on file.
  return { kind: 'other', label: method.type.replace(/_/g, ' ') }
}

function summariseInvoice(invoice: Stripe.Invoice): InvoiceSummary {
  const status = asInvoiceStatus(invoice.status)
  return {
    // Only a not-yet-finalised preview lacks an id; a listed invoice has one.
    id: invoice.id ?? `invoice-${invoice.created}`,
    number: invoice.number,
    created: epochToIso(invoice.created) ?? new Date(0).toISOString(),
    amountCents: status === 'paid' ? invoice.amount_paid : invoice.amount_due,
    currency: invoice.currency,
    status,
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    invoicePdf: invoice.invoice_pdf ?? null,
  }
}

/**
 * The card Stripe will charge: the subscription's default payment method,
 * falling back to the customer's. Null when there is none or the read failed.
 */
async function readPaymentMethod(
  account: BillingAccount
): Promise<PaymentMethodSummary | null> {
  if (isNil(account.stripeSubscriptionId)) return null

  const subResult = await stripeCall(
    'Failed to read payment method',
    (stripe) =>
      stripe.subscriptions.retrieve(account.stripeSubscriptionId as string, {
        expand: [
          'default_payment_method',
          'customer.invoice_settings.default_payment_method',
        ],
      })
  )
  if (isErr(subResult)) {
    logger.warn(
      { error: subResult.error },
      'Billing: payment method unavailable'
    )
    return null
  }

  const sub = subResult.data
  const fromSubscription = summarisePaymentMethod(sub.default_payment_method)
  if (!isNil(fromSubscription)) return fromSubscription

  const customer = sub.customer
  if (typeof customer === 'string' || customer.deleted === true) return null
  return summarisePaymentMethod(
    customer.invoice_settings?.default_payment_method
  )
}

async function readInvoices(
  account: BillingAccount
): Promise<BillingOverview['invoices']> {
  if (isNil(account.stripeCustomerId)) return { error: false, items: [] }

  const listResult = await stripeCall('Failed to list invoices', (stripe) =>
    stripe.invoices.list({
      customer: account.stripeCustomerId as string,
      limit: 12,
    })
  )
  if (isErr(listResult)) {
    logger.warn({ error: listResult.error }, 'Billing: invoices unavailable')
    return { error: true }
  }
  return { error: false, items: listResult.data.data.map(summariseInvoice) }
}

/**
 * Everything the Billing page shows. The account is read through the user's
 * own client so RLS enforces MANAGE_BILLING; the live Stripe reads run in
 * parallel and each degrades on its own rather than failing the page.
 */
export async function getBillingOverview(
  _user: User
): Promise<Result<string, BillingOverview>> {
  const client = await createClient()
  const rawResult = await BillingRepository.getBillingAccount(client)
  if (isErr(rawResult)) return rawResult
  if (isNil(rawResult.data)) {
    return err('The billing account is missing or not visible to this user')
  }

  const account = toBillingAccount(rawResult.data)
  const configured = isPlatformBillingConfigured()
  if (!configured) {
    return ok({
      configured,
      account,
      paymentMethod: null,
      invoices: { error: false, items: [] },
    })
  }

  const [paymentMethod, invoices] = await Promise.all([
    readPaymentMethod(account),
    readInvoices(account),
  ])

  return ok({ configured, account, paymentMethod, invoices })
}
