import { expect, test } from '@playwright/test'
import { isNil } from 'lodash'
import {
  resetBillingAccountForSpec,
  restoreBillingAccount,
  snapshotBillingAccount,
  type BillingAccountSnapshot,
} from './fixtures/billing'
import { loadPersonas, storageStatePath } from './fixtures/personas'

/**
 * Platform billing against a real Stripe sandbox: pressing Subscribe on a
 * never-subscribed community lands on Stripe's hosted Checkout, which proves
 * the platform key, the price id and customer creation all work. Stripe's page
 * is not filled in.
 *
 * Tagged `@stripe-live`, so it only runs with `E2E_STRIPE_LIVE=1` (see
 * `grepInvert` in playwright.config.ts), and it skips itself when the
 * platform keys are missing. The dev server must hold the same sandbox keys.
 *
 * Side effect on the sandbox: each run creates one Stripe Customer (and an
 * abandoned Checkout Session, which expires on its own). The local
 * `billing_account` row is restored afterwards, including its customer id.
 */

test.describe.configure({ mode: 'serial', timeout: 60_000 })
test.use({ storageState: storageStatePath('billingManager') })

function missingPlatformKeys(): string[] {
  return ['PLATFORM_STRIPE_SECRET_KEY', 'PLATFORM_STRIPE_PRICE_ID'].filter(
    (name) => isNil(process.env[name]) || process.env[name] === ''
  )
}

test.describe('platform billing checkout', { tag: '@stripe-live' }, () => {
  let snapshot: BillingAccountSnapshot | undefined

  test.beforeAll(async () => {
    const missing = missingPlatformKeys()
    test.skip(
      missing.length > 0,
      `Platform billing live spec needs ${missing.join(' and ')} (sandbox values, the same as the dev server's)`
    )
    await loadPersonas()
    snapshot = await snapshotBillingAccount()
    await resetBillingAccountForSpec()
  })

  test.afterAll(async () => {
    if (snapshot !== undefined) await restoreBillingAccount(snapshot)
  })

  test('Subscribe opens Stripe Checkout', async ({ page }) => {
    await page.goto('/admin/billing')
    const card = page.locator('[data-slot="card"]').filter({
      has: page.getByRole('heading', { name: 'Tres Dias Platform' }),
    })
    await expect(
      card.getByText('Not subscribed', { exact: true })
    ).toBeVisible()

    await card.getByRole('button', { name: 'Subscribe' }).click()
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 })
  })
})
