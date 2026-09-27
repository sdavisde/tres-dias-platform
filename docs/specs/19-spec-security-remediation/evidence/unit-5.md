# Unit 5 evidence — public flows on the admin client, anonymous revocation part B

Migration: `supabase/migrations/20260927000001_anon_revocation_part_b.sql`, applied to the local
database with `supabase migration up` on 2026-09-27 (`Local database is up to date`). No table shape
changed, so `database.types.ts` was not regenerated.

## What changed in code

| Area                                        | Before                                                                                                                                                         | After                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Candidate forms page                        | `getHydratedCandidate` on the session client (anon), full `candidate_info` row sent to the browser as `initialData`                                            | `getCandidateFormsContext` (`services/candidates/candidate-forms.ts`, `server-only`, admin client) returns only candidate name, sponsor name, status and `formsSubmitted`; id validated with `z.uuid()`; unknown id → `notFound()`; closed or already-submitted → static "Forms already submitted" card                                                                                                                                                                               |
| Submit                                      | `addCandidateInfo(candidateId, dbRow)` — session client, no validation, unconditional status flip                                                              | `submitCandidateForms(candidateId, values)` (`// publicAction`) — server re-parses the form with the shared `candidateFormsSchema` (`lib/candidates/candidate-forms-schema.ts`), maps to columns and computes age on the server, inserts via admin client, then `UPDATE candidates … WHERE id = ? AND status IN ('sponsored','awaiting_forms')`; zero rows → the inserted info row is removed and the caller gets "no longer accepting forms"; unique violation → "already submitted" |
| PWC "forms completed" email                 | `getHydratedCandidate` + `getPreWeekendCoupleEmail` on the session client → failed for every anonymous submitter (`contact_information` is authenticated-only) | `getCandidateByIdAdmin`, `getPreWeekendCoupleEmailAdmin`, review URL resolved with the admin client (`getCandidateReviewUrl(candidate, { client })`)                                                                                                                                                                                                                                                                                                                                  |
| Assistant Head team-payment email (webhook) | session client inside the webhook → anonymous → `weekend_roster` / `weekends` reads returned nothing                                                           | `createAdminClient()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Candidate fee page                          | `getCandidateById` on the session client (anon) for `id` + `paymentOwner`                                                                                      | `candidate_id` validated with `z.uuid()`; `paymentOwner` added to `CheckoutQuote` (admin-backed `findCandidateCheckoutRow`); no session read                                                                                                                                                                                                                                                                                                                                          |
| RLS                                         | five anon policies + anon `SELECT/INSERT/UPDATE` grants on the three candidate tables                                                                          | policies recreated `TO authenticated` with the same expressions; `REVOKE ALL … FROM anon`; `anon` holds no table grants and no policies (only `USAGE` on schema `public`; function EXECUTE for PUBLIC was revoked in the audit fix-up migration `20260927000004`, and anon can still fetch objects in the `public = true` `files` bucket, see `audit-fixups.md` H2)                                                                                                                   |
| Data                                        | duplicate `candidate_info` rows possible on resubmit                                                                                                           | `CREATE UNIQUE INDEX candidate_info_candidate_id_key ON candidate_info (candidate_id)` (no duplicates existed locally or in prod; defensive keep-newest cleanup precedes it)                                                                                                                                                                                                                                                                                                          |

## Anonymous callers (publishable key only, local PostgREST)

```
curl -H "apikey: <anon>" -H "Authorization: Bearer <anon>" \
  http://127.0.0.1:54321/rest/v1/<table>?select=id&limit=1

GET   candidates                 → 401 {"code":"42501","message":"permission denied for table candidates"}
GET   candidate_info             → 401 permission denied for table candidate_info
GET   candidate_sponsorship_info → 401 permission denied for table candidate_sponsorship_info
GET   users                      → 401 permission denied for table users
GET   roles                      → 401 permission denied for table roles
POST  candidate_info {...}       → 401 permission denied for table candidate_info
PATCH candidates?id=eq.<uuid> {"status":"pending_approval"} → 401 permission denied for table candidates
```

Before this migration the three candidate `GET`s returned rows (Unit 1 left them open on purpose).

Catalog after the migration (psql, local):

```
policies on candidates / candidate_info / candidate_sponsorship_info → 12 rows, every polroles = {authenticated}
information_schema.role_table_grants where grantee = 'anon'          → 0 rows
has_schema_privilege('anon', 'public', 'USAGE')                      → true
pg_indexes on candidate_info → candidate_info_pkey, candidate_info_candidate_id_key
```

## Submission semantics (psql, service role, rolled back)

```
candidate e1000136-… (status awaiting_forms, no candidate_info row)
INSERT candidate_info (candidate_id = e1000136-…)                     → 1 row
INSERT candidate_info (same candidate_id)                             → ERROR 23505 duplicate key value
                                                                        violates unique constraint
                                                                        "candidate_info_candidate_id_key"
UPDATE candidates SET status='pending_approval'
  WHERE id = … AND status IN ('sponsored','awaiting_forms')           → 1 row (pending_approval)
same UPDATE again                                                     → 0 rows
```

These are the exact statements `submitCandidateForms` issues through the admin client, so the
service's two guard branches (23505 → "already submitted"; 0 rows → undo insert, "no longer
accepting forms") are exercised at the database layer.

## Gates

- `npx tsc --noEmit`: clean
- `yarn lint`: 0 errors, 15 pre-existing warnings
- `yarn test`: 45 suites, 461 tests passing (unchanged count; no new tests in this unit)
- `yarn build`: compiled successfully (6.2 s compile, 43/43 static pages)

## Not exercised

- The browser flows (logged-out candidate filling the form, Stripe test checkout, receiving the two
  emails) were not driven in this run. The RSC payload check ("no `medical_conditions` in the forms
  page payload") follows from the page no longer receiving `candidate_info` at all, but was not
  observed in a network tab.
- `submitCandidateForms` itself was not executed outside Next (it imports `server-only`); the psql
  transcript above reproduces its statements.
- `supabase/rls.test.ts` does not exist yet (Unit 8 creates it), so task 5.7's "update the
  expectation" is folded into Unit 8: anon `select` on `candidate_info` must fail.

## Side effect to state in the PR (FR-5.8)

These exports now fail for anonymous callers by design: `getHydratedCandidate`,
`getAllCandidatesWithDetails` (both server-only since Unit 3), `updateCandidatePaymentOwner`,
`getCandidateById`, `getAllUsers`, `sendPaymentRequestEmail`.
