import { AlertTriangle, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { isLiveStatus, needsPaymentAttention } from '@/lib/billing/format'
import type { BillingAccount } from '@/services/platform-billing/types'
import { PortalButton, SubscribeButton } from './billing-buttons'

/**
 * Sits above the cards when something needs a decision: a failed payment, or
 * a canceled subscription. Renders nothing for a healthy or never-subscribed
 * account (the plan card already says "Not subscribed").
 */
export function BillingStatusBanner({ account }: { account: BillingAccount }) {
  if (needsPaymentAttention(account.status)) {
    return (
      <Alert
        variant="destructive"
        className="mb-6 border-destructive/40 bg-destructive/5"
      >
        <AlertTriangle />
        <AlertTitle className="line-clamp-none">
          The last payment didn&apos;t go through
        </AlertTitle>
        <AlertDescription className="gap-2">
          <p>
            Stripe couldn&apos;t charge the card on file for the site&apos;s
            monthly plan. Nothing is turned off, but the card needs attention:
            Stripe will keep retrying it for a few weeks and then cancel the
            subscription.
          </p>
          <PortalButton className="mt-1" variant="default">
            Update payment method
          </PortalButton>
        </AlertDescription>
      </Alert>
    )
  }

  if (account.status !== null && !isLiveStatus(account.status)) {
    return (
      <Alert className="mb-6">
        <Info />
        <AlertTitle className="line-clamp-none">
          The subscription is canceled
        </AlertTitle>
        <AlertDescription className="gap-2">
          <p>
            The community isn&apos;t paying for the platform right now. Nothing
            is turned off. Subscribing again starts a new monthly plan today.
          </p>
          <SubscribeButton className="mt-1" />
        </AlertDescription>
      </Alert>
    )
  }

  return null
}
