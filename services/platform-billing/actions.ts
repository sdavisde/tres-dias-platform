'use server'

import { revalidatePath } from 'next/cache'
import { authorizedAction } from '@/lib/actions/authorized-action'
import { Permission } from '@/lib/security'
import { createAdminClient } from '@/lib/supabase/server'
import { isErr, type Result } from '@/lib/results'
import * as PlatformBillingService from './platform-billing-service'
import type { BillingAccount } from './types'

/**
 * Platform billing actions. Every export requires MANAGE_BILLING (Full Access
 * holders pass implicitly). None takes an argument that influences what is
 * charged or which customer is used: the account row is always looked up
 * server-side, and the card itself is only ever entered on Stripe's pages.
 */

/** The Billing page and the dashboard alert both read the mirror. */
function revalidatingBilling<T>(result: Result<string, T>): Result<string, T> {
  if (!isErr(result)) {
    revalidatePath('/admin/billing')
    revalidatePath('/admin')
  }
  return result
}

/**
 * Starts a hosted Stripe Checkout for the monthly plan and returns its URL.
 * Refuses when billing is not configured here or a subscription is already
 * live.
 */
export const startSubscriptionCheckout = authorizedAction<[], string>(
  Permission.MANAGE_BILLING,
  async (user) => {
    return revalidatingBilling(
      await PlatformBillingService.createSubscriptionCheckout(
        createAdminClient(),
        user
      )
    )
  }
)

/**
 * Opens the Stripe Customer Portal (card changes, invoice PDFs, cancellation)
 * and returns its URL. Requires a Stripe customer, i.e. at least one
 * Subscribe click.
 */
export const openBillingPortal = authorizedAction<[], string>(
  Permission.MANAGE_BILLING,
  async () => {
    return revalidatingBilling(
      await PlatformBillingService.createPortalSession(createAdminClient())
    )
  }
)

/** Re-reads the subscription from Stripe and rewrites the mirror. */
export const refreshBillingStatus = authorizedAction<[], BillingAccount>(
  Permission.MANAGE_BILLING,
  async () => {
    return revalidatingBilling(
      await PlatformBillingService.refreshFromStripe(createAdminClient())
    )
  }
)
