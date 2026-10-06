# 22-spec-tenancy-schema-retrofit.md

## Introduction/Overview

Epic 2 of the platform roadmap (`docs/platform-roadmap-status.md`) adds the community dimension to the
database in place, so that Dusty Trails Tres Dias (DTTD) becomes tenant #1 of Tres Dias Platform and a
second community can be seeded next to it without either seeing the other. This spec is the **database
half of Epic 2**, plus the minimum application changes needed for DTTD to keep running unchanged against
the new schema. Host-based tenant resolution, the onboarding wizard, Stripe Connect calls and the
branding sweep are separate units and are listed under Non-Goals.

Today there is no tenant concept anywhere except two nullable, FK-less `community_id` columns
(`email_log`, `billing_account`). An audit on 2026-09-29 found that "add `community_id` to every table"
is necessary but not sufficient. Four things would silently break or leak on the second tenant:

1. **Global singletons.** `site_settings` is keyed by `key`, `contact_information` by the literal id
   `preweekend-couple`, and `community_encouragements` is pinned to one row by a `((1))` unique index
   (`20260118030550_remote_schema.sql:589`). None can hold a second community's row.
2. **"Active weekend" is a global query.** It is `weekends.status = 'ACTIVE'`, free text with no
   constraint. Activating a group runs an unscoped
   `UPDATE weekends SET status = 'FINISHED' WHERE status = 'ACTIVE'`
   (`services/weekend/repository.ts:337-349`), which would finish every community's weekend.
3. **Permissions answer "anywhere", not "here".** `auth_user_has_permission(p)` and
   `auth_user_cha_has_permission(p)` (`20260927000002_permission_helpers.sql`) join from `auth.uid()`
   through `user_roles` with no community filter, and `user-service.ts:65-112` unions CHA permissions
   across every ACTIVE weekend the user is rostered on. A Full Access admin in community A would pass
   every check in community B.
4. **The cache layer bypasses RLS and has no tenant in its keys.** `defineCachedRead`
   (`lib/cache/cached-read.ts:47-62`) runs on the admin client, keys entries by `[name, ...args]`, and
   five of its ten readers take no arguments.

So this spec does the column retrofit and, in the same programme, re-keys the singletons, makes the
active weekend a per-community pointer, makes the permission helpers and every RLS policy
community-aware, introduces composite foreign keys so a child row can never point at another tenant's
parent, and threads a community id through the few application chokepoints that bypass RLS.

### Settled decisions (roadmap, 2026-08-29 to 2026-09-28; this spec implements them)

- **Tenant isolation:** shared schema, one Supabase project, `community_id` on every tenant table,
  RLS mandatory everywhere. RLS is both the security and the tenant boundary.
- **Identity:** global users, per-community memberships matched by verified email. Membership carries
  roles, history and status.
- **Person spine:** one durable person record; candidacy, attendance, team roles and payments are
  events attached over time.
- **Roles:** per-community role rows seeded from a Tres Dias template; permissions are explicit grants,
  never derived from roster placement.
- **Active weekend:** kill the global flag; a per-community value used only as a default.
- **Medical / PII:** global to the person, permission-gated per community, consent at entry.
- **Migration strategy:** retrofit in place on prod, gated behind Epic 1 backups, rehearsed on a prod
  copy first.
- **Weekend model:** keep group (number) → weekend (gendered, dated). Gender stays an app-layer rule.

### Decisions made in this spec (2026-10-01)

- **DTTD's community id is the fixed UUID `c0000001-0000-4000-8000-000000000001`**, exported as
  `DTTD_COMMUNITY_ID` from `lib/communities/constants.ts`. The seed's second community is
  `c0000002-0000-4000-8000-000000000002`.
- **`user_roles.community_id` is stored, not derived**, and checked by a composite FK to
  `roles (community_id, id)`. Storing it keeps the RLS predicate a single column and makes the
  "role from another community" case impossible at the constraint level.
- **Deep child tables get `community_id` denormalised**, not derived through joins. Every RLS
  predicate is then one column, and every index can lead with it.
- **Person tables get no `community_id`:** `users`, `user_medical_profiles`, the `avatars` bucket.
  `billing_webhook_events`, `role_templates` and `permissions` are platform-level and also get none.
- **The policy predicate reads from a membership join, not a JWT claim.** A custom access-token hook
  can later cache memberships in the JWT; the join stays authoritative.
- **The RLS predicate shape is "community_id = ANY (set)"**, with set-returning helpers wrapped in
  `(SELECT …)` so they run once per statement and the planner can use the leading index.

**Owner decisions (2026-10-01):**

- `church_affiliation` stays on `users` as an identity attribute: a person attends one church
  regardless of community, so it is not migrated to `community_members`.
- The `files` bucket stays public per accepted risk H2, to be revisited before community #2.
- The U8 storage object move runs during a quiet hour with no announced maintenance window.
- The second seeded community is `BVTD`, "Brazos Valley Tres Dias", slug `bvtd`, timezone
  `America/Chicago`.
- Roles beyond the 11 seeded ones stay community-local with `template_key = NULL`; templates and
  per-community roles both remain editable later.

## Goals

- DTTD runs unchanged as tenant #1: every page, action, webhook and email behaves exactly as before,
  with its data carrying `community_id = DTTD_COMMUNITY_ID`.
- A second community seeded locally is invisible to DTTD members and vice versa, proven by an RLS
  matrix test over every tenant table and by service-level tests over the admin-client paths.
- No row can reference a parent in another community: composite foreign keys make that a constraint
  violation, not a bug class.
- No global singleton remains: settings, contacts, encouragements, the active weekend, and the
  billing row are all per community.
- Permissions are evaluated per community in SQL and in TypeScript from one shared membership model.
- The migration chain is rehearsed on a prod copy with recorded timings before it touches prod, and
  the nightly drift check stays green after it lands.

## User Stories

- **As a DTTD board member**, I want nothing to change for me on the day the retrofit lands, so the
  retreat season is not disrupted by platform work.
- **As the platform operator**, I want to seed a second community locally and prove with automated
  tests that neither community can read or write the other's rows, before any real second community
  is created.
- **As a person who serves in two communities**, I want one login, one medical profile and one avatar,
  with each community seeing only what my membership there grants.
