# 20-tasks-e2e-testing.md

> Implementation tasks for the PR CI gate and the E2E regression suite (Epic 1 of the platform roadmap,
> "Infra foundation"). Source spec: `20-spec-e2e-testing.md`. Decisions in the spec's Settled Decisions
> table and the Seed Invariants table are fixed inputs. Where an Open Question has a default, the task
> implements the default and says so.

## Relevant Files

| File                                                                          | Why It Is Relevant                                                                                                                                 |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit 1**                                                                    |                                                                                                                                                    |
| `.github/workflows/ci.yml`                                                    | New. `pull_request` + `workflow_dispatch`; jobs `checks` and `build` (renamed `e2e` in Unit 2).                                                    |
| `.github/workflows/release.yml`                                               | Read-only reference for the `supabase/setup-cli@v1` and `setup-node` patterns already in use; edited in Unit 5.                                    |
| `lib/sentry.ts`                                                               | `enabled` gains the `NEXT_PUBLIC_SENTRY_ENABLED !== 'false'` guard (FR-1.4).                                                                       |
| `.env.example`                                                                | Document `NEXT_PUBLIC_SENTRY_ENABLED`, `E2E_BASE_URL`, `E2E_SEED_PASSWORD`.                                                                        |
| `docs/platform-roadmap-status.md`                                             | Epic 1 row updated in Units 1 and 5.                                                                                                               |
| **Unit 2**                                                                    |                                                                                                                                                    |
| `package.json`, `yarn.lock`                                                   | Add `@playwright/test` (exact pin), `dotenv`; scripts `e2e`, `e2e:ui`, `e2e:report`, `e2e:stripe` (Unit 6).                                        |
| `playwright.config.ts`                                                        | New, from PR #35 (`1ace8f5`): serial, Chromium, `setup` project, `webServer` that reuses a running dev server locally and runs `yarn start` in CI. |
| `e2e/personas.setup.ts`                                                       | New. Runs the seed selectors, writes `e2e/.auth/personas.json`, signs each persona in through `/login`, saves storage state.                       |
| `e2e/fixtures/supabase.ts`                                                    | New, from PR #35: `adminClient()`, `anonClient()`, `signInAs()`, `requireEnv()`.                                                                   |
| `e2e/fixtures/seed.ts`                                                        | New. Seed Invariant selectors S1–S6; each throws `Seed invariant S<n> not met: …`.                                                                 |
| `e2e/fixtures/personas.ts`                                                    | New. Types and read/write for `e2e/.auth/personas.json`.                                                                                           |
| `e2e/fixtures/auth-users.ts`                                                  | New. `deleteAuthUser(email)` via the admin auth API; `e2eEmail(runId)`.                                                                            |
| `e2e/auth.spec.ts`                                                            | New. Six auth scenarios (FR-2.6).                                                                                                                  |
| `lib/auth/auth-errors.ts`, `lib/auth/auth-errors.test.ts`                     | New. `describeAuthError` and its unit test (FR-2.7, FR-2.9).                                                                                       |
| `lib/auth/constants.ts`                                                       | New or shared with spec 19 task 7.1: `MIN_PASSWORD_LENGTH`.                                                                                        |
| `components/auth/AuthForm.tsx`                                                | Render the mapped message and hint; log the raw error (FR-2.8). Also touched by spec 19 Unit 7; rebase whichever lands second.                     |
| `eslint.config.mjs`                                                           | PR #35 override: `react-hooks/rules-of-hooks` off under `e2e/**/*.ts` (FR-2.11).                                                                   |
| `.gitignore`                                                                  | Already has `/test-results/`, `/playwright-report/`, `/playwright/.cache/` (lines 58–62); add `/e2e/.auth/`.                                       |
| `docs/e2e-testing.md`                                                         | New, from PR #35, rewritten for this suite (FR-2.12).                                                                                              |
| `Taskfile.yml`                                                                | Read-only reference: `write-supabase-keys` (l.319) shows how the local keys are derived from `supabase status`; `ci.yml` mirrors it.               |
| **Unit 3**                                                                    |                                                                                                                                                    |
| `e2e/fixtures/team-forms.ts`                                                  | New. Snapshot and restore the `teamForms` persona's rows; clear completions before and after.                                                      |
| `e2e/team-forms.spec.ts`                                                      | New. Five steps, gating, negative case (FR-3.2–FR-3.4).                                                                                            |
| `components/team-forms/schemas.ts`, `components/team-forms/*.tsx`             | Read-only: field names and validation strings the spec fills and asserts.                                                                          |
| `app/(member)/team-forms/layout.tsx`, `app/(member)/team-forms/page.tsx`      | Read-only: redirects and the `All forms completed!` state.                                                                                         |
| **Unit 4**                                                                    |                                                                                                                                                    |
| `lib/payments/checkout-metadata.ts`, `lib/payments/checkout-metadata.test.ts` | New. `buildCheckoutMetadata` and its key-set test (FR-4.1).                                                                                        |
| `actions/checkout.ts`                                                         | `beginCheckout` calls `buildCheckoutMetadata` instead of building the object inline (l.78–84).                                                     |
| `services/stripe/handlers/checkout-session-completed.ts`                      | Replay short-circuit on existing `payment_intent_id` before any write (FR-4.6).                                                                    |
| `services/payment/payment-service.ts`, `services/payment/repository.ts`       | Add a `findByPaymentIntentId` read (admin client) if none exists.                                                                                  |
| `e2e/fixtures/stripe-events.ts`                                               | New. `signedCheckoutCompleted(...)`, `postWebhook(...)`.                                                                                           |
| `e2e/fixtures/payments.ts`                                                    | New. Cleanup of `pi_e2e_` rows, candidate status reset, `email_log` window cleanup.                                                                |
| `e2e/payments-team-fee.spec.ts`, `e2e/payments-candidate-fee.spec.ts`         | New (FR-4.3–FR-4.5, FR-4.7).                                                                                                                       |
| `lib/payments/checkout-price.ts`                                              | Read-only: `CHECKOUT_REFUSAL_MESSAGES`, `formatFee`/`toStripeAmount` imported by specs.                                                            |
| **Unit 5**                                                                    |                                                                                                                                                    |
| `.github/workflows/ci.yml`                                                    | Add `workflow_call` trigger.                                                                                                                       |
| `.github/workflows/release.yml`                                               | New first job `ci` (uses `./.github/workflows/ci.yml`); `migrate` gains `needs: ci`.                                                               |
| **Unit 6**                                                                    |                                                                                                                                                    |
| `.github/workflows/e2e-stripe.yml`                                            | New. `schedule` + `workflow_dispatch`; Stripe CLI listen; real test keys.                                                                          |
| `.github/actions/e2e-setup/action.yml`                                        | New composite action if the shared steps exceed a few lines (FR-6.1).                                                                              |
| `e2e/stripe-live/team-fee.spec.ts`, `e2e/stripe-live/candidate-fee.spec.ts`   | New. Tagged `@stripe-live`; iframe checkout, success pages, metadata deep-equal (FR-6.3).                                                          |

