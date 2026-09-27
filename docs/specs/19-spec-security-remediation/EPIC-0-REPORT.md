# Epic 0 — Security remediation report

_Branch `feat/security-remediation` off `preview`, 2026-09-26 → 2026-09-27. Spec:
`19-spec-security-remediation.md`. Evidence: `evidence/`. Regression suite: `features/`._

## Summary

All eight units of the spec were implemented, one commit per unit, plus a fix-up commit for the
findings of an independent re-audit. Gates on the final commit: `npx tsc --noEmit` clean,
`yarn lint` 0 errors, `yarn test` 49 suites / **478 tests** (447 before Epic 0), `yarn build` 43/43
pages. The server-action surface went from **151 exported actions in 27 files to 88 in 20**, every
one of them permission-gated, ownership-checked, auth-only, self-guarded or explicitly marked public.
The `anon` role went from **ALL privileges on 24 tables to zero table grants and zero policies**
(avatars public-read excepted); four migrations dropped 78 policies and recreated 69 with
permission or ownership expressions, leaving authenticated `SELECT` open everywhere by decision.

The independent audit, run by a fresh agent against the finished units and before the fix-ups,
returned: **"Not ready. The gate is not closed."** Its reason: signup is open with no email
confirmation, so "logged-in member" means anyone on the internet, and authenticated `SELECT` on
every PII table is still `USING (true)`. Two HTTP requests (sign up, then one REST read) dump every
candidate's medical conditions. The fix-up commit closed every other finding the owner's decisions
allow. What remains is the owner's call on that one design tension, plus the public `files` bucket.

## Before / after, per original finding

| Original finding (2026-09-26 audit)                                           | Now                                                                                                             | Evidence                                              |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `USING (true)` for `anon` on `users`, `roles`, `user_roles`, candidate tables | No anon grants, policies or default privileges; anon REST reads return `42501`                                  | `unit-1.md`, `unit-5.md`, `supabase/rls.test.ts`      |
| Any member can write `roles` / `user_roles` (self-grant FULL_ACCESS)          | Writes need `WRITE_USER_ROLES`; granting or joining `FULL_ACCESS` additionally needs `FULL_ACCESS` (app + RLS)  | `unit-1.md`, `audit-fixups.md` H1                     |
| Unsigned raw-UUID impersonation cookie                                        | HMAC-SHA256, httpOnly, 24 h, bound to the admin's session, `FULL_ACCESS` re-checked on every read, fails closed | `unit-2.md`, `impersonation-cookie.test.ts`           |
| 93 of 151 server actions unguarded                                            | 63 deleted or demoted to `server-only`; 88 remain, 100% guarded/marked                                          | `unit-3.md`, `unit-4.md`, `authorized-action.test.ts` |
| Caller-supplied `user` / `createdBy` used for authorization                   | Both `user` arguments removed (functions are `server-only`); `createdBy` comes from the session                 | `unit-3.md`, `unit-4.md`                              |
| Open relay via unguarded candidate + email actions                            | Sponsor form validated server-side; notification needs sponsor-of-candidate or `WRITE_CANDIDATES`               | `audit-fixups.md` M3, M5                              |
| Admin-client medical write reachable by any member                            | `submitReleaseOfClaim` behind `ownsGroupMember`; roster medical row read with the admin client only after auth  | `unit-4.md`                                           |
| Auth config: 6-char passwords, open redirects in two auth routes              | Minimum 8 (new passwords only); both routes validate `next`, incl. dot-segment and backslash bypasses           | `unit-7.md`, `lib/redirect.test.ts`                   |
| `/api/files/download` unauthenticated, any bucket, any path                   | Session required, bucket allow-list, path normaliser, escaped `Content-Disposition`                             | `unit-7.md`, `lib/storage-path.test.ts`               |
| Roster self-elevation (place yourself as Rector)                              | Roster row writes need `WRITE_TEAM_ROSTER` in the action and in RLS (CHA-aware helper)                          | `unit-6.md`, `cha-permissions-sql.test.ts`            |
| Public candidate forms sent full `candidate_info` (medical) to browser        | Page gets name, sponsor, status only; submit is validated, admin-client, single-shot (unique index)             | `unit-5.md`                                           |
| Two notification emails silently failing                                      | PWC "forms completed" and Assistant Head payment emails read via the admin client and send                      | `unit-5.md`                                           |

## Commits on the branch

```
c3cdcf1 docs(security): add the Epic 0 security remediation spec and task list
33d5db6 docs(security): record the production policy verification for Epic 0
98a1cba fix(security): require permissions for role, user and storage writes and revoke anon access
d891e41 fix(security): sign the impersonation cookie and re-verify the admin on every read
9716749 docs(security): draft the Epic 0 Gherkin regression suite
ae51676 refactor(security): extend authorizedAction and shrink the server-action surface
707b771 fix(security): gate every remaining server action against the session
8cb8429 fix(security): move the public candidate flows to the admin client and finish anon revocation
aa08676 fix(security): require app permissions for every remaining authenticated write
314a0de fix(security): raise the password minimum, validate auth redirects and gate file downloads
6f837d8 test(security): prove the anon RLS baseline and map the Epic 0 verification checklist
b674ae3 docs(security): confirm the Gherkin suite against the finished Epic 0 code
495db8b fix(security): close the redirect bypass and block FULL_ACCESS self-grants
edf8d1a docs(security): record the independent audit and fix-up evidence
```

