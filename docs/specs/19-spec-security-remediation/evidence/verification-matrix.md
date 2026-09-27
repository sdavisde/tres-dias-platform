# Verification matrix — FR-8.4 per-persona checklist

Branch `feat/security-remediation`, 2026-09-27. No browser was driven during implementation, so each
checklist item below names the evidence that already covers it (unit test, psql proof, PostgREST
probe, build-time boundary check) or is marked **manual, pending** with the Gherkin scenario ids in
`../features/` that a reviewer runs before merge. "Covered" means the exact statement or code path
the UI executes was exercised under the right identity; it does not mean the page was clicked.

Legend: **U1–U7** = `evidence/unit-N.md`; **T** = jest test; **G** = Gherkin id for the manual pass.

## Logged out

| Flow                                                              | Evidence                                                                                                                                                       | Status                                                                                                                                          |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Candidate forms link renders (name, sponsor, status only)         | U5: `getCandidateFormsContext` field list; anon cannot read `candidate_info` (U5 curl, T `supabase/rls.test.ts`)                                               | Partial — page render manual (G ANON-010)                                                                                                       |
| Candidate forms submit once; resubmit blocked                     | U5 psql: unique index 23505 on second insert, conditional status update 0 rows on repeat                                                                       | Partial — form UI manual (G ANON-011..015)                                                                                                      |
| Candidate fee checkout                                            | U5: page reads owner from admin-backed quote; `beginCheckout` and webhook admin-client only (audit)                                                            | Manual (G ANON-020..022)                                                                                                                        |
| Login                                                             | Unchanged code path; T `lib/redirect.test.ts` for redirectTo handling in middleware                                                                            | Manual (G AUTH-005, AUTH-006)                                                                                                                   |
| Forgot password → callback → reset                                | U7: `/reset-password` allow-listed in callback; T `lib/redirect.test.ts`                                                                                       | Manual (G AUTH-010, AUTH-011, AUTH-020)                                                                                                         |
| Off-site `next` refused (callback, confirm incl. invalid token)   | U7 + T `lib/redirect.test.ts` (absolute, `//`, `javascript:`, and after the audit fix-up: `/.//evil.com`, `/a/..//evil.com`, `/%2e%2e//evil.com`, backslashes) | Covered (browser confirm G AUTH-021..023). The independent audit found a dot-segment bypass in the first version; fixed in `audit-fixups.md` M1 |
| Protected pages redirect to login                                 | Unchanged proxy; not re-tested                                                                                                                                 | Manual (G ANON-030)                                                                                                                             |
| Publishable key cannot read/write PII, roles, candidates, storage | U1 + U5 curl (401 `42501`); T `supabase/rls.test.ts` (3 assertions)                                                                                            | Covered (G ANON-040..043)                                                                                                                       |
| Server actions reject anonymous callers                           | T `lib/actions/authorized-action.test.ts`; U4 coverage table (88/88 guarded, marked or self-guarded)                                                           | Covered (G ANON-050, ANON-051)                                                                                                                  |
| Download route needs a session, bucket allow-list, no traversal   | U7; T `lib/storage-path.test.ts`                                                                                                                               | Covered for helper; HTTP manual (G ANON-044, MEMBER-074)                                                                                        |

## Member with no roles

| Flow                                                                        | Evidence                                                                                                                                                                   | Status                                       |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Sponsor form (insert candidate + sponsorship info, notification)            | U4: `createCandidateWithSponsorshipInfo` and notification now `'authenticated'`; U6: candidate INSERT policies left open                                                   | Manual (G CAND-001, CAND-003)                |
| Secuela confirm (own `weekend_group_members` insert/update)                 | U6 psql (b): own row insert + `attended_secuela_at` update succeed; other user denied                                                                                      | Covered (G MEMBER-040, MEMBER-041)           |
| Five team forms as a team member (own group member id)                      | U4: `ownsGroupMember` on all five; U6: `team_form_completions` own-row policy                                                                                              | Partial — form UI manual (G MEMBER-030..036) |
| Own profile contact / address / photo edits                                 | U4: `ownsUser` / `ownsUserOrAdmin`; T `services/identity/user/actions.test.ts` (owner succeeds, other user denied, no session denied); U1: own `users` UPDATE 200 via REST | Covered (G MEMBER-010..015)                  |
| Own email edit on profile                                                   | U1: `users` UPDATE policy allows own row (Open Question default)                                                                                                           | Manual (G MEMBER-011)                        |
| Experience add and delete                                                   | U4: `ownsUserOrAdmin` / `ownsExperienceOrAdmin`; U6 psql (b): own `users_experience` insert/delete succeed                                                                 | Covered (G MEMBER-020..022)                  |
| Roster and hub tabs render                                                  | U3: `getWeekendRosterViewData` reads the session; `yarn build` 43/43 pages                                                                                                 | Manual (G MEMBER-001..003)                   |
| Cannot self-grant a role / edit roles / place roster rows / record payments | U1 REST (403 RLS on `user_roles` insert); U6 psql (a) roster + payment inserts denied; U4 permission guards                                                                | Covered (G MEMBER-053, 054, 060..065)        |
| Cannot upload/delete in `files`, create buckets                             | U1 Storage API: upload 403, create bucket 403                                                                                                                              | Covered (G MEMBER-070..072)                  |

## Rector by CHA only (active weekend, no DB role)