- **As a Full Access admin in one community**, I must not be able to impersonate, read medical data,
  or grant roles in another community, even if I am also a plain member there.
- **As the developer**, I want the database to refuse a cross-tenant parent reference, so a bug in an
  action cannot produce a roster row in community A pointing at a weekend in community B.

## Functional Requirements

### FR-1 `communities` and `community_members`

1. Table `communities`:
   - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
   - `slug text NOT NULL UNIQUE` (subdomain label, `^[a-z0-9-]{2,32}$` CHECK), `code text NOT NULL
UNIQUE` (the short code used in weekend labels, e.g. `DTTD`), `display_name text NOT NULL`,
     `timezone text NOT NULL` (an IANA name; CHECK via `now() AT TIME ZONE timezone` is not possible,
     so validate in the app and in the seed)
   - `status text NOT NULL DEFAULT 'active'` CHECK in `('trial','active','suspended','archived')`
   - `active_weekend_group_id uuid` nullable, added in FR-6 (needs `weekend_groups.community_id`)
   - `stripe_account_id text` nullable UNIQUE, `sender_display_name text`, `sender_email text`, all
     nullable (filled by Epic 3 / 4)
   - `created_at`, `updated_at timestamptz NOT NULL DEFAULT now()`
   - `COMMENT ON` every column, in the style of `20260921000000_create_email_log.sql`.
2. The migration inserts the DTTD row with the fixed id: slug `dttd`, code `DTTD`, display name
   `Dusty Trails Tres Dias`, timezone `America/Chicago`, status `active`. `ON CONFLICT (id) DO NOTHING`.
3. Table `community_members`:
   - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `community_id uuid NOT NULL REFERENCES
communities(id)`, `user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE`,
     `UNIQUE (community_id, user_id)`
   - `status text NOT NULL DEFAULT 'active'` CHECK in `('pending','active','inactive','removed')`
   - `joined_at timestamptz NOT NULL DEFAULT now()`
   - the membership-level attributes moved off `users` (`remote_schema.sql:379-382`):
     `essentials_training_date timestamptz`, `special_gifts_and_skills text[]`, and
     `joined_weekend_group_id uuid` / `joined_external_community text` /
     `joined_external_number int` (the structured replacement for `users.weekend_attended`, filled
     in FR-7)
   - index `(user_id)`; `(community_id, status)`.
4. Backfill: one `active` membership in DTTD for every `public.users` row, copying the two
   attributes. `users.essentials_training_date`, `special_gifts_and_skills` are dropped in FR-7
   after the app reads the membership instead.
5. `sync_users` (`20260829000000_sync_user_email_on_change.sql`) is unchanged: it creates the global
   `users` row only. A membership is created by the app (the join flow is Epic 3; until then every
   signup on the DTTD host gets a DTTD membership from a small `ensureMembership(userId,
communityId)` call in the existing post-signup path).
6. RLS on both tables: SELECT `authenticated` where the row's `community_id` is one of the caller's
   (FR-5 helpers); `communities` UPDATE requires `WRITE_SETTINGS` in that community; no INSERT/DELETE
   policies (operator tooling uses service role). `community_members` INSERT/UPDATE/DELETE require
   `WRITE_USER_ROLES` in that community, plus the caller may insert their own `pending` row.

### FR-2 `community_id` on every tenant table

1. The column is added, in this order, to exactly these 23 tables:
   `weekend_groups`, `weekends`, `events`, `candidates`, `candidate_info`,
   `candidate_sponsorship_info`, `weekend_group_members`, `weekend_roster`, `draft_weekend_roster`,
   `team_form_completions`, `weekend_group_fee_changes`, `payment_transaction`, `deposits`,
   `deposit_payments`, `roles`, `user_roles`, `users_experience`, `site_settings`,
   `contact_information`, `community_encouragements`, `meeting_minutes_metadata`, `email_log`
   (exists), `billing_account` (exists).
2. These tables do **not** get it, and a test asserts they never do (FR-12.4): `users`,
   `user_medical_profiles`, `billing_webhook_events`, `role_templates`, `permissions`, `communities`.
3. Three-step pattern, one migration each so each step is independently re-runnable:
   - **Add:** `ALTER TABLE t ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES communities(id)
DEFAULT 'c0000001-…'`. On Postgres 15.8 a constant default is metadata-only, no rewrite.
   - **Backfill:** for rows inserted before the default existed (there are none after step 1, but the
     migration is written to be correct on a copy restored mid-chain), derive via the parent chain:
     ```sql
     UPDATE candidate_info ci SET community_id = c.community_id
       FROM candidates c WHERE c.id = ci.candidate_id AND ci.community_id IS NULL;
     UPDATE candidates c SET community_id = w.community_id
       FROM weekends w WHERE w.id = c.weekend_id AND c.community_id IS NULL;
     UPDATE weekends w SET community_id = g.community_id
       FROM weekend_groups g WHERE g.id = w.group_id AND w.community_id IS NULL;
     ```
     and so on for every derivable table. Rows that cannot be derived (community `events` with both
     `weekend_group_id` and `weekend_id` NULL, donation `payment_transaction` rows with NULL
     `weekend_id`, `candidates` with NULL `weekend_id`, every `roles` / `site_settings` /
     `contact_information` / `community_encouragements` row) are set to `DTTD_COMMUNITY_ID`
     explicitly.
   - **Lock:** `ALTER TABLE t ALTER COLUMN community_id SET NOT NULL, ALTER COLUMN community_id DROP
DEFAULT`. Dropping the default is deliberate: after this, any app path that forgot to set the
     column fails closed instead of silently writing to DTTD.
4. `email_log.community_id` and `billing_account.community_id` get the FK and NOT NULL in the same
   lock migration; the column comments that say "no FK yet" are replaced.
5. Every tenant table gets a leading-column index, e.g. `(community_id, weekend_id)` on
   `weekend_roster`, `(community_id, target_type, target_id) WHERE voided_at IS NULL` on
   `payment_transaction`, `(community_id, number)` on `weekend_groups`. Existing single-column
   indexes are kept until the rehearsal's `EXPLAIN` shows they are unused.
6. `bun run db:generate` after the lock migration; `database.types.ts` is committed with it.

