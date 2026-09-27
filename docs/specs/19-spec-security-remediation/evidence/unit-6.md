# Unit 6 evidence — remaining authenticated write policies

Branch `feat/security-remediation`, 2026-09-27. Local Supabase (`supabase migration up`), no reset.

## What shipped

- `supabase/migrations/20260927000002_permission_helpers.sql`
  - `auth_user_has_permission(text)` rewritten with a recursive CTE over `roles.based_on_role_id`
    (depth-capped at 100). Same signature, so the payment, fee and `email_log` policies from
    `20260821000000` / `20260924000000` / `20260921000000` keep working.
  - New `auth_user_cha_has_permission(text)`: true when the caller has a non-dropped
    `weekend_roster` row on an `ACTIVE` weekend whose `cha_role` grants the permission. Maps
    `WRITE_TEAM_ROSTER`, `READ_WRITE_TEAM_PAYMENTS`, `READ_TEAM_ROSTER_BUILDER` only.
  - EXECUTE revoked from `PUBLIC`/`anon`, granted to `authenticated` and `service_role`.
- `supabase/migrations/20260927000003_authenticated_write_policies.sql`: 44 policies dropped by
  their exact names, 37 recreated with permission expressions, 1 added (`weekends` DELETE), 8
  dropped without replacement (`contact_information` INSERT/DELETE, `deposits` and
  `deposit_payments` INSERT/UPDATE/DELETE). Header lists every one.
- `lib/security.ts`: comment above `CHA_ROLE_PERMISSIONS` naming the SQL mirror.
- `lib/security/cha-permissions-sql.test.ts`: parses the migration's `CASE` branches and asserts
  the role list per permission equals what `getPermissionsForCHARole` grants in TypeScript, and
  that every SQL role string is a `CHARole` enum value (4 tests).
- `database.types.ts` regenerated (`yarn db:generate`): the new function appears under
  `Functions`.

## Gates

| Gate               | Result                                                              |
| ------------------ | ------------------------------------------------------------------- |
| `npx tsc --noEmit` | clean                                                               |
| `yarn lint`        | 0 errors, 15 pre-existing warnings                                  |
| `yarn test`        | 46 suites, 465 tests passing (was 45 / 461; +4 from the drift test) |
| `yarn build`       | compiled successfully                                               |

## Policy catalogue after the migration (local)

```
select tablename, policyname, cmd from pg_policies
where schemaname='public' and cmd <> 'SELECT' and 'authenticated' = any(roles)
  and coalesce(qual,'true')='true' and coalesce(with_check,'true')='true';
```

Returns exactly three rows, all INSERT, all intentional (any member may sponsor a candidate):
`candidates`, `candidate_info`, `candidate_sponsorship_info`. Every other authenticated write
policy now carries a permission or ownership expression. Authenticated SELECT policies were not
touched.

## psql proofs (a–e)

> **Caveat added after the independent audit (2026-09-27).** The local database had never been
> reseeded, so its role rows had drifted from `supabase/seed.sql` and from production: locally the
> Treasurer and Pre Weekend Couple roles lacked `WRITE_PAYMENTS` at proof time. Proofs (d) and (e)
> depend on DB-role permissions (Leaders Committee and inheritance) and were run against the drifted
> data; the roles they used do hold the permissions in both seed and prod
> (`prod-verification-2026-09-26.md`). Proofs (a), (b) and (c) depend only on CHA placement or on
> having no role and are unaffected.

Run inside one transaction that ends in `ROLLBACK`; fixtures verified gone afterwards (0 leftover
rows). Each block uses `SET LOCAL ROLE authenticated` plus `set_config('request.jwt.claim.sub', …)`
so `auth.uid()` returns the test user, exactly as PostgREST does. Users are seed users from the
local database; ids redacted here.

**(a) No-role member (no `user_roles`, not on the active roster)**

| Statement                                                                            | Result                                       |
| ------------------------------------------------------------------------------------ | -------------------------------------------- |
| `auth_user_has_permission('WRITE_TEAM_ROSTER')`, `auth_user_cha_has_permission(...)` | `f`, `f`                                     |
| INSERT `weekend_roster` (self as Rector on the active weekend)                       | `new row violates row-level security policy` |
| INSERT `payment_transaction` (team cash)                                             | RLS violation                                |
| INSERT `draft_weekend_roster`                                                        | RLS violation                                |
| DELETE `weekends` (fixture weekend)                                                  | 0 rows                                       |

**(b) Same member, own rows (secuela + experience)**

| Statement                                                   | Result            |
| ----------------------------------------------------------- | ----------------- |
| INSERT own `weekend_group_members` row for the active group | inserted          |
| UPDATE own row `attended_secuela_at = now()`                | updated           |
| INSERT `weekend_group_members` row for another user         | RLS violation     |
| INSERT / DELETE own `users_experience` row                  | inserted, deleted |
| INSERT `users_experience` for another user                  | RLS violation     |

