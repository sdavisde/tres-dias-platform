import { isNil } from 'lodash'
import { Card, CardContent } from '@/components/ui/card'
import {
  describePlanStatus,
  formatBillingDate,
  formatPlanPrice,
  isLiveStatus,
  needsPaymentAttention,
} from '@/lib/billing/format'
import type { BillingAccount } from '@/services/platform-billing/types'
import { PortalButton, SubscribeButton } from './billing-buttons'
import { StatusBadge } from './status-badge'

/** The fallback when the mirror has no price yet (never subscribed). */
const DEFAULT_PLAN_PRICE = '$45 / month'

/** One plain line under the price about what happens next. */
function describeRenewal(account: BillingAccount): string {
  const periodEnd = formatBillingDate(account.currentPeriodEnd)
  const canceledOn = formatBillingDate(account.canceledAt)

  if (isNil(account.status)) {
    return 'Nothing is charged until the community subscribes.'
  }
  if (!isLiveStatus(account.status)) {
    return isNil(canceledOn)
      ? 'The subscription is canceled.'
      : `Canceled on ${canceledOn}.`
  }
  if (account.cancelAtPeriodEnd) {
    return isNil(periodEnd)
      ? "Set to end at the close of this period. It won't renew."
      : `Access ends on ${periodEnd}. It won't renew.`
  }
  if (needsPaymentAttention(account.status)) {
    return "The last payment didn't go through. Stripe will retry the card on file."
  }
  if (account.status === 'trialing') {
    return isNil(periodEnd) ? 'In trial.' : `Trial ends on ${periodEnd}.`
  }
  return isNil(periodEnd) ? 'Renews monthly.' : `Renews on ${periodEnd}`
}

export function PlanCard({ account }: { account: BillingAccount }) {
  const badge = describePlanStatus(
    account.status,
    account.cancelAtPeriodEnd,
    account.currentPeriodEnd
  )
  const price =
    formatPlanPrice(
      account.planAmountCents,
      account.planInterval,
      account.currency
    ) ?? DEFAULT_PLAN_PRICE
  const live = isLiveStatus(account.status)

  return (
    <Card className="gap-0 py-0">
      <CardContent className="px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Plan
            </p>
            <h2 className="font-serif text-lg font-semibold tracking-tight">
              Tres Dias Platform
            </h2>
          </div>
          <StatusBadge badge={badge} />
        </div>

        <p className="mt-4 font-serif text-3xl font-semibold tabular-nums tracking-tight">
          {price}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {describeRenewal(account)}
        </p>

        <div className="mt-5">
          {live ? (
            <PortalButton>Manage subscription</PortalButton>
          ) : (
            <SubscribeButton />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
