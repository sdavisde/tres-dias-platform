# Platform / Multitenancy — Status Brief

_Status as of 2026-09-27._

## The plan

Turn DTTD into a multi-tenant platform other Tres Dias communities can run their weekends on
(target: dozens of communities in 1–2 years). Planned in a design interview on 2026-08-29.

**Source of truth:** [DTTD Platform Roadmap (Draft v1)](https://claude.ai/code/artifact/15eee3d5-d23a-4f19-9450-1f81d3d4ae17)
— 15 locked decisions, six sequenced epics. Not yet captured as a spec under `docs/specs/`.

## Locked decisions (settled — don't re-litigate)

- **Tenancy:** shared schema, `community_id` on every table, RLS mandatory everywhere, one Supabase project
- **Identity:** global users, per-community memberships; one durable person record
  ("candidate" / "team member" are roles at a point in time)
- **Routing:** host-based tenant resolution — platform subdomain, optional custom domain via CNAME
- **Payments:** Stripe Connect (Standard accounts) + platform application fee
- **Roles:** per-community data seeded from a standard Tres Dias template; permissions are explicit
  grants, never derived from roster placement
- **Weekends:** keep weekend group → weekend; gender is an app-layer rule, not a DB constraint;
  replace the global "active weekend" flag with a per-community value
- **Onboarding:** operator-run "create community" wizard (not self-serve); revocable join link / QR;
  verified email; new members get zero privileges
- **Medical / PII:** global to the person, permission-gated per community, consent acknowledgment at entry
- **Migration:** retrofit `community_id` in place on prod — DTTD becomes tenant #1. No Terraform IaC.

## Epic status

Epics are a true sequence: **0 and 1 must land before 2 touches the live schema.**

| Epic                                                                            | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0 — Security remediation** (hard gate before community #2)                    | **Implemented on `feat/security-remediation` (PR pending), 2026-09-27.** Eight units, 14 commits, five migrations; tests 447 → 478, build green; 151 → 88 server-action exports, all guarded; anon has no table grants. Independent re-audit: **not yet closed**. Open signup + open reads accepted by the owner as a known risk until an invite mechanism exists; public `files` bucket decision pending. See `docs/specs/19-spec-security-remediation/EPIC-0-REPORT.md`. |
| **1 — Infra foundation**                                                        | **Partial.** Double-build fixed (`vercel.json` + `deploy` job in `release.yml`). Still missing: PR CI gate (lint / typecheck / tests), E2E harness (Playwright PR #35 closed unmerged), preview env with its own DB (preview currently shares the prod database), backups, migration drift check, build-time cuts.                                                                                                                                                         |
| **2 — Tenancy retrofit**                                                        | **No code.** No `community_id` / tenant anywhere. Only trace: TODO on `COMMUNITY_NAME` in `lib/weekend/constants.ts`.                                                                                                                                                                                                                                                                                                                                                      |
| **3 — Onboarding**                                                              | **No code.**                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **4 — Payments platform** (Connect, webhook hardening, refunds, reconciliation) | **No code.**                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **5 — Perf / polish**                                                           | **In progress.** Loading-states Tier 1 shipped (`docs/specs/17-spec-loading-states`). Admin redesign phase 1 (`docs/specs/16-spec-admin-redesign-phase-1`) is 15 commits on `preview`, not yet merged to `main`.                                                                                                                                                                                                                                                           |

## Cross-cutting: audit log (added 2026-09-21)

Not in the original roadmap. Today there is no audit table, only scattered `updated_by` columns, and
pino logs go to Vercel only.

Decision (2026-09-21): auditability is tracked here as platform work and built later, not now. The
sample activity feed was removed from the admin dashboard until then.

**Phase 1 (~3–5 days).** Best sequenced after Epic 0, since widening `authorizedAction` coverage
widens audit coverage for free:

1. `audit_log` table — actor, impersonated-by, action, entity type/id, summary, metadata, plus a
   nullable `community_id` from day one so Epic 2 doesn't have to retrofit it. RLS on.
2. Log inside `authorizedAction` (`lib/actions/authorized-action.ts`) — one file, every wrapped action.
3. Explicit audit events in the 10–15 highest-value mutations: payments and voids, candidate status
   changes, role grants, file deletes, impersonation — including Stripe webhook / admin-client paths,
   which have no user JWT and need the actor passed explicitly.
4. Replace the sample activity feed with a real query; add an admin activity page.

**Deferred until after Epic 2:** generic row-change triggers. They would copy medical fields into a
less-guarded table (needs a per-table column allowlist first) and record no actor for service-role writes.

**Verify first:** impersonation swaps the user via cookie, not JWT — audit rows must record both the
real admin and the impersonated user.

**Related, shipped 2026-09-21:** `email_log` table + a single `sendEmail()` wrapper around all seven
Resend call sites. Emails were the only direct per-tenant cost with no tracking; this also feeds
usage-based billing.

## Upgrades

- **Landed:** Next 16.3.4 / React 19.2.8 (2026-09-01, `middleware.ts` → `proxy.ts`); Supabase CLI 2.116
- **Pending:** TanStack Query still v4; `cacheComponents: true` blocked on remaining loading-states tiers;
  Turbopack not used for the production build; `CLAUDE.md` still says Next 15.3.2

## Open "verify first" items from the roadmap

- Prod RLS vs. checked-in migrations (first task of Epic 0)
- Payments product analysis (refund + reporting model)
- Consent wording for global medical data
- How much custom-domain / CNAME verification to automate

## Next steps

1. Owner decision on H2 from the Epic 0 report (make the `files` bucket private and serve through
   signed URLs). C1 is accepted as a known risk (2026-09-27); an invite mechanism is planned later.
2. Run the 15 manual Gherkin scenarios listed in the report against a preview of the branch, and test
   the five new migrations against a copy of production.
3. Merge `feat/security-remediation` → `preview` → `main`; then mark Epic 0 complete here (task 8.5).
4. Start Epic 1 (preview database, PR CI gate running lint/typecheck/tests, E2E harness seeded from
   `docs/specs/19-spec-security-remediation/features/`).