### FR-3 Composite keys, tenant-scoped uniqueness, re-keyed singletons

1. `UNIQUE (community_id, id)` on `weekend_groups`, `weekends`, `candidates`, `roles`,
   `weekend_group_members`, `payment_transaction`, `deposits`, `community_members`.
2. Child FKs become composite so a child cannot reference a parent in another community:
   - `weekends (community_id, group_id) → weekend_groups (community_id, id)`
   - `events (community_id, weekend_group_id)` and `(community_id, weekend_id)` (both nullable; a
     composite FK with a NULL member is not checked, which is what we want)
   - `candidates (community_id, weekend_id) → weekends`
   - `candidate_info`, `candidate_sponsorship_info (community_id, candidate_id) → candidates`
   - `weekend_group_members (community_id, group_id) → weekend_groups`
   - `weekend_roster (community_id, weekend_id) → weekends` and `(community_id, group_member_id) →
weekend_group_members`; same for `draft_weekend_roster`
   - `team_form_completions (community_id, weekend_group_member_id) → weekend_group_members`
   - `weekend_group_fee_changes (community_id, group_id) → weekend_groups`
   - `deposit_payments (community_id, deposit_id) → deposits` and `(community_id,
payment_transaction_id) → payment_transaction`
   - `user_roles (community_id, role_id) → roles (community_id, id)`
   - `roles (community_id, based_on_role_id) → roles (community_id, id)` (a role may only inherit
     within its community)
   - `users_experience (community_id, weekend_id) → weekends` (nullable)
     The single-column FKs are dropped once the composite ones are validated, so there is one
     constraint per relationship.
     `payment_transaction.target_id` is polymorphic with no FK (`20260308000006`) and stays so; its
     community is asserted by the service when the row is written (FR-11.5).
3. Tenant-scoped uniques, all new:
   - `weekend_groups UNIQUE (community_id, number)` (today `number` has no unique at all,
     `20260308000001_weekend_groups.sql:4`)
   - `roles UNIQUE (community_id, label)`
   - `user_roles UNIQUE (community_id, user_id, role_id)`
   - `payment_transaction UNIQUE (community_id, payment_intent_id) WHERE payment_intent_id IS NOT
NULL`, replacing `payment_transaction_payment_intent_id_key` (`20260308000005`)
   - `deposits UNIQUE (community_id, payout_id)`, replacing the global `payout_id UNIQUE`
   - `billing_account UNIQUE (community_id)`
     The rehearsal runs a duplicate check for each before adding it; a duplicate aborts the rehearsal.
4. Re-keyed singletons:
   - `site_settings`: `PRIMARY KEY (community_id, key)`. The restrictive fee-default policies from
     `20260924000000:49-67` and the `site_settings_*` policies from `20260927000003:124-130` are
     recreated with the community predicate. `guard_and_log_weekend_group_fees()` reads the defaults
     `WHERE community_id = NEW.community_id` (`20260924000000:131-132`).
   - `contact_information`: column `id` renamed to `key`, `PRIMARY KEY (community_id, key)`. The
     value stays `preweekend-couple`; the five call sites (`notification-service.ts:79,96`,
     `board-service.ts:112`, `hooks/use-pre-weekend-email.ts:26`, `services/notifications/types.ts:7`)
     pass the community id alongside it.
   - `community_encouragements`: drop `community_encouragements_single_row`; add `UNIQUE
(community_id)`.
   - `meeting_minutes_metadata`: `PRIMARY KEY (community_id, storage_path)`; `storage_path` values
     gain the prefix in FR-9.

### FR-4 Roles as template plus per-community copies; permissions as data

1. Table `role_templates (key text PRIMARY KEY, label text NOT NULL, permissions text[] NOT NULL,
description text, type role_type NOT NULL, based_on_key text REFERENCES role_templates(key),
sort_order int)`. Seeded in the migration with DTTD's 11 roles from `supabase/seed.sql:18-30`
   under the keys `full_access`, `leaders_committee`, `admin`, `pre_weekend_couple`,
   `corresponding_secretary`, `president`, `vice_president`, `treasurer`, `recording_secretary`,
   `community_spiritual_director`, `at_large_members`. `seed.sql` stops inserting `roles` directly
   and the role rows for a community come from the template (FR-12.1). The Platform Support role of
   Epic 3 is a later template row, not part of this spec.
2. `roles.template_key text REFERENCES role_templates(key)` nullable (a community may create its own
   roles), `UNIQUE (community_id, template_key)`. Backfill DTTD's rows by fixed id
   (`a0000001-…` through `a0000011-…`) where present, otherwise by label; the rehearsal verifies all
   11 resolve on the prod copy and aborts if any does not.
3. Table `permissions (key text PRIMARY KEY, area text NOT NULL, label text NOT NULL, description
text)`, seeded from the `Permission` enum in `lib/security.ts:47-109` and
   `lib/security/permission-areas.ts`. A BEFORE INSERT OR UPDATE trigger on `roles`
   (`roles_permissions_known`) raises `22023` if any element of `roles.permissions` is not a
   `permissions.key`. `role_templates` gets the same trigger. A test
   (`lib/security/permissions-table.test.ts`) asserts the enum and the table agree, in the style
   of `cha-permissions-sql.test.ts`.
4. `DROP TYPE public.permissions` (the dead enum at `remote_schema.sql:74`; nothing references it,
   confirmed by `grep` in the rehearsal).
5. Migrations stop mutating roles by label. `20260411100000` and friends are history; any future
   change to a template is an `UPDATE role_templates … WHERE key = …` plus, if it should reach
   existing communities, an explicit per-community `UPDATE roles … WHERE template_key = …`.
   `role_templates` rows and per-community `roles` rows are both editable after provisioning;
   editing a template never rewrites existing communities' copies.
6. Label compares switch to `template_key`: `app/admin/people/config/columns.tsx:19,22`
   (`'Admin'`, `'Pre-Weekend Couple'`, note the hyphen never matched the seeded label) and
   `app/admin/community-board/components/role-assignments.tsx:216,221` (`'Pre Weekend Couple'`).
   `services/community/board/types.ts:10-14` keys board positions by template key.

### FR-5 Community-aware permission helpers and RLS

