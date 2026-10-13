-- Migration: Community email (mass email / broadcasts)
-- Spec: docs/specs/23-spec-community-email
--
-- Purpose: admins write one email in the app and send it to a group of people
-- the platform already knows about (the whole community, a weekend team, a
-- weekend's candidates or sponsors, or holders of a community role). Three
-- tables:
--
--   email_broadcasts            one row per email, from draft through sent
--   email_broadcast_recipients  one row per address the send resolved to
--   email_unsubscribes          addresses that opted out of community email
--
-- Unlike email_log, broadcasts DO store their body: it is admin-authored
-- announcement text (not a template rendering candidate medical details), and
-- the sent-email history needs it.
--
-- Additive only (three new tables), so it is safe to apply ahead of the code.

-- ---------------------------------------------------------------------------
-- email_broadcasts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."email_broadcasts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "community_id" uuid,
  "subject" text NOT NULL DEFAULT '',
  "body_html" text NOT NULL DEFAULT '',
  "audience" jsonb NOT NULL DEFAULT '{"type": "community"}'::jsonb,
  "status" text NOT NULL DEFAULT 'draft',
  "created_by_user_id" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
  "sent_by_user_id" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
  "sent_at" timestamptz,
  "recipient_count" integer NOT NULL DEFAULT 0,
  "sent_count" integer NOT NULL DEFAULT 0,
  "failed_count" integer NOT NULL DEFAULT 0,
  "skipped_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz,
  CONSTRAINT "email_broadcasts_status_check" CHECK (
    "status" IN ('draft', 'sending', 'sent', 'failed')
  )
);

COMMENT ON TABLE "public"."email_broadcasts" IS 'Community emails written in Admin → Email. Drafts are edited in place (auto-save); a send freezes the row. Written only by the service-role client behind permission-checked server actions.';
COMMENT ON COLUMN "public"."email_broadcasts"."community_id" IS 'Reserved for the upcoming multitenancy retrofit. Intentionally has no foreign key: there is no communities table yet.';
COMMENT ON COLUMN "public"."email_broadcasts"."subject" IS 'Subject line. May be empty while a draft.';
COMMENT ON COLUMN "public"."email_broadcasts"."body_html" IS 'Body as sanitized HTML from the editor. Wrapped in the community email layout at send time; {{first_name}} is filled per recipient.';
COMMENT ON COLUMN "public"."email_broadcasts"."audience" IS 'Who it goes to, e.g. {"type":"community"}, {"type":"weekend_team","weekendId":"..."}, {"type":"role","roleId":"..."}. Resolved to addresses at send time; see services/community-email/types.ts.';
COMMENT ON COLUMN "public"."email_broadcasts"."status" IS 'draft = still editable; sending = a send is in progress; sent = every batch was handed to Resend (some recipients may still have failed); failed = nothing could be sent.';
COMMENT ON COLUMN "public"."email_broadcasts"."sent_at" IS 'When the send finished.';
COMMENT ON COLUMN "public"."email_broadcasts"."recipient_count" IS 'Addresses the audience resolved to at send time, after removing unsubscribes and duplicates.';
COMMENT ON COLUMN "public"."email_broadcasts"."sent_count" IS 'Recipients Resend accepted.';
COMMENT ON COLUMN "public"."email_broadcasts"."failed_count" IS 'Recipients Resend rejected.';
COMMENT ON COLUMN "public"."email_broadcasts"."skipped_count" IS 'Recipients deliberately not emailed: on non-production deployments only the sender (and an allowlist) receive mail.';
COMMENT ON COLUMN "public"."email_broadcasts"."deleted_at" IS 'Soft delete. Only drafts are deleted.';

CREATE INDEX IF NOT EXISTS "idx_email_broadcasts_created_at"
  ON "public"."email_broadcasts" ("created_at" DESC)
  WHERE "deleted_at" IS NULL;

