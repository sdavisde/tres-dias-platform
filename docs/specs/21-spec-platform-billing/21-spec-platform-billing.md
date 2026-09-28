# 21-spec-platform-billing.md

## Introduction/Overview

The platform operator (the owner of this codebase) will charge the community that runs on it a flat
**$45 / month** subscription. Today there is one community, Dusty Trails Tres Dias (DTTD), and the app
is not multitenant, so this spec delivers single-tenant billing that is shaped for the tenancy retrofit
(`docs/platform-roadmap-status.md`, Epic 2) without depending on it.

The model is the one Vercel, Claude and most SaaS products use: Stripe Billing owns the subscription,
renewals, retries and receipts; the app owns a small mirror of subscription state, a **Billing** page in
the admin portal, and a webhook that keeps the mirror honest. Card changes, cancellation and invoice
PDFs go through the **Stripe Customer Portal**, so the app never touches card data and never has to
rebuild those flows.

### The one architectural fact that shapes everything

The Stripe keys already in this app (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) belong to **DTTD's
own Stripe account**. That account receives candidate and team fees and its payouts are recorded into
DTTD's `deposits` ledger (`services/stripe/handlers/payout-paid.ts`). A Stripe account cannot charge
itself, so the platform subscription is billed from a **second, platform-owned Stripe account**, with
its own restricted key, webhook secret, Product and Price. Nothing in this spec touches
`lib/stripe.ts` or the existing `/api/webhooks/stripe` route, and no billing event is ever pointed at
that route: its `checkout.session.completed` handler rejects any session without a `payment_intent`
before it reads metadata (`services/stripe/handlers/checkout-session-completed.ts:29-40`), so a
subscription-mode session sent there would 400 and be retried by Stripe indefinitely.

This matches the roadmap's locked payments decision (Stripe Connect Standard per community + platform
application fee, Epic 4): the platform account created here is the account those communities will later
connect to.

### Owner decisions (2026-09-27, settled)

- A **new platform Stripe account** will be created by the owner. Development runs against a sandbox of
  that account; keys are swapped at launch.
- **Enforcement is banner + alert only.** A past-due or canceled subscription shows a warning on the
  Billing page and a dashboard system alert. Nothing is locked. Lockout policy is a later decision.
- **New `MANAGE_BILLING` permission.** Full Access holders have it implicitly; a treasurer can be
  granted it alone.
- **Built on `preview`**, which already contains the Epic 0 security work (variadic `authorizedAction`,
  permission helper functions with inheritance).

## Goals

- An admin with `MANAGE_BILLING` can subscribe the community to the $45/month plan from the admin
  portal in one sitting, and afterwards forget about it: Stripe renews, retries and emails receipts.
- The Billing page always shows the truth: plan, status, renewal date, payment method, and invoice
  history, sourced from the webhook-maintained mirror plus live Stripe reads.
- Failed renewals are visible where an admin already looks (dashboard alert) without any custom email.
- Every webhook delivery is idempotent and tolerant of out-of-order arrival.
- Nothing about the existing fee payment path changes: `lib/stripe.ts`, `actions/checkout.ts`,
  `services/stripe/**` and `/api/webhooks/stripe` are untouched except for two type-union additions.
- Local development and preview deployments without platform keys degrade to a clear "not set up on
  this deployment" state. Nothing crashes at import time.

## User Stories

- **As the platform operator**, I want DTTD to pay me $45 every month automatically, so that I am not
  chasing a volunteer board for a bank transfer.
- **As a DTTD board member with billing access**, I want to enter a card once, see what I am paying and
  when, download invoices for the treasurer, and change the card when it expires, without emailing the
  developer.
- **As a board member who opens the admin dashboard**, I want to be told plainly if the platform
  payment failed and what to do about it.
- **As the developer**, I want billing state written only by a signature-verified webhook through the
  service-role client, so that no member can grant the community a free subscription from the browser.

## Functional Requirements

### FR-1 Platform Stripe client (`lib/platform-stripe.ts`)

1. New env vars, documented in `.env.example` (names only):
   `PLATFORM_STRIPE_SECRET_KEY` (a restricted key, `rk_`), `PLATFORM_STRIPE_WEBHOOK_SECRET`,
   `PLATFORM_STRIPE_PRICE_ID`.