1. New helpers in `public`, all `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`, with
   EXECUTE revoked from `PUBLIC, anon` and granted to `authenticated, service_role`
   (`20260927000004` L1 rule):
   - `auth_member_communities() RETURNS uuid[]`: ids of communities where the caller has an `active`
     membership.
   - `auth_communities_with_permission(p text) RETURNS uuid[]`: ids of communities where the caller
     holds `p` or `FULL_ACCESS` through `user_roles` in that community, following
     `roles.based_on_role_id` within the community (the recursive CTE from `20260927000002:37-61`
     with `ur.community_id` carried through).
   - `auth_user_has_permission(p text, community_id uuid) RETURNS boolean`: the boolean form,
     `community_id = ANY (auth_communities_with_permission(p))`. Used by triggers and by the app.
   - `auth_user_cha_has_permission(p text, community_id uuid) RETURNS boolean`: as today
     (`20260927000002:77-110`) with `w.community_id = $2` added, and `w.status = 'ACTIVE'` kept.
     The one-argument overloads are dropped in the same migration, so any policy or trigger that was
     missed fails loudly at migration time rather than silently answering "anywhere".
2. **Policy template.** Every tenant table's policies are dropped and recreated from this shape:
   ```sql
   CREATE POLICY "<t>_select_member" ON public.<t>
     FOR SELECT TO authenticated
     USING (community_id = ANY ((SELECT public.auth_member_communities())));

   CREATE POLICY "<t>_insert_<perm>" ON public.<t>
     FOR INSERT TO authenticated
     WITH CHECK (community_id = ANY ((SELECT public.auth_communities_with_permission('<PERM>'))));
   -- UPDATE: USING and WITH CHECK both carry the predicate. DELETE: USING.
   ```
   Own-row policies (`auth.uid() = user_id`) and CHA-role policies keep their extra condition ANDed
   with the membership predicate. The "authenticated SELECT USING (true)" owner decision from Epic 0
   becomes "any active member of the community", which is the same openness within a tenant.
3. Per-table predicates (the permission named is the one the policy already uses in
   `20260927000003`; only the scoping is new):

   | Table                                                        | SELECT                   | INSERT / UPDATE / DELETE                                                      |
   | ------------------------------------------------------------ | ------------------------ | ----------------------------------------------------------------------------- |
   | weekend_groups, weekends, events                             | member                   | WRITE_WEEKENDS (fees: MANAGE_FEES), WRITE_EVENTS                              |
   | candidates, candidate_info, candidate_sponsorship_info       | member                   | member insert (`status = 'sponsored'`), WRITE_CANDIDATES, DELETE_CANDIDATES   |
   | weekend_roster, draft_weekend_roster                         | member                   | WRITE_TEAM_ROSTER or CHA(WRITE_TEAM_ROSTER, community_id)                     |
   | weekend_group_members                                        | member                   | own row or WRITE_TEAM_ROSTER / CHA                                            |
   | team_form_completions                                        | member                   | own row (via group member) or FULL_ACCESS                                     |
   | payment_transaction, deposits, deposit_payments              | READ_PAYMENTS (as today) | WRITE_PAYMENTS, team cash via CHA(READ_WRITE_TEAM_PAYMENTS)                   |
   | weekend_group_fee_changes                                    | READ_PAYMENTS            | none (trigger writes)                                                         |
   | roles, user_roles                                            | member                   | WRITE_USER_ROLES plus the FR-5.5 guard                                        |
   | users_experience                                             | member                   | own row, FULL_ACCESS or WRITE_WEEKENDS                                        |
   | site_settings, contact_information, community_encouragements | member                   | WRITE_SETTINGS / MANAGE_FEES, WRITE_USER_ROLES, WRITE_COMMUNITY_ENCOURAGEMENT |
   | meeting_minutes_metadata                                     | member                   | FILES_UPLOAD, FILES_DELETE                                                    |
   | email_log                                                    | FULL_ACCESS              | none (service role)                                                           |
   | billing_account                                              | MANAGE_BILLING           | none (service role)                                                           |
   | communities, community_members                               | member                   | FR-1.6                                                                        |

4. **Medical profiles** (`user_medical_profiles`, no `community_id`): own row as today; the admin
   policy from `20260312000000` is replaced by "the reader shares an active membership with the
   subject in a community where the reader holds READ_MEDICAL_HISTORY":
   ```sql
   EXISTS (
     SELECT 1 FROM community_members subj
     WHERE subj.user_id = user_medical_profiles.user_id AND subj.status = 'active'
       AND subj.community_id = ANY ((SELECT public.auth_communities_with_permission('READ_MEDICAL_HISTORY')))
   )
   ```
   Bare FULL_ACCESS no longer reads medical data. Impersonation writes (the reason for the old
   policy) go through the impersonated user's own-row policy because `getLoggedInUser()` swaps the
   user, and the write path uses the admin client with an explicit permission check (FR-11.7).
5. **Grant guard** (`20260927000004`): `role_grants_full_access(role_id)` is unchanged (it is
   role-local). The four `roles` / `user_roles` policies are recreated with
   `auth_user_has_permission('WRITE_USER_ROLES', community_id)` and
   `auth_user_has_permission('FULL_ACCESS', community_id)`.
6. `users` policies: SELECT stays open to `authenticated` but only for users who share a community
   with the caller (`EXISTS` on `community_members` against `auth_member_communities()`); UPDATE own
   row or FULL_ACCESS in a shared community; DELETE FULL_ACCESS in a shared community.
7. The two policies that inline the role join instead of calling a helper (the medical admin policy
   and any `'FULL_ACCESS' = ANY(r.permissions)` predicate) are gone after this unit; a test greps the
   migrations' final policy set via `pg_policies` and fails on `ANY(r.permissions)`.
8. `supabase/rls.test.ts` is extended per FR-12.3.

### FR-6 Active weekend as a per-community pointer; `weekends.status` as an enum

