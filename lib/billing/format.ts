import { isNil } from 'lodash'
import { format } from 'date-fns'
import type {
  BillingStatus,
  InvoiceStatus,
} from '@/services/platform-billing/types'

// Pure display helpers for the Billing page. No server imports, so both the
// server page and its client components can share them, and Jest can test them.
// Every string here is written for a non-technical board member: "Past due",
// never "unpaid invoice"; "Renews on", never "current_period_end".

/** "$45.00" from 4500 cents; currency is Stripe's lower-case ISO code. */
export function formatBillingAmount(
  cents: number,
  currency: string | null | undefined
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency ?? 'usd').toUpperCase(),
  }).format(cents / 100)
}

/** "$45 / month" for the plan card; whole dollars when there are no cents. */
export function formatPlanPrice(
  cents: number | null | undefined,
  interval: string | null | undefined,
  currency: string | null | undefined
): string | null {
  if (isNil(cents) || isNil(interval)) return null
  const amount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency ?? 'usd').toUpperCase(),
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
  return `${amount} / ${interval}`
}

/** "September 27, 2026" from an ISO date. Null in, null out. */
export function formatBillingDate(
  iso: string | null | undefined
): string | null {
  if (isNil(iso) || iso === '') return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return format(date, 'MMMM d, yyyy')
}

export type PlanBadge = {
  label: string
  tone: 'success' | 'warning' | 'error' | 'neutral' | 'info'
}

/**
 * The status pill on the plan card. `cancelAtPeriodEnd` on an otherwise live
 * subscription reads as "Canceling", since access continues until the period
 * ends.
 */
export function describePlanStatus(
  status: BillingStatus | null,
  cancelAtPeriodEnd: boolean,
  currentPeriodEnd: string | null
): PlanBadge {
  if (isNil(status)) return { label: 'Not subscribed', tone: 'neutral' }
  if (cancelAtPeriodEnd && isLiveStatus(status)) {
    const ends = formatBillingDate(currentPeriodEnd)
    return {
      label: isNil(ends) ? 'Canceling' : `Canceling · access ends ${ends}`,
      tone: 'warning',
    }
  }
  switch (status) {
    case 'active':
      return { label: 'Active', tone: 'success' }
    case 'trialing':
      return { label: 'Trialing', tone: 'info' }
    case 'past_due':
    case 'unpaid':
      return { label: 'Past due', tone: 'warning' }
    case 'canceled':
    case 'incomplete_expired':
      return { label: 'Canceled', tone: 'neutral' }
    case 'incomplete':
      return { label: 'Payment not finished', tone: 'warning' }
    case 'paused':
      return { label: 'Paused', tone: 'neutral' }
  }
}

/**
 * A subscription the community still has, whatever its payment health. Only
 * `canceled` and `incomplete_expired` (Stripe's terminal states) mean there is
 * nothing live, so a new checkout is allowed.
 */
export function isLiveStatus(status: BillingStatus | null): boolean {
  return (
    !isNil(status) && status !== 'canceled' && status !== 'incomplete_expired'
  )
}

/** Past due or unpaid: the card needs attention. */
export function needsPaymentAttention(status: BillingStatus | null): boolean {
  return status === 'past_due' || status === 'unpaid'
}

export function describeInvoiceStatus(status: InvoiceStatus | null): PlanBadge {
  switch (status) {
    case 'paid':
      return { label: 'Paid', tone: 'success' }
    case 'open':
      return { label: 'Awaiting payment', tone: 'warning' }
    case 'uncollectible':
      return { label: 'Not collected', tone: 'error' }
    case 'void':
      return { label: 'Voided', tone: 'neutral' }
    case 'draft':
      return { label: 'Draft', tone: 'neutral' }
    default:
      return { label: 'Unknown', tone: 'neutral' }
  }
}

/** Capitalises Stripe's card brand codes: "visa" → "Visa", "amex" → "Amex". */
export function formatCardBrand(brand: string): string {
  if (brand === '') return 'Card'
  return brand.charAt(0).toUpperCase() + brand.slice(1)
}
