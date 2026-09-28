-- Migration: Platform billing
-- Spec: docs/specs/21-spec-platform-billing (FR-2)
--
-- Purpose: the community pays the platform operator a flat monthly subscription
-- through Stripe Billing, from a second, platform-owned Stripe account (the
-- community's own account collects candidate and team fees and cannot charge
-- itself). Stripe owns the subscription, renewals, retries and receipts; these
-- two tables are the app's small mirror of that state, kept honest by the
-- signature-verified webhook at /api/webhooks/platform-billing.
--
-- Shaped for the multitenancy retrofit (one row per community) without
-- depending on it: until a communities table exists there is exactly one row,
-- seeded below, with a NULL community_id.

-- ---------------------------------------------------------------------------
-- billing_account: one row per community
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."billing_account" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "community_id" uuid,
  "stripe_customer_id" text UNIQUE,
  "stripe_subscription_id" text UNIQUE,
  "status" text,
  "price_id" text,
  "plan_amount_cents" integer,
  "plan_interval" text,
  "currency" text,
  "current_period_start" timestamptz,
  "current_period_end" timestamptz,
  "cancel_at_period_end" boolean NOT NULL DEFAULT false,
  "canceled_at" timestamptz,
  "latest_invoice_id" text,
  "latest_invoice_status" text,
  "last_event_created" bigint,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "billing_account_status_check" CHECK (
    "status" IS NULL OR "status" IN (
      'incomplete', 'incomplete_expired', 'trialing', 'active',
      'past_due', 'canceled', 'unpaid', 'paused'
    )
  )
);

COMMENT ON TABLE "public"."billing_account" IS 'The community''s subscription to the platform, mirrored from Stripe Billing. One row per community; exactly one row until the multitenancy retrofit. Written only by the service-role client (webhook and billing actions), never from the browser.';
COMMENT ON COLUMN "public"."billing_account"."community_id" IS 'Reserved for the upcoming multitenancy retrofit. Intentionally has no foreign key: there is no communities table yet. Backfill and add the FK when that table lands.';
COMMENT ON COLUMN "public"."billing_account"."stripe_customer_id" IS 'Stripe Customer (cus_...) on the PLATFORM Stripe account. Created on the first Subscribe click; NULL until then.';
COMMENT ON COLUMN "public"."billing_account"."stripe_subscription_id" IS 'Stripe Subscription (sub_...) on the platform account. NULL until the first checkout completes.';
COMMENT ON COLUMN "public"."billing_account"."status" IS 'Stripe subscription status, verbatim. NULL means the community has never subscribed.';
COMMENT ON COLUMN "public"."billing_account"."price_id" IS 'The Stripe Price (price_...) the subscription is on, from the first subscription item.';
COMMENT ON COLUMN "public"."billing_account"."plan_amount_cents" IS 'Recurring amount in the smallest currency unit (cents), from the price''s unit_amount.';
COMMENT ON COLUMN "public"."billing_account"."plan_interval" IS 'Billing interval of the price (month, year, ...).';
COMMENT ON COLUMN "public"."billing_account"."currency" IS 'ISO currency code of the price, lower-case as Stripe returns it (e.g. usd).';
COMMENT ON COLUMN "public"."billing_account"."current_period_start" IS 'Start of the current billing period. On the basil API version this comes from the subscription item, not the subscription.';
COMMENT ON COLUMN "public"."billing_account"."current_period_end" IS 'End of the current billing period: the renewal date, or when access ends if cancel_at_period_end is set.';
COMMENT ON COLUMN "public"."billing_account"."cancel_at_period_end" IS 'True when the subscription is set to end at current_period_end instead of renewing.';
COMMENT ON COLUMN "public"."billing_account"."canceled_at" IS 'When the cancellation was requested. NULL unless canceled or canceling.';
COMMENT ON COLUMN "public"."billing_account"."latest_invoice_id" IS 'The newest invoice (in_...) Stripe has told us about, from the subscription or an invoice event.';
COMMENT ON COLUMN "public"."billing_account"."latest_invoice_status" IS 'Stripe invoice status of latest_invoice_id: draft, open, paid, uncollectible or void.';
COMMENT ON COLUMN "public"."billing_account"."last_event_created" IS 'Stripe event.created (epoch seconds) of the newest subscription event applied. An event older than this is stale and skipped, so out-of-order deliveries converge.';
COMMENT ON COLUMN "public"."billing_account"."created_at" IS 'When the row was created.';
COMMENT ON COLUMN "public"."billing_account"."updated_at" IS 'When the mirror was last written. Set by the writer, not a trigger.';

-- The single DTTD row. No-op when a row already exists (re-runs, or a future
-- backfill that already created it).
INSERT INTO "public"."billing_account" ("community_id")
SELECT NULL
WHERE NOT EXISTS (SELECT 1 FROM "public"."billing_account");

-- ---------------------------------------------------------------------------
-- billing_webhook_events: idempotency ledger for the platform webhook
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."billing_webhook_events" (
  "stripe_event_id" text PRIMARY KEY,
  "event_type" text NOT NULL,
  "received_at" timestamptz NOT NULL DEFAULT now(),
  "outcome" text NOT NULL,
  CONSTRAINT "billing_webhook_events_outcome_check" CHECK (
    "outcome" IN ('applied', 'skipped_stale', 'ignored')
  )
);

COMMENT ON TABLE "public"."billing_webhook_events" IS 'One row per Stripe event delivered to /api/webhooks/platform-billing. Inserted BEFORE any write to billing_account; a primary-key conflict means a replay, which the handler acknowledges (200) without doing anything.';
COMMENT ON COLUMN "public"."billing_webhook_events"."stripe_event_id" IS 'Stripe event id (evt_...). The primary key is the idempotency guard.';
COMMENT ON COLUMN "public"."billing_webhook_events"."event_type" IS 'Stripe event type, e.g. customer.subscription.updated.';
COMMENT ON COLUMN "public"."billing_webhook_events"."received_at" IS 'When the event was first received.';
COMMENT ON COLUMN "public"."billing_webhook_events"."outcome" IS 'applied = the mirror was written; skipped_stale = older than last_event_created; ignored = not an event we act on (or a misrouted checkout mode).';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Reads: holders of MANAGE_BILLING only. auth_user_has_permission()
-- (20260927000002_permission_helpers.sql) already treats FULL_ACCESS as
-- satisfying any permission and follows roles.based_on_role_id, so Full Access
-- holders pass without being named here.
--
-- Writes: none via the API at all. Rows are written with the service-role
-- client from the webhook (no session) and the billing actions, so no member
-- can grant the community a free subscription from the browser.

ALTER TABLE "public"."billing_account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."billing_webhook_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Billing managers can read the billing account"
  ON "public"."billing_account"
  FOR SELECT TO "authenticated"
  USING (public.auth_user_has_permission('MANAGE_BILLING'));

CREATE POLICY "Billing managers can read billing webhook events"
  ON "public"."billing_webhook_events"
  FOR SELECT TO "authenticated"
  USING (public.auth_user_has_permission('MANAGE_BILLING'));

-- No grants to "anon": billing state is never readable by the public.
GRANT SELECT ON TABLE "public"."billing_account" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_account" TO "service_role";
GRANT SELECT ON TABLE "public"."billing_webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_webhook_events" TO "service_role";