1. `CREATE TYPE weekend_status AS ENUM ('PLANNING', 'ACTIVE', 'FINISHED')`; `weekends.status` is
   converted with `USING (CASE upper(trim(both '''' from status)) WHEN 'ACTIVE' THEN 'ACTIVE' WHEN
'FINISHED' THEN 'FINISHED' ELSE 'PLANNING' END)::weekend_status`, `NOT NULL DEFAULT 'PLANNING'`.
   The rehearsal lists `SELECT DISTINCT status FROM weekends` first; anything outside the three
   values plus the broken default `'pre-weekend'` (`remote_schema.sql:478`) aborts. `WeekendStatus`
   in `lib/weekend/types.ts` already has these three values.
2. Partial unique index `weekends_one_active_per_type_per_community ON weekends (community_id, type)
WHERE status = 'ACTIVE'`: at most one active men's and one active women's weekend per community.
3. `communities.active_weekend_group_id uuid`, with `FOREIGN KEY (id, active_weekend_group_id)
REFERENCES weekend_groups (community_id, id) ON DELETE SET NULL`. Backfilled from the group of the
   currently ACTIVE weekends. It is the dropdown default the roadmap describes; `weekends.status`
   remains the lifecycle. `setActiveWeekendGroup` (`weekend-service.ts:531`) writes both in one
   transaction through a new RPC `set_active_weekend_group(community_id, group_id)` (SECURITY
   DEFINER, checks `auth_user_has_permission('WRITE_WEEKENDS', community_id)`), which replaces
   `updateWeekendStatusByCurrentStatus` and scopes the FINISHED update by `community_id`.
4. The five raw `.eq('status', 'ACTIVE')` reads (`services/weekend/repository.ts:84,900,935`,
   `services/weekend-group-member/repository.ts:108,511`) go through one
   `findActiveGroup(client, communityId)` in `services/weekend/repository.ts`.
   `findMaxWeekendGroupNumber` (`repository.ts:246`) takes `communityId`. E2E invariant S1
   (`e2e/fixtures/seed.ts:151-171`) takes a community id.
5. `auth_user_cha_has_permission` is scoped per FR-5.1, so CHA permissions from an ACTIVE weekend in
   community A never apply in B.

### FR-7 Weekend references as structure; person spine columns; drop moved `users` columns

1. `users_experience` gains `weekend_group_id uuid` with composite FK `(community_id,
weekend_group_id) → weekend_groups (community_id, id)`, plus `external_community_name text` and
   `external_weekend_number int`. CHECK: exactly one of `weekend_group_id` or
   `(external_community_name, external_weekend_number)` is set. `weekend_reference` is dropped after
   backfill.
2. Backfill parses the `DTTD#n` wire format (`lib/weekend/weekend-reference.ts:87-104`): a ref whose
   community equals the row's community `code` and whose number matches a `weekend_groups.number`
   in that community becomes `weekend_group_id`; everything else becomes the external pair. The
   rehearsal prints the rows that parsed as external so the owner can eyeball them.
3. `users.weekend_attended` is migrated the same way into `community_members.joined_weekend_group_id`
   / `joined_external_*` (FR-1.3), then `users.weekend_attended`, `essentials_training_date`,
   `special_gifts_and_skills` are dropped. `users.church_affiliation` stays on `users` as an
   identity attribute. `User.communityInformation` (`lib/users/types.ts`) reads from the membership.
4. `formatCommunityWeekendRef` / `parseCommunityWeekendRef` are deleted; `getWeekendLabel` takes the
   community code from the community record instead of `COMMUNITY_NAME`. The hand-built strings in
   `scripts/seed/world.ts:328,378,888` are replaced by group ids.
   `candidate_sponsorship_info.sponsor_weekend` stays free text.
5. Person spine start: `candidates.user_id uuid REFERENCES users(id)` and
   `candidate_sponsorship_info.sponsor_user_id uuid REFERENCES users(id)`, both nullable, no
   automatic backfill. An optional one-off script `scripts/link-candidates-by-email.ts` matches
   `candidate_info.email` to `users.email` and reports before writing.

### FR-8 Storage paths per community

1. Objects in the `files` bucket live under `{community_id}/…`, e.g.
   `c0000001-…/Meeting Minutes/2026-09.pdf`. One helper `communityStoragePath(communityId, relative)`
   in `lib/files/paths.ts` is the only place that builds a path; `file-service.ts:253`,
   `FileBrowserTable.tsx:107,120`, the upload actions, `app/api/files/download/route.ts` and
   `getStorageUsage` (`lib/storage.ts:41`, now per community) use it. The `avatars` bucket is
   untouched (per person, `{auth.uid()}.webp`).
2. Storage policies on `storage.objects` for `bucket_id = 'files'` compare the first path segment as
   text, so a non-UUID segment cannot raise a cast error:
   `(storage.foldername(name))[1] IN (SELECT id::text FROM unnest((SELECT public.auth_member_communities())) AS id)`
   for SELECT, and the same against `auth_communities_with_permission('FILES_UPLOAD' /
'FILES_DELETE')` for INSERT and DELETE (`20260927000000:235-253`).
3. **Object move script** `scripts/storage/move-to-community-prefix.ts`: service role, lists every
   object in `files`, calls `storage.from('files').move(name, DTTD_COMMUNITY_ID + '/' + name)`,
   then `UPDATE meeting_minutes_metadata SET storage_path = $1 || '/' || storage_path`. Idempotent
   (skips names already prefixed), dry-run by default, logs each move. Storage objects cannot be
   renamed in a SQL migration, so this is a documented one-off run during the U8 deploy. The
   `delete_meeting_minutes_metadata` trigger matches on `OLD.name` and keeps working.
4. The bucket stays `public = true` per accepted risk H2 (Open Questions).

### FR-9 Stripe columns and the billing row

1. `communities.stripe_account_id` (FR-1.1), `payment_transaction.stripe_account_id text` and
   `deposits.stripe_account_id text`, nullable, backfilled NULL (DTTD's account id is not known to
   the database today; Epic 4 fills it). Index `(stripe_account_id, payout_id)` on `deposits`.
2. Checkout metadata (`lib/payments/checkout-metadata.ts:25-37`) gains `community_id`; the webhook
   context (`services/stripe/webhook-context.ts`) reads it and asserts it equals the community of the
   candidate or group member it resolves, rejecting with 400 and a `warn` log otherwise.
