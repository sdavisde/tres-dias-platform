# 20-spec-e2e-testing.md

## Introduction/Overview

The platform roadmap (`docs/platform-roadmap-status.md`, Epic 1 "Infra foundation") lists two missing
pieces that this spec delivers together: a **PR CI gate** and an **E2E harness**. Today the repository
has no CI on pull requests at all. The only workflow, `.github/workflows/release.yml`, runs on push to
`main` and does three things in order: `supabase db push` + `supabase config push` against prod, a
semantic release, and `vercel deploy --prod`. Lint, type-check, the 43 Jest unit tests and `next build`
never run before a change reaches production. A broken build is discovered by Vercel; a broken flow is
discovered by a member.

The owner's brief (2026-09-26) is the slimmest, fastest pipeline that prevents regressions in three
flows, with the expectation that coverage grows from here:

1. **Fees are accepted.** A team member's fee and a candidate's fee can be paid and the system records
   them correctly
2. **Accounts work.** A person can create an account and log in, and gets correct remediation guidance
   when it fails (wrong password, existing account, and so on)
3. **Team forms work.** A member on the active weekend's roster can see and complete their five team
   forms

What already exists and is reused:

- **Jest** (`jest.config.ts`: ts-jest, node environment, `testMatch: **/*.test.ts`) with 43 pure unit
  tests under `lib/`, `services/` and `app/admin/`. Nothing touches a database or a browser
- **`supabase/seed.sql`**: today, 50 confirmed auth users sharing the password `password`, weekend
  group #45 `ACTIVE` with fees set, a full roster with four members who have paid nothing and done no
  forms, and five candidates in `awaiting_payment`. The seed is being reworked on another branch, so
  this spec depends on it only through the **Seed Invariants** below, never on particular rows
- **PR #35** (`claude/payment-corrections-e2e`, closed 2026-08-24): a working Playwright setup for the
  admin payments flows. It was closed because a long-standing suite was not wanted at the time. Its
  `playwright.config.ts`, `e2e/auth.setup.ts`, `e2e/fixtures/supabase.ts`, ESLint override and
  `.gitignore` entries (already on `main`, lines 58–62) are the starting point for Unit 2
- **Signature-verified Stripe webhook** at `app/(public)/api/webhooks/stripe/route.ts` that tolerates
  the follow-up Stripe API lookups failing, which is what makes a Stripe-free payment test possible

## Goals

- Every pull request runs lint, type-check, unit tests, a production build and the E2E suite, and
  cannot merge to `main` until all of them pass
- The E2E suite covers the three flows above end to end in a real browser against a production build
  and a real local Supabase, in under a minute of test time and under about seven minutes of wall
  time including setup
- Payments are proven on every PR without Stripe secrets in CI, and against real Stripe test mode
  once a night, so a change in what Stripe sends is caught within a day rather than by a member
- Auth failures show messages the repository owns, with remediation guidance, instead of raw GoTrue
  text
- The same suite runs locally against the owner's already-running database and dev server without a
  database reset, and cleans up after itself
- Adding a flow later means adding a spec file and, at most, one fixture

## User Stories

- **As the site owner**, I want a red check on a pull request when a change breaks login, team forms
  or fee payment, so that I stop finding these out from members after a deploy.
- **As a team member**, I want a clear message when I mistype my password or try to register an email
  that already has an account, so that I know what to do next without emailing the owner.
- **As the treasurer**, I want confidence that a Stripe payment always becomes exactly one recorded
  transaction, so that balances and the payment report stay right.
- **As a contributor**, I want `yarn e2e` to run against my local stack and leave it as it found it, so
  that I can iterate without resetting the database.
- **As the site owner**, I want to be told when Stripe's webhook payload no longer matches what the
  app expects, before a real payment is lost.

## Settled Decisions (2026-09-26)

