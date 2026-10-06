# Platform billing

The community pays the platform operator a flat **$45 / month** through Stripe Billing. Stripe owns the
subscription, renewals, retries and receipts; the app keeps a small mirror of the subscription state
(`billing_account`), shows it on **Admin → Billing**, and keeps the mirror honest through a webhook.
Card changes, cancellation and invoice PDFs happen in the **Stripe Customer Portal**, so the app never
touches card data.

Spec: `docs/specs/21-spec-platform-billing/21-spec-platform-billing.md`.

## The one thing to get right: two Stripe accounts

The keys already in this app (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) belong to **the
community's own Stripe account**, which collects candidate and team fees. A Stripe account cannot
charge itself, so the platform subscription is billed from a **second, platform-owned Stripe account**
with its own restricted key, webhook secret, Product and Price.

- Community account → `lib/stripe.ts`, `/api/webhooks/stripe`. Unchanged.
- Platform account → `lib/platform-stripe.ts`, `/api/webhooks/platform-billing`. This document.

Never point a platform webhook at `/api/webhooks/stripe`: its `checkout.session.completed` handler
rejects sessions without a `payment_intent`, so a subscription event there returns 400 and Stripe
retries it indefinitely.

## Setup (owner, one time per environment)

Do this once against a **sandbox** of the platform account for development and preview, and again
against the live account at launch. Use test mode / the sandbox until the very last step.

### 1. Product and Price

In the platform Stripe account: **Product catalog → Add product**.

- Name: `Tres Dias Platform`
- Pricing: **Recurring**, **$45.00 USD**, billed **Monthly**
- Save, open the price and copy its id (`price_…`). That is `PLATFORM_STRIPE_PRICE_ID`.

### 2. Restricted API key

**Developers → API keys → Create restricted key**. Prefer a restricted key (`rk_…`) over a secret
key: the app only needs these resources.

| Resource                              | Permission |
| ------------------------------------- | ---------- |
| Checkout Sessions                     | Write      |
| Customers                             | Write      |
| Subscriptions                         | Write      |
| Customer portal (Billing Portal)      | Write      |
| Invoices                              | Read       |
| Payment Methods                       | Read       |
| Webhook Endpoints (optional, for CLI) | Read       |

Copy the key. That is `PLATFORM_STRIPE_SECRET_KEY`.

### 3. Customer Portal

**Settings → Billing → Customer portal**. Turn on:

- Payment methods: **allow customers to update payment methods**
- Invoice history: **show**
- Cancellations: **allow**, **at end of billing period** (not immediately)
- Subscriptions: **do not** allow switching plans or changing quantities (there is one plan)
- Business information: the platform's name and support email; these appear on the portal and receipts

Also under **Settings → Billing → Subscriptions and emails**, turn on **Smart Retries** and the
customer emails for **successful payments** and **failed payments**. Those emails are the receipts and
dunning for v1; the app sends none of its own.

### 4. Webhook endpoint

**Developers → Webhooks → Add endpoint**.

- Endpoint URL: `https://tresdiasplatform.org/api/webhooks/platform-billing`
  (for a Vercel preview, the preview's URL with the same path). Until the platform domain is attached
  to the Vercel project it is `https://www.dustytrailstresdias.org/api/webhooks/platform-billing`.
  One endpoint serves every community: the handler finds the tenant from the event payload, never from
  the host (see "Domains and routing" in `docs/platform-roadmap-status.md`).
- Events (exactly these six):
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- After saving, reveal the **Signing secret** (`whsec_…`). That is `PLATFORM_STRIPE_WEBHOOK_SECRET`.

### 5. Environment variables

Add the three variables to Vercel for **Production** and **Preview** (use the sandbox values for
Preview until launch):

```sh
vercel env add PLATFORM_STRIPE_SECRET_KEY production
vercel env add PLATFORM_STRIPE_SECRET_KEY preview
vercel env add PLATFORM_STRIPE_WEBHOOK_SECRET production
vercel env add PLATFORM_STRIPE_WEBHOOK_SECRET preview
vercel env add PLATFORM_STRIPE_PRICE_ID production
vercel env add PLATFORM_STRIPE_PRICE_ID preview
```

A deployment missing any of the three shows "Platform billing isn't set up on this deployment." on
the Billing page and logs a warning (not an error) if a webhook arrives. Nothing crashes.

### 6. Local development

1. Put the sandbox `PLATFORM_STRIPE_SECRET_KEY` and `PLATFORM_STRIPE_PRICE_ID` in `.env.local`.
2. Log the Stripe CLI into the **platform** account (`stripe login`; it can hold several accounts,
   pick the platform one or use `--project-name`).
3. Run `bun run stripe:listen:platform`. It forwards the platform account's events to
   `localhost:3000/api/webhooks/platform-billing` and prints a `whsec_…`; put that in `.env.local` as
   `PLATFORM_STRIPE_WEBHOOK_SECRET` and restart `bun run dev`.
4. Open `/admin/billing` as a Full Access user (or one granted **Manage platform billing** under
   Security → People, community & settings → Manage) and press **Subscribe**.

Test cards:

| Card                  | Use                                                                                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `4242 4242 4242 4242` | Succeeds. Any future expiry, any CVC, any ZIP.                                                                                                                          |
| `4000 0000 0000 0341` | Attaches, then **fails when charged**. Attach it as the default card (via the portal), then advance the test clock or trigger `invoice.payment_failed` to see Past due. |

Handy CLI checks:

```sh
stripe trigger customer.subscription.updated   # 200, one billing_webhook_events row
stripe events resend evt_…                      # replay: 200, "replay": true, no second row
```

### 7. Sales tax (read before launch)

Nothing here enables tax. If the platform becomes liable for sales tax on SaaS in its state, turn on
**Stripe Tax**, add a **tax registration** for that state, and only then set `automatic_tax` on the
Checkout Session. Without a registration Stripe collects nothing, silently.

## How it works

- **Permission.** `MANAGE_BILLING` (label "Manage platform billing"), in the _People, community &
  settings_ ladder's Manage tier. Full Access holders have it implicitly. Weekend (CHA) roles never
  imply it.
- **Mirror.** `billing_account` holds one row (seeded by the migration with `community_id = NULL`,
  ready for the multitenancy retrofit). `status` is Stripe's subscription status verbatim; `NULL`
  means never subscribed. Reads are RLS-gated on `MANAGE_BILLING`; there are no write policies, so
  writes only happen through the service-role client from the webhook and the actions.
- **Idempotency and ordering.** Every delivery is recorded in `billing_webhook_events` _before_ the
  account is written; a repeated event id is answered 200 and does nothing. Subscription events carry
  `event.created`, and one older than `billing_account.last_event_created` is recorded as
  `skipped_stale`. The checkout return and the Refresh button read Stripe live and always win.
- **Enforcement.** Banner and dashboard alert only. `past_due` / `unpaid` show a warning on the Billing
  page and on the admin dashboard; `canceled` shows on the Billing page only. Nothing is locked.
- **API version.** stripe-node 18.x → `2025-08-27.basil`. `current_period_start/end` live on the
  subscription **item**; an invoice's subscription is `invoice.parent.subscription_details.subscription`.

## Seed and reset

`billing_account` and `billing_webhook_events` are **not** in the seed's `WIPED_TABLES`: like `roles`
and `site_settings`, the migration-seeded row survives a reseed. Locally, "never subscribed" is the
honest state.