Migrations added: `20260927000000` (Unit 1), `20260927000001` (Unit 5), `20260927000002` +
`20260927000003` (Unit 6), `20260927000004` (fix-up). Production was verified drift-free against the
40 prior migrations before Unit 1 (`prod-verification-2026-09-26.md`).

## Independent audit outcome

Full text: `evidence/independent-audit-2026-09-27.md` (run against `6f837d8`). Disposition of every
finding, with file references, is in `evidence/audit-fixups.md`. Condensed:

| Id  | Severity | Finding                                                            | Status                                   |
| --- | -------- | ------------------------------------------------------------------ | ---------------------------------------- |
| C1  | Critical | Open signup + open authenticated reads = anyone can read all PII   | **Owner decision**                       |
| H1  | High     | `WRITE_USER_ROLES` could escalate to `FULL_ACCESS`                 | Fixed in `495db8b`                       |
| H2  | High     | `files` bucket is public; download-route auth is cosmetic          | **Owner decision**                       |
| M1  | Medium   | Redirect validator bypassed by `/.//evil.com` and dot-segments     | Fixed in `495db8b`                       |
| M2  | Medium   | Candidate UUID is not a secret once a member can list candidates   | Owner decision (follows from C1)         |
| M3  | Medium   | Candidate INSERT wide open; sponsor payload unvalidated            | Fixed in `495db8b`                       |
| M4  | Medium   | CHA-derived write power not scoped to the holder's weekend         | Epic 2                                   |
| M5  | Medium   | Any member can trigger unlimited sponsorship emails                | Fixed (partial, no rate limit)           |
| M6  | Medium   | Own-row UPDATE covers every column (`users.email`, `group_id`)     | Owner decision; Epic 2 blocker by design |
| L1  | Low      | Functions still `EXECUTE` for `PUBLIC`                             | Fixed in `495db8b`                       |
| L2  | Low      | SQL CHA helper broader than the app's roster-row selection         | Deferred (Epic 2 rewrites the helper)    |
| L3  | Low      | Medical-profile admin policy ignores inheritance (fails closed)    | Deferred                                 |
| L4  | Low      | Manual candidate payment action looser than RLS (RLS wins)         | No change                                |
| L5  | Low      | Existence / payment-status oracles answered before auth            | Fixed in `495db8b`                       |
| L6  | Low      | `/secuela-confirm` writes during a GET render                      | Deferred (pre-existing UX)               |
| L7  | Low      | `sync_users` has no pinned `search_path`                           | Deferred (trigger-only)                  |
| L8  | Low      | Raw DB error strings returned to anonymous callers                 | Fixed in `495db8b`                       |
| L9  | Low      | Payment barrel re-exported server-only values                      | Fixed in `495db8b`                       |
| L10 | Low      | `Content-Disposition` filename not escaped                         | Fixed in `495db8b`                       |
| —   | Info     | Impersonation: banner check signature-only; missing `server-only`  | Fixed in `495db8b`                       |
| —   | Info     | Tenant-blind cache keys; global "active weekend"; local role drift | Epic 2 / noted                           |

### C1 in plain language

The app hides medical and payment data behind permissions, but the database does not. Every
member-readable table has a policy that says "any logged-in user may read every row", and the
Supabase REST endpoint is reachable from any browser with the public key that ships in the site's
JavaScript. That was an acceptable trade while "logged-in user" meant "someone in our community".
It stops being acceptable because signup is open and needs no email confirmation: a stranger can
create an account in one request and read 138 candidates' medical conditions with the next. The
roadmap's principle is "signup grants nothing"; today signup grants full read access.

Options:

1. **Approval gate + email confirmation (recommended).** Add an `approved` (or `member_status`)
   flag on `users`, default it to approved for every existing row so nobody is locked out, and make
   the open `SELECT` policies read `USING (auth_user_is_approved())` instead of `true`. Turn on
   `enable_confirmations` so an account is at least a real mailbox. New sign-ups see an empty
   member area until an admin (or the Epic 3 join link) approves them. Friction for the 65+
   audience is one email click at signup only; existing members feel nothing. Matches the roadmap
   decision "new members default to zero privileges" and becomes the Epic 3 join-link's landing
   state. Estimated effort: one migration, one helper, a small admin approval control, half a day.
2. **Membership-scoped reads now.** Build Epic 2's `community_members` table and rewrite every
   `SELECT` policy to require a membership row. This is the permanent tenancy boundary, but it is
   the first and largest migration of Epic 2 pulled forward before Epic 1's safety net exists.
3. **Accept until Epic 2.** Not recommended: the exposure is live today for DTTD's own members'
   medical data, not only for a hypothetical second tenant, and the roadmap gates Epic 2 on
   Epic 1's preview database and CI, so "until Epic 2" is months.