| Topic                 | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser tool          | Playwright, Chromium only. Runs against `next build && next start`, not the dev server, so the build is part of the gate and page timings match production                                                                                                                                                                                                                                                                                                                              |
| Database in CI        | Local Supabase via `supabase start` on the runner, with unneeded containers excluded (`-x studio,postgres-meta,imgproxy,mailpit,logflare,vector,edge-runtime,realtime,supavisor`), then `yarn seed pre-weekend --yes`. `supabase/seed.sql` now holds only roles; app data and auth users come from `scripts/seed/` (merged from `preview` on 2026-09-27), which applies its SQL through `docker exec` into the `supabase_db_<project_id>` container, so it runs on the runner unchanged |
| Fixture data          | The seed, selected by **predicate at run time**, never by id or email. A `setup` step queries the local database for a record matching each scenario's invariant (an unpaid roster member with no forms, a candidate awaiting payment, and so on), fails with a message naming the invariant when none exists, and hands the same selection to every spec. Scenarios never share a person. No new seed file in this pass                                                                |
| Isolation and cleanup | Tests clean up what they touch through a service-role client (snapshot before, restore after). No `db reset` between tests or files. Serial execution (`workers: 1`) until the suite is large enough to need more                                                                                                                                                                                                                                                                       |
| Logins                | Playwright global setup signs in once per persona through the real form and saves storage state. Specs reuse it. This keeps a full run near 10 auth requests against GoTrue's local limit of 30 sign-in/sign-up requests per IP per 5 minutes. **The rate limit in `config.toml` is not raised**: `supabase config push` applies `[auth]` to prod on every merge                                                                                                                        |
| Payments on PRs       | **Fully synthetic.** No Stripe secrets in CI; dummy keys satisfy the import-time checks. Tests build a `checkout.session.completed` event, sign it with the shared `STRIPE_WEBHOOK_SECRET` using stripe-node's `generateTestHeaderString`, POST it to `/api/webhooks/stripe`, and assert the database and UI outcome                                                                                                                                                                    |
| Metadata drift        | The session metadata builder is extracted from `beginCheckout` into a pure function. Both `beginCheckout` and the E2E event builder call it, so a renamed key cannot pass the PR suite by accident. The nightly run proves Stripe echoes it                                                                                                                                                                                                                                             |
| Payments nightly      | A scheduled, on-demand workflow runs the real path with Stripe test-mode secrets: Stripe CLI forwarding the webhook, the 4242 card typed into the embedded checkout iframe, success pages, and a check that the session metadata Stripe returns equals the builder's output                                                                                                                                                                                                             |
| Webhook replays       | A replayed `checkout.session.completed` (same `payment_intent`) returns 200 and records nothing. Today both fee types return 400 on replay, which makes Stripe retry for up to three days (see Known Bugs). The fix lands with Unit 4 because the E2E test asserts it                                                                                                                                                                                                                   |
| Auth error mapping    | **In scope.** A pure `describeAuthError` maps GoTrue error codes to the repository's own message plus a remediation hint. Wrong password and unknown email stay indistinguishable (GoTrue already returns one code for both). Unit tested; E2E asserts on these strings                                                                                                                                                                                                                 |
| Merge gate            | The new workflow's jobs become **required status checks** on `main`. The same suite runs at the top of `release.yml`, before `migrate`, so a red `main` neither migrates prod nor deploys                                                                                                                                                                                                                                                                                               |
| Email in CI           | A dummy `RESEND_API_KEY`. The Resend client throws at import without a key (`services/notifications/email-client.ts:12`, `actions/password-reset.ts:13`); with a bad key, sends return an error that every in-scope path already swallows. No transport abstraction in this pass                                                                                                                                                                                                        |
| Sentry in CI          | Off. `lib/sentry.ts` enables Sentry for any production build, so a CI `next start` would report to the real project. A `NEXT_PUBLIC_SENTRY_ENABLED=false` flag disables it for both server and browser bundles                                                                                                                                                                                                                                                                          |
| Local runs            | `yarn e2e` reuses the owner's running Supabase and dev server (`reuseExistingServer`). Playwright never starts or resets the database. Dev-mode autofill buttons are not used by any test                                                                                                                                                                                                                                                                                               |
| Out of this pass      | Forgot-password (Resend plus a two-per-hour local email limit), Stripe success pages on PRs (they call `checkout.sessions.retrieve`), candidate approval through the UI (aborts when the payment-request email fails to send), every other page                                                                                                                                                                                                                                         |

## Seed Invariants

The seed is owned by another branch and may change shape at any time. `scripts/seed/` (see its `README.md`) generates a date-relative world in one of three phases; the
suite targets **`pre-weekend`** (#45 active and about 60 days out, roster built, some fees and forms
outstanding, candidates in every status), which is the state all three flows need. The README's "E2E
fixtures" table pins one person per invariant below and `scripts/seed/world.test.ts` asserts they stay
pinned. The suite still selects by predicate rather than by those names, so a re-pin never touches a
spec. The suite asks nothing of it except the following, each checked by a selector in `e2e/fixtures/seed.ts` that throws a message
naming the invariant when it does not hold:

| #   | Invariant                                                                                                                                                                                           | Selector                              | Used by                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------- |
| S1  | Exactly one weekend group has a weekend with status `ACTIVE`, and that group has `team_fee`, `candidate_fee` and `online_surcharge` set                                                             | `activeGroup()`                       | every payments spec, team forms |
| S2  | At least one `weekend_group_members` row of that group has an active roster row (`status <> 'drop'`) in a non-exempt role, **zero** `team_form_completions` and **zero** `payment_transaction` rows | `pickTeamFormsMember()`               | Unit 3                          |
| S3  | At least two further such members exist, so the team-fee persona is never the team-forms persona                                                                                                    | `pickUnpaidTeamMember({ excluding })` | Unit 4, Unit 6                  |
| S4  | At least one candidate on an `ACTIVE` weekend is `awaiting_payment` with no `payment_transaction` rows, and at least one other is `awaiting_payment` with a partial payment below the fee           | `pickAwaitingCandidate({ partial })`  | Unit 4, Unit 6                  |
| S5  | Every seeded `auth.users` row is confirmed and shares one password, read from `E2E_SEED_PASSWORD` (default `password`)                                                                              | `pickSeededUser()`, `seedPassword()`  | Unit 2 setup, login specs       |
| S6  | At least one seeded user has no roster row on any `ACTIVE` weekend                                                                                                                                  | `pickNonRosterUser()`                 | Unit 3 negative case            |

Selectors run once in the Playwright `setup` project, which writes the chosen ids and emails to
`e2e/.auth/personas.json` (gitignored) and signs each chosen person in. Specs read that file, so a
run uses one consistent cast. Everything the specs assert (fee amounts, names, counts) is computed
from the selected rows, not typed into the spec.

## Demoable Units of Work

Units are in ship order and each is one PR. Unit 1 alone gives the repository its first PR gate.
Units 2–4 add the three flows. Unit 5 wires the gate into branch protection and the release. Unit 6
adds the nightly Stripe run.