### Notes

- Tests that need no browser or database stay in Jest as co-located `.test.ts` (`yarn test`). Browser
  tests are `e2e/**/*.spec.ts` and run with `yarn e2e`; Jest's `**/*.test.ts` glob never matches them.
- Lint with `yarn lint` (never raw `npx eslint`); type-check with `npx tsc --noEmit`. `yarn build` is
  what CI runs; the Unit 1 job proves it passes with placeholder env.
- **The owner runs the local database and dev server.** Never run `yarn db:reset`, `yarn db:start/stop`
  or `yarn dev` yourself; `yarn e2e` reuses whatever is running on `localhost:3000` and `54321`.
- **No seeded UUID or email appears in any spec or fixture.** `e2e/fixtures/seed.ts` is the only file
  that knows the seed's shape, through the six invariants. The seed is being reworked on another
  branch into named scenarios (now merged: `scripts/seed/`, run with `yarn seed pre-weekend --yes`;
  the README's `bun run seed` is the same script on Node). The suite uses **`pre-weekend`**. If a
  selector throws, report which invariant and stop. Locally the owner runs the seed; CI runs it right
  after `supabase start` (task 2.11).
- `supabase config push` runs on every merge to `main` and overwrites prod `[auth]` settings, so
  `config.toml` is never edited here (rate limits stay at 30 sign-ins / 5 min).
- Server actions return `Result<Error, T>`; use `Results.*` helpers and `isNil()`; user-facing errors
  go through `toastError()`. UI is shadcn-only.
- Commits are Conventional Commits; header and body lines ≤ 100 chars (commitlint). Never put the
  literal skip-ci marker in a commit body.
- Placeholder env used by CI everywhere a real value is not needed: `STRIPE_SECRET_KEY=sk_test_e2e_dummy`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_e2e_dummy`, `STRIPE_WEBHOOK_SECRET=whsec_e2e_dummy`,
  `RESEND_API_KEY=re_e2e_dummy`, `CANDIDATE_FEE_PRODUCT_ID=prod_e2e_dummy`,
  `TEAM_FEE_PRODUCT_ID=prod_e2e_dummy`, `SITE_URL=http://localhost:3000`, `NEXT_PUBLIC_SENTRY_ENABLED=false`.
- Suggested agent sizing (per the owner's routing policy): tasks marked **[S]** have a fully known
  scope and suit Sonnet; **[O]** need judgement (Opus); the whole of Unit 2 is a long run (Fable).

## Tasks

### [ ] 1.0 PR CI gate: lint, type-check, unit tests and a production build on every pull request

A non-technical user can confirm this is done by opening any pull request and seeing two checks named
`checks` and `build` turn green in a few minutes, and by seeing the same checks turn red when a
teammate pushes a change that does not compile.

#### 1.0 Proof Artifact(s)

- Screenshot or link: a PR with `checks` and `build` green, total under about four minutes (FR-1.1–FR-1.3)
- Link: a run on the same PR after a deliberate type error, `checks` red; then green after revert (FR-1.2)
- CLI: `grep -n NEXT_PUBLIC_SENTRY_ENABLED lib/sentry.ts .github/workflows/ci.yml .env.example` shows all three (FR-1.4)
- CLI: the `build` job log shows `yarn build` succeeding with no Supabase step in the job (FR-1.5)

#### 1.0 Tasks

- [ ] 1.1 **[S]** In `lib/sentry.ts` change `enabled` to
      `process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_ENABLED !== 'false'` and
      extend the file's header comment with one line explaining the CI kill switch. Add
      `NEXT_PUBLIC_SENTRY_ENABLED=` with a comment to `.env.example` under "O11Y Keys" (FR-1.4).
- [ ] 1.2 **[S]** Create `.github/workflows/ci.yml`: `name: CI`; `on: pull_request` (no branch filter)
      and `workflow_dispatch`; `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }`;
      `permissions: contents: read`. Job `checks` (`ubuntu-latest`): `actions/checkout@v4`;
      `actions/setup-node@v4` with `node-version-file: .nvmrc` and `cache: yarn`;
      `yarn install --frozen-lockfile`; `yarn lint`; `npx tsc --noEmit`; `yarn test` (FR-1.1, FR-1.2).
- [ ] 1.3 **[S]** Add job `build` (parallel, no `needs`): same checkout/node/install; `yarn build` with a
      job-level `env:` block holding every placeholder from the Notes plus
      `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`,
      `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_e2e_dummy`,
      `SUPABASE_SECRET_KEY=sb_secret_e2e_dummy`. Do not set `SENTRY_AUTH_TOKEN`. Cache `.next/cache`
      with `actions/cache@v4` keyed `${{ runner.os }}-next-${{ hashFiles('yarn.lock') }}-${{ hashFiles('**/*.ts', '**/*.tsx') }}`
      and restore-key `${{ runner.os }}-next-${{ hashFiles('yarn.lock') }}-` (FR-1.3).
- [ ] 1.4 **[O]** Open the PR and read the `build` log. If `next build` fails because a page prerenders
      with a Supabase or Stripe call, find that page and mark it dynamic (`export const dynamic =
'force-dynamic'` or a `connection()` call), with a comment saying why, rather than adding Supabase to
      the job (FR-1.5). If it fails on an import-time throw not covered by the placeholders, add the
      missing placeholder to `env:` and to the Notes list.
- [ ] 1.5 **[S]** Push a commit with a deliberate type error, confirm `checks` fails, revert it. Update
      the Epic 1 row in `docs/platform-roadmap-status.md`: "PR CI gate (lint / typecheck / tests /
      build) shipped <date>; E2E harness in progress (spec 20)" (FR-1.6). Merge.

### [ ] 2.0 Playwright harness, auth flows, and owned auth error messages

A non-technical user can confirm this is done by typing a wrong password on the login page and reading
a plain sentence telling them the email and password don't match with a link to reset it, by trying to
register with an email that already has an account and being pointed to sign in instead, and by seeing
a check named `e2e` on every pull request.

#### 2.0 Proof Artifact(s)

- CLI: `yarn e2e` against the owner's running stack, run twice back to back, both green: `setup` plus six auth scenarios (FR-2.3, FR-2.6)
- CLI: `yarn test` green including `lib/auth/auth-errors.test.ts` (FR-2.9)
- Link: a PR with `checks` and `e2e` green; `e2e` under about seven minutes on a cold cache (FR-2.10)
- Manual: wrong password on `/login`; duplicate email on `/join`; each shows the new message and hint (FR-2.7, FR-2.8)
- CLI: `grep -rn "b0000\|ab0000\|@example.com" e2e/ | grep -v "e2e+\|e2e-unknown"` returns nothing outside comments in `e2e/fixtures/seed.ts`; the suite's own throwaway addresses (`e2e+…`, `e2e-unknown-…`) are the only `@example.com` strings (Seed Invariants)

#### 2.0 Tasks

- [ ] 2.1 **[S]** `yarn add -D -E @playwright/test` (exact pin) and `yarn add -D dotenv`. Add scripts
      `"e2e": "playwright test"`, `"e2e:ui": "playwright test --ui"`, `"e2e:report": "playwright show-report"`.
      Append `/e2e/.auth/` to `.gitignore` next to the existing Playwright lines (FR-2.1).
- [ ] 2.2 **[S]** Fetch PR #35's `playwright.config.ts` (`gh api repos/sdavisde/tres-dias-platform/contents/playwright.config.ts?ref=1ace8f5910a779fa0eb434fe3e79913600d8c3d5 --jq .content | base64 -d`)
      and adapt: `baseURL` default `http://localhost:3000`; `projects`: `setup` matching
      `/personas\.setup\.ts/` and `chromium` (`devices['Desktop Chrome']`, `dependencies: ['setup']`,
      no project-level `storageState`); `grepInvert: /@stripe-live/` unless `E2E_STRIPE_LIVE=1`;
      `webServer`: `command: process.env.CI === 'true' ? 'yarn start' : 'yarn dev'`,
      `reuseExistingServer: process.env.CI !== 'true'`, `timeout: 120_000`; keep `workers: 1`,
      `fullyParallel: false`, `retries` 1 in CI, `github` reporter in CI, trace on first retry,
      screenshot on failure, `loadEnv({ path: '.env.local', quiet: true })`. Drop the `database`
      project and the `E2E_CHROMIUM_PATH` launch option (FR-2.2).
- [ ] 2.3 **[S]** Fetch PR #35's `e2e/fixtures/supabase.ts` the same way and keep it as is (it already
      types the client with `Database` from `@/database.types`). Add the ESLint override from PR #35 to
      `eslint.config.mjs` (`files: ['e2e/**/*.ts']`, `'react-hooks/rules-of-hooks': 'off'`) (FR-2.4, FR-2.11).
