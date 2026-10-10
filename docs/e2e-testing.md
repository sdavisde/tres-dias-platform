# E2E Testing

A Playwright suite covering the three flows the owner most needs protected: accounts (login,
register, error messages), team forms, and fee payments. It runs against a production build
(`next build && next start`) in a nightly GitHub Actions run and against your own running dev server
locally; it is not part of `bun run test`, never runs under Jest, and does not gate PRs or deploys.

## Running locally

Prerequisites. The suite reseeds the local database itself on every run (see below) but never
starts or stops anything:

- A local Supabase running (`bun run db:start`). **Every run wipes local app data and auth users and
  rebuilds the `pre-weekend` world** (under a second) before the first test, so anything you created
  by hand locally is gone after `bun run e2e`. A bare `bun run e2e` in a terminal asks `Continue? [y/N]`
  first; answering no aborts with nothing changed. `E2E_RESEED=yes bun run e2e` skips the prompt, and
  `bun run e2e:ui` needs it because UI mode has no terminal to answer in. CI sets `CI=true`, which also
  skips it. Global setup refuses to run unless `NEXT_PUBLIC_SUPABASE_URL` points at `127.0.0.1` or
  `localhost`.
- The dev server running on the suite's base URL (`bun run dev`, default `http://localhost:3000`).
- `.env.local` (or `.env`; Playwright loads `.env.local` first and falls back to `.env`, the same
  precedence Next.js uses) with the three local Supabase values (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) plus `STRIPE_WEBHOOK_SECRET` and
  `PLATFORM_STRIPE_WEBHOOK_SECRET`, which the payment and billing fixtures share with the app to sign
  synthetic webhook events. The billing spec also needs `PLATFORM_STRIPE_SECRET_KEY` and
  `PLATFORM_STRIPE_PRICE_ID` set on the dev server (any value) so the Billing page renders its
  configured state. Dummy Stripe and Resend values (`sk_test_e2e_dummy`, `pk_test_e2e_dummy`,
  `re_e2e_dummy`, and so on) are fine for local runs too — nothing in the default suite talks to
  the real services.
- `bunx playwright install chromium`, once.

| Command          | What it does                                                                 |
| ---------------- | ---------------------------------------------------------------------------- |
| `bun run e2e`    | Runs global setup, then every spec, headless.                                |
| `bun run e2e:ui` | Opens Playwright's UI mode against the same config (also runs global setup). |

`bun run e2e --grep <text>` narrows a run to specs whose title matches `<text>`, and `bunx playwright
show-report` opens the HTML report from the last run.

Two environment variables tune a run: `E2E_BASE_URL` (default `http://localhost:3000`) is the base
URL Playwright drives, and `E2E_SEED_PASSWORD` (default `password`) is the shared password of every
seeded auth user.

Locally the suite reuses whatever dev server is already answering on the base URL
(`webServer.reuseExistingServer`) and never starts or resets the database. Only in CI does it start
its own server against a fresh build.

## How it is put together

Playwright global setup (`e2e/global-setup.ts`) runs once before the suite, also when the UI mode
opens. It selects the run's cast by predicate (see Seed Invariants below), writes the chosen ids,
emails and fee numbers to `e2e/.auth/personas.json`, then signs three of those personas in through
the real `/login` form and saves their storage state to `e2e/.auth/<persona>.json`. The whole
`e2e/.auth/` directory is gitignored; it is regenerated every run.

The personas:

| Persona              | What it is for                                                            |
| -------------------- | ------------------------------------------------------------------------- |
| `teamForms`          | Roster member with no forms and no payments (team forms flow, S2).        |
| `teamFee`            | Roster member who owes the team fee, distinct from `teamForms` (S3).      |
| `seededUser`         | Any confirmed seeded user, for the plain login case (S5).                 |
| `nonRosterUser`      | Confirmed user on no roster of an active weekend, the negative case (S6). |
| `billingManager`     | Admin who can open Admin → Billing and the dashboard (S7).                |
| `candidates.full`    | Candidate awaiting payment with nothing paid (S4).                        |
| `candidates.partial` | Candidate awaiting payment with a partial payment below the fee (S4).     |
| `group`              | The one active weekend group's id, number and fee amounts (S1).           |

