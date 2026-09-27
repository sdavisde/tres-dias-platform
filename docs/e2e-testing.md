# E2E Testing

A Playwright suite covering the three flows the owner most needs protected: accounts (login,
register, error messages), team forms, and fee payments. It runs against a production build
(`next build && next start`) in CI and against your own running dev server locally; it is not part
of `yarn test` and never runs under Jest.

## Running locally

Prerequisites, all the owner's call — the suite never starts, seeds or resets anything for you:

- A local Supabase running (`yarn db:start`) and seeded with `yarn seed pre-weekend --yes`. This is
  **destructive**: it wipes all app data and every local auth user before rebuilding the
  `pre-weekend` world. Only run it when you mean to.
- The dev server running on the suite's base URL (`yarn dev`, default `http://localhost:3000`).
- `.env.local` with the three local Supabase values (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) plus `STRIPE_WEBHOOK_SECRET`, which
  the payment fixtures share with the app to sign synthetic webhook events. Dummy Stripe and Resend
  values (`sk_test_e2e_dummy`, `pk_test_e2e_dummy`, `re_e2e_dummy`, and so on) are fine for local
  runs too — nothing in the suite talks to the real services.
- `npx playwright install chromium`, once.

| Command                    | What it does                                               |
| -------------------------- | ---------------------------------------------------------- |
| `yarn e2e`                 | Runs the full suite: the `setup` project, then every spec. |
| `yarn e2e --project=setup` | Runs only persona selection and sign-in, for debugging.    |
| `yarn e2e --grep <name>`   | Runs specs whose title matches `<name>` (plus `setup`).    |
| `yarn e2e:ui`              | Opens Playwright's UI mode against the same config.        |
| `yarn e2e:report`          | Opens the HTML report from the last run.                   |

Two environment variables tune a run: `E2E_BASE_URL` (default `http://localhost:3000`) is the base
URL Playwright drives, and `E2E_SEED_PASSWORD` (default `password`) is the shared password of every
seeded auth user.

Locally the suite reuses whatever dev server is already answering on the base URL
(`webServer.reuseExistingServer`) and never starts or resets the database. Only in CI does it start
its own server against a fresh build.

## How it is put together

A `setup` project runs before any spec. It selects the run's cast by predicate (see Seed Invariants
below), writes the chosen ids, emails and fee numbers to `e2e/.auth/personas.json`, then signs two
of those personas in through the real `/login` form and saves their storage state to
`e2e/.auth/<persona>.json`. The whole `e2e/.auth/` directory is gitignored; it is regenerated every
run.

The personas:

| Persona              | What it is for                                                            |
| -------------------- | ------------------------------------------------------------------------- |
| `teamForms`          | Roster member with no forms and no payments (team forms flow, S2).        |
| `teamFee`            | Roster member who owes the team fee, distinct from `teamForms` (S3).      |
| `seededUser`         | Any confirmed seeded user, for the plain login case (S5).                 |
| `nonRosterUser`      | Confirmed user on no roster of an active weekend, the negative case (S6). |
| `candidates.full`    | Candidate awaiting payment with nothing paid (S4).                        |
| `candidates.partial` | Candidate awaiting payment with a partial payment below the fee (S4).     |
| `group`              | The one active weekend group's id, number and fee amounts (S1).           |

A spec opts into a signed-in persona with `test.use({ storageState: storageStatePath('teamForms') })`
(from `e2e/fixtures/personas.ts`); auth specs use no storage state at all, since they exercise
login and registration themselves. Any spec reads the chosen cast with `readPersonas()`, which
throws a clear error if `personas.json` is missing (run `yarn e2e --project=setup` first, or just
`yarn e2e`, since the `chromium` project depends on `setup`).

`adminClient()` (`e2e/fixtures/supabase.ts`) is a service-role Supabase client for fixtures to
arrange data, assert on it and clean it up. It bypasses Row Level Security, so it is never used to
assert that a policy allows or denies something — that needs `anonClient()` signed in as a real
user.

## Seed invariants

The suite never selects a person by id or email; it asks the seeded database a predicate question
and fails loudly if nothing answers it. Each row below is checked by a selector in
`e2e/fixtures/seed.ts`:

| #   | Invariant                                                                                                                                                                                           | Selector                              | Used by                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------- |
| S1  | Exactly one weekend group has a weekend with status `ACTIVE`, and that group has `team_fee`, `candidate_fee` and `online_surcharge` set                                                             | `activeGroup()`                       | every payments spec, team forms |
| S2  | At least one `weekend_group_members` row of that group has an active roster row (`status <> 'drop'`) in a non-exempt role, **zero** `team_form_completions` and **zero** `payment_transaction` rows | `pickTeamFormsMember()`               | Unit 3                          |
| S3  | At least two further such members exist, so the team-fee persona is never the team-forms persona                                                                                                    | `pickUnpaidTeamMember({ excluding })` | Unit 4, Unit 6                  |
| S4  | At least one candidate on an `ACTIVE` weekend is `awaiting_payment` with no `payment_transaction` rows, and at least one other is `awaiting_payment` with a partial payment below the fee           | `pickAwaitingCandidate({ partial })`  | Unit 4, Unit 6                  |
| S5  | Every seeded `auth.users` row is confirmed and shares one password, read from `E2E_SEED_PASSWORD`                                                                                                   | `pickSeededUser()`, `seedPassword()`  | Unit 2 setup, login specs       |
| S6  | At least one seeded user has no roster row on any `ACTIVE` weekend                                                                                                                                  | `pickNonRosterUser()`                 | Unit 3 negative case            |