- [ ] 2.4 **[O]** Create `e2e/fixtures/seed.ts` with the six selectors from the spec's Seed Invariants
      table, each one query (joins allowed) on `adminClient()`:
      `activeGroup()` → the one group whose weekend has `status = 'ACTIVE'`, with non-null `team_fee`,
      `candidate_fee`, `online_surcharge` (throw if zero or more than one group);
      `pickTeamFormsMember()` → a `weekend_group_members` row of that group joined to a `weekend_roster`
      row with `status <> 'drop'` whose `cha_role` is not in the exempt list exported from
      `lib/payments/group-fees.ts`, with no `team_form_completions` and no live `payment_transaction`
      rows for the member (use the same "covered so far" logic as `getCheckoutQuote`, including legacy
      roster-id targets, or import the helper if it is pure);
      `pickUnpaidTeamMember({ excluding })` → same predicate minus the completions condition, different
      user; `pickAwaitingCandidate({ partial })` → `candidates.status = 'awaiting_payment'` on an ACTIVE
      weekend, with zero payments (`partial: false`) or payments summing to less than `candidate_fee`
      (`partial: true`); `pickSeededUser()` → any confirmed `auth.users` row via
      `auth.admin.listUsers` with a matching `public.users` row; `pickNonRosterUser()` → a confirmed
      user with no `weekend_roster` row on any ACTIVE weekend; `seedPassword()` →
      `process.env.E2E_SEED_PASSWORD ?? 'password'`. Every throw reads
      `Seed invariant S<n> not met: <one line describing the row looked for>`. Return typed rows
      (`Tables<'…'>` from `database.types.ts`) plus the derived numbers the specs need (`fee`,
      `surcharge`, `covered`). No seeded ids or emails in this file except in comments (FR-2.4a).