### Unit 1: PR CI Gate

**Purpose:** Run what already exists (lint, `tsc`, Jest) plus a production build on every pull
request. No test code; one workflow file and one small Sentry change.

**Functional Requirements:**

- FR-1.1 A new workflow `.github/workflows/ci.yml` shall run on `pull_request` (all target branches)
  and `workflow_dispatch`, with `concurrency` keyed on the ref and `cancel-in-progress: true`
- FR-1.2 Job `checks` shall: check out; `actions/setup-node@v4` with `node-version-file: .nvmrc` and
  `cache: yarn`; `yarn install --frozen-lockfile`; `yarn lint`; `npx tsc --noEmit`; `yarn test`
- FR-1.3 Job `build` shall run in parallel with `checks` and run `yarn build` with placeholder
  environment values for every variable in `.env.example` (Supabase URL `http://127.0.0.1:54321`,
  `sk_test_e2e_dummy`, `pk_test_e2e_dummy`, `whsec_e2e_dummy`, `re_e2e_dummy`, `prod_e2e_dummy`,
  `SITE_URL=http://localhost:3000`) and `NEXT_PUBLIC_SENTRY_ENABLED=false`. `SENTRY_AUTH_TOKEN` is
  not set, so no source maps upload. Unit 2 extends this job; it is named `build` now and `e2e` then
- FR-1.4 `lib/sentry.ts` shall set `enabled` to `NODE_ENV === 'production' &&
process.env.NEXT_PUBLIC_SENTRY_ENABLED !== 'false'`. The flag is `NEXT_PUBLIC_` so it is inlined into
  the browser bundle as well as read on the server. Production and preview on Vercel do not set it,
  so nothing changes there
- FR-1.5 The build shall succeed with no database running. If any page turns out to prerender with a
  Supabase call, that page is marked dynamic rather than starting Supabase in Unit 1
- FR-1.6 `docs/platform-roadmap-status.md` Epic 1 row shall record "PR CI gate shipped" with the date

**Proof Artifacts:**

- A pull request showing two green checks, `checks` and `build`, in under about four minutes
- The same PR with a deliberate type error pushed and reverted, showing `checks` go red then green
- `grep -n NEXT_PUBLIC_SENTRY_ENABLED lib/sentry.ts .github/workflows/ci.yml` shows both

### Unit 2: Playwright Harness, Auth Flows and Auth Error Mapping

**Purpose:** Install the browser harness once, prove it with the simplest flow, and replace raw GoTrue
error text with owned messages.

**Functional Requirements:**

- FR-2.1 Add `@playwright/test` and `dotenv` as dev dependencies and scripts `e2e: playwright test`,
  `e2e:ui: playwright test --ui`, `e2e:report: playwright show-report`. Keep `test: jest` unchanged;
  E2E files end in `.spec.ts` and Jest's `**/*.test.ts` glob never matches them