The seed (`scripts/seed/`, `pre-weekend` phase) owns these invariants and pins one person per
invariant in its own README (the "E2E fixtures" section). `scripts/seed/world.test.ts` asserts
those pins hold. Because this suite selects by predicate rather than by name, a re-pin on the seed
side never touches a spec here. When a selector cannot find a matching row, it throws a message of
the form `Seed invariant S<n> not met: <what was looked for>`, which is the first thing to read when
`setup` fails after a seed change.

## Rate limit budget

Local GoTrue allows 30 sign-in/sign-up requests per IP per 5 minutes. A full run costs 2 sign-ins
from `setup` (`teamForms`, `teamFee`) plus 6 from the auth spec (login, wrong password, unknown
email, register, duplicate email, mismatched passwords stops before any request) — about 8 requests,
doubled to about 16 if one test retries. That leaves headroom, and it must stay that way:
**`config.toml`'s `[auth]` rate limit is never raised** to buy more room, because `supabase config
push` applies `[auth]` to production on every merge to `main`. If the budget ever gets tight, the
fix is to sign personas in through the admin API (`auth.admin.generateLink`) instead of the real
form, not to raise the limit.

## CI

`.github/workflows/ci.yml` runs on every pull request and on `workflow_dispatch`, with two jobs:

- **`checks`** — checkout, Node via `.nvmrc` with the Yarn cache, `yarn install --frozen-lockfile`,
  `yarn lint`, `npx tsc --noEmit`, `yarn test`.
- **`e2e`** — checkout and install, then `supabase/setup-cli@v1` and `supabase start` with the
  unneeded containers excluded (Studio, Postgres Meta, imgproxy, Mailpit, Logflare, Vector, Edge
  Runtime, Realtime, Supavisor — the app needs only auth, REST, storage and the gateway). Next,
  `yarn seed pre-weekend --yes` builds the same world described above inside the runner's
  `supabase_db_<project_id>` container. A step then reads `supabase status -o env` and exports the
  real local Supabase URL and keys to `$GITHUB_ENV`, replacing the placeholder values used earlier.
  `yarn build` runs next (with `.next/cache` restored from a lockfile-and-source-hash key), followed
  by a cached `npx playwright install --with-deps chromium` and finally `yarn e2e`. On failure,
  `playwright-report/` and `test-results/` are uploaded as a build artifact.

The `e2e` job's placeholder environment variables (`STRIPE_SECRET_KEY=sk_test_e2e_dummy`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_e2e_dummy`, `STRIPE_WEBHOOK_SECRET=whsec_e2e_dummy`,
`CANDIDATE_FEE_PRODUCT_ID`/`TEAM_FEE_PRODUCT_ID=prod_e2e_dummy`, `RESEND_API_KEY=re_e2e_dummy`) exist
only to satisfy import-time checks in `lib/stripe.ts`, the checkout components and the Resend
client; nothing in the PR run talks to Stripe or Resend for real. `STRIPE_WEBHOOK_SECRET` is the one
placeholder the app and the E2E fixtures both read, since the payments specs sign synthetic webhook
events with it. `NEXT_PUBLIC_SENTRY_ENABLED=false` keeps the CI production build from reporting to
the real Sentry project (`lib/sentry.ts` only enables Sentry when that flag is not explicitly
`'false'`); it is never set on Vercel, so production reporting is unaffected.

Wall-time expectations: install with cache about 30 seconds; `supabase start` with the exclusion
list 60–120 seconds (image pulls dominate); `next build` 90–180 seconds cold, less with `.next/cache`
restored; the Playwright browser install about 20 seconds cached; the tests themselves under a
minute. `checks` runs in parallel with `e2e`, so the critical path is the `e2e` job, targeted at
under about seven minutes end to end on a cold cache.

## Cleanup rules

Every fixture that writes data restores or removes it in its own teardown: the team-forms fixture
snapshots and restores the `teamForms` persona's rows, and the payments fixtures delete only the
rows they created. No spec or fixture ever calls `yarn db:reset` or otherwise touches the database
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

When in doubt, `yarn seed pre-weekend --yes` (destructive, owner's call) rebuilds a clean world from
scratch rather than hunting for leftovers.

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

## Where the merge gate lives

_To be filled in when Unit 5 (Merge Gate and Release Ordering) lands: branch protection on `main`
requiring the `checks` and `e2e` status checks, and how `release.yml` sequences its own `ci` job
before `migrate`._