- [ ] 2.5 **[S]** Create `e2e/fixtures/personas.ts`: `type Personas = { teamForms: {...}, teamFee: {...},
seededUser: {...}, nonRosterUser: {...}, candidates: { full: {...}, partial: {...} }, group: {...} }`
      with `writePersonas(p)` / `readPersonas()` on `e2e/.auth/personas.json`. Create
      `e2e/fixtures/auth-users.ts`: `e2eEmail()` returning `e2e+${process.env.GITHUB_RUN_ID ?? Date.now()}@example.com`
      and `deleteAuthUser(email)` using `adminClient().auth.admin.listUsers()` (page through if needed)
      then `auth.admin.deleteUser(id)`; no-op when not found (FR-2.5).
- [ ] 2.6 **[O]** Create `e2e/personas.setup.ts` (from PR #35's `auth.setup.ts` pattern): one `setup`
      test that calls the selectors, writes `personas.json`, then for `teamForms` and `teamFee` opens
      `/login`, fills `#email` / `#password` (`seedPassword()`), clicks `button[type="submit"]`, waits
      for the URL to leave `/login`, and saves `e2e/.auth/teamForms.json` / `teamFee.json`. Assert
      `/home` renders before saving. Two logins total (FR-2.3).
- [ ] 2.7 **[O]** Create `lib/auth/constants.ts` exporting `MIN_PASSWORD_LENGTH` (6 today; spec 19 task
      7.1 raises it to 8 and reuses this file). Create `lib/auth/auth-errors.ts` with `describeAuthError`
      per FR-2.7: read `error.code` when the error is an `AuthApiError` (`isAuthApiError` from
      `@supabase/supabase-js`), fall back to matching the known message strings (`Invalid login
credentials`, `User already registered`, `Password should be at least`), then to the generic message.
      Messages, exact: invalid credentials → `That email and password don't match. Check for typos, or
reset your password.` + hint `Reset password` (`forgot-password`); already registered → `An account
with that email already exists. Sign in instead.` + hint `Go to sign in` (`switch-to-login`); weak
      password → `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`; rate limited → `Too
many attempts. Please wait a few minutes and try again.`; email not confirmed → `Please confirm your
email address, then sign in.`; invalid email → `Please enter a valid email address.`; generic →
      `Something went wrong. Please try again.`. Export the messages as named constants so the E2E specs
      import them instead of retyping.
- [ ] 2.8 **[S]** Create `lib/auth/auth-errors.test.ts`: one case per code, the message-string fallback,
      the generic fallback, `mode` affecting only which hint is offered, and an explicit case that an
      `invalid_credentials` error yields identical output for two different emails (FR-2.9).
- [ ] 2.9 **[O]** In `components/auth/AuthForm.tsx` (catch blocks at l.133–134 and l.150–151, alert at
      l.163–165): replace `setError(error.message)` with `setError(describeAuthError(error, mode))` where
      `error` state becomes `{ message, hint? } | null`; keep the two client-side strings by wrapping
      them as `{ message }`. Render `message` in the existing destructive `Alert` and, when `hint`
      exists, a `Button variant="link"` under it whose `onClick` maps `forgot-password` → navigate to
      the existing Forgot link target, `switch-to-login` / `switch-to-register` → `setMode(...)`. Log
      the raw error with the existing pino `logger` at `warn`. Add `data-testid="auth-error"` on the
      Alert (FR-2.8). `yarn lint`, `npx tsc --noEmit`.
- [ ] 2.10 **[O]** Create `e2e/auth.spec.ts` (no `storageState`) with the six scenarios of FR-2.6.
      Import the message constants from `lib/auth/auth-errors.ts`. For the mismatched-password case,
      register a `page.on('request')` listener and assert no request URL contains `/auth/v1/`. For
      signup, use a 12-character password, pick a gender through the `GenderToggle` buttons, assert
      `/home`, then query `public.users` by the email and assert first and last name; `afterEach`
      calls `deleteAuthUser`. For the duplicate case use `personas.seededUser.email`. Count auth
      requests in a comment at the top of the file against the 30-per-5-minute budget.
- [ ] 2.11 **[O]** Turn `ci.yml`'s `build` job into `e2e` (FR-2.10): after install, `supabase/setup-cli@v1`
      (`version: latest`), `supabase start -x studio,postgres-meta,imgproxy,mailpit,logflare,vector,edge-runtime,realtime,supavisor`,
      then `yarn seed pre-weekend --yes` (it finds the `supabase_db_<project_id>` container itself);
      then a step that runs `supabase status -o env` and writes `NEXT_PUBLIC_SUPABASE_URL`,
      `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` to `$GITHUB_ENV`, mapping the
      output names exactly as `Taskfile.yml`'s `write-supabase-keys` task does (read it; the CLI has
      renamed these keys across versions); replace the two Supabase placeholders from 1.3 with these;
      keep the other placeholders and add `E2E_BASE_URL=http://localhost:3000`, `CI=true`; `yarn build`;
      `actions/cache@v4` on `~/.cache/ms-playwright` keyed on the Playwright version from
      `package.json`; `npx playwright install --with-deps chromium`; `yarn e2e`;
      `actions/upload-artifact@v4` of `playwright-report/` and `test-results/` with `if: failure()`.
      Keep the `.next/cache` cache from 1.3.