- FR-2.2 `playwright.config.ts` (from PR #35, adjusted): `testDir: e2e`; `fullyParallel: false`;
  `workers: 1`; `retries: 1` in CI, `0` locally; reporter `github` in CI, `list` locally; `trace:
on-first-retry`; `screenshot: only-on-failure`; `baseURL` from `E2E_BASE_URL` defaulting to
  `http://localhost:3000` (matches `SITE_URL` in `.env.example`); `loadEnv({ path: '.env.local' })` so
  fixtures see the Supabase keys locally. `webServer`: in CI `yarn start` with
  `reuseExistingServer: false`; locally `yarn dev` with `reuseExistingServer: true`, so the owner's
  running dev server is used and never restarted. Chromium only (`devices['Desktop Chrome']`)
- FR-2.3 Single `chromium` project. `e2e/global-setup.ts` runs the seed selectors (Seed Invariants)
  and writes `e2e/.auth/personas.json`, then signs in through the real `/login` form as each chosen
  persona and saves `e2e/.auth/<persona>.json` (gitignored): `teamForms` (S2) and `teamFee` (S3).
  Specs opt into a persona with `test.use({ storageState })`; auth specs use none. Global setup
  targets `button[type="submit"]` because the mode toggle also renders a button labelled `Sign In`,
  and waits for the URL to leave `/login` before saving state
- FR-2.4 `e2e/fixtures/supabase.ts` (from PR #35): `adminClient()` on `SUPABASE_SECRET_KEY` for
  arrange, assert and cleanup; `requireEnv` fails with a message naming `docs/e2e-testing.md`. Never
  used to assert that a policy allows something
- FR-2.4a `e2e/fixtures/seed.ts`: the selectors from Seed Invariants, each a single query on
  `adminClient()` returning a typed row or throwing `Seed invariant S<n> not met: <what was looked
for>`. `e2e/fixtures/personas.ts` reads and writes `e2e/.auth/personas.json`
- FR-2.5 `e2e/fixtures/auth-users.ts`: `deleteAuthUser(email)` via `auth.admin.listUsers` +
  `auth.admin.deleteUser`, used to remove signup test accounts. Signup emails are
  `e2e+<runId>@example.com` with `runId` from `GITHUB_RUN_ID` or a timestamp, so a crashed run leaves
  identifiable rows and the next run is unaffected
- FR-2.6 Auth specs (`e2e/auth.spec.ts`, no storage state):
  - login with `pickSeededUser()` (S5) lands on `/home` and shows that row's first name
  - login with the wrong password shows the mapped invalid-credentials message and its
    "Forgot your password?" hint, and stays on `/login`
  - login with an unknown email shows the identical message
  - `/join` register with a unique email, matching passwords, first and last name and a gender lands
    on `/home`; a `public.users` row exists with those names (the `sync_users` trigger); cleanup
    deletes the auth user
  - register with the email of the S5 user shows the mapped already-registered message and a way to
    switch to sign in
  - register with mismatched passwords shows `Passwords do not match` without any network request
    (assert no `/auth/v1/` request was made)
- FR-2.7 Auth error mapping: new `lib/auth/auth-errors.ts` exporting `describeAuthError(error:
unknown, mode: 'login' | 'register'): { message: string; hint?: { text: string; action:
'forgot-password' | 'switch-to-login' | 'switch-to-register' } }`. Keys on `error.code` from
  `@supabase/supabase-js`'s `AuthApiError` (`invalid_credentials`, `user_already_exists`,
  `weak_password`, `over_request_rate_limit`, `email_not_confirmed`, `validation_failed`,
  `email_address_invalid`), with a message-string fallback for the pre-code shape and a generic
  fallback `Something went wrong. Please try again.` Messages are plain English written for members,
  for example `That email and password don't match. Check for typos, or reset your password.` and
  `An account with that email already exists. Sign in instead.` The weak-password message reads the
  minimum from `lib/auth/constants.ts` (`MIN_PASSWORD_LENGTH`), which spec 19 task 7.1 also creates;
  whichever lands first, the other reuses it
- FR-2.8 `components/auth/AuthForm.tsx` shall render `describeAuthError(...)` in the existing
  destructive `Alert` (message) with the hint as a link or button under it (`forgot-password` → the
  existing Forgot link target; `switch-to-login` / `switch-to-register` → `onModeChange`). The client
  keeps `Passwords do not match` and `Please select your gender` as they are. The raw error is
  logged with the existing pino logger; it is never shown
- FR-2.9 `lib/auth/auth-errors.test.ts` covers every code above, the fallback, and that
  `invalid_credentials` produces the same output whether or not the email exists (the function has
  no way to know, which is the point)
- FR-2.10 `ci.yml` job `build` becomes `e2e`: after install, `supabase/setup-cli@v1`, `supabase start`
  with the exclusion list, then derive `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  and `SUPABASE_SECRET_KEY` the same way `Taskfile.yml`'s `write-supabase-keys` task does (from
  `supabase status -o env`), export them to `GITHUB_ENV`, `yarn build`, `npx playwright install
--with-deps chromium`, `yarn e2e`. Cache `.next/cache` (key: lockfile hash + source hash, restore on
  lockfile hash) and `~/.cache/ms-playwright` (key: Playwright version). Upload `playwright-report/`
  as an artifact on failure. `STRIPE_WEBHOOK_SECRET=whsec_e2e_dummy` is shared between the app env
  and the test env because Unit 4 signs with it
- FR-2.11 ESLint: add the PR #35 override turning `react-hooks/rules-of-hooks` off for `e2e/**/*.ts`
  (Playwright fixtures take a callback named `use`)
- FR-2.12 `docs/e2e-testing.md` (from PR #35, rewritten for this suite): how to run locally against a
  running stack, which env vars are read, the persona list, the cleanup rules, how to add a spec

**Proof Artifacts:**

- `yarn e2e` locally against the owner's running stack: setup plus six auth specs green, and running
  it twice in a row is green both times (cleanup works)
- `yarn test` green with `lib/auth/auth-errors.test.ts`
- A PR with `checks` and `e2e` green; `e2e` under about seven minutes on a cold cache
- Manual: type a wrong password on `/login` and read the new message and hint

### Unit 3: Team Forms

**Purpose:** Prove a roster member can see and complete all five team forms, in order.

**Functional Requirements:**

- FR-3.1 `e2e/fixtures/team-forms.ts`: a fixture that, for the `teamForms` persona (S2, from
  `personas.json`), snapshots their `users` row, `user_medical_profiles` rows, `user_experience` rows
  and `weekend_roster.special_needs` before the test and restores them after, and deletes their
  `team_form_completions` rows before and after. S2 guarantees zero completions, so the restored
  state equals the seeded state
- FR-3.2 `e2e/team-forms.spec.ts` (persona `teamForms`):
  - `/home` shows the checklist item `Complete team forms` linking to `/team-forms`
  - `/team-forms` shows `Team Forms Progress` at 0%, step 1 enabled and steps 2–5 not clickable
  - Statement of Belief: submitting an empty signature shows `Signature must be at least 2
characters`; a signature and `Agree and Continue` lands on `/team-forms/commitment-form`
  - Commitment Form: submitting with a box unticked shows `You must agree to all commitments to
proceed.`; all boxes plus signature lands on `/team-forms/release-of-claim`
  - Release of Claim: `Please select yes or no.` when nothing chosen; choosing yes requires a
    description; choosing no plus signature lands on `/team-forms/camp-waiver`
  - Camp Waiver: signature and `Agree and Submit` lands on `/team-forms/info-sheet`
  - Team Info: fill every required field of `TeamInfoSchema` (`components/team-forms/schemas.ts`),
    including a 10-digit emergency phone; `Save Information` shows `Information saved successfully!`
    and returns to `/team-forms` reading `All forms completed!`
  - the database has five `team_form_completions` rows for the persona's group member id and a
    `user_medical_profiles` row with the emergency contact entered
- FR-3.3 Negative case: `pickNonRosterUser()` (S6), signed in inside the spec (one extra login),
  visiting `/team-forms` is redirected away with `error=UserNotOnRoster` and the toast text renders
- FR-3.4 Direct navigation to a later step before the earlier ones are done shall be asserted as
  whatever the layout does today (confirm at implementation time: redirect to the current step, or
  render). The assertion documents the behaviour; changing it is out of scope

**Proof Artifacts:**

- `yarn e2e --grep team-forms` green twice in a row locally
- After the run, `team_form_completions` has zero rows for the persona's group member id and their
  `users` row matches the seed

### Unit 4: Payments Through a Synthetic Signed Webhook

**Purpose:** Prove a completed checkout becomes exactly one recorded payment with the right UI
outcome, for both fee types, with no Stripe account involved. Fix the replay behaviour the test
exposes.

**Functional Requirements:**

- FR-4.1 Extract the metadata construction from `actions/checkout.ts:78-84` into a pure
  `buildCheckoutMetadata(target: CheckoutTarget, quote: CheckoutQuote): Record<string, string>` in
  `lib/payments/checkout-metadata.ts`, returning exactly the keys sent today (`fee_type`,
  `weekend_group_id`, `payment_owner`, and `candidateId` or `group_member_id`, plus `user_id` /
  `user_email` for team fees). `beginCheckout` calls it. A unit test pins the key set for each fee
  type. `services/stripe/handlers/checkout-session-completed.ts` keeps reading the same keys; a
  comment on each side points at the other
- FR-4.2 `e2e/fixtures/stripe-events.ts`: `signedCheckoutCompleted({ target, quote, amountTotal,
customerEmail })` builds a minimal `Stripe.Checkout.Session` (`id: cs_test_e2e_<rand>`,
  `payment_intent: pi_e2e_<rand>`, `payment_status: 'paid'`, `amount_total`, `customer_details`,
  `metadata: buildCheckoutMetadata(target, quote)`) inside an `evt_e2e_<rand>`
  `checkout.session.completed` event, serialises it, and signs it with `new
Stripe('sk_test_e2e_dummy').webhooks.generateTestHeaderString({ payload, secret:
process.env.STRIPE_WEBHOOK_SECRET })`. A `postWebhook(request, { payload, signature })` helper
  POSTs the raw body with the `stripe-signature` header via Playwright's `request` fixture and returns
  the response
- FR-4.3 `e2e/payments-team-fee.spec.ts` (persona `teamFee`, S3; `fee` and `surcharge` read from the
  S1 group; `expectedTotal = fee + surcharge`):
  - `/payment/team-fee` shows the header `Team fee` and the description built from those numbers,
    `Your {formatFee(fee)} team fee, plus {formatFee(surcharge)} card processing.` (import `formatFee`
    rather than retyping the format). The embedded checkout itself cannot mount with dummy keys and
    shows `Something went wrong`; the spec does not assert on the iframe
  - POST a signed event for the persona's group member with `amount_total: expectedTotal * 100`;
    expect 200 with `processed: true`
  - `payment_transaction` has exactly one row with `target_type = 'weekend_group_member'`,
    `target_id` = the persona's group member id, `gross_amount = expectedTotal`,
    `payment_method = 'stripe'`, `weekend_id` = the persona's roster weekend
  - reloading `/payment/team-fee` shows `Nothing to pay online` and `Your team fee is already paid.
Thank you!`; `/home` shows the `Pay team fees` checklist item in its done state (confirm how
    `TeamMemberTodo` renders done at implementation time)
  - POST the identical event again: expect 200 and still exactly one row (FR-4.6)
  - cleanup deletes `payment_transaction` rows whose `payment_intent_id` starts with `pi_e2e_`
- FR-4.4 `e2e/payments-candidate-fee.spec.ts` (no persona; the page is public and the proxy skips it).
  Candidate from `pickAwaitingCandidate({ partial: false })` (S4), `expectedTotal = candidate_fee +
surcharge`:
  - `/payment/candidate-fee` with no `candidate_id` ends on `/login` with a `redirectTo` containing
    `error=MISSING_CANDIDATE_ID` (the page redirects to `/home?error=…`, and `/home` needs a session)
  - `/payment/candidate-fee?candidate_id=<id>` stays on that URL and renders the checkout page shell
    (assert the heading or the `#checkout-container` element, not the iframe)
  - POST a signed candidate event with `amount_total: expectedTotal * 100`; expect 200
    `processed: true`
  - `candidates.status` is `confirmed`; one `payment_transaction` row with `target_type =
'candidate'`, `target_id` = the candidate id, `gross_amount = expectedTotal`
  - revisiting the candidate-fee URL now redirects with `error=CANDIDATE_FEES_ALREADY_PAID`
  - POST the identical event again: expect 200 and still one row (FR-4.6)
  - cleanup deletes the `pi_e2e_` rows and sets the candidate back to `awaiting_payment`
- FR-4.5 Partial payment case: candidate from `pickAwaitingCandidate({ partial: true })` (S4), with
  `covered` = the sum of its existing live payments. One additional test posts an event for
  `amount_total: (candidate_fee - covered + surcharge) * 100` and asserts the candidate is confirmed
  and its rows now sum to `candidate_fee + surcharge` gross. Cleanup deletes only the `pi_e2e_` row
- FR-4.6 Replay idempotency (behaviour change, see Known Bugs): in
  `services/stripe/handlers/checkout-session-completed.ts`, before any write, look up
  `payment_transaction` by `payment_intent_id` (the unique partial index
  `payment_transaction_payment_intent_id_key` from migration `20260308000005` makes this the natural
  key). If a row exists, log at `info` and return `ok({ processed: false })` so the route answers 200. Today the candidate path returns 400 `CANDIDATE_NOT_AWAITING_PAYMENT` because the status is
  already `confirmed`, and the team path returns 400 `PAYMENT_RECORD_FAILED` from the unique index
  violation; Stripe retries a 400 for up to three days and then alerts
- FR-4.7 Signature checks: a POST with no `stripe-signature` returns 400 `MISSING_SIGNATURE`; a POST
  signed with a different secret returns 400 `INVALID_SIGNATURE`
- FR-4.8 Dummy Stripe secret key behaviour is acceptable: the handler's `getTransactionData` call
  reaches `api.stripe.com` with `sk_test_e2e_dummy`, gets 401 quickly, and is tolerated with a
  warning (`checkout-session-completed.ts`, "Transaction data not available at checkout time").
  `notifyAssistantHeadForTeamPayment` and `notifyCandidatePaymentReceivedAdmin` fail on the dummy
  Resend key and are logged, not raised. Each failed send writes an `email_log` row with status
  `failed`; cleanup deletes `email_log` rows created during the run (by `created_at` window) so
  local runs stay tidy

**Proof Artifacts:**

- `yarn e2e --grep payments` green twice in a row locally, with no Stripe environment beyond the
  dummy values
- `yarn test` green with `lib/payments/checkout-metadata.test.ts`
- Manual, with real test-mode keys locally and `yarn stripe:listen`: pay the team fee with 4242 in
  the browser, then use the Stripe CLI to resend the same event (`stripe events resend <evt_id>`) and
  see a 200 and no second row

### Unit 5: Merge Gate and Release Ordering

**Purpose:** Make the suite the thing that decides whether a change ships.

**Functional Requirements:**

- FR-5.1 `ci.yml` shall also be `workflow_call`-able. `release.yml` shall add a first job `ci` that
  calls it, and `migrate` shall `needs: ci`. Nothing touches prod until the suite passes on `main`
- FR-5.2 The owner configures branch protection on `main` to require the `checks` and `e2e` status
  checks (job names from `ci.yml`) and "require branches to be up to date". Recorded in
  `docs/e2e-testing.md` so the next person knows where the gate lives
- FR-5.3 `docs/platform-roadmap-status.md` Epic 1 row updated: PR CI gate and E2E harness shipped,
  with the date

**Proof Artifacts:**

- A PR to `main` shows the two checks as required (GitHub's "Required" label)
- A `release.yml` run on `main` shows `ci` completing before `migrate` starts

### Unit 6: Nightly Real-Stripe Run

**Purpose:** Prove, once a day and on demand, that Stripe still sends what the app expects and that
the real browser checkout still completes.

**Functional Requirements:**

- FR-6.1 New workflow `.github/workflows/e2e-stripe.yml` on `schedule` (one nightly cron) and
  `workflow_dispatch`. Same Supabase and build steps as `ci.yml` (factor the shared steps into a
  composite action under `.github/actions/e2e-setup/` if duplication is more than a few lines)
- FR-6.2 Secrets: `STRIPE_TEST_SECRET_KEY`, `STRIPE_TEST_PUBLISHABLE_KEY`, `CANDIDATE_FEE_PRODUCT_ID`,
  `TEAM_FEE_PRODUCT_ID`, all test mode. The workflow installs the Stripe CLI (official apt repository
  or release binary, pinned version), authenticates with `STRIPE_API_KEY=<the same test secret key>`,
  starts `stripe listen --forward-to localhost:3000/api/webhooks/stripe --print-secret` in the
  background, captures the printed `whsec_` and exports it as `STRIPE_WEBHOOK_SECRET` before
  `next start`
- FR-6.3 Specs tagged `@stripe-live` (`e2e/stripe-live/*.spec.ts`) are excluded from the PR run via
  `grep-invert` and selected here with `grep`. They cover:
  - Team fee as the `teamFee` persona: `frameLocator('iframe[name^="embedded-checkout"]')`, fill email, card
    `4242 4242 4242 4242`, a future expiry, any CVC and ZIP, cardholder name, click Pay; wait for
    `/payment/team-fee/success`; assert the success page renders; poll `payment_transaction` for a
    row whose `payment_intent_id` starts with `pi_` for the persona's group member; then retrieve the session by
    id through the Stripe API and assert `session.metadata` deep-equals
    `buildCheckoutMetadata(target, quote)`
  - Candidate fee for the S4 candidate: same through `/payment/candidate-fee?candidate_id=…` and
    `/payment/candidate-fee/success`, plus `candidates.status = 'confirmed'`
- FR-6.4 The seed is fresh on every runner, so no cleanup is needed in CI. Locally the same specs run
  with `yarn e2e:stripe` against the owner's real test keys and `yarn stripe:listen`, and reuse the
  Unit 4 cleanup (Stripe test-mode payment intents are not deleted; test mode is disposable)
- FR-6.5 On failure GitHub's default workflow-failure notification reaches the owner. No extra alert
  channel in this pass

**Proof Artifacts:**

- A `workflow_dispatch` run of `e2e-stripe.yml` green, with the Stripe dashboard (test mode) showing
  two new payments and the `stripe listen` log in the job output showing two `200` deliveries
- A deliberate rename of one metadata key on a branch makes the nightly spec fail on the
  deep-equals assertion

## Prior Art: PR #35

Closed 2026-08-24 without merging, by preference at the time not to keep a long-standing Playwright
suite. Everything in it that is generic is reused here rather than rewritten: `playwright.config.ts`
(structure, `setup` project, `webServer` block), `e2e/auth.setup.ts` (the `button[type="submit"]`
selector and the wait-for-URL-to-leave-`/login` pattern), `e2e/fixtures/supabase.ts` (`adminClient`,
`anonClient`, `signInAs`, `requireEnv`), the ESLint override, `docs/e2e-testing.md`, and the
`.gitignore` entries that already landed on `main`. Its payments specs and fixtures are not reused;
they cover admin corrections, which are out of scope. Two of its findings carry over: the shared
DataTable renders every row twice (desktop table and mobile cards, one hidden by CSS), so locators on
admin tables must be scoped; and Playwright does not get Next's `.env.local` loading for free.

## Known Bugs Fixed or Surfaced

Fixed by this spec:

- **Webhook replays are rejected with 400** for both fee types (FR-4.6). Stripe retries non-2xx
  responses with backoff for up to three days and then emails the account. Every legitimate retry of
  an already-recorded payment today is treated as a failure
- **Auth errors show raw GoTrue text** with no remediation (FR-2.7, FR-2.8)

Surfaced, follow-up only:

- **A non-roster member never sees the "not on roster" message** (found by Unit 3, 2026-09-27).
  `app/(member)/team-forms/layout.tsx` redirects to `/` before `page.tsx` can redirect to
  `/?error=UserNotOnRoster`, the proxy then forwards `/` to `/home`, and `UserNotOnRoster` is not in
  the `Errors` enum in `lib/error.ts`, so `Toastbox` would ignore it anyway. The spec asserts today's
  behaviour (lands on `/home`, no error). Fix: add the enum value and message, and let the layout
  carry the error through
- **Commitment Form shows its fallback message.** The page renders `You must agree to all
commitments.` rather than the schema's `You must agree to all commitments to proceed.`, because the
  array-level Zod message is not picked up. Cosmetic
- **Church Affiliation input has no accessible label.** The label points at a wrapper `div`, so the
  spec fills it by placeholder. Small accessibility fix in `components/team-forms/basic-info-section.tsx`
- **Candidate approval depends on Resend.** `services/notifications/email-actions.ts:206-234` returns
  before setting `awaiting_payment` when the payment-request email fails. Without a working key the
  approve flow cannot complete, which is why the E2E suite starts from seeded `awaiting_payment`
  candidates. A no-op or logging email transport selected by environment would unblock testing the
  approve flow later
- **The embedded checkout shows a generic failure** (`Something went wrong` / `Please contact
sdavisde@gmail.com`) for every error, including the pricing refusals that have friendly messages in
  `CHECKOUT_REFUSAL_MESSAGES`. The team-fee page pre-checks and avoids this; the candidate page
  relies on redirects. Worth aligning when the checkout component is next touched
- **`next start` data cache survives restarts.** `lib/cache/cached-read.ts` wraps `unstable_cache`
  with a one-day revalidate, and a direct database change does not invalidate its tags. The suite
  never mutates the cached entities (weekends, fees, roles, settings, events), so it is unaffected,
  but a future spec that edits fees must call the app's own action or clear `.next/cache`

## Non-Goals (Out of Scope)

- **Forgot-password and reset-password flows.** They send through Resend and the local email rate
  limit is two per hour
- **Success pages on PRs.** They call `stripe.checkout.sessions.retrieve`; covered nightly
- **Real Stripe on PRs.** Decided against; nightly instead
- **Candidate approval through the UI.** Blocked on Resend (above)
- **Admin pages, roster builder, sponsorship, candidate forms, files, events.** Later specs add them
  one spec file at a time
- **Cross-browser or mobile viewport runs.** Chromium desktop only
- **Raising GoTrue rate limits, enabling confirmations, CAPTCHA.** Auth friction decisions belong to
  spec 19
- **A preview environment with its own database.** Epic 1 item, separate
- **Visual regression or performance budgets**
- **An email transport abstraction.** Dummy key suffices for this pass

## Repository Standards

- Tests that need no browser or database stay in Jest as co-located `.test.ts`; browser tests live in
  `e2e/*.spec.ts` and never run under `yarn test`
- `yarn lint`, `npx tsc --noEmit`, `yarn test`, `yarn e2e`; `yarn build` is what CI runs, not the
  local type-check shortcut
- The owner runs the local database and dev server. `yarn e2e` reuses them and never resets. Ask
  before `yarn db:reset`
- `supabase config push` applies `[auth]` to prod on every merge to `main`: `config.toml` is not
  edited by this spec
- Server actions return `Result`; use `Results.*` helpers and `isNil()`; user-facing failures go
  through `toastError()`; shadcn only
- Commits are Conventional Commits, header and body lines ≤ 100 chars; never put the literal skip-ci
  marker in a commit body
- Every E2E fixture that writes data removes or restores it in `afterEach`/fixture teardown, and its
  rows are identifiable (`e2e+` emails, `pi_e2e_` payment intents) so a crashed run can be cleaned by
  hand

## Technical Considerations

- **Why a production build.** `next dev` compiles routes on first visit, so every first navigation in
  a spec pays seconds of compile time and timings are unrepresentative. `next build` also catches
  `server-only` graph violations and build-time errors, which is a regression class of its own.
  Locally the suite still runs against `yarn dev` for convenience
- **CI wall time budget.** Install with cache about 30 s; `supabase start` with exclusions 60–120 s
  (image pulls dominate; not cacheable without extra tooling); `next build` 90–180 s cold, less with
  `.next/cache` restored; Playwright browser install 20 s cached; tests under 60 s. Running `checks`
  in parallel keeps the critical path at the `e2e` job
- **Import-time throws.** `lib/stripe.ts` throws without `STRIPE_SECRET_KEY`; `components/checkout.tsx`
  and `components/public-checkout.tsx` throw without `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`; Resend
  throws without `RESEND_API_KEY`. The dummy values exist to satisfy these, not to make anything work
- **GoTrue rate limits.** `sign_in_sign_ups = 30` per 5 minutes per IP and `email_sent = 2` per hour.
  Budget per run: 2 setup logins + 3 login specs + 2 for signup (`signUp` then `signInWithPassword`)
  - 1 duplicate signup ≈ 8, doubled with one retry. If the suite ever nears 30, the fix is to sign
    personas in through `auth.admin.generateLink` rather than the form, not to raise the limit
- **Stripe signature helper.** `stripe.webhooks.generateTestHeaderString({ payload, secret })` is in
  stripe-node 18.5.0 (`types/Webhooks.d.ts:92`). The `Stripe` constructor makes no network call, so a
  dummy key is fine for signing
- **Metadata as a contract.** After FR-4.1 there is one function that decides the session metadata.
  The handler reads `session.metadata?.candidateId` / `group_member_id` / `fee_type` directly; a
  later refactor may give it a typed reader from the same module
- **Seed independence.** No spec or fixture contains a seeded UUID or email. The selectors in
  `e2e/fixtures/seed.ts` are the only code that knows what the seed looks like, and each failure
  names its invariant. When the seed branch lands, the only possible breakage is an invariant it
  dropped, which the first `setup` run reports in one line
- **Two personas, no admin.** None of the three flows needs `FULL_ACCESS`. The admin persona from PR
  #35 is not created until a spec needs it, which keeps the login budget down
- **Spec 19 interactions.** Password minimum goes to 8 (the shared seed password is read from
  `E2E_SEED_PASSWORD`; the signup spec uses a 12-character one); team-form actions gain ownership guards (William acts on his own row);
  the candidate-fee page moves to the admin client (URL and redirects unchanged). Unit 7 of spec 19
  and Unit 2 here both touch `AuthForm.tsx`; rebase whichever lands second
- **Seed dates.** Weekend #45 is `ACTIVE` by status, dated 2025. Nothing in the three flows reads the
  date, so the suite does not rot as the calendar moves

## Security Considerations

- The PR workflow holds no secrets beyond `GITHUB_TOKEN`. The webhook secret it uses is a dummy shared
  by app and tests on the runner only
- The nightly workflow holds Stripe **test-mode** keys only. A restricted key with write access to
  Checkout Sessions and read access to PaymentIntents, Charges and Events is enough; the product ids
  are not secrets but live alongside for convenience
- The service-role key used by fixtures is the local stack's, generated per runner; it never leaves
  the job
- `NEXT_PUBLIC_SENTRY_ENABLED=false` is set only in CI. Its absence on Vercel means production
  reporting is unchanged

## Success Metrics

- Zero merges to `main` without green `checks` and `e2e`
- The three flows have a browser spec each; breaking any one of them fails a PR
- A replayed webhook records nothing and answers 200
- The nightly Stripe run has been green on consecutive nights before Unit 6 is called done
- `yarn e2e` run twice locally without a reset is green both times

## Open Questions

- **Nightly cron time.** Default: 09:00 UTC (early morning US Central), so a failure is in the inbox
  at the start of the owner's day
- **Where the metadata builder lives.** Default: `lib/payments/checkout-metadata.ts` beside
  `checkout-price.ts`; importable from the `e2e/` directory through the `@/` alias, which Playwright
  resolves through `tsconfig.json` paths
- **`e2e` job and forks.** Not a concern today (single-owner repository); note that secrets are not
  available to fork PRs if that ever changes, which is another reason the PR suite carries none
- **Seed password.** Default: `E2E_SEED_PASSWORD` falls back to `password`. If the seed branch picks
  a different shared password, set the variable in `ci.yml` and `.env.example` rather than editing
  specs
- **Playwright version pin.** Default: exact pin in `package.json`, bumped deliberately, because the
  browser cache key and the `--with-deps` install follow it

## Rollout

Each unit is its own PR to `main` (or to `preview` first, matching the current habit), in order:

1. **Unit 1** (workflow + Sentry flag). First PR gate. Small and safe; ship the same day
2. **Unit 2** (harness + auth specs + error mapping). The largest PR. Land the harness and the
   mapping in one PR so the specs assert on the new strings from the start
3. **Unit 3** (team forms). Fixture plus one spec file
4. **Unit 4** (payments synthetic + replay fix + metadata extraction). Test the replay fix by hand
   with `yarn stripe:listen` before merging
5. **Unit 5** (release ordering + branch protection). One workflow edit and a settings change by the
   owner
6. **Unit 6** (nightly Stripe). Needs the owner to add four test-mode secrets first

Update the Epic 1 row in `docs/platform-roadmap-status.md` at Units 1 and 5.
