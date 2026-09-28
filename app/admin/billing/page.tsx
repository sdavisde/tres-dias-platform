import { Suspense } from 'react'
import { isNil } from 'lodash'
import { Info } from 'lucide-react'
import { AdminBreadcrumbs } from '@/components/admin/breadcrumbs'
import { PageHeader } from '@/components/ui/page-header'
import { guardAdminPage } from '@/lib/admin/page-guard'
import { Permission } from '@/lib/security'
import { logger } from '@/lib/logger'
import * as Results from '@/lib/results'
import { isPlatformBillingConfigured } from '@/lib/platform-stripe'
import { createAdminClient } from '@/lib/supabase/server'
import {
  getBillingOverview,
  syncFromCheckoutSession,
} from '@/services/platform-billing/platform-billing-service'
import { CheckoutReturnQuerySchema } from '@/services/platform-billing/types'
import { BillingStatusBanner } from './components/billing-status-banner'
import { RefreshBillingButton } from './components/billing-buttons'
import { CheckoutReturnToast } from './components/checkout-return-toast'
import { InvoicesTable } from './components/invoices-table'
import { PaymentMethodCard } from './components/payment-method-card'
import { PlanCard } from './components/plan-card'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/** The dashed notice the Settings page uses for things that are not here yet. */
function DashedNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-dashed border-input bg-card px-5 py-4">
      <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  )
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { user } = await guardAdminPage({
    required: [Permission.MANAGE_BILLING],
  })

  const configured = isPlatformBillingConfigured()

  // Back from Stripe Checkout: read the session and sync its subscription
  // BEFORE rendering, so the page is right even if the webhook is still on
  // its way. The client toast reads the same params afterwards.
  const returned = CheckoutReturnQuerySchema.safeParse(await searchParams)
  if (
    configured &&
    returned.success &&
    returned.data.checkout === 'success' &&
    !isNil(returned.data.session_id)
  ) {
    const synced = await syncFromCheckoutSession(
      createAdminClient(),
      returned.data.session_id
    )
    if (Results.isErr(synced)) {
      // The webhook will catch up; the admin can also press Refresh.
      logger.warn(
        { error: synced.error },
        'Billing: could not sync the subscription on the checkout return'
      )
    }
  }

  const overviewResult = await getBillingOverview(user)
  if (Results.isErr(overviewResult)) {
    logger.error(
      { error: overviewResult.error },
      'Billing: overview could not be loaded'
    )
  }
  const overview = Results.toNullable(overviewResult)

  return (
    <>
      <AdminBreadcrumbs
        title="Billing"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }]}
      />
      <div className="container mx-auto px-4 pb-10 sm:px-8 py-6">
        <PageHeader
          title="Billing"
          description="The community's subscription to the platform. Renews monthly; Stripe emails the receipt."
        >
          {configured && !isNil(overview) && <RefreshBillingButton />}
        </PageHeader>

        <Suspense fallback={null}>
          <CheckoutReturnToast />
        </Suspense>

        {!configured ? (
          <DashedNotice>
            Platform billing isn&apos;t set up on this deployment.
          </DashedNotice>
        ) : isNil(overview) ? (
          <DashedNotice>
            Billing information couldn&apos;t be loaded just now. Reload in a
            moment; if it keeps happening, tell a developer.
          </DashedNotice>
        ) : (
          <>
            <BillingStatusBanner account={overview.account} />

            <div className="grid items-start gap-4 sm:grid-cols-2">
              <PlanCard account={overview.account} />
              <PaymentMethodCard
                paymentMethod={overview.paymentMethod}
                canOpenPortal={!isNil(overview.account.stripeCustomerId)}
              />
            </div>

            <section className="mt-8" aria-labelledby="invoices-heading">
              <h2
                id="invoices-heading"
                className="mb-3 font-serif text-lg font-semibold tracking-tight"
              >
                Invoices
              </h2>
              {overview.invoices.error ? (
                <DashedNotice>
                  Invoices couldn&apos;t be loaded from Stripe just now. The
                  Stripe receipt emails still have every invoice.
                </DashedNotice>
              ) : (
                <InvoicesTable invoices={overview.invoices.items} />
              )}
            </section>
          </>
        )}
      </div>
    </>
  )
}