- [ ] 2.12 **[S]** Create `docs/e2e-testing.md` from PR #35's version: replace the payments-specific
      sections with: prerequisites (owner's running Supabase and dev server, `.env.local` keys,
      `npx playwright install chromium` once); commands; the persona model and `personas.json`; the
      Seed Invariants table copied from the spec with a sentence that the seed branch owns them;
      cleanup rules (`e2e+` emails, `pi_e2e_` payments, snapshot/restore) and the hand-cleanup SQL;
      how to add a spec; where the merge gate lives (filled in by Unit 5) (FR-2.12).
- [ ] 2.13 Ask the owner to run `yarn e2e` twice against their stack and paste the summary lines. Open
      the PR; confirm `checks` and `e2e` green and note the `e2e` wall time in the PR description.

### [ ] 3.0 Team forms: a roster member completes all five forms

A non-technical user can confirm this is done by watching the E2E run open the team forms as a seeded
member, sign each form in order with later steps locked until earlier ones are done, save the
information sheet, and land on "All forms completed!", and by checking afterwards that the member's
record looks exactly as it did before.

#### 3.0 Proof Artifact(s)

- CLI: `yarn e2e --grep team-forms` green twice in a row locally (FR-3.2)
- SQL: after the run, zero `team_form_completions` rows for the persona's group member; their `users` row equals the pre-run snapshot the fixture logged (FR-3.1)
- CLI: the negative case passes with the `UserNotOnRoster` toast text asserted (FR-3.3)

