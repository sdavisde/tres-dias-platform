# Independent security audit — 2026-09-27

> Produced by an independent agent with no knowledge of the remediation session, against
> `feat/security-remediation` at HEAD `6f837d8` (Units 1–8 committed), **before** the fix-ups in
> `audit-fixups.md`. Reproduced verbatim; findings are addressed or dispositioned in that file.

**Verdict: Not ready. The gate is not closed.** The branch fixes most of what it targeted. The
impersonation cookie is sound, all 88 server-action exports are covered, anon holds no table grants,
and authenticated writes are permission-gated. But the main goal of Epic 0, "no anonymous caller can
read any application table", is still defeated in two HTTP requests. There is also a confirmed
open-redirect bypass that the evidence marks as "Covered".

What I ran (all read-only against the local stack):

- `yarn test` and `npx tsc --noEmit`.
- psql catalog queries, plus one `BEGIN READ ONLY … ROLLBACK` simulation as an `authenticated` JWT.
- curl against GoTrue `/settings` and the storage endpoints.
- One temporary jest file to probe `validateRedirectUrl`. It was created in `lib/` and deleted
  straight after, so the tree is unchanged.

Nothing was written to the database.

---

## Critical

**C1. Open self-signup plus open authenticated reads means the anon revocation can be bypassed.
Anyone on the internet can read all PII and candidate medical data.**

- Signup is on and email confirmation is off: `supabase/config.toml:144` `enable_signup = true`,
  `:182` `[auth.email] enable_signup = true`, `:187` `enable_confirmations = false`.
- The `[remotes.production.auth]` block (`:383-410`) does not override these, and `release.yml` runs
  `config push`, so prod gets the same values.
- Local GoTrue `/auth/v1/settings` returns `disable_signup:false` and `mailer_autoconfirm:true`.
- Every PII table has `SELECT TO authenticated USING (true)` (live `pg_policies`): `users`,
  `candidate_info`, `candidate_sponsorship_info`, `candidates`, `payment_transaction`, `deposits`,
  `weekend_roster` (including `special_needs`), `storage.objects`.
- **Proof:** in a read-only transaction as `role=authenticated` with a random `sub` (a user who does
  not exist and has no roles), I could see:
  - `candidate_info`: 138 rows, all 138 with `medical_conditions`
  - `users`: 245 rows with phone numbers
  - `payment_transaction`: 270 rows
  - `candidate_sponsorship_info`: 156 rows
- So `POST /auth/v1/signup` followed by one GET to PostgREST dumps everything.
- The spec's reasoning ("Medical redaction out of scope. Anon revocation already stops non-members
  reading it", spec §Settled Decisions) is invalid while anyone can become a member instantly.
- Unit 1 evidence used `POST /auth/v1/signup` to create its test member, which demonstrates this
  path, but it is not flagged anywhere.
- Every app-level read permission is bypassable through direct PostgREST reads:
  `READ_MEDICAL_HISTORY`, `READ_CANDIDATE_MEDICAL_INFO`, `READ_PAYMENTS`.

## High

**H1. `WRITE_USER_ROLES` can escalate to `FULL_ACCESS`.**

- The app guard is only `WRITE_USER_ROLES` for `updateUserRoles`, `setRoleMembers`, `createRole` and
  `updateRole` (`services/identity/roles/actions.ts:41-106`). The RLS on `roles` and `user_roles`
  requires the same thing (`20260927000000…part_a.sql` roles and user_roles policies).
- So the Leaders Committee and Corresponding Secretary, who both hold `WRITE_USER_ROLES` (local DB;
  the prod doc lists it for Leaders Committee), can add themselves to "Full Access" or give any role
  `FULL_ACCESS`.
- `FULL_ACCESS` unlocks impersonating anyone, all medical profiles and the email log.
- **Epic 2 blocker:** if `FULL_ACCESS` stays global, a tenant admin can make themselves platform
  superuser.

**H2. The `files` bucket is public, so the new auth on the download route is cosmetic.**

- `20260315000001_create_files_bucket.sql:4-6` creates it with `public=true`, and the live
  `storage.buckets` shows `files | t`.
- Anonymous `GET /storage/v1/object/public/files/<path>` is served. I got `NoSuchKey`, not denied.
  Listing needs a session, which C1 makes free.
- The UI itself opens public URLs (`components/file-management/FileBrowserTable.tsx:106-108`).
- The `app/api/files/download/route.ts` gate and "storage RLS decides" claim are moot for `files`.
- Tenant-isolated files are impossible while the bucket is public.

## Medium

**M1. The open-redirect fix can be bypassed with dot-segments.**

- `lib/redirect.ts:37` checks `//` on the raw input, but `:59` returns `new URL(url).pathname` after
  normalisation.