2. `getPlatformStripe(): Result<string, Stripe>` constructs a `Stripe` client lazily and memoises it.
   Unlike `lib/stripe.ts`, a missing key returns `err`, never throws at module load. Uses the SDK's
   pinned API version, the same as the existing client (stripe-node 18.x → `2025-08-27.basil`).
3. `isPlatformBillingConfigured(): boolean` is true when all three env vars are present.
4. `import 'server-only'` at the top.

### FR-2 Database (`supabase/migrations/2026092800000N_platform_billing.sql`, sorting after `20260927000004`)

1. Table `billing_account`, one row per community (one row total until Epic 2):
   - `id uuid PK default gen_random_uuid()`
   - `community_id uuid` nullable, **no FK** (same reservation as `email_log.community_id`, same
     column comment)
   - `stripe_customer_id text UNIQUE`, `stripe_subscription_id text UNIQUE`, both nullable
   - `status text` nullable, `CHECK` in `('incomplete','incomplete_expired','trialing','active',
'past_due','canceled','unpaid','paused')` (Stripe's subscription statuses). `NULL` means never
     subscribed.
   - `price_id text`, `plan_amount_cents integer`, `plan_interval text`, `currency text`
   - `current_period_start timestamptz`, `current_period_end timestamptz`
   - `cancel_at_period_end boolean NOT NULL DEFAULT false`, `canceled_at timestamptz`
   - `latest_invoice_id text`, `latest_invoice_status text` (Stripe invoice status: `draft`, `open`,
     `paid`, `uncollectible`, `void`)
   - `last_event_created bigint` (Stripe `event.created` of the newest subscription event applied;
     the out-of-order guard)
   - `created_at`, `updated_at timestamptz NOT NULL DEFAULT now()`
   - `COMMENT ON` the table and every column, in the style of `20260921000000_create_email_log.sql`.
2. Table `billing_webhook_events`: `stripe_event_id text PK`, `event_type text NOT NULL`,
   `received_at timestamptz NOT NULL DEFAULT now()`, `outcome text NOT NULL` (`applied`, `skipped_stale`,
   `ignored`). Rows are inserted **before** any write to `billing_account`; a primary-key conflict means
   a replay and the handler answers 200 without doing anything.
3. The migration inserts the single DTTD row: `INSERT INTO billing_account (community_id) VALUES (NULL)`
   guarded so it is a no-op if a row already exists.
4. RLS on both tables. `SELECT TO authenticated USING (public.auth_user_has_permission('MANAGE_BILLING'))`.
   No INSERT/UPDATE/DELETE policies: all writes go through the service-role client from the webhook and
   the billing actions. `GRANT SELECT … TO authenticated; GRANT ALL … TO service_role`. No grants to
   `anon`. Confirm `auth_user_has_permission` (rewritten in `20260927000002_permission_helpers.sql`)
   treats `FULL_ACCESS` as satisfying any permission and follows role inheritance; if it does not, the
   policy must OR in `FULL_ACCESS` explicitly.
5. Regenerate `database.types.ts` (`bun run db:generate`). Do **not** add these tables to the seed's
   `WIPED_TABLES` (`scripts/seed/index.ts`): like `roles` and `site_settings`, the migration-seeded row
   survives a reseed. Locally, "never subscribed" is the honest state.

### FR-3 Permission

1. Add `MANAGE_BILLING = 'MANAGE_BILLING'` to the `Permission` enum in `lib/security.ts`, in the Admin
   group next to `WRITE_SETTINGS`.
2. Place it in `lib/security/permission-areas.ts` under the Admin area's manage tier, with label
   "Manage platform billing" and description "The community's platform subscription: card on file,
   invoices, and cancellation". `permission-areas.test.ts` must pass.
3. No `CHA_ROLE_PERMISSIONS` entry: weekend roles never imply billing access.

### FR-4 Service (`services/platform-billing/`, per `services/CLAUDE.md` layering)

1. `types.ts`: `BillingAccount` DTO (camelCase mirror of the row), `BillingStatus` union,
   `SubscriptionSnapshot` (what a handler extracts from a `Stripe.Subscription`), Zod schema for the
   checkout return query.
2. `repository.ts`: `getBillingAccount(client)` (the single row: `.limit(1).maybeSingle()`),
   `updateBillingAccount(adminClient, id, patch)`, `recordWebhookEvent(adminClient, event, outcome)`
   returning `Result<_, 'duplicate' | Error>` so a PK conflict is a typed outcome, not a failure.
3. `platform-billing-service.ts`:
   - `snapshotFromSubscription(sub: Stripe.Subscription): SubscriptionSnapshot`, **pure**. On the basil
     API version `current_period_start/end` live on `sub.items.data[0]`, not on the subscription; the
     price and amount come from `sub.items.data[0].price` (`unit_amount`, `currency`,
     `recurring.interval`). Handle `cancel_at_period_end`, `canceled_at`, `status`, and
     `latest_invoice` (id or expanded object).
   - `applySubscriptionEvent(account, snapshot, eventCreated)` **pure**: returns `{ kind: 'stale' }`
     when `eventCreated < account.lastEventCreated`, otherwise the patch to write.
   - `syncSubscription(adminClient, subscriptionId)`: fetches the subscription from the platform Stripe
     client and applies it. Used by the success return and the manual refresh, where there is no event
     ordering to respect (it always wins and sets `last_event_created` to `now()` epoch seconds).
   - `ensureCustomer(adminClient, account, actingUser)`: creates the Stripe Customer on first use with
     `name` = the community's display name (`lib/weekend/labels.ts` / `COMMUNITY_NAME` wording, e.g.
     "Dusty Trails Tres Dias"), `email` = the acting admin's email, `metadata.billing_account_id`,
     and stores the id. Idempotent by checking `stripe_customer_id` first.
   - `getBillingOverview(user)`: the page's read model. Reads the account through the **user's**
     client (RLS enforces `MANAGE_BILLING`), then, when subscribed and configured, reads live from
     Stripe in parallel: the subscription with `default_payment_method` expanded (falling back to the
     customer's `invoice_settings.default_payment_method`), and `invoices.list({ customer, limit: 12 })`.
     Each live read is independent and failure-tolerant: the overview carries `paymentMethod: null`
     and `invoices: { error: true }` rather than failing the page. Uses `Results.*` helpers.
4. `actions.ts`, every export wrapped in `authorizedAction(Permission.MANAGE_BILLING, …)`:
   - `startSubscriptionCheckout(): Promise<Result<string, string>>` returns the hosted Checkout URL.
     Refuses with a friendly message when `!isPlatformBillingConfigured()` or the account already has
     a subscription that is not `canceled`/`incomplete_expired`. Ensures the customer, then
     `checkout.sessions.create({ mode: 'subscription', customer, line_items: [{ price:
PLATFORM_STRIPE_PRICE_ID, quantity: 1 }], client_reference_id: account.id, metadata: {
billing_account_id }, subscription_data: { metadata: { billing_account_id } }, success_url:
getUrl('/admin/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}'), cancel_url:
getUrl('/admin/billing?checkout=canceled'), allow_promotion_codes: false })`. Never pass
     `payment_method_types`. Hosted redirect, not embedded: it needs no second publishable key in the
     browser and no second Stripe.js instance.
   - `openBillingPortal(): Promise<Result<string, string>>` returns
     `billingPortal.sessions.create({ customer, return_url: getUrl('/admin/billing') }).url`.
     Requires a customer id.
   - `refreshBillingStatus(): Promise<Result<BillingAccount, string>>` calls `syncSubscription`.
   - All three call `revalidatePath('/admin/billing')` (and `/admin` for the alert) on success.
5. `index.ts` re-exports actions and types.

### FR-5 Webhook (`app/(public)/api/webhooks/platform-billing/route.ts` + `services/platform-billing/webhook/`)

1. Route mirrors `app/(public)/api/webhooks/stripe/route.ts` exactly in shape (raw body, signature
   header, `constructEvent`, `withWebhookScope`, `reportWebhookError`, `logWebhookSuccess`, severity →
   status mapping) but uses `getPlatformStripe()` and `PLATFORM_STRIPE_WEBHOOK_SECRET`. Missing secret →
   500 `WEBHOOK_NOT_CONFIGURED`, logged at `warn` not `error` on preview/local so Sentry stays quiet.
   Extract the shared body of the two routes into a helper only if it can be done without changing the
   existing route's behaviour; otherwise duplicate and say so in a comment.
2. Handler registry `services/platform-billing/webhook/handlers.ts` reusing `WebhookHandler`,
   `WebhookError`, `HandlerSuccess`, `WebhookHandlerContext` from `services/stripe/handlers/types.ts`.
   Two additive union changes in that file: `HandlerSuccess.entityType` gains `'billing_account'`;
   `ProcessingStage` gains `'billing_sync'`; `WebhookErrorCodes` gains `BILLING_SYNC_FAILED` and
   `BILLING_ACCOUNT_NOT_FOUND`.
3. Events and behaviour. Every handler first calls `recordWebhookEvent`; `'duplicate'` →
   `ok({ processed: false, details: { replay: true } })`.
   - `checkout.session.completed` with `mode === 'subscription'`: store `session.customer` and
     `session.subscription` on the account, then `syncSubscription`. Sessions with any other mode are
     `ok({ processed: false })` (they can only mean a misrouted event).
   - `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`:
     `snapshotFromSubscription(event.data.object)` → `applySubscriptionEvent`; stale events record
     `skipped_stale` and return `ok({ processed: false })`. The account is located by
     `stripe_subscription_id`, falling back to `stripe_customer_id`, falling back to the single row when
     it has no subscription yet. Not found → `BILLING_ACCOUNT_NOT_FOUND`, severity `warning` (200; a
     retry cannot fix it).
   - `invoice.paid`, `invoice.payment_failed`: update `latest_invoice_id/status`, then attempt
     `syncSubscription` for `invoice.parent.subscription_details.subscription` (basil shape). If the
     Stripe read fails, keep the invoice update and return `ok` with `details.subscriptionRefreshed:
false` at `warn`, so a CI run with dummy keys still passes.
   - Anything else: `ok({ processed: false })`.
4. A handler failure that a retry could fix (database write error, Stripe read error during
   `checkout.session.completed`) is severity `error` → 400. Everything else is `warning` → 200.
5. `proxy.ts` already skips `/api/*`; signature verification is the only gate on this route, as with
   the existing one.

### FR-6 Admin Billing page (`app/admin/billing/`)

1. Nav: add `{ title: 'Billing', href: '/admin/billing', icon: Receipt, permissionsNeeded:
[Permission.MANAGE_BILLING] }` to `adminNavItems` directly after "Site settings". Update
   `lib/admin/navigation.test.ts`. Note: this is an 11th item, not on the redesign canvas; it is the
   right home for a standalone Vercel-style billing page and the canvas should be updated to match.
2. `page.tsx` (server): `guardAdminPage({ required: [Permission.MANAGE_BILLING] })`, then
   `getBillingOverview(user)`. `AdminBreadcrumbs` + container + `PageHeader title="Billing"
description="The community's subscription to the platform. Renews monthly; Stripe emails the
receipt."`.
3. Return handling: `?checkout=success&session_id=…` → the server page retrieves the session from the
   platform client, and when `session.subscription` is a string, `syncSubscription` runs **before**
   rendering, so the page is correct even if the webhook has not landed yet. A client component reads
   the query param once and shows a success toast (`sonner`), then `replaceState` strips the params.
   `?checkout=canceled` → neutral toast "Nothing was charged."
4. Layout, following the Site settings page grid (two columns at `sm`, cards `bg-card border
rounded-lg`):
   - **Plan card**: "Tres Dias Platform" · `$45 / month` (from the account's `plan_amount_cents` and
     `plan_interval`; falls back to copy when unknown) · status `Badge`: Active (success), Past due
     (warning), Canceling · access ends {date} (when `cancel_at_period_end`), Canceled, Trialing, Not
     subscribed · "Renews on {current_period_end}" line · primary action: **Subscribe** when there is
     no live subscription, otherwise **Manage subscription** (portal).
   - **Payment method card**: card brand + `•••• 4242` + expiry when known; "No card on file" otherwise;
     **Update payment method** (portal).
   - **Status banner** above the cards when `past_due`/`unpaid`: shadcn `Alert` (destructive) with the
     plain-English impact and a portal button. When `canceled`: neutral Alert with a Subscribe button.
   - **Invoices**: a table via the shared `components/ui/data-table` (mobile cards for free): Date,
     Amount, Status (badge), Invoice (link to `hosted_invoice_url`, PDF link to `invoice_pdf`). Empty
     state "No invoices yet." Degraded state "Invoices couldn't be loaded from Stripe just now."
   - **Not-configured state** (`!isPlatformBillingConfigured()`): a single dashed notice, same style
     as the Settings placeholder: "Platform billing isn't set up on this deployment." Buttons hidden.
5. Buttons are client components that call the action, then `window.location.assign(url)` on `ok`
   and `toastError('Unable to open Stripe billing. Please try again.', { error })` on `err`. Disable
   while pending. Minimum 44px touch targets.
6. Dates format with `date-fns` (`MMMM d, yyyy`). Amounts format from cents with
   `Intl.NumberFormat('en-US', { style: 'currency', currency })`.

### FR-7 Dashboard alert

1. `lib/admin/system-alerts.ts`: new `SystemAlertKey` `'billing-past-due'`; new check
   `billingStatus?: BillingStatus | null`. When `past_due` or `unpaid`: severity `warning`, title
   "The platform subscription payment failed", impact "Stripe couldn't charge the card on file for the
   site's monthly plan. Nothing is turned off, but the card needs attention.", action "Update the
   payment method on the Billing page.", `href: '/admin/billing'`, `linkLabel: 'Go to billing'`.
   `canceled` produces no dashboard alert (the Billing page says so; the board may have chosen it).
2. `app/admin/page.tsx` supplies `billingStatus` from `getBillingAccount` through the admin client
   (the dashboard is already gated on `READ_ADMIN_PORTAL`; the alert is visible to any admin because it
   is actionable by asking whoever holds billing access). Unit-test the derivation.

### FR-8 Developer setup (`docs/platform-billing.md`, plus scripts)

1. Written for the owner, step by step:
   1. Create the platform Stripe account (or a sandbox on it). Create Product "Tres Dias Platform" with
      one recurring Price, $45.00 USD monthly. Copy the `price_…` id.
   2. Create a **restricted key** with write access to Checkout Sessions, Customers, Subscriptions,
      Billing Portal, and read access to Invoices and Payment Methods.
   3. Enable the Customer Portal (Settings → Billing → Customer portal): allow updating payment
      methods, viewing invoice history, and cancelling at period end; disallow plan switching.
   4. Add a webhook endpoint for `https://dustytrailstresdias.org/api/webhooks/platform-billing` with
      the six events in FR-5, copy the `whsec_…`.
   5. `vercel env add` the three variables for Production and Preview.
   6. Local: `bun run stripe:listen:platform` (new script:
      `stripe listen --forward-to localhost:3000/api/webhooks/platform-billing`, run while logged into
      the platform account; the printed `whsec_` goes in `.env.local` as
      `PLATFORM_STRIPE_WEBHOOK_SECRET`). Test cards: `4242 4242 4242 4242`; failing renewal:
      `4000 0000 0000 0341` attached as the default card.
   7. Stripe Tax note: if the platform becomes liable for sales tax on SaaS in its state, enable Stripe
      Tax and a registration before turning on `automatic_tax`; without a registration Stripe collects
      nothing silently.
2. `.env.example` gains the three names with one-line comments.

### FR-9 Tests (Jest, co-located `.test.ts`, no `__tests__`)

1. `platform-billing-service.test.ts`: `snapshotFromSubscription` against a basil-shaped fixture
   (items carry the period; price on the item), `applySubscriptionEvent` stale vs fresh, canceled
   transitions.
2. `webhook/handlers.test.ts`: replay returns 200 not-processed and writes nothing; stale
   `customer.subscription.updated` is skipped; `checkout.session.completed` in payment mode is ignored;
   `invoice.payment_failed` sets `latest_invoice_status` and tolerates a failing Stripe read. Mock
   `server-only` virtually, mock the repository and `lib/platform-stripe` as the existing
   `checkout-session-completed.test.ts` does.
3. `lib/admin/system-alerts.test.ts`: `past_due` yields the alert with the billing link; `active`,
   `null` and `canceled` yield none.
4. `lib/admin/navigation.test.ts`: the Billing item is hidden without `MANAGE_BILLING` and shown with
   it or `FULL_ACCESS`.
5. `permission-areas.test.ts` passes with the new enum value placed.

## Non-Goals (Out of Scope)

- Locking out or degrading the app on non-payment. Banner and alert only.
- Multiple plans, seats, usage pricing, trials, coupons, annual billing.
- Custom dunning or receipt emails. Stripe's Smart Retries and customer emails, enabled on the
  platform account, cover v1.
- Stripe Tax / `automatic_tax` (documented, not enabled).
- Stripe Connect for community fee collection (Epic 4).
- A `communities` table. `community_id` stays a nullable, FK-less reservation.
- Changing the existing fee checkout, its webhook, or DTTD's Stripe account in any way.
- E2E coverage in Playwright. A follow-up can add a signed `customer.subscription.updated` fixture in
  the style of `e2e/fixtures/stripe-events.ts` once a dummy platform webhook secret is wired into CI.

## Design Considerations

- Follow `docs/design-system.md` and the Site settings page for card chrome, spacing and typography.
  No Material UI; shadcn only. Status badges use the existing success/warning tokens.
- The page must read correctly to a non-technical, 65+ board member: no Stripe jargon in the UI
  ("Past due", not "unpaid invoice"; "Renews on", not "current_period_end").
- Mobile: the invoice table goes through `DataTable`, which renders cards below `md`.

## Technical Considerations

- **API version is basil.** `Subscription.current_period_*` moved to subscription items;
  `Invoice.subscription` moved to `invoice.parent.subscription_details.subscription`;
  `Invoice.payment_intent` moved to `invoice.payments`. Do not use the removed fields.
- **Ordering.** `customer.subscription.updated` can arrive before `created`, and Stripe does not
  guarantee order. `last_event_created` plus event-id dedupe makes the mirror converge regardless.
- **Sentry.** Every server `logger.error` becomes a Sentry event (`sentry.server.config.ts`
  `pinoIntegration`). Expected states (not configured on preview, stale event, replay, misrouted mode)
  log at `info`/`warn`.
- **Caching.** The Billing page is dynamic (it reads the session and Stripe). Actions call
  `revalidatePath`; the webhook route calls `revalidatePath('/admin/billing')` and `revalidatePath('/admin')`
  after a successful write (route handlers may not call `updateTag`).
- **Never trust the client.** Actions take no arguments that influence what is charged or which
  customer is used; the account row is always looked up server-side.
- **Restricted key.** Recommend `rk_` over `sk_` in the docs.
- Commit messages: conventional types, header and body lines ≤ 100 chars.

## Success Metrics

- Owner completes FR-8 setup and subscribes DTTD from `/admin/billing` on production with a real card;
  the first invoice is paid and the page shows Active with the renewal date within a minute.
- `stripe trigger customer.subscription.updated` and a replayed event both return 200 locally, with
  exactly one `billing_webhook_events` row per event id.
- A simulated failed renewal (test card `4000 0000 0000 0341`) shows Past due on the Billing page and
  the dashboard alert within one webhook delivery.
- `bun run test`, `bun run lint`, `npx tsc --noEmit` and `bun run build` are green.

## Implementation Units (suggested order, one commit each)

1. Env + platform client + permission (FR-1, FR-3).
2. Migration + regenerated types + repository/types (FR-2, FR-4.1–4.2).
3. Service pure functions + sync + tests (FR-4.3, FR-9.1).
4. Webhook route + handlers + tests (FR-5, FR-9.2).
5. Actions + Billing page + nav (FR-4.4, FR-6, FR-9.4).
6. Dashboard alert + test (FR-7, FR-9.3).
7. Docs + scripts (FR-8).

## Open Questions

- Which email should receive Stripe's receipts and failed-payment notices: the acting admin's, or the
  system address from Site settings (`getSystemEmailAddress`)? Spec defaults to the acting admin's
  email at customer creation; it is editable in the portal.
- Should `canceled` also raise a dashboard alert? Spec says no (a deliberate board decision should not
  nag), Billing page still shows it.