#### 3.0 Tasks

- [ ] 3.1 **[O]** Create `e2e/fixtures/team-forms.ts` exporting a `test` extended with a `teamFormsMember`
      fixture: reads `personas.teamForms`; before the test, selects and stores the persona's `users`
      row, `user_medical_profiles` rows, `user_experience` rows and `weekend_roster.special_needs`, and
      deletes their `team_form_completions`; after the test (also on failure), restores each stored
      row with `upsert`/`update`, deletes any `user_experience` or `user_medical_profiles` rows that
      did not exist before, and deletes `team_form_completions` again (FR-3.1). Log the snapshot at
      debug level so a failed restore can be repaired by hand.
- [ ] 3.2 **[S]** Read `components/team-forms/schemas.ts`, the five form components, `steps.config.ts`,
      `app/(member)/team-forms/page.tsx` and `layout.tsx`; write down (in the spec file's header
      comment) every required field with its `name=` and every validation string the spec asserts,
      and how a locked step renders (`pointer-events-none`, `aria-disabled`, or similar).
- [ ] 3.3 **[O]** Create `e2e/team-forms.spec.ts` using `test.use({ storageState: 'e2e/.auth/teamForms.json' })`
      and the 3.1 fixture, with `test.describe.configure({ mode: 'serial' })`, covering FR-3.2 in order:
      home checklist link; progress page at 0% with steps 2–5 locked; each form's validation message
      then successful submit and the next URL; the info sheet filled from a single `teamInfo` object
      (10-digit phone); the toast `Information saved successfully!`; `/team-forms` reading `All forms
completed!`; final DB assertions (five completions, one medical profile with the entered emergency
      contact).
- [ ] 3.4 **[S]** Add the negative case (FR-3.3): a test that signs in as `personas.nonRosterUser`
      through `/login` inside the test (this is the one extra login), visits `/team-forms`, and asserts
      the final URL carries `error=UserNotOnRoster` and the toast text from `lib/error.ts` is visible.
      Add the direct-deep-link assertion of FR-3.4 documenting current behaviour, with a comment.
- [ ] 3.5 Ask the owner to run `yarn e2e --grep team-forms` twice and confirm the persona's row is
      unchanged (`select * from users where id = …` before and after, ids from `personas.json`). Open
      the PR; `checks` and `e2e` green.

### [ ] 4.0 Payments: a completed checkout becomes exactly one recorded payment, for both fee types

A non-technical user can confirm this is done by watching the E2E run show a team member who owes the
fee, deliver a signed "payment complete" message the way Stripe would, and then show that same member
told their fee is paid, with one payment on the books; by seeing the same for a candidate who becomes
confirmed; and by seeing that delivering the same message twice adds nothing.

#### 4.0 Proof Artifact(s)

- CLI: `yarn e2e --grep payments` green twice in a row locally with only the dummy Stripe values in `.env.local` overrides (FR-4.3–FR-4.5, FR-4.7)
- CLI: `yarn test` green including `lib/payments/checkout-metadata.test.ts` (FR-4.1)
- Manual: with real test-mode keys and `yarn stripe:listen`, pay a team fee with 4242, then `stripe events resend <evt_id>`; the second delivery logs 200 and `payment_transaction` still has one row for that intent (FR-4.6)
- CLI: `grep -n "buildCheckoutMetadata" actions/checkout.ts e2e/fixtures/stripe-events.ts` shows both call sites (FR-4.1)

#### 4.0 Tasks

- [ ] 4.1 **[S]** Create `lib/payments/checkout-metadata.ts` exporting
      `buildCheckoutMetadata(target: CheckoutTarget, quote: CheckoutQuote): Record<string, string>`
      that returns exactly what `actions/checkout.ts:78-84` builds today (read the surrounding lines
      for `weekend_group_id`, `payment_owner`, `user_id`, `user_email`), and a
      `CHECKOUT_METADATA_KEYS` constant per fee type. Replace the inline object in `beginCheckout` with
      a call. Add a comment on `services/stripe/handlers/checkout-session-completed.ts` where
      `session.metadata` is read pointing at this module, and vice versa (FR-4.1).
- [ ] 4.2 **[S]** Create `lib/payments/checkout-metadata.test.ts`: for a candidate target and a team
      target, the returned key set equals `CHECKOUT_METADATA_KEYS[feeType]` exactly, and the values are
      strings (Stripe rejects non-string metadata) (FR-4.1).