A spec opts into a signed-in persona with `test.use({ storageState: storageStatePath('teamForms') })`
(from `e2e/fixtures/personas.ts`); auth specs use no storage state at all, since they exercise
login and registration themselves. Every spec reads the chosen cast in `test.beforeAll` with
`await loadPersonas()`, which throws a clear error if `personas.json` is missing (run `bun run e2e`,
which always runs global setup first). `loadPersonas()` also re-checks every persona id and email
against the database before handing back the cast, so if the database was reseeded after global
setup ran, specs fail fast with a "personas.json is stale" message instead of misbehaving (e.g.
treating a stale "existing user" email as available and registering it as a new account). The fix
after a reseed is to rerun `bun run e2e` (or restart the UI mode) so global setup runs again.

`adminClient()` (`e2e/fixtures/supabase.ts`) is a service-role Supabase client for fixtures to
arrange data, assert on it and clean it up. It bypasses Row Level Security, so it is never used to
assert that a policy allows or denies something — that needs `anonClient()` signed in as a real
user.

## Seed invariants

The suite never selects a person by id or email; it asks the seeded database a predicate question
and fails loudly if nothing answers it. Each row below is checked by a selector in
`e2e/fixtures/seed.ts`:

| #   | Invariant                                                                                                                                                                                                                                                      | Selector                              | Used by                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------- |
| S1  | Exactly one weekend group has a weekend with status `ACTIVE`, and that group has `team_fee`, `candidate_fee` and `online_surcharge` set                                                                                                                        | `activeGroup()`                       | every payments spec, team forms |
| S2  | At least one `weekend_group_members` row of that group has an active roster row (`status <> 'drop'`) in a non-exempt role, **zero** `team_form_completions` and **zero** `payment_transaction` rows                                                            | `pickTeamFormsMember()`               | Unit 3                          |
| S3  | At least two further such members exist, so the team-fee persona is never the team-forms persona                                                                                                                                                               | `pickUnpaidTeamMember({ excluding })` | Unit 4, Unit 6                  |
| S4  | At least one candidate on an `ACTIVE` weekend is `awaiting_payment` with no `payment_transaction` rows, and at least one other is `awaiting_payment` with a partial payment below the fee; both have a sponsorship `payment_owner` of `candidate` or `sponsor` | `pickAwaitingCandidate({ partial })`  | Unit 4, Unit 6                  |
| S5  | Every seeded `auth.users` row is confirmed and shares one password, read from `E2E_SEED_PASSWORD`                                                                                                                                                              | `pickSeededUser()`, `seedPassword()`  | Unit 2 setup, login specs       |
| S6  | At least one seeded user has no roster row on any `ACTIVE` weekend                                                                                                                                                                                             | `pickNonRosterUser()`                 | Unit 3 negative case            |
| S7  | At least one seeded user's roles (`user_roles` → `roles.permissions`, following `roles.based_on_role_id`) grant `FULL_ACCESS`, or both `MANAGE_BILLING` and `READ_ADMIN_PORTAL`                                                                                | `pickBillingManager()`                | billing specs                   |

The seed (`scripts/seed/`, `pre-weekend` phase) owns these invariants and pins one person per
invariant in its own README (the "E2E fixtures" section). `scripts/seed/world.test.ts` asserts
those pins hold. Because this suite selects by predicate rather than by name, a re-pin on the seed
side never touches a spec here. When a selector cannot find a matching row, it throws a message of
the form `Seed invariant S<n> not met: <what was looked for>`, which is the first thing to read when
global setup fails after a seed change.

## Rate limit budget

Local GoTrue allows 30 sign-in/sign-up requests per IP per 5 minutes. A full run costs 3 sign-ins
from global setup (`teamForms`, `teamFee`, `billingManager`) plus 6 from the auth spec (login, wrong
password, unknown email, register, duplicate email, mismatched passwords stops before any request) —
about 9 requests, doubled to about 18 if one test retries. That leaves headroom, and it must stay that way:
**`config.toml`'s `[auth]` rate limit is never raised** to buy more room, because `supabase config
push` applies `[auth]` to production on every merge to `main`. If the budget ever gets tight, the
fix is to sign personas in through the admin API (`auth.admin.generateLink`) instead of the real
form, not to raise the limit.

## CI

`.github/workflows/ci.yml` runs on every pull request, on `workflow_dispatch`, and as the first job of
`release.yml`, with a single **`checks`** job: checkout, Node via `.nvmrc`, `bun install
--frozen-lockfile`, `bun run lint`, `bunx tsc --noEmit`, `bun run test`.

The Playwright suite lives in `.github/workflows/e2e.yml`, which runs nightly (08:00 UTC) against
`main` and on `workflow_dispatch` (Actions tab → E2E → Run workflow, on any branch). It was moved out
of `ci.yml` because it made every PR and push to `main` too slow. Its one job, **`e2e`**:

- checkout and install, then `supabase/setup-cli@v1` and `supabase start` with the
  unneeded containers excluded (Studio, Postgres Meta, imgproxy, Mailpit, Logflare, Vector, Edge
  Runtime, Realtime, Supavisor — the app needs only auth, REST, storage and the gateway). A step then
  reads `supabase status -o env` and exports the real local Supabase URL and keys to `$GITHUB_ENV`,
  replacing the placeholder values used earlier. `bun run build` runs next (with `.next/cache`
  restored from a lockfile-and-source-hash key), followed by a cached `bunx playwright install
