# 19-spec-security-remediation.md

## Introduction/Overview

The platform roadmap ([DTTD Platform Roadmap, Draft v1](https://claude.ai/code/artifact/15eee3d5-d23a-4f19-9450-1f81d3d4ae17),
summarised in `docs/platform-roadmap-status.md`) makes security remediation **Epic 0**: the hard gate
before a second Tres Dias community is added. Once tenants share one database, every hole below stops
being one community's problem and becomes everyone's.

An audit of the `preview` branch on 2026-09-26 (HEAD `39214fb`) found four ways to fully compromise
the app today, none of which needs a bug in a server action:

1. **Anonymous RLS on PII and access-control tables.** The baseline migration
   (`supabase/migrations/20260118030550_remote_schema.sql`) grants `ALL` to `anon` on every table,
   sets default privileges to keep doing so, and has `USING (true)` policies **for `anon`** on
   `users`, `roles`, `user_roles`, `candidates`, `candidate_info` and `candidate_sponsorship_info`.
   Anyone holding the public publishable key (it ships in the browser bundle) can read every
   candidate's medical notes or insert a `user_roles` row granting any account `FULL_ACCESS`, with
   one HTTP request to PostgREST. No login needed.
2. **Unsigned impersonation cookie.** `DTTD_IMPERSONATING_USER` holds a raw user id, not `httpOnly`,
   not signed. `authorizedAction` checks the permissions of the user named in the cookie, so any
   logged-in member who sets it to the admin's id passes every permission check in the app.
3. **Open signup.** Signup needs no email confirmation, so step 2 is available to anyone who
   registers. (Confirmation stays off by decision; see Settled Decisions. Steps 1 and 2 are what close
   this path.)
4. **93 of 151 server-action exports have no auth check**, including `deleteUser`, `deleteCandidate`,
   every roster-builder mutation, both manual-payment recorders, event writes, the PWC email actions,
   and two admin-client paths that read or write `special_needs` for anonymous callers.

Several things are already right and are kept: `authorizedAction` and `userHasPermission`,
owner-scoped `user_medical_profiles`, permission-gated `payment_transaction` UPDATE/DELETE, the
restrictive avatars bucket policies, signature-verified Stripe webhooks, and server-side redaction on
the review queue.

The owner's guiding constraints, settled on 2026-09-26, shape everything here:

- Logged-in community members are trusted readers. The `USING (true)` policies for `authenticated`
  were deliberate and stay for reads. Only writes tighten, and only to the permission the UI already
  checks for that operation, so nothing a member can do today goes away.
- Over half the users are 65+. No new login friction: no email confirmation, no CAPTCHA, no forced
  password changes.
- Fix the mechanism, not the symptom: delete dead endpoints and demote server-only helpers before
  wrapping anything.

## Goals

- No anonymous caller can read or write any application table or storage object, except through the
  two public flows (candidate forms, candidate fee checkout), which run on the admin client behind
  explicit validation
- No logged-in member can grant themselves a role, edit another member's record, place themselves on
  a roster, or record a payment unless the same permission the UI checks today allows it
- The impersonation cookie cannot be forged; only a session that legitimately called
  `impersonateUser` and still holds `FULL_ACCESS` is honoured
- Every server-action endpoint either checks authorization, is provably only reachable from server
  code, or is explicitly marked public
- Existing users log in exactly as before; new passwords are at least 8 characters
- The two auth redirect routes cannot be used for open redirects

## User Stories

- **As a community member**, I want to keep seeing the roster, candidate list, events and weekends
  exactly as I do today, so that hardening is invisible to me.
- **As the Rector**, I want to keep building the roster and recording team cash payments during my
  active weekend, so that a database policy never locks me out of my own job.
- **As a candidate who is not logged in**, I want to fill in my forms and pay my fee from the links I
  was sent, so that the public flows keep working without an account.
- **As the site owner**, I want to impersonate a member to debug what they see, and be certain nobody
  else can do the same to me.
- **As the site owner**, I want another community's future data to be unreachable from ours, which
  starts with making today's data unreachable from the internet.

## Settled Decisions (2026-09-26)

| Topic                    | Decision                                                                                                                                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authenticated reads      | Stay open. Every `SELECT ... TO authenticated USING (true)` is kept. Only writes tighten, to the permission the app already checks                                                                                                                          |
| Anonymous access         | Target surface is **zero**: no anon table grants, no anon policies, no anon default privileges. The two public flows move to `server-only` code on the admin client with UUID and status validation                                                         |
| Impersonation            | Feature stays (owner is the only `FULL_ACCESS` user and uses it to debug). Cookie becomes signed (HMAC-SHA256), `httpOnly`, `secure`; the reader re-verifies the real session user still has `FULL_ACCESS`. Missing secret fails closed. Workflow unchanged |
| Meaning of "gate"        | Mostly "must be logged in". Admin-style mutations get the permission their page or button already checks. Admin routes are never public; member routes may check a CHA role for the active weekend or a role permission                                     |
| Server-only helpers      | Exports only called from Server Components are demoted to `server-only` (endpoint removed, no behavior change). Exports with no callers are deleted                                                                                                         |
| Caller-supplied identity | `getWeekendRosterViewData(user)` and `getTeamTodoData(user)` become `server-only` (history shows no reason for the argument). `addDraftRosterMember` takes `createdBy` from the session                                                                     |
| Manual payments          | `recordManualPayment` and `recordManualCandidatePayment` require `READ_WRITE_TEAM_PAYMENTS` **or** `WRITE_PAYMENTS` (leadership team + treasurer). Verified: each has one UI caller already behind that check; no self-report flow exists                   |
| Roster placement         | Every roster row add/update/delete requires `WRITE_TEAM_ROSTER`, in the action and in RLS                                                                                                                                                                   |
| Medical redaction        | **Out of scope.** Client-side column hiding stays. Anon revocation already stops non-members reading it                                                                                                                                                     |
| Auth friction            | **No** email confirmation, **no** CAPTCHA (revisit only if bot signups appear), **no** `secure_password_change`. Google sign-in is a wanted future addition, compatible with all of this                                                                    |
| Passwords                | `minimum_password_length = 8`, `password_requirements = ""`. Applies to new passwords only; existing users keep logging in (Supabase enforces at signup/change, and the installed auth client returns a session with a `weakPassword` hint, not an error)   |
| Open redirects           | `auth/callback` and `auth/confirm` validate `next` with the existing `validateRedirectUrl` (`lib/redirect.ts`), including the confirm route's error branch                                                                                                  |
| Proxy                    | Skip list stays (candidate forms and the Stripe webhook depend on it). Add auth to `app/api/files/download/route.ts` instead                                                                                                                                |
| Tests                    | Exactly three: wrapper rejects an anonymous caller; anon key cannot read `candidate_info` or write `user_roles`; flip the existing action test that asserts an unguarded write succeeds. No per-action test sprawl                                          |
| Dropped from Epic 0      | `getMasterRoster` returning the permissions map (minor; it becomes server-only anyway)                                                                                                                                                                      |

## Demoable Units of Work

Units are in ship order. Units 1 and 2 close the two total-compromise paths and ship first. Unit 6
depends on Unit 5 and on the SQL helpers it introduces.

### Unit 1: Access-Control Policies and Anonymous Revocation, Part A

**Purpose:** Stop any member from making themselves an admin, and stop anonymous callers from touching
anything the two public flows don't need. No app code changes; one migration.

**Functional Requirements:**

- FR-1.1 The migration shall replace the four `roles` policies (`remote_schema.sql:662,674,686,698`)
  with: `SELECT TO authenticated USING (true)`; `INSERT`, `UPDATE`, `DELETE TO authenticated` gated by
  `auth_user_has_permission('WRITE_USER_ROLES')`. The app already requires `WRITE_USER_ROLES` for
  `createRole`, `duplicateRole`, `updateRole`, `deleteRole` (`services/identity/roles/actions.ts`)
- FR-1.2 The migration shall do the same for `user_roles` (`:666,678,690,702`). `updateUserRoles`,
  `setRoleMembers`, `removeAllUserRoles` already require `WRITE_USER_ROLES`
- FR-1.3 The migration shall replace the `users` policies (`:670,682,694,706`) with: `SELECT TO
authenticated USING (true)`; no `INSERT` policy for `authenticated` (rows are created by the
  `SECURITY DEFINER` trigger `sync_users`); `UPDATE TO authenticated USING (auth.uid() = id OR
auth_user_has_permission('FULL_ACCESS'))`; `DELETE TO authenticated` gated by `FULL_ACCESS`
- FR-1.4 Policies written `TO authenticated, anon` shall be dropped and recreated per role. Every
  policy in the baseline that names `anon` or has no `TO` clause shall be recreated `TO authenticated`,
  **except** the ones the two public flows still use until Unit 5 ships: `SELECT` on `candidates`,
  `candidate_info`, `candidate_sponsorship_info`; `INSERT` on `candidate_info`; `UPDATE` on
  `candidates`. Specifically drop anon from: `candidates` INSERT (`:734`), `candidate_sponsorship_info`
  INSERT and UPDATE (`:710,762`), `candidate_info` UPDATE (`:758`), `events` SELECT (`:834`),
  `community_encouragements` SELECT (`:830`)
- FR-1.5 The migration shall drop the dead anon policies on `candidate_payments` if the table is
  still referenced (the table itself was dropped in `20260220200000`; verify no policy survives)
- FR-1.6 The migration shall `REVOKE ALL ON ALL TABLES / SEQUENCES IN SCHEMA public FROM anon`,
  `REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon` and `FROM PUBLIC` for the
  `SECURITY DEFINER` functions, and `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE ALL ON TABLES, SEQUENCES, FUNCTIONS FROM anon`, so new tables stop inheriting anon grants.
  Then re-`GRANT` only what FR-1.4 still needs: `SELECT` on the three candidate tables, `INSERT` on
  `candidate_info`, `UPDATE` on `candidates`, plus `USAGE` on schema `public`. Unit 5 removes these
- FR-1.7 Storage: replace `storage.objects` `SELECT TO public USING (true)` (`:1347`) with `TO
authenticated`; keep the avatars public-read policy (`20260627000000:34-39`). Tighten
  `storage.objects` `INSERT` (`:1338`) and `DELETE` (`:1329`) to `(bucket_id = 'avatars' AND name =
auth.uid()::text || '.webp') OR (bucket_id = 'files' AND auth_user_has_permission('FILES_UPLOAD'))`
  and the `FILES_DELETE` equivalent. Uploads use `createSignedUploadUrl` on the session client inside
  the `FILES_UPLOAD` action (`services/files/repository.ts:60`), so this matches today's gate
- FR-1.8 Storage: `storage.buckets` `INSERT` and `DELETE` (`:1311,1302`) shall have no policy for
  `authenticated` (no app code creates or deletes buckets). `SELECT` becomes `TO authenticated`
  (`lib/storage.ts:44` lists buckets while logged in)
- FR-1.9 The migration header shall list every policy it drops and recreates, so the prod diff can be
  checked line by line before it runs

**Proof Artifacts:**

- Migration file with the header list
- Local check (Unit 8 test 2): with the anon key, `select * from user_roles` and `insert into
user_roles` both fail; `select * from candidates` still works until Unit 5
- Manual: role editor, people editor, avatar upload, file upload and delete all behave as before

### Unit 2: Signed Impersonation Cookie

**Purpose:** Make the impersonation cookie unforgeable without changing how the owner uses it.

**Functional Requirements:**

- FR-2.1 The system shall read a new secret `IMPERSONATION_COOKIE_SECRET` (32+ random bytes). It is
  added to Vercel Production and Preview as Sensitive with different values, to `.env.example` with a
  placeholder and comment, and to the owner's local `.env.local`. Not needed in GitHub secrets
- FR-2.2 `impersonateUser` (`services/identity/impersonation/actions.ts`) shall write the cookie as
  `base64url(JSON{targetUserId, adminUserId, iat}) + '.' + base64url(HMAC-SHA256(body, secret))`
  with `httpOnly: true`, `secure: NODE_ENV === 'production'`, `sameSite: 'lax'`, `path: '/'`,
  `maxAge: 24h`. `adminUserId` is the real session user's id. The existing `FULL_ACCESS` check stays
- FR-2.3 `findImpersonatingUser` (`impersonation-service.ts:14-25`) shall: split the value; recompute
  the HMAC and compare with `crypto.timingSafeEqual` after a length check; reject when `iat` is older
  than the max age; load the real session user via `getAuthenticatedUser()`; require `session.id ===
adminUserId` **and** that this user currently has `FULL_ACCESS`; only then load `targetUserId`. On
  any failure it returns `null`. It shall **not** try to delete the cookie, because it runs during
  Server Component render where cookies cannot be set
- FR-2.4 When the secret is missing, the reader shall treat every request as not impersonating and
  log once at warn level
- FR-2.5 `isImpersonatingUser` shall verify the cookie the same way, not merely check for presence
- FR-2.6 `getLoggedInUser` shall keep returning `{...impersonatedUser, originalUser}` so the audit-log
  work can attribute actions later. `clearImpersonation` keeps working without `FULL_ACCESS` (while
  impersonating a non-admin the session user lacks it; see FR-4.9)

**Proof Artifacts:**

- Manual: impersonate a member, browse, clear; a hand-edited cookie value is ignored and the request
  proceeds as the real user
- The secret exists in Vercel for both environments before merge to `main`

### Unit 3: `authorizedAction` Extension, Dead Code and Demotions

**Purpose:** Make the wrapper able to express every gate the classification needs, then shrink the
endpoint surface by ~60% without changing behavior.

**Functional Requirements:**

- FR-3.1 `authorizedAction` (`lib/actions/authorized-action.ts`) shall accept a guard of type
  `Permission | Permission[] | 'authenticated' | ((user: User, ...args: A) => boolean |
Promise<boolean>)`. A list passes when any listed permission is held (`userHasPermission` already
  does this). `'authenticated'` requires only a session. The predicate form covers ownership
- FR-3.2 The wrapper shall become variadic: `<A extends unknown[], R>(guard, fn: (user: User,
...args: A) => Promise<Result<string, R>>) => (...args: A) => Promise<Result<string, R>>`, so
  existing positional call sites don't change and `fn` receives the session user
- FR-3.3 Ownership predicates shall live in `lib/actions/guards.ts`: `ownsUser(u, userId)`,
  `ownsUserOrAdmin`, `ownsGroupMember(u, groupMemberId)` (via `u.teamMemberInfo?.groupMemberId`),
  async `ownsExperienceOrAdmin(u, experienceId)` (looks up `users_experience.user_id`), and
  `canImpersonate` (from `lib/security.ts`, which allows `FULL_ACCESS` on the user **or**
  `originalUser`)
- FR-3.4 Delete the 13 exports with no callers: `deleteCandidate`, `updatePasswordWithToken`,
  `getReviewPageData`, `isUserRectorOnUpcomingWeekend`, `getAllCandidates`,
  `getCandidateIdsByWeekend`, `getEvents`, `getEvent`, `getUpcomingEventsForPeriod`, `deleteUser`,
  `getDraftRoster`, `getWeekendRoster`, `getWeekendRosterRecord`. Delete `actions/review-candidates.ts`
  and `actions/roster.ts` outright. Remove their re-exports from `services/weekend/index.ts` and
  `services/roster-builder/index.ts`. Also remove `services/contact-information/actions.ts` and
  `services/deposit/actions.ts` (confirmed 2026-09-26: nothing imports either file)
- FR-3.5 Demote the 45 exports only called from Server Components or other server modules. Every
  `services/*/*-service.ts` already has `import 'server-only'` and the actions are one-line
  pass-throughs, so: delete the pass-through and repoint the server caller at the service or the
  `cached.ts` module. The affected action files and counts: `services/candidates/actions.ts` (6
  reads), `services/community/actions.ts` (1), `services/events/actions.ts` (4), `services/fees/
actions.ts` (3), `services/identity/roles/actions.ts` (1), `services/notifications/actions.ts`
  (2), `services/payment/actions.ts` (1), `services/roster-builder/actions.ts` (1),
  `services/settings/actions.ts` (2), `services/weekend/actions.ts` (12)
- FR-3.6 Whole files that switch from `'use server'` to `import 'server-only'`:
  `lib/weekend/team/todos.actions.ts`, `services/community/board/actions.ts`,
  `services/master-roster/index.ts` (clients import only from `master-roster/types`)
- FR-3.7 Inline code that needs a new server-only home: `getHydratedCandidate` and
  `getAllCandidatesWithDetails` (from `actions/candidates.ts`; `email-actions.ts` imports the former);
  `getTeamFormsProgress` and `hasCompletedAllTeamForms` (already exist in
  `weekend-group-member-service.ts`; repoint callers); `getUserServiceHistory` (from
  `actions/user-experience.ts`); `notifyAssistantHeadForTeamPayment` and
  `sendCandidateFormsCompletedEmail` (from `email-actions.ts`, into notification-service)
- FR-3.8 `getWeekendRosterViewData` shall drop its `user` parameter and call `getLoggedInUser()`
  internally; it becomes server-only. `WeekendRosterView` keeps its `user` prop for UI flags.
  `getTeamTodoData` likewise, and must return `null` when `teamMemberInfo` is null, because it loses
  the `TeamMemberUser` type guarantee
- FR-3.9 **Barrel trap.** These barrels are value-imported by client components and must not
  re-export anything `server-only`: `services/weekend`, `services/events`, `services/identity/user`,
  `services/identity/roles`, `services/roster-builder`, `services/notifications`, `services/fees`,
  `services/community`. Server callers import `*-service` or `cached` directly.
  `CandidateCashCheckPaymentModal.tsx:23` imports `@/services/candidates/actions` directly; update it
  if `recordManualCandidatePayment` moves
- FR-3.10 `npx tsc --noEmit` and `yarn build` pass; pulling a `server-only` module into a client graph
  fails the build, which is the check

**Proof Artifacts:**

- `yarn build` succeeds
- A grep for `'use server'` shows the remaining files contain only client-called or public exports
- Manual: hub tabs, review candidates, admin dashboard, weekends, events, payments and roster builder
  pages render as before

### Unit 4: Gate the Remaining Client-Called Actions

**Purpose:** Every action a browser can call checks the same thing its button checks.

**Functional Requirements:**

- FR-4.1 **`WRITE_CANDIDATES`:** `updateCandidatePaymentOwner`, `getMoveWeekendOptions`
  (`actions/candidates.ts`); `sendCandidateForms`, `sendPaymentRequestEmail`
  (`services/notifications/email-actions.ts`). Button gate: `canEdit` at
  `review-candidates/page.tsx:42`
- FR-4.2 **`WRITE_EVENTS`:** `createEvent`, `updateEvent`, `deleteEvent` (`services/events/actions.ts`).
  Gate: `canEdit` at `app/admin/events/page.tsx:51`. Remove the "relies on RLS" comments
- FR-4.3 **`WRITE_TEAM_ROSTER`:** `addDraftRosterMember`, `removeDraftRosterMember`,
  `finalizeDraftRosterMember`, `dropFinalizedRosterMember`, `removeFinalizedRosterMember`
  (`services/roster-builder/actions.ts`). `addDraftRosterMember` drops the `createdBy` parameter and
  uses the session user's id; update `roster-builder-board.tsx:96` and the `rectorUserId` prop if
  nothing else uses it. Compatibility: the page checks `READ_TEAM_ROSTER_BUILDER`; both roles that
  hold it (Rector via CHA, seeded Leaders Committee) also hold `WRITE_TEAM_ROSTER`
- FR-4.4 **`READ_WRITE_TEAM_PAYMENTS | WRITE_PAYMENTS`:** `recordManualPayment`
  (`services/weekend/actions.ts`), `recordManualCandidatePayment` (`services/candidates/actions.ts`).
  Remove the "Public - no auth per user request" comments
- FR-4.5 **`FULL_ACCESS`:** `updateUserContactInfo` (`services/identity/user/actions.ts`; only the
  admin people editor calls it). **`canImpersonate` predicate:** `getAllUsers`
  (`services/weekend/actions.ts`), because a plain `FULL_ACCESS` check would break switching users
  while already impersonating
- FR-4.6 **Ownership by group member** (`ownsGroupMember`): `signStatementOfBelief`,
  `signCommitmentForm`, `submitReleaseOfClaim`, `signCampWaiver`, `completeInfoSheet`
  (`actions/team-forms.ts`). `submitReleaseOfClaim` reaches the admin-client write
  `updateSpecialNeedsForGroup`, so this closes the "any member overwrites anyone's special needs" hole
- FR-4.7 **Ownership by user id** (`ownsUser`): `updateRosterMedicalInfo` (`actions/team-forms.ts`),
  `updateUserProfilePhoto`, `removeUserProfilePhoto`. **Ownership or admin** (`ownsUserOrAdmin`):
  `updateUserAddress`, `updateUserBasicInfo` (`services/identity/user/actions.ts`),
  `upsertUserExperience`; **`ownsExperienceOrAdmin`:** `deleteUserExperience`
  (`actions/user-experience.ts`). The admin people editor (`FULL_ACCESS` page) and the member's own
  team info form are the two callers
- FR-4.8 **Logged in only** (`'authenticated'`): `createCandidateWithSponsorshipInfo`
  (`actions/candidates.ts`), `sendSponsorshipNotificationEmail` (`email-actions.ts`), `getPastEvents`
  (`services/events/actions.ts`), `getFilePublicUrlAction`, `getFileDownloadUrlAction`
  (`services/files/actions.ts`), `clearImpersonation`
- FR-4.9 `clearImpersonation` must stay `'authenticated'`, never `FULL_ACCESS` (FR-2.6)
- FR-4.10 **Public by design**, left unwrapped and marked with a `// publicAction:` comment stating
  why: `addCandidateInfo` (hardened in Unit 5), `beginCheckout` (team branch already checks
  ownership at `actions/checkout.ts:54-66`), `sendCustomPasswordResetEmail`, `sendPasswordResetEmail`
  (or delete the latter and point `profile/page.tsx:270` at the former; they are identical)
- FR-4.11 Already self-guarded, unchanged: `requestEmailChange`, `impersonateUser`,
  `getMyTeamFeeStatus`, `getLoggedInUser`

**Proof Artifacts:**

- Table in the PR description mapping each export to its guard and the UI check it mirrors
- Manual: as a member with no roles, every gated action returns "Unauthorized" when invoked from the
  browser console; as the Rector on the active weekend, roster builder and team cash payments work

### Unit 5: Public Flows on the Admin Client, Anonymous Revocation Part B

**Purpose:** Make the two logged-out flows safe, then remove the last anon access.

**Functional Requirements:**

- FR-5.1 Candidate forms page (`app/(public)/candidate/[candidateId]/forms/page.tsx`) shall call a
  new `server-only` `getCandidateFormsContext(id)` on the admin client that returns only
  `candidateName`, `sponsorName`, `status` and `formsSubmitted`. It validates `id` with `z.uuid()`.
  The stored `candidate_info` row (medical fields) is no longer sent to the browser as `initialData`
- FR-5.2 The page shall render the form only when `status IN ('sponsored', 'awaiting_forms')` and no
  `candidate_info` row exists; otherwise it shows an "already submitted" state
- FR-5.3 `addCandidateInfo` shall become `submitCandidateForms(id, data)`: validate the UUID, parse
  `data` with the existing `CandidateFormData` Zod schema on the server, insert `candidate_info` via
  the admin client, and update `candidates` with `.eq('id', id).in('status', ['sponsored',
'awaiting_forms'])` so the status flip is conditional. A unique index on
  `candidate_info(candidate_id)` prevents duplicate rows on resubmit
- FR-5.4 `sendCandidateFormsCompletedEmail` shall use `getCandidateByIdAdmin`,
  `getPreWeekendCoupleEmailAdmin` and pass the admin client to `getWeekendById`. **This fixes a live
  bug:** the PWC "forms completed" email fails today because `contact_information` is
  authenticated-only and the caller is anonymous (`actions/candidates.ts:342` logs the error)
- FR-5.5 Candidate fee page (`app/(public)/payment/candidate-fee/page.tsx:43`) shall stop calling
  `getCandidateById`. Add `paymentOwner` (already on `CandidateCheckoutRow`) to `CheckoutQuote` and
  rely on the admin-backed `getCheckoutQuote`. Validate `candidate_id` as a UUID
- FR-5.6 `notifyAssistantHeadForTeamPayment` shall read `weekend_roster` and `weekends` with the
  admin client. **Fixes a live bug:** inside the Stripe webhook the session client is anonymous, so
  the Assistant Head email never sends today
- FR-5.7 With FR-5.1 through FR-5.6 deployed, a migration shall drop the remaining anon policies
  (`SELECT` on `candidates`, `candidate_info`, `candidate_sponsorship_info`; `INSERT` on
  `candidate_info`; `UPDATE` on `candidates`) and the matching grants from FR-1.6. After this, `anon`
  holds only `USAGE` on schema `public`
- FR-5.8 Side effect to state in the PR: these unguarded exports stop working for anonymous callers,
  which is the intent: `getHydratedCandidate`, `getAllCandidatesWithDetails`,
  `updateCandidatePaymentOwner`, `getCandidateById`, `getAllUsers`, `sendPaymentRequestEmail`

**Proof Artifacts:**

- Manual, logged out: open a candidate forms link, submit, see the success page; the PWC receives the
  email. Open a candidate fee link, complete a Stripe test checkout
- Local check (Unit 8 test 2): with the anon key, `select * from candidate_info` now fails
- Network tab on the forms page shows no medical fields in the RSC payload

### Unit 6: Remaining Authenticated Write Policies

**Purpose:** Make the database agree with the app about who may write what, without locking out
CHA-role leaders or inherited roles.

**Functional Requirements:**

- FR-6.1 **Helper 1.** Extend `auth_user_has_permission(text)`
  (`20260821000000_payment_transaction_corrections.sql:37-54`) with a recursive CTE over
  `roles.based_on_role_id` so it honours the inheritance added in `20260923000000_role_inheritance`.
  Without this, a user who gets a permission only through a base role passes the app check but fails
  every DB policy
- FR-6.2 **Helper 2.** Add `auth_user_cha_has_permission(p text)`, `SECURITY DEFINER`, returning
  `EXISTS (SELECT 1 FROM weekend_roster wr JOIN weekends w ON w.id = wr.weekend_id WHERE wr.user_id =
auth.uid() AND wr.status IS DISTINCT FROM 'drop' AND w.status = 'ACTIVE' AND wr.cha_role = ANY(...))`
  where the role list per permission mirrors `CHA_ROLE_PERMISSIONS` in `lib/security.ts:115-225`
  (CHA strings from `lib/weekend/types.ts:118-153`). Only `WRITE_TEAM_ROSTER` and
  `READ_WRITE_TEAM_PAYMENTS` need mapping for this spec. A comment in both files ties them together,
  and a small test asserts the SQL role list equals the TypeScript one for those two permissions.
  Below, `hp(p)` means `auth_user_has_permission(p) OR auth_user_cha_has_permission(p)`
- FR-6.3 **Roster tables.** `weekend_roster` INSERT/UPDATE/DELETE → `hp('WRITE_TEAM_ROSTER')`.
  `draft_weekend_roster` INSERT/UPDATE/DELETE → same. `weekend_group_members` INSERT/UPDATE →
  `user_id = auth.uid() OR hp('WRITE_TEAM_ROSTER')` (members insert and update their own row when
  confirming secuela attendance, `weekend-group-member/repository.ts:522,530`); DELETE →
  `hp('WRITE_TEAM_ROSTER')`. `updateSpecialNeedsForGroup` uses the admin client and is unaffected
- FR-6.4 **Payments.** `payment_transaction` INSERT → `auth_user_has_permission('WRITE_PAYMENTS') OR
(hp('READ_WRITE_TEAM_PAYMENTS') AND target_type = 'weekend_group_member' AND payment_method IN
('cash','check'))`. Webhook, roster sync and candidate-move inserts already bypass RLS. `deposits`
  and `deposit_payments` INSERT/UPDATE/DELETE → no authenticated policy (webhook-only via
  `dangerouslyBypassRLS`)
- FR-6.5 **Candidates.** `candidates` UPDATE → `hp('WRITE_CANDIDATES')` (safe only after Unit 5 moved
  the forms status flip to the admin client). `candidate_info` UPDATE, `candidate_sponsorship_info`
  UPDATE → `hp('WRITE_CANDIDATES')`. All three DELETE → `hp('DELETE_CANDIDATES')`. INSERT and SELECT
  stay open (sponsor form)
- FR-6.6 **Weekends.** `weekends` INSERT/UPDATE → `hp('WRITE_WEEKENDS')`; add a DELETE policy for
  `WRITE_WEEKENDS`. **Fixes a live bug:** `deleteWeekendsByGroupId`
  (`services/weekend/repository.ts:367`) silently deletes zero rows today because no DELETE policy
  exists. `weekend_groups` INSERT/DELETE →
  `hp('WRITE_WEEKENDS')`; UPDATE → `hp('WRITE_WEEKENDS') OR hp('MANAGE_FEES')`; keep the fee guard
  trigger
- FR-6.7 **Content and settings.** `events` INSERT/UPDATE/DELETE → `hp('WRITE_EVENTS')`.
  `site_settings` INSERT/UPDATE → `hp('WRITE_SETTINGS') OR hp('MANAGE_FEES')`, keeping the restrictive
  fee-key policies. `community_encouragements` INSERT/UPDATE → `hp('WRITE_COMMUNITY_ENCOURAGEMENT')`.
  `contact_information` UPDATE → `hp('WRITE_USER_ROLES')`; INSERT/DELETE → no policy.
  `meeting_minutes_metadata` INSERT/UPDATE → `hp('FILES_UPLOAD')`; DELETE → `hp('FILES_DELETE')`
  (cleanup trigger is `SECURITY DEFINER`)
- FR-6.8 **Per-member rows.** `team_form_completions` INSERT/UPDATE → `EXISTS (SELECT 1 FROM
weekend_group_members m WHERE m.id = weekend_group_member_id AND m.user_id = auth.uid()) OR
hp('FULL_ACCESS')`. `users_experience` INSERT → `user_id = auth.uid() OR hp('FULL_ACCESS') OR
hp('WRITE_WEEKENDS')` (`setActiveWeekendGroup` bulk-inserts through the session client,
  `weekend/repository.ts:786`); UPDATE/DELETE → `user_id = auth.uid() OR hp('FULL_ACCESS')`
- FR-6.9 Impersonation note for policy authors: `auth.uid()` stays the **admin's** id while
  impersonating, so every ownership clause also needs `OR hp('FULL_ACCESS')`, which `hp()` already
  treats as satisfying any permission
- FR-6.10 Ship order inside the unit: helpers first; then roles-independent tables (events, settings,
  content, weekends); then roster and payment tables, tested as a Rector who holds no DB role

**Proof Artifacts:**

- Test from FR-6.2 passes
- Manual as Rector-by-CHA with no DB role: build and finalize a roster, record a team cash payment.
  As a plain member: confirm secuela attendance, complete team forms, edit own experience
- Manual as admin: activate a weekend group (bulk experience insert), delete a weekend group (now
  actually deletes weekends)

### Unit 7: Auth Config, Redirects and the Download Route

**Purpose:** The low-friction auth hardening the owner agreed to, plus the one API route the proxy
skips.

**Functional Requirements:**

- FR-7.1 `supabase/config.toml`: `minimum_password_length = 8`; `password_requirements = ""` stays.
  `enable_confirmations`, `secure_password_change` and captcha settings are **not** changed. The
  release workflow runs `supabase config push` on every merge to `main`, so this takes effect on
  merge, and any dashboard edit to these keys is overwritten by the next push
- FR-7.2 Add `MIN_PASSWORD_LENGTH = 8` in a new `lib/auth/constants.ts` (no `lib/auth/` exists yet) and
  use it in `components/auth/ResetPasswordForm.tsx:94` (check and message) and
  `components/auth/AuthForm.tsx:259` (help text, plus a matching client check on the register path,
  which currently relies on the server error)
- FR-7.3 `app/(public)/auth/callback/route.ts:21,24` and `app/(public)/auth/confirm/route.ts:26,57,72`
  shall pass `next` through `validateRedirectUrl` (`lib/redirect.ts`, already used in
  `lib/supabase/middleware.ts:66`) before redirecting, including the confirm route's error branch,
  which today redirects to a raw `next` even when the token is invalid
- FR-7.4 `app/api/files/download/route.ts` shall require a session (`getLoggedInUser`) and restrict
  `bucket` to an allowlist (`files`, `avatars`) and `path` to a normalized value with no `..`
  segments. The proxy skip list in `proxy.ts` is left as is

**Proof Artifacts:**

- Manual: existing account logs in unchanged; new signup with a 7-character password is rejected with
  the new message; a reset with 8 succeeds
- Manual: `/auth/confirm?type=email_change&token_hash=bad&next=https://example.com` lands on the
  app's error page, not example.com
- Manual: `/api/files/download?...` logged out returns 401

### Unit 8: Tests and Verification

**Purpose:** Prove the two gate mechanisms and the RLS baseline, with exactly three tests.

**Functional Requirements:**

- FR-8.1 `lib/actions/authorized-action.test.ts`: with `getLoggedInUser` mocked to return no user, a
  wrapped action returns an `Unauthorized` `Result` and never calls `fn`; with a user lacking the
  permission, same; with the permission, `fn` runs and receives the user
- FR-8.2 `supabase/rls.test.ts` (runs only when `SUPABASE_URL` points at the local stack; skipped in
  CI until Epic 1 adds a DB job): using the anon key, `select` on `candidate_info` returns an
  error or zero rows, and `insert` into `user_roles` fails
- FR-8.3 Flip `services/identity/user/actions.test.ts`: the existing case that calls
  `updateUserProfilePhoto('user-1', …)` with no session must now assert the `Unauthorized` result,
  and a second case with the owning session succeeds
- FR-8.4 Manual verification checklist, run per unit before merge:
  - Logged out: candidate forms submit; candidate fee checkout; login; forgot and reset password
  - Member with no roles: sponsor form; secuela confirm; all five team forms; own profile edits;
    experience add and delete; roster and hub tabs render
  - Rector by CHA only (active weekend, no DB role): roster builder draft, finalize, drop, remove;
    team cash/check payment from the roster
  - Admin: impersonate and clear; people editor (roles, contact, address, experience); role editor;
    event create, edit, delete; file upload and delete; settings; weekend group create, activate,
    delete; candidate approve, payment request, manual candidate payment

**Proof Artifacts:**

- `yarn test` green with the three new or changed tests
- The checklist, ticked, in each unit's PR description

## Production Verification (2026-09-26)

- **Migration history matches:** all 40 checked-in migrations are applied to prod, none extra
- **Policy and grant dump captured but not yet diffed** against the migrations. It covers RLS status
  per table, every `public` and `storage` policy, grants to `anon`/`authenticated`, default
  privileges, `SECURITY DEFINER` functions, buckets, and the `roles` table with permissions. Path
  (session scratchpad, not in the repo):
  `/private/tmp/claude-501/-Users-sdavis-Projects-dttd/97911c1f-4878-46a8-92ef-7ff173d6d186/scratchpad/prod-verify/prod-policies.txt`.
  Diff it before Unit 1's migration is written; any policy present in prod but not in a migration is a
  finding
- **Auth settings** need the management API or the dashboard (Authentication → Sign In / Providers).
  Owner-run check:

  ```
  curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    https://api.supabase.com/v1/projects/hlbfwbfhfbbiyztbqmsw/config/auth \
    | jq '{mailer_autoconfirm, password_min_length, password_required_characters,
           security_update_password_require_reauthentication, security_captcha_enabled, disable_signup}'
  ```

- **Treasurer role:** the seed (`supabase/seed.sql:21`) gives Treasurer only `READ_PAYMENTS` and
  `READ_ADMIN_PORTAL`. Roles are editable in the UI, so prod may differ. Check the live `roles` row
  before relying on `WRITE_PAYMENTS` for the treasurer (Open Questions)

## Known Bugs Fixed or Surfaced

Fixed by this spec:

- PWC "candidate forms completed" email never sends (FR-5.4)
- Assistant Head "team payment received" email never sends from the webhook (FR-5.6)
- Deleting a weekend group silently deletes zero weekends (FR-6.6)
- Duplicate `candidate_info` rows on resubmit (FR-5.3)

Surfaced, follow-up only:

- CHA leaders reading roster medical profiles get only their own row back, because `getWeekendRoster`
  reads `user_medical_profiles` with the session client (`weekend-service.ts:861`). Fix only if it
  falls out of Unit 6 trivially; otherwise a separate ticket
- Community board page gates editing on `WRITE_USER_ROLES` (`app/admin/community-board/page.tsx:21`)
  while the action checks `WRITE_COMMUNITY_ENCOURAGEMENT`. Align in a follow-up
- `notifyCandidatePaymentReceivedAdmin` was a publicly callable admin-client path that could send
  forged "payment received" emails to the PWC; closed by demotion in Unit 3

## Non-Goals (Out of Scope)

- **Server-side medical redaction** for the hub candidate list, candidate detail and roster views
- **Email confirmation, CAPTCHA, `secure_password_change`**
- **Per-action tests.** Three tests total
- **Removing the proxy skip list**
- **Audit log.** Separate work, sequenced after this epic (see `docs/platform-roadmap-status.md`)
- **`community_id` / tenancy.** Epic 2
- **Google sign-in.** Wanted later; nothing here blocks it
- **`files` bucket `public: true`.** Noted, unchanged (Open Questions)

## Repository Standards

- Server actions return `Result`; every wrapped action goes through `authorizedAction`;
  `toastError()` for user-facing failures; `isNil()` for null checks
- Migrations in `supabase/migrations/`, header comment listing dropped and recreated policies, then
  `yarn db:generate`
- `yarn lint`, `npx tsc --noEmit`, `yarn test`; `yarn build` for Unit 3 (server-only graph check)
- The owner runs the local database and dev server; ask before `yarn db:reset`

## Technical Considerations

- **Server actions dispatch by header, not URL.** Every export of a `'use server'` module is a POST
  endpoint whatever the proxy does. That is why demotion (Unit 3) is the cheapest fix and why the
  proxy skip list is left alone
- **`TO authenticated, anon` policies** cannot be edited per role; drop and recreate
- **Impersonation and `auth.uid()`:** the JWT is always the admin's, so ownership clauses in RLS need
  the `FULL_ACCESS` escape (FR-6.9), and app-level ownership predicates act as the impersonated user
- **CHA permissions apply only while the group is ACTIVE** (`user-service.ts:65-111`) and use
  `cha_role`, not `additional_cha_role`. Helper 2 mirrors exactly that
- **React `cache()` doesn't memoize outside a render**, so actions that now call `getLoggedInUser()`
  internally pay one auth lookup per call (plus one `getUserById` when impersonating). Acceptable for
  click-driven mutations; the demoted reads run inside renders where the lookup is already cached
- **Prod testing order:** Units 1, 5 and 6 change live policies. Run each on a fresh local
  `db reset`, then against a prod copy, then prod

## Security Considerations

- After Units 1 and 5, `anon` holds only `USAGE` on `public`; PostgREST returns nothing for
  anonymous requests to any table
- After Unit 2, a forged cookie is indistinguishable from no cookie
- After Units 3 and 4, every reachable action endpoint is wrapped, self-guarded, or carries a
  `publicAction` comment; a grep for `'use server'` files is the audit
- After Unit 6, the database enforces the same write permissions as the app, so a future unguarded
  action is a bug, not a breach
- Rate limiting on the public candidate forms submit is deferred; UUID entropy (122 bits) plus the
  status check is the guard

## Success Metrics

- Anon key: zero rows readable, zero writes accepted, on every table
- A member with no roles cannot change `user_roles`, `roles`, any roster table, or any payment, from
  the browser console or from the REST endpoint
- A hand-set impersonation cookie has no effect
- `'use server'` files contain only wrapped, self-guarded or `publicAction`-marked exports
- Existing users log in with unchanged passwords; the Rector by CHA completes the Unit 8 checklist

## Open Questions

- **Payment owner edits.** `updateCandidatePaymentOwner` is reachable today by anyone with
  `READ_CANDIDATES`. Default: require `WRITE_CANDIDATES` (matches the approve flow it sits in)
- **Own email edits.** Should the `users` UPDATE policy exclude the `email` column for self-edits?
  Default: allow; the `sync_user_email_on_change` trigger governs the auth side
- **`files` bucket `public: true`.** `FileBrowserTable.tsx:108` uses `getPublicUrl`. Default: keep for
  now and note it; revisit when the files feature is next touched
- **Dead exports.** Delete or keep behind a guard? Default: delete (FR-3.4)
- **Cookie max age.** 24 hours

## Rollout

Each unit is its own PR to `preview`, merged to `main` in order:

1. **Unit 1 + Unit 2** (one migration, one service change, one Vercel secret). Diff the prod policy
   dump first
2. **Unit 3** (wrapper, deletions, demotions). Largest diff, zero behavior change; `yarn build` is the
   gate
3. **Unit 4** (gating). PR description carries the export-to-guard table
4. **Unit 5** (public flows, anon part B). Test logged-out flows in preview before merging
5. **Unit 6** (helpers, then write policies). Test as Rector-by-CHA on a prod copy
6. **Unit 7** (auth config, redirects, download route)
7. **Unit 8** ships alongside, tests landing with the unit they prove

Update the Epic 0 row in `docs/platform-roadmap-status.md` as units land.