**(c) Rector on the ACTIVE Men's weekend, no database role at all**

| Statement                                                                                                     | Result           |
| ------------------------------------------------------------------------------------------------------------- | ---------------- |
| `EXISTS (user_roles for R)`                                                                                   | `f`              |
| `auth_user_has_permission('WRITE_TEAM_ROSTER')`                                                               | `f` (no DB role) |
| `auth_user_cha_has_permission('WRITE_TEAM_ROSTER' / 'READ_WRITE_TEAM_PAYMENTS' / 'READ_TEAM_ROSTER_BUILDER')` | `t`, `t`, `t`    |
| INSERT `draft_weekend_roster` (place a member)                                                                | inserted         |
| INSERT `weekend_roster` (finalize)                                                                            | inserted         |
| UPDATE `weekend_roster` status → `drop`                                                                       | updated          |
| INSERT `payment_transaction` team cash (`target_type = 'weekend_group_member'`, `cash`)                       | inserted         |
| INSERT `payment_transaction` for a **candidate** target                                                       | RLS violation    |
| INSERT `payment_transaction` team target with method **stripe**                                               | RLS violation    |
| INSERT `events`                                                                                               | RLS violation    |
| DELETE `weekends`                                                                                             | 0 rows           |

**(d) User whose only role is a fixture "Test Child Role" with `permissions = {}` based on Leaders Committee**

| Statement                                       | Result                               |
| ----------------------------------------------- | ------------------------------------ |
| `auth_user_has_permission('WRITE_TEAM_ROSTER')` | `true` (inherited)                   |
| `auth_user_has_permission('WRITE_EVENTS')`      | `true` (inherited)                   |
| `auth_user_has_permission('MANAGE_FEES')`       | `false` (nobody in the chain has it) |
| INSERT + UPDATE `events`                        | inserted, updated                    |

Before this migration the same user returned `false` for every check, because the old helper
only read the roles a user holds directly.

**(e) Leaders Committee member (`WRITE_WEEKENDS` via DB role)**

| Statement                                                                          | Result                                                                          |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| DELETE fixture `weekends` row                                                      | `weekend deleted` (1 row; previously always 0 because no DELETE policy existed) |
| INSERT `users_experience` for another user (the group-activation bulk insert path) | inserted                                                                        |

## App-side session-client writers checked

| Path                                                                            | Permission the action holds                    | Policy it now needs                  | OK?                                                                                                                                                                                   |
| ------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setActiveWeekendGroup` → bulk `users_experience` insert                        | `WRITE_WEEKENDS` (`authorizedAction`)          | own OR FULL_ACCESS OR WRITE_WEEKENDS | yes                                                                                                                                                                                   |
| `markSecuelaAttendance` → `upsertGroupMember` + update own row                  | logged-in member (own `user_id`)               | own OR WRITE_TEAM_ROSTER             | yes                                                                                                                                                                                   |
| Team form upserts (`upsertFormCompletion`)                                      | `ownsGroupMember` (Unit 4)                     | own group membership OR FULL_ACCESS  | yes                                                                                                                                                                                   |
| Roster add via `upsertGroupMember` / `finalizeDraftRosterMember`                | `WRITE_TEAM_ROSTER` (Unit 4)                   | `hp OR cha` WRITE_TEAM_ROSTER        | yes, incl. Rector-by-CHA                                                                                                                                                              |
| `recordManualPayment` (team cash/check, `target_type = 'weekend_group_member'`) | `READ_WRITE_TEAM_PAYMENTS` or `WRITE_PAYMENTS` | same, plus target/method restriction | yes                                                                                                                                                                                   |
| `recordManualCandidatePayment` (`target_type = 'candidate'`)                    | `READ_WRITE_TEAM_PAYMENTS` or `WRITE_PAYMENTS` | `WRITE_PAYMENTS` only at the DB      | yes for every UI caller (button requires `WRITE_PAYMENTS`); a `READ_WRITE_TEAM_PAYMENTS`-only holder calling the action directly is now stopped by RLS, which is the intended outcome |
| `recordAdminPayment` (incl. `waived`)                                           | `WRITE_PAYMENTS`                               | `WRITE_PAYMENTS`                     | yes                                                                                                                                                                                   |
| `updateSpecialNeedsForGroup`, webhook, roster payment sync, candidate move      | service role                                   | bypass                               | unaffected                                                                                                                                                                            |

## Not exercised

- Browser flows from task 6.8 (roster builder UI as the Rector, secuela confirm page, team forms
  UI, admin activate/delete group, event editor, people editor). The psql proofs above execute the
  same statements the repositories issue, under the same `auth.uid()`, but the UI itself was not
  driven. The Gherkin suite (`features/roster-and-leadership.feature`, `member-self-service.feature`,
  `admin-portal.feature`) covers these for the branch-level manual pass.
- Prod copy run (Rollout step) — owner action before merge.
