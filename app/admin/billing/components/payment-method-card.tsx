import { isNil } from 'lodash'
import { CreditCard, Landmark, Wallet, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCardBrand } from '@/lib/billing/format'
import type { PaymentMethodSummary } from '@/services/platform-billing/types'
import { PortalButton } from './billing-buttons'

/** The icon, headline and detail line for whatever Stripe will charge next. */
function describe(method: PaymentMethodSummary | null): {
  icon: LucideIcon
  title: string
  detail: string | null
} {
  if (isNil(method)) {
    return { icon: CreditCard, title: 'Nothing on file', detail: null }
  }
  switch (method.kind) {
    case 'card':
      return {
        icon: CreditCard,
        title: `${formatCardBrand(method.brand)} •••• ${method.last4}`,
        detail: `Expires ${String(method.expMonth).padStart(2, '0')}/${method.expYear}`,
      }
    case 'link':
      return {
        icon: Wallet,
        title: 'Link by Stripe',
        detail: isNil(method.email)
          ? 'Saved card, paid through Link'
          : method.email,
      }
    case 'us_bank_account':
      return {
        icon: Landmark,
        title: isNil(method.last4)
          ? (method.bankName ?? 'Bank account')
          : `${method.bankName ?? 'Bank account'} •••• ${method.last4}`,
        detail: 'Bank account (ACH)',
      }
    case 'other':
      return { icon: Wallet, title: method.label, detail: null }
  }
}

export function PaymentMethodCard({
  paymentMethod,
  canOpenPortal,
}: {
  paymentMethod: PaymentMethodSummary | null
  /** False until a Stripe customer exists; the portal needs one. */
  canOpenPortal: boolean
}) {
  const { icon: Icon, title, detail } = describe(paymentMethod)
  const hasMethod = !isNil(paymentMethod)

  return (
    <Card className="gap-0 py-0">
      <CardContent className="px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Payment method
        </p>
        <h2 className="font-serif text-lg font-semibold tracking-tight">
          {hasMethod ? 'On file' : 'Nothing on file'}
        </h2>

        <div className="mt-4 flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p
              className={
                hasMethod
                  ? 'font-medium tabular-nums'
                  : 'text-sm text-muted-foreground'
              }
            >
              {hasMethod
                ? title
                : 'Stripe has no way to charge the community yet.'}
            </p>
            {!isNil(detail) && (
              <p className="truncate text-sm text-muted-foreground tabular-nums">
                {detail}
              </p>
            )}
          </div>
        </div>

        {canOpenPortal && (
          <div className="mt-5">
            <PortalButton>
              {hasMethod ? 'Update payment method' : 'Add a payment method'}
            </PortalButton>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