--with-deps chromium` and finally `bun run e2e`, whose global setup reseeds `pre-weekend`. On
  failure, `playwright-report/` and `test-results/` are uploaded as a build artifact.

The `e2e` job's placeholder environment variables (`STRIPE_SECRET_KEY=sk_test_e2e_dummy`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_e2e_dummy`, `STRIPE_WEBHOOK_SECRET=whsec_e2e_dummy`,
`CANDIDATE_FEE_PRODUCT_ID`/`TEAM_FEE_PRODUCT_ID=prod_e2e_dummy`, `RESEND_API_KEY=re_e2e_dummy`) exist
only to satisfy import-time checks in `lib/stripe.ts`, the checkout components and the Resend
client; nothing in the PR run talks to Stripe or Resend for real. `STRIPE_WEBHOOK_SECRET` is a
placeholder the app and the E2E fixtures both read, since the payments specs sign synthetic webhook
events with it. The three platform billing placeholders (`PLATFORM_STRIPE_SECRET_KEY=rk_test_e2e_dummy`,
`PLATFORM_STRIPE_WEBHOOK_SECRET=whsec_platform_e2e_dummy`, `PLATFORM_STRIPE_PRICE_ID=price_e2e_dummy`)
make the Billing page render its configured state (the Subscribe button) while every real Stripe call
fails; the page degrades on its own (no payment method, "Invoices couldn't be loaded"), and
`PLATFORM_STRIPE_WEBHOOK_SECRET` is shared with the billing spec, which signs synthetic platform events
with it. `NEXT_PUBLIC_SENTRY_ENABLED=false` keeps the CI production build from reporting to
the real Sentry project (`lib/sentry.ts` only enables Sentry when that flag is not explicitly
`'false'`); it is never set on Vercel, so production reporting is unaffected.

Wall-time expectations: install with cache about 30 seconds; `supabase start` with the exclusion
list 60–120 seconds (image pulls dominate); `next build` 90–180 seconds cold, less with `.next/cache`
restored; the Playwright browser install about 20 seconds cached; the tests themselves under a
minute — about seven minutes end to end on a cold cache, which is why it no longer gates PRs.

## Cleanup rules

Every fixture that writes data restores or removes it in its own teardown: the team-forms fixture
snapshots and restores the `teamForms` persona's rows, and the payments fixtures delete only the
rows they created. No spec or fixture ever calls `bun run db:reset` or otherwise touches the database
outside its own arrange/assert/cleanup.

Rows a crashed run can still leave behind are deliberately identifiable, so they are easy to find
and safe to remove by hand:

- **Auth users** from the signup spec, `e2e+<runId>@example.com` (`e2e/fixtures/auth-users.ts`'s
  `e2eEmail()`). Remove them with `deleteE2EAuthUsers()` from that file, for example as a one-liner:
  `node -e "require('./e2e/fixtures/auth-users').deleteE2EAuthUsers().then(n => console.log(n))"`
  run through the project's TypeScript loader, or by hand in `supabase studio`.
- **Payments**, `payment_intent_id` starting with `pi_e2e_`. Remove with SQL:

  ```sql
  delete from payment_transaction where payment_intent_id like 'pi_e2e_%';
  ```

- **Platform billing**, `billing_webhook_events.stripe_event_id` starting with `evt_e2e_billing_` (the
  next billing run sweeps them too), and a `billing_account` row carrying `sub_e2e_` / `cus_e2e_`
  ids. The billing specs snapshot that row to `e2e/.auth/billing-account.snapshot.json` before
  touching it; if a run dies before restoring, the next billing run writes the file back (only when
  the row still holds test state), or you can copy the values back by hand.