- `validateRedirectUrl('/.//evil.com')`, `'/a/..//evil.com'` and `'/%2e%2e//evil.com'` all return
  `//evil.com`, which resolves to `https://evil.com/`. Probed with jest.
- **Works unauthenticated:** `/auth/confirm?type=email_change&token_hash=x&next=/.//evil.com` hits
  the error branch (`app/(public)/auth/confirm/route.ts:77`) and redirects to
  `https://evil.com/?emailChange=error`.
- `/auth/callback` behaves the same after a valid code exchange.
- `lib/redirect.test.ts` does not test this. The verification matrix marks "Off-site next refused"
  as **Covered**.

**M2. The candidate-forms UUID is not a secret.**

- Any authenticated user (which means anyone, per C1) can `SELECT candidates` for all ids and
  statuses.
- They can then call `submitCandidateForms` (`actions/candidates.ts:111`, public) for every candidate
  in `sponsored` or `awaiting_forms` with junk data.
- The new unique index (`20260927000001:47`) then locks the real candidate out with "already
  submitted", and each submission sends a PWC email.
- The same lockout is possible directly via PostgREST, because `candidate_info` INSERT is
  `WITH CHECK (true)` for authenticated.

**M3. Candidate INSERT policies are wide open.**

- Any member can insert `candidates` with any `status` (for example `confirmed`) and any
  `weekend_id`, bypassing the workflow and capacity. This is via PostgREST; the action hard-codes
  `sponsored`.
- `createCandidateWithSponsorshipInfo` spreads an unvalidated client object into
  `candidate_sponsorship_info` (`actions/candidates.ts:36,56`). There is no server-side zod parse, so
  the caller can set `payment_owner`, emails and any other column.

**M4. CHA-derived write power is global, not scoped to the holder's weekend.**

- `auth_user_cha_has_permission` (`20260927000002:88-90`) is true for any active, non-dropped
  placement.
- The `weekend_roster`, `draft_weekend_roster`, `weekend_group_members` and `payment_transaction`
  policies (`20260927000003:297,361,391`) never constrain `weekend_id` or `target_id`.
- The actions accept arbitrary ids too (`services/roster-builder/actions.ts:30-86`,
  `services/weekend/actions.ts:193-222`).
- Consequences:
  - A "Roster" CHA can edit any weekend's roster.
  - A "Roster" CHA can promote themselves to Rector (`updateWeekendRosterMember` on their own row),
    gaining `READ_WRITE_TEAM_PAYMENTS` and candidate PII permissions.
  - A Head can record a cash payment of any amount for any group member, including themselves.
- **Epic 2 must add tenant and weekend scoping here.**

**M5. Unlimited email-triggering by any member.**

- `sendSponsorshipNotificationEmail` is `'authenticated'` and accepts any `candidateId` with no
  ownership or rate limit (`services/notifications/email-actions.ts:33`), so it can flood the PWC
  inbox and Resend quota.
- The subject line includes attacker-controlled `candidate_name`.

**M6. The users "own row" UPDATE covers every column** (`20260927000000:140`).

- Today it lets members diverge `public.users.email` from `auth.users`, bypassing
  `requestEmailChange` re-auth. Not used for authorisation now.
- **Epic 2 blocker by design:** if `community_id` goes on `users` under this policy, members can move
  themselves between tenants.
- `weekend_group_members` own-row UPDATE similarly lets a member change their own `group_id`.

## Low

- **L1. New functions still default to EXECUTE for PUBLIC.** The migration revoked from `anon`, not
  PUBLIC, so `roles_prevent_inheritance_cycle` and `update_community_encouragements_updated_at` are
  anon-executable. `pg_default_acl` for `supabase_admin` in `public` still grants anon on tables,
  sequences and functions. Epic 2 helper functions will be anon-callable via `/rpc` unless each one
  does `REVOKE … FROM PUBLIC`.
- **L2. The SQL CHA helper is broader than the app.** SQL counts any roster row on any ACTIVE weekend.
  The app only counts rows reached through the user's first active `weekend_group_members` row
  (`user-service.ts:64-100`). Legacy rows without a group member therefore get DB permissions but not
  app permissions. The role lists themselves match `CHA_ROLE_PERMISSIONS`, and a drift test covers
  them.
- **L3. `user_medical_profiles` admin policy ignores role inheritance** (`20260312000000`). It fails
  closed, so a user with inherited `FULL_ACCESS` is locked out rather than let in.
- **L4. `recordManualCandidatePayment` action is looser than RLS.** It allows
  `READ_WRITE_TEAM_PAYMENTS` (`services/candidates/actions.ts:14-19`), but RLS rejects candidate
  targets without `WRITE_PAYMENTS`. The UI gates on `WRITE_PAYMENTS` (`review-candidates/page.tsx:43`),
  so no user can click into the failure.