### H2 — `files` bucket

`files` is `public = true`, so any object is readable at `/storage/v1/object/public/files/<path>`
without a session, regardless of the RLS and route hardening. Fix: flip the bucket private and serve
files through signed URLs. `getFileDownloadUrlAction` already exists; the only UI dependency is
`components/file-management/FileBrowserTable.tsx` using `getPublicUrl`, plus any file links pasted
into emails or the community board. Small change; the owner's earlier default was "keep for now".

### M2 — candidate forms link

Once non-members cannot read `candidates` (any C1 option), the forms UUID is again only in the
emailed link and the finding closes. Otherwise a per-candidate token column is the alternative.

### Carried into Epic 2 as conditions

- Scope CHA-derived write power to the holder's weekend and tenant (M4, L2).
- Restrict own-row `UPDATE` on `users` and `weekend_group_members` to profile columns before
  `community_id` lands on them (M6).
- `REVOKE EXECUTE ... FROM PUBLIC` on every new SQL function; `supabase_admin` default ACL cannot
  be altered from migrations (L1).
- Tenant-keyed cache keys in `lib/cache/cached-read.ts` and the role graph / active group / fees /
  settings / events caches.
- Define the platform-superuser vs tenant-admin split; `FULL_ACCESS` must not remain a global grant
  a tenant admin can reach.

## Regression coverage

**Gherkin suite** — `features/`, nine files, **202 scenarios** (outlines counted once), every one
with a stable `@E0-<AREA>-<NNN>` id and persona / kind / unit tags. Drafted from the spec while the
units were built, then every inline assumption was resolved against the finished code (six confirmed
as written, five corrected, five scenarios added). Intended as the first residents of the Epic 1
Playwright harness; `features/README.md` lists the fixtures it will need.

**Verification matrix** — `evidence/verification-matrix.md`, FR-8.4's persona × flow checklist:

| Status                                       | Count |
| -------------------------------------------- | ----- |
| Covered by automated or DB-level evidence    | 19    |
| Partial (mechanism proven, page not clicked) | 4     |
| Manual, pending                              | 15    |

No browser was driven during implementation. The 15 manual items are "the page still renders and the
button still works" checks whose underlying statements were proven under the right identity. Run
these before merging (ids from the suite):

- Logged out: `ANON-020..022` (candidate fee checkout), `ANON-030` (protected pages redirect),
  `ANON-044` / `MEMBER-074` (download route over HTTP), `AUTH-005`, `AUTH-006` (login),
  `AUTH-010`, `AUTH-011`, `AUTH-020` (forgot → callback → reset)
- Member: `CAND-001`, `CAND-003` (sponsor form + notification), `MEMBER-011` (own email edit),
  `MEMBER-001..003` (roster and hub tabs render)
- Rector by CHA: `ROSTER-001` (open roster builder), `ROSTER-035`, `ROSTER-036` (permissions end
  with the weekend)
- Admin: `ADMIN-040`, `ADMIN-046` (people editor), `ADMIN-041..043` (role editor),
  `ADMIN-070`, `ADMIN-071`, `ADMIN-024` (settings and fees), `CAND-011..014` (approve, payment
  request, manual candidate payment)

Automated tests added by Epic 0 (31 new): `lib/actions/authorized-action.test.ts`,
`supabase/rls.test.ts` (skips unless local Supabase answers), `services/identity/user/actions.test.ts`
(flipped), `impersonation-cookie.test.ts`, `lib/security/cha-permissions-sql.test.ts`,
`lib/redirect.test.ts`, `lib/storage-path.test.ts`, and `roleGrantsFullAccess` cases in
`services/identity/roles/inheritance.test.ts`.

## Before merging

1. **Decide C1 and H2** (above). If option 1 for C1, it can land as one more unit on this branch.
2. Run the 15 manual Gherkin scenarios against a preview deployment of the branch.
3. Test the five migrations against a **copy of production** (Units 1, 5, 6 and the fix-up change
   policies; Unit 5 adds a unique index that de-duplicates `candidate_info` if duplicates exist —
   none did locally or in the prod dump, but confirm).
4. Confirm both members of the `Full Access` role are intended. Impersonation and the FULL_ACCESS
   grant guard now trust that role exclusively (`prod-verification-2026-09-26.md`).
5. Note that merging to `main` runs `supabase config push`, which sets the production password
   minimum to 8 for new passwords. Existing users are unaffected.
6. Reseed the local database (`yarn db:reset`, owner-run): local role data had drifted from the seed
   and from production before the Unit 6 proofs, so `Treasurer` and `Pre Weekend Couple` lacked
   `WRITE_PAYMENTS` locally. The seed now matches production.
7. `IMPERSONATION_COOKIE_SECRET` is already set (Sensitive) in Vercel for Production and Preview and
   in `.env.local`. Without it, impersonation is disabled and everything else works.
8. Update the Epic 0 row in `docs/platform-roadmap-status.md` to complete after merge (task 8.5).
