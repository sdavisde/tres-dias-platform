import { z } from 'zod'
import type { Tables, TablesUpdate } from '@/database.types'

/** The `billing_account` row as the database returns it. */
export type RawBillingAccount = Tables<'billing_account'>

/** A partial write to `billing_account`; the repository stamps `updated_at`. */
export type BillingAccountPatch = Omit<
  TablesUpdate<'billing_account'>,
  'id' | 'created_at' | 'updated_at'
>

/** Stripe's subscription statuses, verbatim. `null` on the account means never subscribed. */
export const BILLING_STATUSES = [
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused',
] as const

export type BillingStatus = (typeof BILLING_STATUSES)[number]

/** Stripe's invoice statuses, verbatim. */
export const INVOICE_STATUSES = [
  'draft',
  'open',
  'paid',
  'uncollectible',
  'void',
] as const

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

/** Camel-case mirror of the `billing_account` row. Dates are ISO strings. */
export type BillingAccount = {
  id: string
  communityId: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  status: BillingStatus | null
  priceId: string | null
  planAmountCents: number | null
  planInterval: string | null
  currency: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
  latestInvoiceId: string | null
  latestInvoiceStatus: InvoiceStatus | null
  /** Stripe `event.created` (epoch seconds) of the newest subscription event applied. */
  lastEventCreated: number | null
  createdAt: string
  updatedAt: string
}

/** What a webhook handler extracts from a `Stripe.Subscription`. */
export type SubscriptionSnapshot = {
  stripeSubscriptionId: string
  stripeCustomerId: string | null
  status: BillingStatus
  priceId: string | null
  planAmountCents: number | null
  planInterval: string | null
  currency: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
  latestInvoiceId: string | null
  /** Only known when `latest_invoice` arrived expanded. */
  latestInvoiceStatus: InvoiceStatus | null
}

/**
 * What Stripe will charge next, as the Billing page shows it. Checkout lets
 * the payer choose Link or a bank account as well as a card, so this is a
 * union rather than a card shape.
 */
export type PaymentMethodSummary =
  | {
      kind: 'card'
      brand: string
      last4: string
      expMonth: number
      expYear: number
    }
  | { kind: 'link'; email: string | null }
  | { kind: 'us_bank_account'; bankName: string | null; last4: string | null }
  | { kind: 'other'; label: string }

/** One invoice row on the Billing page. */
export type InvoiceSummary = {
  id: string
  number: string | null
  /** ISO date the invoice was created. */
  created: string
  amountCents: number
  currency: string
  status: InvoiceStatus | null
  hostedInvoiceUrl: string | null
  invoicePdf: string | null
}

/** The Billing page's read model: the mirror plus failure-tolerant live reads. */
export type BillingOverview = {
  /** False when the deployment has no platform Stripe keys. */
  configured: boolean
  account: BillingAccount
  /** Null when there is no card on file or the live read failed. */
  paymentMethod: PaymentMethodSummary | null
  invoices: { error: true } | { error: false; items: InvoiceSummary[] }
}

/** Outcome recorded for every webhook delivery, before any account write. */
export type WebhookEventOutcome = 'applied' | 'skipped_stale' | 'ignored'

/** The query string Stripe Checkout sends the admin back with. */
export const CheckoutReturnQuerySchema = z.object({
  checkout: z.enum(['success', 'canceled']).optional(),
  session_id: z.string().startsWith('cs_').optional(),
})

export type CheckoutReturnQuery = z.infer<typeof CheckoutReturnQuerySchema>