- **L5. Two bare exports act as existence and payment-status oracles.**
  - `getMyTeamFeeStatus` (`services/payment/actions.ts:31`) is bare, has no `publicAction` marker, is
    called only from Server Components, and runs an admin-client quote before checking auth. It
    answers anonymous callers with "Team member not found" vs "Not your team fee".
  - `beginCheckout`'s team branch (`actions/checkout.ts:40-66`) returns "already paid" style refusals
    before its auth check.
- **L6. `/secuela-confirm` writes during a GET render** (`app/(member)/secuela-confirm/page.tsx:22`).
  A link or prefetch can trigger it, and under impersonation it marks the impersonated user.
- **L7. `sync_users` has no pinned `search_path`.** It is SECURITY DEFINER and EXECUTE is granted to
  authenticated, though it only runs as a trigger.
- **L8. Anonymous callers see raw DB error strings** from `submitCandidateForms`
  (`services/candidates/candidate-forms.ts:170-173`).
- **L9. Build-boundary trap in the payment barrel.** `services/payment/index.ts:2,40-45` re-exports
  the server-only `payment-service` from a barrel that client files import. All client imports are
  type-only today.
- **L10. Download filename is not escaped** in `Content-Disposition`
  (`app/api/files/download/route.ts:65`).

## Info

- **Impersonation holds up** (`services/identity/impersonation/*`, `session.ts`):
  - HMAC-SHA256 with a timing-safe compare of equal-length base64url strings.
  - `iat` is checked on both sides (a future `iat` is rejected, maximum age 24h).
  - The cookie is bound to `adminUserId === session.id`, and live `FULL_ACCESS` is re-checked on
    every read, so replay after a demotion fails.
  - A missing secret fails closed.
  - The cookie is httpOnly, secure in prod and `lax`, and is only set inside actions, never during
    render.
  - No code reads the raw cookie, and `originalUser` comes from the session.
  - Minor: `isImpersonatingUser` checks only the signature (banner only), and
    `impersonation-service.ts` lacks `import 'server-only'`.
- **Server-side cache is tenant-blind.** `lib/cache/cached-read.ts` reads with the admin client via
  `unstable_cache`, and keys have no tenant. The same applies to the role graph, active group, fees,
  settings and events.
- **Global "one active weekend" assumptions**, for example `markSecuelaAttendance` and
  `getCachedActiveGroupId`. Epic 2 must key both by tenant.
- **Local role data has drifted from seed and prod.** Locally, Treasurer and Pre Weekend Couple lack
  `WRITE_PAYMENTS`; seed and the prod doc say both have it. The evidence psql persona proofs ran on
  this drifted data.

---

## 1. Server actions

There are 20 `'use server'` files with 88 exported functions (same count as the evidence).

| Guard                          | Count | Exports                                                                                                                                                               |
| ------------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Permission / permission list   | 62    | —                                                                                                                                                                     |
| Ownership predicate            | 13    | `ownsGroupMember` ×5, `ownsUser` ×3, `ownsUserOrAdmin` ×3, `ownsExperienceOrAdmin`, `canImpersonate`                                                                  |
| `'authenticated'`              | 6     | `createCandidateWithSponsorshipInfo`, `clearImpersonation`, `getPastEvents`, `getFilePublicUrlAction`, `getFileDownloadUrlAction`, `sendSponsorshipNotificationEmail` |
| Bare, marked `// publicAction` | 3     | `submitCandidateForms`, `sendCustomPasswordResetEmail`, `beginCheckout`                                                                                               |
| Bare, self-guarded             | 4     | `impersonateUser`, `requestEmailChange`, `getLoggedInUser`, `getMyTeamFeeStatus` (see L5)                                                                             |

On the wrapper and guards:

- `lib/actions/authorized-action.ts` and `lib/actions/guards.ts` have no bypass. Guards run against
  the session user, and every ownership predicate compares to `user.id` or `user.teamMemberInfo` from
  the session.
- No action accepts a `user`, `permissions` or `isAdmin` argument. `addDraftRosterMember` takes
  `createdBy` from the session.
- Admin-client use reachable from actions happens only after validation or authorisation:
  `updateSpecialNeedsForGroup` behind `ownsGroupMember`, `movePaymentsToWeekend` behind
  `WRITE_CANDIDATES`, the forms flow after zod validation, and checkout quotes (L5).
- Weakly-guarded actions do cause abuse: M2, M3, M5.

## 2. RLS (verified live)

- The only remaining non-SELECT `true` policies are the three candidate-table INSERTs, which is
  intended.
- Every SELECT policy is `USING (true)` except `email_log`, `weekend_group_fee_changes` and
  `user_medical_profiles`. That matches the owner's intent, but see C1.
