# Unit 1 evidence — access-control policies and anonymous revocation, part A

Migration: `supabase/migrations/20260927000000_access_control_rls_anon_part_a.sql`, applied to the
local database with `supabase migration up` on 2026-09-27 (`Local database is up to date`).

All probes below ran against local Supabase (`http://127.0.0.1:54321`). `<anon>` is the local
publishable key; `<member>` is the access token of a throwaway member created for this check with
`POST /auth/v1/signup` (no roles). Keys and tokens are redacted.

## Anonymous callers (publishable key only)

```
curl -H "apikey: <anon>" -H "Authorization: Bearer <anon>" \
  http://127.0.0.1:54321/rest/v1/users?select=id&limit=1
→ 401 {"code":"42501","message":"permission denied for table users"}

GET  /rest/v1/user_roles?select=user_id&limit=1        → 401 permission denied for table user_roles
POST /rest/v1/user_roles {"user_id":…,"role_id":<Full Access>} → 401 permission denied for table user_roles
PATCH /rest/v1/roles?id=eq.<Treasurer> {"permissions":["FULL_ACCESS"]} → 401 permission denied for table roles
GET  /rest/v1/events?select=id&limit=1                 → 401 permission denied for table events
GET  /rest/v1/payment_transaction?select=id&limit=1    → 401 permission denied for table payment_transaction
POST /storage/v1/object/list/files {"prefix":""}       → 200 []   (no rows visible; policy gone)

GET  /rest/v1/candidates?select=id&limit=1             → 200 [{"id":"e0000001-…"}]
     (intentionally still open until Unit 5, see FR-1.4)
```

Before this migration the first four requests succeeded with the same key.

## Logged-in member with no roles

```
signup: POST /auth/v1/signup → 200, users row created by the sync_users trigger
GET   /rest/v1/users?id=eq.<self>                      → 200 (own row, email visible)
GET   /rest/v1/user_roles?select=user_id&limit=1       → 200 (reads stay open, owner decision)
POST  /rest/v1/user_roles {"user_id":<self>,"role_id":<Full Access>}
      → 403 {"code":"42501","message":"new row violates row-level security policy for table \"user_roles\""}
PATCH /rest/v1/roles?id=eq.<Treasurer> {"permissions":["FULL_ACCESS"]} → 200 []   (0 rows affected)
DELETE /rest/v1/roles?id=eq.<Recording Secretary>       → 200 []   (0 rows affected)
PATCH /rest/v1/users?id=eq.<self> {"first_name":"Epic"}  → 200 [updated row]   (own edit allowed)
PATCH /rest/v1/users?id=eq.<other> {"first_name":"Hacked"} → 200 []   (0 rows affected)
DELETE /rest/v1/users?id=eq.<other>                     → 200 []   (0 rows affected)
POST  /storage/v1/object/files/epic0-probe.txt          → 400 {"statusCode":"403","message":"new row violates row-level security policy"}
POST  /storage/v1/bucket {"id":"epic0-probe"}           → 400 {"statusCode":"403","message":"new row violates row-level security policy"}
GET   /storage/v1/bucket                                → 200 [files, avatars]   (listing still works)
```

## Same member after being given Leaders Committee (WRITE_USER_ROLES, FILES_UPLOAD, FILES_DELETE)

Granted with a superuser insert into `user_roles` on the local database only, then removed.

```
POST   /storage/v1/object/files/epic0-probe.txt         → 200 {"Key":"files/epic0-probe.txt",…}
DELETE /storage/v1/object/files {"prefixes":["epic0-probe.txt"]} → 200 [deleted object]
POST   /rest/v1/user_roles {"user_id":<other>,"role_id":<Recording Secretary>} → 201 [row]
```

A `psql` transaction with `request.jwt.claims` set to the same member confirmed
`auth_user_has_permission('WRITE_USER_ROLES') = true`, and INSERT/UPDATE/DELETE on `user_roles`
and `roles` succeeded (rolled back).

## Resulting catalog state (local, `pg_policies` / `information_schema` / `pg_default_acl`)

- Policies naming `anon`: exactly 5 (`candidates` SELECT + UPDATE, `candidate_info` SELECT +
  INSERT, `candidate_sponsorship_info` SELECT). Policies naming `public`: only
  `storage.objects` "Public read access to avatars".
- Default privileges for role `postgres` in schema `public` now list only `postgres`,
  `authenticated`, `service_role` for tables, sequences and functions.
- Function ACLs: `auth_user_has_permission`, `sync_users`, `delete_meeting_minutes_metadata`,
  `guard_and_log_weekend_group_fees` no longer carry the PUBLIC (`=X`) grant or `anon`;
  `sync_users` additionally grants `supabase_auth_admin`. The trigger still fired for the signup
  above.

## Not exercised here

- Browser flows (role editor, people editor, avatar upload, file browser upload/delete) were not
  driven through the UI in this session. The REST/Storage probes above exercise the same policies
  the UI hits with the same permissions.
- Production apply: happens through `supabase db push` on merge to `main`. The prod policy dump
  (see `../prod-verification-2026-09-26.md`) matched the migrations, so the DROP-by-name statements
  will find every policy they target.
