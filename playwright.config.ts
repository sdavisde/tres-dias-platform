import { config as loadEnv } from 'dotenv'
import { defineConfig, devices } from '@playwright/test'

// The fixtures talk to Supabase directly, and the Playwright process does not
// get Next.js's automatic .env.local loading. In CI the env comes from the
// workflow and there is no .env.local.
loadEnv({ path: '.env.local', quiet: true })

/**
 * End-to-end tests against a real local Supabase and the seed from
 * `scripts/seed/` (`pre-weekend` phase). Specs pick their people through the
 * selectors in e2e/fixtures/seed.ts. Not part of `yarn test`; see
 * docs/e2e-testing.md for how to run them.
 */

const CI = process.env.CI === 'true'
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  // Specs mutate shared seeded rows, so files run one at a time and tests
  // within a file run in order. Determinism beats speed at this size.
  fullyParallel: false,
  workers: 1,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? 'github' : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  // The real-Stripe specs only run in the nightly workflow.
  grepInvert: process.env.E2E_STRIPE_LIVE === '1' ? undefined : /@stripe-live/,
  // Picks the personas from the seed, writes e2e/.auth/personas.json and
  // signs a session per persona, once before the whole suite (also before UI
  // mode's first run). Being a global setup rather than a project means
  // there is no separate "setup" entry cluttering the test list in UI mode
  // or `--list` output — only real specs show up.
  globalSetup: './e2e/global-setup.ts',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // CI runs against a production build; locally the owner's running dev
  // server is reused and never restarted.
  webServer: {
    command: CI ? 'yarn start' : 'yarn dev',
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
})