- anon has no table grants and no policies other than the public avatars read. The `postgres` default
  ACL no longer includes anon; L1 covers the remaining gaps.
- `auth_user_has_permission` is SECURITY DEFINER with `search_path=public`, has a recursion cap of
  100, and treats `FULL_ACCESS` anywhere in the chain as passing.
- Storage: `objects_select_authenticated` is `USING (true)`. Write policies are correct. See H2 for
  the public bucket.

## 3–5. Impersonation, public flows, auth

- Impersonation: see Info.
- Public flows:
  - An anonymous caller gets candidate name, sponsor name and status for a known UUID, and can
    submit forms once. They get no medical data back.
  - The Stripe webhook verifies signatures.
  - Checkout amounts are computed on the server.
  - `beginCheckout` accepts a caller-supplied `returnUrl`. Low risk, since the only person redirected
    is the payer.
  - Abuse paths are in M2 and M5.
- Auth: see C1 and M1.
- Download route: auth, bucket allowlist and path normaliser are all correct, but see H2.
- `proxy.ts` skip list: `/api/*`, `/candidate/*` and `/payment/candidate-fee` get no session refresh.
  The residual risk is that any future route under those prefixes is unauthenticated unless it gates
  itself.

## 7. Tests

- `yarn test`: 49 suites, 474 tests passing. `tsc` is clean.
- Security tests: `authorized-action.test.ts`, `supabase/rls.test.ts` (ran against local, 3 passed),
  `impersonation-cookie.test.ts`, `cha-permissions-sql.test.ts`, `redirect.test.ts`,
  `storage-path.test.ts`, `identity/user/actions.test.ts`.
- Gaps:
  - No authenticated-role RLS tests, even though that is the real threat model.
  - No test of the signup-then-read path.
  - No test of the redirect dot-segment case.
  - No test of CHA weekend scoping.
  - No test that `findImpersonatingUser` binds the admin.
  - No integration test of `submitCandidateForms`.

## 8. Regression risk

Traced as OK:

- Sponsor form, candidate forms, secuela confirmation, team forms.
- Roster builder and team cash payments as Rector-by-CHA. The auto-follow payment sync uses the
  service role.
- People editor, which requires `FULL_ACCESS` in both the page and the action.
- Group activation, which inserts `users_experience` under `WRITE_WEEKENDS`.
- Events, files, settings, fees.

Two to watch:

- `deleteWeekendGroup` now actually deletes weekends. It cascades to draft rosters, is blocked by
  candidates, roster rows or payments (FKs are NO ACTION), and leaves an orphan `weekend_groups` row
  (`weekend-service.ts:747-761`).
- The candidate-payment mismatch in L4 (no UI exposure).

---

## Readiness verdict: **Not ready (blocking findings)**

Blocking before Epic 2:

1. **C1.** Either close open signup, or make "authenticated with no community membership" see zero
   rows. The second option is effectively Epic 2's first migration and must ship before any second
   tenant exists. Also decide whether medical and payment reads need RLS, not just UI hiding.
2. **M1.** Fix `validateRedirectUrl`: reject when the normalised pathname starts with `//` or
   contains `\`, and add tests for these cases.
3. **H1 and M6.** Define the tenant-admin vs platform-superuser split, block granting `FULL_ACCESS`
   via `WRITE_USER_ROLES`, and restrict own-row UPDATE columns on `users` and
   `weekend_group_members` before `community_id` exists.
4. **H2.** Make the `files` bucket private and serve through signed URLs.

Conditions to carry into Epic 2: M4 (scope CHA to tenant and weekend), L1 (`REVOKE … FROM PUBLIC`
on every new function), and tenant-keyed cache keys.

## Compared to evidence files

- **Reproduced:**
  - 88 of 88 exports covered, and 49 suites / 474 tests.
  - Anon has no table grants and only schema USAGE.
  - Exactly three open authenticated INSERT policies.
  - CHA helper behaviour.
  - The Rector-by-CHA candidate-payment denial.
- **Not reproduced or contradicted:**
  - The verification matrix and `unit-7.md` say off-site `next` is refused ("Covered"). The
    `/.//evil.com` bypass works.
  - `unit-7.md` says the download route leaves "storage RLS still decides". It doesn't matter,
    because `files` is public.
  - "anon holds nothing but schema usage" (unit-5 and the tasks) is true for tables. anon can still
    EXECUTE two functions via PUBLIC, and anon reads `files` through the public endpoint.
  - `unit-1.md` shows `POST /auth/v1/signup` minting a member, then reads open to that member, without
    flagging it as the C1 path.
  - `unit-6.md` and the matrix persona proofs assume role permissions ("PWC holds WRITE_PAYMENTS")
    that the local DB does not match. I could not verify prod.