3. `billing_account.community_id` NOT NULL, FK, `UNIQUE (community_id)` (FR-2.4, FR-3.3);
   `getBillingAccount(client, communityId)` replaces the `.limit(1)` first-row lookup
   (`services/platform-billing/repository.ts:27-35`); the platform webhook resolves the row by
   `stripe_customer_id` as it does today.

### FR-10 Seed and `role_templates` interplay

1. `supabase/seed.sql` inserts `role_templates` only. A SQL function
   `seed_community_roles(community_id uuid)` copies every template into `roles` for that community
   (with `based_on_role_id` resolved from `based_on_key`), is called by the DTTD migration for the
   DTTD row where a role with that `template_key` is missing, and is what Epic 3's wizard calls.
2. `scripts/seed/world.ts` is parameterised by a `CommunitySpec { id, slug, code, displayName,
timezone, numberOffset }` and generates two communities: DTTD and `BVTD` ("Brazos Valley Tres
   Dias", id `c0000002-…`, slug `bvtd`, timezone `America/Chicago`). Roughly a fifth of generated
   people are members of both, with different roles in each. `WIPED_TABLES`
   (`scripts/seed/index.ts:34`) gains the new tables; the wipe stays global (local only). The
   generated `contact_information` row no longer carries a personal email. Both seeded communities
   share a timezone, so timezone-scoping bugs are not exercised by the seed; a test may override the
   BVTD timezone where that matters.

### FR-11 Application chokepoints

1. `lib/communities/current.ts`: `getCurrentCommunity(): Promise<Community>`, React `cache()`d per
   request, callable from pages, actions, route handlers and the webhook (it must not depend on the
   proxy, which skips `/candidate/*`, `/payment/candidate-fee` and `/api/*`, `proxy.ts:11-20`). Its
   signature is `(headers: Headers) => Promise<Community>` behind the cached wrapper. In this spec the
   resolver returns the DTTD row; host resolution replaces the body later without changing callers.
2. `User` (`lib/users/types.ts:13-33`) gains `community: CommunitySummary` and `membershipId`;
   `roles`, `permissions`, `teamMemberInfo` and `communityInformation` are computed **only for the
   current community** in `services/identity/user/user-service.ts:60-112` (the roster scan filters
   `weekend_groups.community_id`, the role scan filters `user_roles.community_id`). A user with no
   active membership in the current community is `err('Not a member')` from `getLoggedInUser()`;
   the member layout renders a "not a member of this community" page. `authorizedAction` keeps its
   signature; handlers read `user.community.id`.
3. `defineCachedRead` takes `communityId` as the mandatory first argument of both `read` and the
   returned function; the cache key is `[name, communityId, ...args]`. `lib/cache/tags.ts` tags
   become functions of the community: `TAGS.weekends(cid)` is `c:${cid}:weekends`, and so on. The
   ten `updateTag` call sites pass the community id. Every cached reader filters
   `.eq('community_id', communityId)`.
4. `createAdminClient()` is renamed `createCommunityAdminClient(communityId, { audit?, reason })`,
   and an ESLint `no-restricted-imports` rule forbids importing the bare constructor outside
   `lib/supabase/` and the two platform-level webhooks. Every repository function in the 13 files
   that use it (`services/candidates/*`, `services/deposit/repository.ts`,
   `services/notifications/*`, `services/payment/repository.ts`, `services/settings/repository.ts`,
   `services/stripe/webhook-context.ts`, `services/weekend-group-member/repository.ts`,
   `services/weekend/repository.ts`, `services/platform-billing/actions.ts`, `app/admin/page.tsx`,
   `app/admin/billing/page.tsx`) takes a `communityId` and filters explicitly. The wrapper cannot
   filter automatically; the FR-12.3 service tests are what prove each path does.
5. Public UUID flows (candidate forms by candidate id, candidate fee by candidate id, the fee webhook
   by metadata) derive the community from the row they load and assert it equals
   `getCurrentCommunity().id` (webhook: the metadata's `community_id`). The sponsor form's
   client-supplied `weekend_id` (`actions/candidates.ts:33`) is checked server-side against the
   current community before insert, and the composite FK backs it up.
6. `findMaxWeekendGroupNumber`, `setActiveWeekendGroup`, `getStorageUsage` and the settings
   repository take `communityId` (FR-6, FR-8, FR-3.4).
7. Impersonation cookie payload (`impersonation-cookie.ts:20-27`) gains `communityId`. Starting
   impersonation requires `FULL_ACCESS` in the current community and an active membership of the
   target there; reading the cookie on another community's host treats it as absent. The cookie name
   drops the `DTTD_` prefix in favour of `TDP_IMPERSONATING_USER` (one-time logout of impersonators).

### FR-12 Tests

1. `supabase/rls.test.ts` keeps the anon suite and adds an **RLS matrix**: with the two-community
   seed loaded, sign in as a Full Access admin of DTTD and, for every table in FR-2.1, (a) `select
count(*)` where `community_id = BVTD` is 0, (b) inserting a row with `community_id = BVTD` is
   rejected, (c) updating a BVTD row affects 0 rows, (d) the same user, after being granted a plain
   BVTD membership, sees BVTD rows but still cannot write them. Medical: a DTTD admin cannot read a
   BVTD-only member's profile; a user who is Rector in DTTD has no CHA permission in BVTD.
2. Storage: a DTTD member listing `files` sees only the DTTD prefix; uploading under the BVTD
   prefix is rejected.
3. Service tests (vitest, local stack) for every admin-client path in FR-11.4: called with the DTTD
   id, each returns only DTTD rows from the two-community seed.
4. A schema test reads `information_schema.columns` and asserts every table in FR-2.1 has a NOT NULL
   `community_id` and every table in FR-2.2 has none.
5. `lib/security/permissions-table.test.ts` (FR-4.3) and the existing `cha-permissions-sql.test.ts`
   (updated for the two-argument helper) pass.
6. E2E: `e2e/fixtures/seed.ts` selectors take a community id; invariant S1 is per community; one new
   Playwright test signs in as a dual member and verifies the member hub shows DTTD's active group.
   A second Playwright host project is Non-Goal until host resolution exists.
7. `bun run test`, `bun run lint`, `npx tsc --noEmit`, `bun run build` green on every unit.

## Non-Goals (Out of Scope)

- Host-based tenant resolution in `proxy.ts` or `getCurrentCommunity()`; this spec's resolver returns
  DTTD.
- The create-community wizard, join link / QR membership flow, member deactivation, lifecycle
  statuses beyond the `status` column (Epic 3).
- Stripe Connect API calls, the Connect webhook endpoint, per-community products, refunds (Epic 4).
  Only the columns and the metadata field land here.
- The branding, copy and email-template sweep (`DTTD`, "Dusty Trails", `America/Chicago` in seven
  files, `SYSTEM_EMAIL_DISPLAY_NAME`, `getUrl`'s single `SITE_URL`), the landing page becoming
  dynamic, `lib/communities/whitelist.ts` becoming a table.
- A custom access-token hook that mirrors memberships into the JWT.
- Flipping the `files` bucket to private. The owner decided 2026-10-01 to keep it public per
  accepted risk H2 and to revisit before community #2.
- `audit_log` (cross-cutting roadmap item; it should land with `community_id` from day one).
- Generic row-change triggers.
- Follow-up, one line, not tenancy: remove the developer's personal email and phone from
  `app/(member)/payment/team-fee/page.tsx:48-49`, `components/checkout.tsx:135` and
  `components/public-checkout.tsx:136`.

## Technical Considerations

- **Postgres 15.8 on prod.** `ADD COLUMN … DEFAULT <constant>` is metadata-only; `SET NOT NULL`
  scans the table (all tables are small, the rehearsal records the time). Composite FK validation
  scans both sides; add them `NOT VALID` then `VALIDATE CONSTRAINT` if any step exceeds a few seconds.
- **Dropping the one-argument helper overloads** is the safety net: PostgREST will fail any policy
  that still calls them at `CREATE POLICY` time, inside the migration transaction.
- **`(SELECT fn())` wrapping** makes the planner evaluate a STABLE helper once per statement and
  treat the result as a constant array, so `community_id = ANY (…)` can use the leading index.
  Without it, the function may be called per row.
- **Composite FKs with a nullable member** are not checked when any member is NULL (`MATCH SIMPLE`,
  the default). That is the desired behaviour for `events`, `candidates.weekend_id` and
  `users_experience.weekend_id`; the NOT NULL `community_id` still binds the row to a tenant.
- **Circular FK** `communities → weekend_groups → communities`: the pointer column is added in U6,
  after `weekend_groups.community_id` exists, and is `ON DELETE SET NULL`. The seed inserts groups
  before setting the pointer.
- **Enum conversion** of `weekends.status` rewrites the column; `supabase gen types` turns
  `WeekendStatusValue` into the enum's union, which already matches `lib/weekend/types.ts`.
- **`unstable_cache` keys** are strings; the community id is the second element so a stale entry
  from before U0 never collides (the old keys had no second element of that shape).
- **Service role bypasses RLS**, so FR-11.4 and FR-12.3 are the actual isolation guarantee for
  webhooks, candidate forms, notifications and cached readers. Treat a bare admin query without a
  community filter as a security bug in review.
- **Migrations as truth.** Every schema change is a file under `supabase/migrations`; the nightly
  `drift.yml` must be green the morning after each prod deploy. The storage object move is the one
  non-SQL step and is documented in the U8 PR and in `docs/` runbook form.
- Commit messages: conventional types, header and body lines ≤ 100 chars.

## Security Considerations

- **Fail closed.** Dropping the column defaults (FR-2.3) and the one-argument helper overloads
  (FR-5.1) means an app path that forgot the community errors instead of writing to or reading from
  DTTD.
- **No permission bleed.** Both SQL helpers and `user-service.ts` compute permissions for one
  community. A Full Access admin in DTTD is a plain member in BVTD unless granted there.
- **Medical data** is never readable on bare FULL_ACCESS; it requires a shared active membership and
  `READ_MEDICAL_HISTORY` in that community (FR-5.4). This is the enforcement half of the roadmap's
  "global to the person, gated per community" decision; consent wording remains open.
- **Impersonation** is bound to a community (FR-11.7), so an admin cannot act as a member of a
  community they do not administer.
- **Composite FKs** turn every cross-tenant reference bug into a constraint error.
- **Public UUID flows** assert the row's community matches the request's (FR-11.5), so a candidate
  id from community A cannot be used on community B's host once hosts exist.
- `anon` keeps only USAGE on the schema (`20260927000001`); nothing here grants it more.

## Success Metrics

- On the prod copy rehearsal, every post-migration verification query in Rollout step 4 passes and
  the full chain runs in under the agreed window.
- The RLS matrix test (FR-12.1) and the schema test (FR-12.4) pass locally and in `ci.yml`.
- After the prod deploy of each unit, the member hub, sponsor form, candidate forms, candidate fee
  checkout, team fee checkout, admin payments, roster builder and settings pages work for DTTD with
  no code path change visible to users; `drift.yml` is green the next morning.
- `grep -rn "createAdminClient()"` outside `lib/supabase/` and the platform webhooks returns nothing.
- `grep -rn "DTTD#"` returns nothing outside tests of the backfill parser.

## Implementation Units (suggested order, one PR each)

Each unit leaves DTTD fully working. Tenant isolation is not claimed until U5 and U10 have landed.

| Unit                                              | Migrations                                                                                                                           | Code                                                                                                                                                                                                                                                                                            | Verified by                                                              | Must be true before the next unit                                                                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **U0 App pre-work** against the hardcoded DTTD id | none                                                                                                                                 | `lib/communities/constants.ts`, `current.ts` stub; `findActiveGroup(communityId)`; scoped `setActiveWeekendGroup` UPDATE; `defineCachedRead` + tags take `communityId`; `createCommunityAdminClient` + lint rule; `User.community`; two-community `world.ts` generating only DTTD rows until U1 | unit tests, lint rule fires on a bare call, E2E green                    | the activation UPDATE names the groups it finishes (`group_id IN (…)` for the current community) and never runs a bare `status = 'ACTIVE'`; the filter becomes `community_id` in U2 |
| **U1 Communities**                                | `20261011000000_communities.sql`, `20261011000001_community_members.sql`                                                             | `getCurrentCommunity()` reads the row; `ensureMembership`; `User.communityInformation` from membership                                                                                                                                                                                          | FR-1 tests; every existing user has one DTTD membership                  | `SELECT count(*) FROM users` = `SELECT count(*) FROM community_members`                                                                                                             |
| **U2 Column everywhere**                          | `20261012000000_community_id_add.sql`, `…000001_community_id_backfill.sql`, `…000002_community_id_lock.sql`                          | every insert path sets `community_id`; repositories filter by it; types regenerated                                                                                                                                                                                                             | FR-12.4 schema test; zero NULLs                                          | no NULL `community_id`, no defaults remain                                                                                                                                          |
| **U3 Keys and singletons**                        | `20261013000000_composite_keys.sql`, `…000001_tenant_uniques.sql`, `…000002_rekey_singletons.sql`                                    | settings, contacts, encouragements, minutes repositories take `communityId`; fee trigger scoped                                                                                                                                                                                                 | duplicate pre-checks; FK validation; settings page works                 | all composite FKs `VALIDATED`                                                                                                                                                       |
| **U4 Roles and permissions**                      | `20261014000000_role_templates.sql`, `…000001_permissions_table.sql`                                                                 | `seed_community_roles`; `seed.sql`; label compares → `template_key`; permissions-table test                                                                                                                                                                                                     | FR-4 tests; all 11 DTTD roles have a key                                 | every role matching one of the 11 seeded ids or labels has a `template_key`; any other DTTD roles are listed in the PR and kept as community-local rows                             |
| **U5 Helpers and RLS**                            | `20261015000000_tenant_permission_helpers.sql`, `…000001_tenant_rls_policies.sql`, `…000002_tenant_grant_guard.sql`                  | `user-service.ts` per-community permissions; medical read path; `cha-permissions-sql.test.ts`                                                                                                                                                                                                   | RLS matrix (FR-12.1) against the two-community seed; `pg_policies` grep  | no policy references a one-argument helper or `ANY(r.permissions)`                                                                                                                  |
| **U6 Active weekend**                             | `20261016000000_weekend_status_enum.sql`, `…000001_active_weekend_group.sql`                                                         | `set_active_weekend_group` RPC; `findActiveGroup` reads the pointer; S1 per community                                                                                                                                                                                                           | activation E2E; partial unique index holds                               | `communities.active_weekend_group_id` matches the ACTIVE weekends' group for DTTD                                                                                                   |
| **U7 Refs and spine**                             | `20261017000000_users_experience_weekend_group.sql`, `…000001_person_spine_columns.sql`, `…000002_drop_users_membership_columns.sql` | delete `weekend-reference.ts`; `getWeekendLabel(community)`; seed uses group ids; experience UI                                                                                                                                                                                                 | backfill report reviewed; experience pages work                          | `weekend_reference` and `users.weekend_attended` gone                                                                                                                               |
| **U8 Storage**                                    | `20261018000000_storage_community_prefix.sql` (policies, metadata PK)                                                                | `communityStoragePath`; file browser, uploads, download route, `getStorageUsage`; `scripts/storage/move-to-community-prefix.ts`                                                                                                                                                                 | FR-12.2; dry-run output on the prod copy                                 | every object in `files` is under the DTTD prefix; metadata paths match                                                                                                              |
| **U9 Stripe columns**                             | `20261019000000_stripe_account_columns.sql`, `…000001_billing_account_community.sql`                                                 | metadata `community_id`; webhook cross-check; `getBillingAccount(communityId)`                                                                                                                                                                                                                  | synthetic webhook E2E (spec 20) with and without matching `community_id` | `billing_account` has exactly one row, for DTTD                                                                                                                                     |
| **U10 Proof**                                     | none                                                                                                                                 | FR-12.3 service tests; dual-member E2E; `docs/platform-roadmap-status.md` Epic 2 row updated                                                                                                                                                                                                    | full `ci.yml` green                                                      | Epic 2 database half closed                                                                                                                                                         |

## Rollout

1. **Gate: backups.** Supabase Pro with daily backups (Epic 1's open item) is enabled and a manual
   backup is taken immediately before each prod deploy of U1 to U9. No unit in this spec is applied to
   prod before that.
2. **Rehearsal on a prod copy.** `supabase db dump --linked` (schema plus data) restored into a local
   stack; run the full migration chain U1 to U9 with `supabase migration up`; run the move script in
   dry-run then for real; run the verification queries below; record wall time per migration in the
   PR of the unit that adds it. Repeat the rehearsal from a fresh dump before each unit's prod deploy,
   since prod data changes between units.
3. **Ordering.** Units ship one at a time through the normal `preview` → `main` release path; each
   deploy applies its migrations through `release.yml` as today. U8's object move runs by hand from
   the developer's machine against prod with the service key, during a quiet hour with no announced
   maintenance window: the move itself takes seconds, and the only user-visible effect is that the
   file browser may miss files between the rename and the promotion of the U8 build, so the move
   script runs and the U8 app build is promoted back to back, immediately after the U8 migration has
   applied.
4. **Verification queries after each prod deploy** (kept in
   `docs/specs/22-spec-tenancy-schema-retrofit/verify.sql`):
   - per-table counts `WHERE community_id = DTTD` equal the pre-deploy counts recorded in the PR;
   - `SELECT count(*) … WHERE community_id IS NULL` is 0 for every FR-2.1 table;
   - every composite FK is `convalidated = true` in `pg_constraint`;
   - `SELECT * FROM pg_policies WHERE qual LIKE '%ANY(r.permissions)%'` is empty after U5;
   - after U7, `SELECT count(*) FROM users_experience WHERE weekend_group_id IS NULL AND
external_community_name IS NULL` is 0;
   - after U8, `SELECT count(*) FROM storage.objects WHERE bucket_id = 'files' AND name NOT LIKE
'c0000001-%'` is 0.
5. **Drift.** `drift.yml` runs the morning after each deploy; a red run blocks the next unit.
6. **Rollback.** Each unit's migrations are additive until its lock step; a failed deploy before the
   lock is rolled back by reverting the app build. After the lock step, rollback is restore-from-backup,
   which is why step 1 is a gate and the rehearsal is repeated per unit.

## Open Questions

None open. The five questions raised on 2026-10-01 were answered the same day and are recorded
under Decisions made in this spec.
