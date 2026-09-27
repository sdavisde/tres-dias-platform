# Production verification — 2026-09-26

Read-only dump of the production Supabase project (policies, grants, default privileges, functions,
buckets, roles, applied migrations) taken before Unit 1. Raw output stayed in the session scratchpad;
this file records the comparison against the checked-in migrations.

## Result: no drift

- **Migrations:** 40 applied, 40 in `supabase/migrations/`, identical versions and names.
- **RLS:** enabled on all 24 public tables; none forced.
- **Policies:** 98 policies across `public` and `storage`. Every one matches what the migrations create,
  including the baseline `TO anon, authenticated USING (true)` policies on `users`, `roles`,
  `user_roles`, `candidates`, `candidate_info` and `candidate_sponsorship_info`, the `TO public`
  SELECT on `events`, `community_encouragements`, `storage.objects` and `storage.buckets`, and the
  restrictive fee and avatar policies. No policy exists that is not in a migration.
- **Grants:** `anon` and `authenticated` hold ALL privileges on all 24 tables (baseline
  `GRANT ALL` plus default privileges).
- **Default privileges:** `postgres` in schema `public` grants ALL on tables, sequences and functions
  to `anon`, `authenticated` and `service_role`. (`supabase_admin` has an equivalent set that
  migrations cannot alter; migrations run as `postgres`, so the `postgres` set is the one that
  matters for new tables.)
- **Functions:** six in `public`; `auth_user_has_permission`, `sync_users`,
  `delete_meeting_minutes_metadata` and `guard_and_log_weekend_group_fees` are SECURITY DEFINER.
  All grant EXECUTE to `anon`.
- **Buckets:** `avatars` (public, 5 MB, image types) and `files` (public, no limits).

## Role data (differs from `supabase/seed.sql`)

| Role                    | Live permissions relevant to Epic 0                                                                              | Members |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- | ------- |
| Full Access             | `FULL_ACCESS`                                                                                                    | 2       |
| Treasurer               | `READ_PAYMENTS`, `READ_WRITE_TEAM_PAYMENTS`, `WRITE_PAYMENTS`                                                    | 1       |
| Pre Weekend Couple      | `READ_CANDIDATES`, `WRITE_CANDIDATES`, `WRITE_PAYMENTS`, medical/contact reads                                   | 2       |
| Leaders Committee       | `WRITE_TEAM_ROSTER`, `READ_TEAM_ROSTER_BUILDER`, `WRITE_PAYMENTS`, `WRITE_EVENTS`, `WRITE_USER_ROLES`, ...       | 2       |
| Corresponding Secretary | `WRITE_TEAM_ROSTER`, `WRITE_USER_ROLES`, `WRITE_WEEKENDS`, `WRITE_SETTINGS`, `FILES_UPLOAD`                      | 1       |
| Admin                   | `READ_ADMIN_PORTAL`, `READ_CANDIDATES`, `FILES_UPLOAD`, `FILES_DELETE`, `WRITE_SETTINGS`, ... (no `FULL_ACCESS`) | 3       |

Consequences for the plan:

- The Treasurer already has `WRITE_PAYMENTS`, so the manual-payment gate
  (`READ_WRITE_TEAM_PAYMENTS OR WRITE_PAYMENTS`) needs no production data change. The seed file
  should be updated to match (`supabase/seed.sql:21`).
- `Full Access` has two members, not one. Worth confirming both are intended before the
  impersonation reader starts trusting `FULL_ACCESS` as the impersonation gate.
- Every role that can open the roster builder (`Leaders Committee`) or record payments already holds
  the permission the tightened actions and policies will require.

## Auth settings

Not fetched (management API token not available to the agent). The values in `supabase/config.toml`
are pushed to production on every merge to `main`, so the file is authoritative once Unit 7 lands.