When in doubt, `bun run seed pre-weekend --yes` (destructive, owner's call) rebuilds a clean world from
scratch rather than hunting for leftovers.

## Billing

Platform billing (`docs/platform-billing.md`) is covered in two layers, both as the `billingManager`
persona. `billing_account` is migration-seeded and survives the reseed, and a developer's local row
can hold a real sandbox subscription, so both specs snapshot the row in `beforeAll`, reset it to
never-subscribed, and restore it column for column in `afterAll` (`e2e/fixtures/billing.ts`).

- **`e2e/billing.spec.ts` (every run, no Stripe account).** Synthetic, signed
  `customer.subscription.created/updated/deleted` and `invoice.payment_failed` events, basil-shaped,
  POSTed to `/api/webhooks/platform-billing` and signed with `PLATFORM_STRIPE_WEBHOOK_SECRET`. In
  order: the never-subscribed page offers Subscribe; a created subscription shows Active with its
  renewal date; a replayed event is answered `processed: false` with one ledger row; a failed
  renewal shows the Billing page banner and the dashboard alert; an older out-of-order update is
  recorded as `skipped_stale` and changes nothing; cancellation brings Subscribe back; unsigned and
  forged posts are rejected with 400. `checkout.session.completed` is not used here, because its
  handler reads the subscription from Stripe live.
- **`e2e/billing-live.spec.ts` (`@stripe-live`, only with `E2E_STRIPE_LIVE=1`).** Presses Subscribe
  against a real Stripe sandbox and waits for `checkout.stripe.com`, which proves the platform key,
  price id and customer creation work. Stripe's page is never filled in. It skips itself when
  `PLATFORM_STRIPE_SECRET_KEY` or `PLATFORM_STRIPE_PRICE_ID` is missing; the dev server must hold the
  same sandbox values. Each run leaves one Customer (and an expiring Checkout Session) in the sandbox.
  Run it with `E2E_STRIPE_LIVE=1 bun run e2e --grep @stripe-live`.

## Adding a spec

- New flows get their own file, `e2e/<flow>.spec.ts`.
- Import the project's fixtures (`e2e/fixtures/*.ts`) rather than `@playwright/test` directly
  whenever a fixture already covers what the spec needs — `adminClient()`/`anonClient()` for
  database access, the seed selectors for picking people, `personas.ts` for reading the run's cast.
- Never put a seeded id or email in a spec or fixture. `e2e/fixtures/seed.ts` is the only file
  allowed to know the seed's shape; everything else selects by predicate or reads `personas.json`.
- Scope locators on admin `DataTable`s: the shared table renders every row twice, once as the
  desktop table and once as mobile cards (one hidden by CSS), so a bare row locator matches twice.
- Keep new logins out of specs. Reuse a persona's saved storage state
  (`test.use({ storageState: storageStatePath('teamForms') })`) instead of signing in inside the
  test; the negative-case pattern of signing in mid-test is the deliberate exception, and it is
  counted against the rate-limit budget above when added.
- Add cleanup for anything the spec writes, following the identifiable-rows convention above.
- Rows read through the shared server cache (`lib/cache/cached-read.ts`: weekends, events, fees,
  settings, roles) don't refresh when a fixture changes them directly, since no `updateTag` runs. A
  spec that rearranges them calls `bypassServerCache(context, baseURL)` (`e2e/fixtures/secuela.ts`),
  which sets a cookie the dev server honours; the nightly CI build sets `E2E_DISABLE_SERVER_CACHE=1`
  instead. `e2e/secuela-banner.spec.ts` is the example.

## Where the merge gate lives

The owner pushes to `main` directly, so there is no branch protection gating merges — that's a
deliberate decision, not an oversight. The real gate is `release.yml`: its `ci` job calls the
reusable `ci.yml` workflow (`uses: ./.github/workflows/ci.yml`) as the first thing that runs on
every push to `main`, and `migrate`, `release`, and `deploy` all wait on it (`migrate: needs: ci`,
chained through to `deploy`). If the `checks` job inside that call fails, nothing downstream runs —
no migration, no release, no deploy.

The E2E suite is **not** part of that gate: a regression it would catch can reach production and
shows up as a red nightly `E2E` run the next morning. Run `bun run e2e` locally (or dispatch the
workflow on your branch) before pushing changes to the flows it covers.

`ci.yml`'s `pull_request` trigger also runs `checks` on any PR opened against `main`, which gives
early signal before a push, but that run is informational only: it is not required by branch
protection, and merging is not blocked on it.