- [ ] 4.3 **[O]** Replay short-circuit (FR-4.6): add `findPaymentByIntentId(paymentIntentId, { dangerouslyBypassRLS: true })`
      to `services/payment/payment-service.ts` (repository query on `payment_intent_id`, `maybeSingle`)
      if no equivalent exists. In `checkout-session-completed.ts`, after the `payment_intent` string
      check and before the `fee_type` switch, call it; if a row exists, `logger.info({ paymentIntentId,
paymentId }, 'Payment already recorded; ignoring replay')` and `return ok({ processed: false })`.
      Extend the handler's existing unit tests if any; otherwise add one covering the replay branch
      with the repository mocked.
- [ ] 4.4 **[O]** Create `e2e/fixtures/stripe-events.ts` (FR-4.2): `signedCheckoutCompleted({ target,
quote, amountTotalCents, customerEmail })` builds the minimal session object (`object: 'checkout.session'`,
      `id`, `payment_intent`, `payment_status: 'paid'`, `status: 'complete'`, `mode: 'payment'`,
      `amount_total`, `currency: 'usd'`, `customer_details: { email }`, `metadata: buildCheckoutMetadata(target, quote)`)
      wrapped in `{ id: 'evt_e2e_…', object: 'event', type: 'checkout.session.completed', created,
livemode: false, api_version: <the version stripe-node 18.5 pins>, data: { object } }`; `payload =
JSON.stringify(event)`; `signature = new Stripe('sk_test_e2e_dummy').webhooks.generateTestHeaderString({ payload, secret: requireEnv('STRIPE_WEBHOOK_SECRET') })`.
      `postWebhook(request, { payload, signature })` POSTs to `/api/webhooks/stripe` with
      `content-type: application/json` and `stripe-signature`, `data: payload` as a string so the body
      is byte-identical to what was signed. `quote` comes from calling the same pricing helper the app
      uses on the selected rows, or from the fee numbers in `personas.json` if the helper is not
      importable outside the server graph (decide at implementation and comment).
- [ ] 4.5 **[S]** Create `e2e/fixtures/payments.ts`: `cleanupE2EPayments()` deletes `payment_transaction`
      rows where `payment_intent_id like 'pi_e2e_%'`; `resetCandidate(id)` sets `status =
'awaiting_payment'`; `cleanupEmailLog(since)` deletes `email_log` rows created after the test start.
      Export a `test` extended with an auto fixture that records the start time and runs all three in
      teardown (FR-4.3, FR-4.4, FR-4.8).
- [ ] 4.6 **[O]** Create `e2e/payments-team-fee.spec.ts` with `test.use({ storageState: 'e2e/.auth/teamFee.json' })`
      per FR-4.3: description text built with `formatFee` imported from the app; POST → 200 and
      `processed: true`; exactly one row with the asserted columns; reload shows `Nothing to pay online`
      and `CHECKOUT_REFUSAL_MESSAGES.team['already-paid']`; `/home` checklist done state (read
      `components/team-todos/` first to see how done renders and assert that); identical POST again →
      200 and still one row (FR-4.6).
- [ ] 4.7 **[O]** Create `e2e/payments-candidate-fee.spec.ts` (no storage state) per FR-4.4 and FR-4.5:
      missing id → final URL `/login` with `redirectTo` containing `error=MISSING_CANDIDATE_ID`; valid
      id renders the shell; POST → confirmed + one row; revisit → `error=CANDIDATE_FEES_ALREADY_PAID`
      in the `redirectTo`; replay → 200 and one row; the partial-payment candidate case with the
      computed remainder. `afterEach` resets the candidate statuses.
- [ ] 4.8 **[S]** Add to the candidate spec the two signature cases of FR-4.7: no header → 400 with
      `code: MISSING_SIGNATURE`; signed with `whsec_wrong` → 400 with `code: INVALID_SIGNATURE`.
- [ ] 4.9 Ask the owner to run `yarn e2e --grep payments` twice, and separately to do the FR-4.6 manual
      check with their real test keys and `yarn stripe:listen` (pay, then `stripe events resend`).
      Open the PR with the replay behaviour change called out in the description; `checks` and `e2e`
      green.

### [ ] 5.0 Merge gate and release ordering

A non-technical user can confirm this is done by seeing "Required" next to the `checks` and `e2e`
checks on a pull request to `main`, and by seeing a release run on `main` that waits for those same
checks before it touches the production database or deploys.

#### 5.0 Proof Artifact(s)

- Screenshot: a PR to `main` showing `checks` and `e2e` labelled Required (FR-5.2)
- Link: a `release.yml` run where job `ci` completes before `migrate` starts (FR-5.1)
- Diff: `docs/platform-roadmap-status.md` Epic 1 row and `docs/e2e-testing.md` gate paragraph (FR-5.3)

#### 5.0 Tasks