| Flow                                                    | Evidence                                                                                                                                                                                                                              | Status                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Open roster builder                                     | Page gate unchanged (READ_TEAM_ROSTER_BUILDER via CHA in app code)                                                                                                                                                                    | Manual (G ROSTER-001)                                      |
| Draft add / remove, finalize, drop, remove              | U4: WRITE_TEAM_ROSTER guard (CHA grants it in `user-service.ts`); U6 psql (c): draft insert, roster insert, status → drop succeed with zero DB roles; T `lib/security/cha-permissions-sql.test.ts` ties SQL to `CHA_ROLE_PERMISSIONS` | Covered at action + DB level (UI manual G ROSTER-002..005) |
| Team cash/check payment from the roster                 | U4: `[READ_WRITE_TEAM_PAYMENTS, WRITE_PAYMENTS]`; U6 psql (c): team cash `payment_transaction` insert succeeds, candidate-target and stripe-method denied                                                                             | Covered (G ROSTER-010)                                     |
| Loses CHA permissions when weekend not ACTIVE / dropped | U6 helper predicate (active, non-dropped)                                                                                                                                                                                             | Manual (G ROSTER-035, ROSTER-036)                          |

## Admin (Leaders Committee / Full Access as noted)

| Flow                                                                          | Evidence                                                                                                                                                                | Status                                           |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Impersonate and clear                                                         | U2: 7 cookie tests; reader requires signature, age ≤ 24h, `session.id === adminUserId`, current FULL_ACCESS; `clearImpersonation` is `'authenticated'` (U4)             | Partial — browser flow manual (G IMP-001..006)   |
| Forged / tampered / expired cookie ignored                                    | U2 node checks + T `impersonation-cookie.test.ts`                                                                                                                       | Covered (G IMP-010..015)                         |
| People editor: roles, contact, address, experience                            | U4: FULL_ACCESS / `ownsUserOrAdmin`; U1: `user_roles` writes need WRITE_USER_ROLES (Leaders Committee POST 201 in U1)                                                   | Manual (G ADMIN-040, ADMIN-046)                  |
| Role editor create / edit / delete                                            | U1: `roles` policies → WRITE_USER_ROLES; psql-simulated write succeeds with the permission                                                                              | Manual (G ADMIN-041..043)                        |
| Event create / edit / delete                                                  | U4: WRITE_EVENTS guards; U6 psql (d): inheriting role inserts + updates events                                                                                          | Covered (UI manual G ADMIN-010)                  |
| File upload and delete                                                        | U1: Leaders Committee upload + delete 200 via Storage API; FILES_UPLOAD/FILES_DELETE policies                                                                           | Covered (UI manual G ADMIN-060, 061)             |
| Settings and fee edits                                                        | U6: `site_settings` → WRITE_SETTINGS or MANAGE_FEES, restrictive fee policies kept                                                                                      | Manual (G ADMIN-070, 071, 024)                   |
| Weekend group create, activate, delete                                        | U6 psql (e): `weekends` DELETE now returns 1 row; `users_experience` insert for another user (activation) succeeds with WRITE_WEEKENDS                                  | Covered at DB level (UI manual G ADMIN-020..022) |
| Candidate approve, payment request, manual candidate payment                  | U4: WRITE_CANDIDATES on send/approve; payment gate list; U6: `candidates` UPDATE → WRITE_CANDIDATES; candidate-target payment needs WRITE_PAYMENTS at DB (PWC holds it) | Manual (G CAND-011..014)                         |
| Admin without FULL_ACCESS cannot impersonate / edit contact info / list users | U4: `canImpersonate` predicate on `getAllUsers`, FULL_ACCESS on `updateUserContactInfo`                                                                                 | Covered (G ADMIN-044, 045, IMP-016)              |

## Totals

| Status                                       | Count |
| -------------------------------------------- | ----- |
| Covered by automated or DB-level evidence    | 19    |
| Partial (mechanism proven, page not clicked) | 4     |
| Manual, pending (Gherkin ids listed)         | 15    |

The 15 manual items are all "does the page still render and the button still work" checks whose
underlying statements were proven under the right identity. They are the branch-level pass before
merging to `preview`, and the Gherkin ids make them the first residents of the Epic 1 E2E harness.

## Automated tests added by Epic 0

| Test                                                           | Unit | Purpose                                                                                                                                  |
| -------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/actions/authorized-action.test.ts`                        | 3    | Spec test 1: wrapper rejects anonymous, denies missing permission, passes user through                                                   |
| `supabase/rls.test.ts`                                         | 8    | Spec test 2: anon key cannot read `candidate_info`, `users`, `user_roles` or insert `user_roles`; skipped unless the local stack answers |
| `services/identity/user/actions.test.ts`                       | 4    | Spec test 3 (flipped): no session → Unauthorized with no write; other user denied; owner succeeds                                        |
| `services/identity/impersonation/impersonation-cookie.test.ts` | 2    | Pure crypto helper: valid, tampered, wrong secret, expired                                                                               |
| `lib/security/cha-permissions-sql.test.ts`                     | 6    | SQL CHA helper mirrors `CHA_ROLE_PERMISSIONS`                                                                                            |
| `lib/redirect.test.ts`, `lib/storage-path.test.ts`             | 7    | Redirect allow-list and storage path normalizer                                                                                          |

`yarn test`: 49 suites, 478 tests (447 before Epic 0).
