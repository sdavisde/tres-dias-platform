# 23 — Community email

Admins write one email in the app and send it to a group the platform already knows about. It is
sent through Resend (Pro plan), in the community's name, with replies going to whoever sent it.

## What it does

- **Admin → Email** lists drafts and sent emails. **New email** creates a draft (an explicit Create);
  from then on the draft auto-saves like every other editor.
- **Audiences**, resolved when the email is sent, not when it was written:
  - the whole community, or just its men or women (`users.gender`)
  - a weekend's team (`weekend_roster`, without drops)
  - a weekend's candidates, or their sponsors (`candidate_sponsorship_info`, without rejected
    candidates)
  - holders of a community role (`user_roles`)
- Under the picker: "N people will receive this", how many are left out (unsubscribed or with no
  address), and **See who**. Addresses are lower-cased and de-duplicated.
- **Editor**: formatted text (bold, italic, underline, heading, lists, quote, links) in a fixed
  branded layout (`components/email/CommunityEmail.tsx`). `{{first_name}}` is filled per person
  ("friend" when unknown). No images or attachments in v1. The body is sanitized on every save and
  again at send (`services/community-email/content.ts`).
- **Preview** tab, **Send test to me** (the sender only, subject prefixed `[Test]`), then **Review &
  send**: a confirmation with the count, From, Replies go to, and Subject. A draft can only be sent
  once: sending moves it from `draft` to `sending` with a conditional update.
- **Sent report**: recipients, sent / failed / skipped counts, each recipient's status, and the email
  as sent. **Duplicate** starts a new draft from it.
- **Unsubscribe**: every email has a footer link to `/unsubscribe?t=…` (asks before acting, so link
  scanners can't unsubscribe anyone) and `List-Unsubscribe` + `List-Unsubscribe-Post` headers
  pointing at `POST /api/email/unsubscribe?t=…` (RFC 8058 one-click, which Gmail and Yahoo require of
  bulk senders). Tokens are an HMAC of the address (`EMAIL_UNSUBSCRIBE_SECRET`, falling back to
  `SUPABASE_SECRET_KEY`) and never expire. Unsubscribing affects community email only; forms, payment
  and account emails still go out.

## Permissions

A new **Community email** ladder on the Security page:

| Rung   | Permission             | Grants                                      |
| ------ | ---------------------- | ------------------------------------------- |
| View   | `READ_COMMUNITY_EMAIL` | The sent list and reports                   |
| Manage | `SEND_COMMUNITY_EMAIL` | Drafts, previews, test sends and real sends |

Full Access holders have both. Weekend (CHA) roles imply neither.

## Safety rail off production

Vercel previews share the production database, so a preview could otherwise email the real
community. Unless `VERCEL_ENV=production`, a send only reaches the **sender** plus
`COMMUNITY_EMAIL_SANDBOX_ALLOWLIST` (comma-separated); everyone else is recorded as `skipped`, and the
composer and confirmation say so. `COMMUNITY_EMAIL_LIVE_SENDS=true` turns the rail off on purpose.
Local dev and CI are non-production too, so the E2E suite never reaches Resend for the audience.

## Sending and cost

Resend's batch endpoint, 100 emails per call, ~600 ms apart (rate limit), each batch with an
idempotency key (`community-email-<id>-<batch>`). A batch is all-or-nothing, so obviously bad
addresses are filtered first. Each batch is one `email_log` row (`template = 'community-email'`,
`recipient_count` = batch size), so the existing monthly usage metric counts community email.
The send runs inside the page's server action (`maxDuration = 300`), enough for several thousand
recipients.

## Data

`supabase/migrations/20261013000000_community_email.sql`, additive only:

- `email_broadcasts`: one row per email (subject, sanitized body, audience JSON, status, counts,
  soft delete for drafts)
- `email_broadcast_recipients`: one row per address per send, with status and Resend id
- `email_unsubscribes`: opted-out addresses (lower-cased, unique)

RLS: reads need `READ_COMMUNITY_EMAIL` or `SEND_COMMUNITY_EMAIL`; no write policies. Every write goes
through the service-role client, behind the permission-checked actions or (for unsubscribes) a
verified token. Until the migration reaches a database, the Email pages show a "not set up on this
database yet" notice instead of an error.

## Not in v1

Scheduling, saved templates, images and attachments, bounce/complaint webhooks, a postal address in
the footer (CAN-SPAM wants one; it needs a site setting), per-list unsubscribe, and a usage meter on
Billing.

## Tests

- Unit: `services/community-email/community-email.test.ts` (recipients, safety rail, sanitizing,
  personalizing, tokens), plus the permission-ladder and navigation tests.
- E2E: `e2e/community-email.spec.ts`: write and send to a weekend's candidates (all skipped by the
  rail), unsubscribe by link and by one-click (forged token rejected), and the permission gate.