-- ---------------------------------------------------------------------------
-- email_broadcast_recipients
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."email_broadcast_recipients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "broadcast_id" uuid NOT NULL REFERENCES "public"."email_broadcasts"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL,
  "email" text NOT NULL,
  "name" text,
  "status" text NOT NULL,
  "resend_message_id" text,
  "error_summary" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "email_broadcast_recipients_status_check" CHECK (
    "status" IN ('sent', 'failed', 'skipped')
  )
);

COMMENT ON TABLE "public"."email_broadcast_recipients" IS 'One row per address a community email was sent to (or skipped), for the sent-email report and "I never got it" questions.';
COMMENT ON COLUMN "public"."email_broadcast_recipients"."user_id" IS 'The member the address belongs to, when it came from a users row. NULL for candidate and sponsor addresses from the sponsorship form.';
COMMENT ON COLUMN "public"."email_broadcast_recipients"."status" IS 'sent = Resend accepted it; failed = Resend rejected it; skipped = not emailed (non-production safety rail).';

CREATE INDEX IF NOT EXISTS "idx_email_broadcast_recipients_broadcast_id"
  ON "public"."email_broadcast_recipients" ("broadcast_id");

-- ---------------------------------------------------------------------------
-- email_unsubscribes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."email_unsubscribes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "community_id" uuid,
  "email" text NOT NULL,
  "source" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "email_unsubscribes_email_lowercase" CHECK ("email" = lower("email")),
  CONSTRAINT "email_unsubscribes_source_check" CHECK (
    "source" IN ('link', 'one_click')
  )
);

COMMENT ON TABLE "public"."email_unsubscribes" IS 'Addresses that opted out of community email. Every send removes them. Transactional email (forms, payments, password resets) is unaffected.';
COMMENT ON COLUMN "public"."email_unsubscribes"."email" IS 'Lower-cased address.';
COMMENT ON COLUMN "public"."email_unsubscribes"."source" IS 'link = the unsubscribe page; one_click = a mail client''s List-Unsubscribe-Post button.';

CREATE UNIQUE INDEX IF NOT EXISTS "idx_email_unsubscribes_email"
  ON "public"."email_unsubscribes" ("email");

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Reads: holders of READ_COMMUNITY_EMAIL or SEND_COMMUNITY_EMAIL (Full Access
-- passes inside auth_user_has_permission()). Writes: none via the API. Drafts,
-- sends and unsubscribes are written with the service-role client: drafts and
-- sends behind permission-checked server actions, unsubscribes from the public
-- unsubscribe page after its signed token is verified.

ALTER TABLE "public"."email_broadcasts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."email_broadcast_recipients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."email_unsubscribes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Email readers can read community emails"
  ON "public"."email_broadcasts"
  FOR SELECT TO "authenticated"
  USING (
    "deleted_at" IS NULL
    AND (
      public.auth_user_has_permission('READ_COMMUNITY_EMAIL')
      OR public.auth_user_has_permission('SEND_COMMUNITY_EMAIL')
    )
  );

CREATE POLICY "Email readers can read community email recipients"
  ON "public"."email_broadcast_recipients"
  FOR SELECT TO "authenticated"
  USING (
    public.auth_user_has_permission('READ_COMMUNITY_EMAIL')
    OR public.auth_user_has_permission('SEND_COMMUNITY_EMAIL')
  );

CREATE POLICY "Email readers can read unsubscribes"
  ON "public"."email_unsubscribes"
  FOR SELECT TO "authenticated"
  USING (
    public.auth_user_has_permission('READ_COMMUNITY_EMAIL')
    OR public.auth_user_has_permission('SEND_COMMUNITY_EMAIL')
  );

-- No grants to "anon".
GRANT SELECT ON TABLE "public"."email_broadcasts" TO "authenticated";
GRANT ALL ON TABLE "public"."email_broadcasts" TO "service_role";
GRANT SELECT ON TABLE "public"."email_broadcast_recipients" TO "authenticated";
GRANT ALL ON TABLE "public"."email_broadcast_recipients" TO "service_role";
GRANT SELECT ON TABLE "public"."email_unsubscribes" TO "authenticated";
GRANT ALL ON TABLE "public"."email_unsubscribes" TO "service_role";