- [ ] 5.1 **[S]** In `ci.yml` add `workflow_call:` under `on:`. In `release.yml` add a first job
      `ci: uses: ./.github/workflows/ci.yml` with `secrets: inherit` (none are needed, but harmless)
      and change `migrate` to `needs: ci`. Keep `release` and `deploy` chained as they are (FR-5.1).
- [ ] 5.2 Dropped 2026-09-27: owner pushes to main directly; the release.yml ordering is the gate.
- [ ] 5.3 **[S]** Update the Epic 1 row in `docs/platform-roadmap-status.md`: PR CI gate and E2E harness
      shipped with dates; remaining Epic 1 items unchanged (FR-5.3). Merge and watch one `release.yml`
      run to confirm ordering.

### [ ] 6.0 Nightly real-Stripe run

A non-technical user can confirm this is done by opening the Actions tab in the morning and seeing a
green "E2E (Stripe live)" run from overnight, and by opening the Stripe test dashboard and seeing the
two small payments it made.

#### 6.0 Proof Artifact(s)

- Link: a `workflow_dispatch` run of `e2e-stripe.yml` green; its log shows two `200` deliveries from `stripe listen` (FR-6.2, FR-6.3)
- Stripe test dashboard: two payments with the expected amounts and metadata (FR-6.3)
- Link: a branch run after renaming one metadata key fails on the deep-equal assertion (FR-6.3)
- Actions tab: two consecutive scheduled runs green before the unit is called done (Success Metrics)

#### 6.0 Tasks

- [ ] 6.1 Ask the owner to add repository secrets `STRIPE_TEST_SECRET_KEY` (a restricted test-mode key
      with write on Checkout Sessions and read on PaymentIntents, Charges, Events),
      `STRIPE_TEST_PUBLISHABLE_KEY`, `CANDIDATE_FEE_PRODUCT_ID`, `TEAM_FEE_PRODUCT_ID` (FR-6.2).
- [ ] 6.2 **[O]** If the Supabase + build + Playwright-install steps in `ci.yml` exceed a few lines,
      move them to a composite action `.github/actions/e2e-setup/action.yml` with inputs for the env
      overrides, and use it from both workflows (FR-6.1). Otherwise duplicate and say so in a comment.
- [ ] 6.3 **[O]** Create `.github/workflows/e2e-stripe.yml`: `name: E2E (Stripe live)`; `on: schedule:
- cron: '0 9 * * *'`(Open Question default) and`workflow_dispatch`; one job that runs the shared
setup with `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`and the product ids from
secrets; installs the Stripe CLI at a pinned version from the official apt repository (or the
GitHub release tarball); starts`stripe listen --api-key "$STRIPE_TEST_SECRET_KEY" --forward-to localhost:3000/api/webhooks/stripe --print-secret > stripe-listen.log 2>&1 &`,
waits until the log contains `whsec_`, exports it as `STRIPE_WEBHOOK_SECRET`to`$GITHUB_ENV`    **before** the`yarn e2e`step starts the server; runs`E2E_STRIPE_LIVE=1 yarn e2e --grep @stripe-live`;
uploads `stripe-listen.log` and the Playwright report always (FR-6.2, FR-6.3).
- [ ] 6.4 **[O]** Create `e2e/stripe-live/team-fee.spec.ts` (tagged `@stripe-live` in the title, persona
      `teamFee`): open `/payment/team-fee`; `const frame = page.frameLocator('iframe[name^="embedded-checkout"]')`;
      fill email, card `4242424242424242`, expiry `12/34`, CVC `123`, ZIP `12345`, name; click the
      pay button; `waitForURL(/\/payment\/team-fee\/success/)`; assert the success page's confirmation
      text; poll `payment_transaction` (up to 30 s) for a row for the persona's group member with
      `payment_intent_id like 'pi_%'`; parse `session_id` from the URL, `stripe.checkout.sessions.retrieve`
      with the test secret key, and `expect(session.metadata).toEqual(buildCheckoutMetadata(target, quote))`
      (FR-6.3). Inspect the iframe's actual field labels once with `--ui` locally and pin locators to
      labels, not positions.
- [ ] 6.5 **[O]** Create `e2e/stripe-live/candidate-fee.spec.ts` the same way through
      `/payment/candidate-fee?candidate_id=…` and `/payment/candidate-fee/success`, plus
      `candidates.status = 'confirmed'` (FR-6.3). Add script `"e2e:stripe": "E2E_STRIPE_LIVE=1 playwright test --grep @stripe-live"`
      and a `docs/e2e-testing.md` section on running it locally with real test keys and
      `yarn stripe:listen` (FR-6.4).
- [ ] 6.6 Trigger `workflow_dispatch`, fix what the first real run reveals (iframe locators, timing),
      then on a throwaway branch rename one metadata key and confirm the deep-equal assertion fails.
      Leave the schedule on and check the next two mornings before closing the unit (FR-6.5).
