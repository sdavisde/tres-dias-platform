# Platform / Multitenancy — Status Brief

_Status as of 2026-10-01._

## The plan

**Brand:** the platform is **Tres Dias Platform** (tresdiasplatform.org, bought 2026-09-28). "Dusty Trails
Tres Dias" is the first community on it, not the product name.

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

| Epic                                                                            | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0 — Security remediation** (hard gate before community #2)                    | **Complete, on `main` since 2026-09-28** (PR #42, release 1.56.0; five migrations applied to prod, nightly drift check green 2026-09-29). All workstreams done or decided: owner scope decisions 2026-09-26/27 keep open signup and open authenticated reads until the Epic 3 join link exists, keep the proxy skip list, no email confirmation / CAPTCHA / secure password change, `files` bucket stays public. Tests prove anon cannot reach privileged data (`supabase/rls.test.ts`, `lib/actions/authorized-action.test.ts`). Report: `docs/specs/19-spec-security-remediation/EPIC-0-REPORT.md`. |
| **1 — Infra foundation**                                                        | **Done except backups.** On `main`: double-build fix, phase-aware seed, nightly `drift.yml` schema check, `ci.yml` (lint / typecheck / tests / E2E) on every PR and gating every push to `main` through `release.yml` (not yet enforced as a required status check in branch protection). Build-time: `webpack` block removed; **decided 2026-09-29: keep Sentry `widenClientFileUpload`**. Hosted preview DB cut 2026-09-27. **Open: backups (upgrade to Supabase Pro before Epic 2).**                                                                                                              |
| **2 — Tenancy retrofit**                                                        | **Spec drafted 2026-10-01, no code.** `docs/specs/22-spec-tenancy-schema-retrofit` is the database half (`communities`, memberships, `community_id` everywhere, scoped permissions and cache keys) plus a `getCurrentCommunity()` stub that returns DTTD. Today's only traces: a nullable, FK-less `community_id` on `billing_account` and `email_log`, and a TODO on `COMMUNITY_NAME` in `lib/weekend/constants.ts`. Host resolution and the branding sweep are a separate unit; see [Domains and routing](#domains-and-routing-2026-10-01).                                                         |
| **3 — Onboarding**                                                              | **Designed, no code.** See [Epic 3 design](#epic-3-design-tenant-onboarding-2026-09-28) below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **4 — Payments platform** (Connect, webhook hardening, refunds, reconciliation) | **No code.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **5 — Perf / polish**                                                           | **In progress.** Loading-states Tier 1 shipped (`docs/specs/17-spec-loading-states`). Admin redesign phase 1 (`docs/specs/16-spec-admin-redesign-phase-1`) is 15 commits on `preview`, not yet merged to `main`.                                                                                                                                                                                                                                                                                                                                                                                      |

## Epic 3 design: tenant onboarding (2026-09-28)

**Source of truth:** [Tenant Onboarding Design](https://claude.ai/artifact/Pcjp5oXkfA2mqk3VqnkSKd) — a
design canvas with eight boards: a setup inventory (every community-specific value in the code, tagged by
who supplies it), the end-to-end flow, the five wizard screens, and the community lifecycle. Produced in a
design interview on 2026-09-28. Read it before any work on community provisioning, the operator area,
platform billing access rules, or feature gating. Not yet a spec under `docs/specs/`.

**Inventory.** About 90 values are community-specific today (name and short code, contact emails, venue in
the waiver text, timezone in seven files, Stripe keys, sending address, role seed, fee defaults, prayer
wheel URLs, the operator's personal phone on the team-fee page). Only 11 need a human answer in the wizard;
the rest are seeded from a template, defaulted for later Settings, platform-wide, or derived from the
community record. Note: weekend references are persisted as the literal string `DTTD#11`, so the short
code is effectively immutable until Epic 2 stores them structurally.

**Decisions (settled, do not re-ask):**

- **Platform identity:** the platform brand is **Tres Dias Platform** at **tresdiasplatform.org**
  (domain purchased 2026-09-28). Dusty Trails Tres Dias is one community on it, tenant #1, and keeps
  dustytrailstresdias.org as its custom domain. Communities get `<code>.tresdiasplatform.org`; the shared
  sender is `noreply@tresdiasplatform.org`. Platform name and domain are still config values, never
  literals.
- **Wizard:** operator-only, four steps plus review. Community (name, short code, tagline, timezone) →
  Address and email (subdomain from the code, public contact email; sender is `<Name> <noreply@platform>`)
  → People (first admin, Pre-Weekend Couple inbox) → Weekends and fees (next weekend number, weekend fee,
  online surcharge). Billing, Stripe Connect, legal text and the first weekend group are **not** in the
  wizard. Nothing is written until Create; provisioning is one transaction.
- **Operator access:** the wizard adds the operator as a member through a seeded **Platform Support** role
  with Full Access permissions, excluded from the board, rosters, counts and fees, badged on the people
  page, not grantable or removable by the community.
- **Feature gates:** team forms are admin-configured after creation (venue, camp waiver, Statement of
  Belief, Commitment Form) and stay dark until done. Also gated: online payments until Stripe Connect,
  the candidate-forms email until the camp waiver exists, the prayer wheel action until both URLs are set.
  The public landing page is live from day one with generic content.
- **Stripe Connect:** a post-create checklist item only (Epic 4); the treasurer gets the link from
  Settings.
- **Access before payment:** new communities get a 30-day trial (operator-adjustable) with a banner, then
  become read-only until the subscription is paid; the webhook reactivates them. The operator can mark a
  community complimentary. DTTD stays banner-only per spec 21.
- **History:** optional CSV master-roster import as a Settings task. Past groups are created FINISHED;
  imported people are matched to accounts by email when they join.
- **Custom domain:** self-serve for the web domain through the Vercel API (records shown, verification
  polled, auth redirects derived from the host list). A custom sending domain stays operator-assisted.
- **Lifecycle:** trial → active → suspended (read-only, export available) → archived (hidden, retained) →
  purged after 90 days (operator-run, medical data first). Non-payment never auto-suspends an active
  community.

**Stated assumptions:** admin invited by a sign-in-link email, existing accounts get a membership instead
of a new account; join link and QR generated at create with the approval gate off; DTTD retrofitted as
tenant #1 with its checklist already complete.

**Supersedes:** the roadmap artifact's Epic 3 line about kicking off the Stripe Connect link from the
wizard.

## Domains and routing (2026-10-01)

How tresdiasplatform.org is used and how the frontend gets ready for host-based tenancy. This is the
unit spec 22 lists under Non-Goals (host resolution, `getUrl`, the branding sweep); it builds on spec 22's
`communities` table and `getCurrentCommunity()` stub and can be specced in parallel. Based on a codebase
sweep on 2026-09-28.

**Hosts.**

| Host                                          | Serves                                                         |
| --------------------------------------------- | -------------------------------------------------------------- |
| `tresdiasplatform.org` (and `www`)            | Platform landing page, operator area, **all webhooks**         |
| `<code>.tresdiasplatform.org`                 | A community (the default host; `dttd.` for tenant #1)          |
| Custom domain, e.g. `dustytrailstresdias.org` | The same community, via CNAME (self-serve, Epic 3)             |
| `<code>.localhost:3000`                       | Local dev; Chrome resolves `*.localhost` without a hosts entry |

**Webhooks live on the platform apex.** Stripe sends an account's events to one endpoint URL and does not
care about the host, so a single endpoint already serves every tenant. It still moves to the apex because
it belongs to the platform (not to DTTD's custom domain) and because webhook requests must never be
scoped to a tenant by host. `proxy.ts` already skips `/api/*`; keep it that way. What makes a webhook
multi-tenant is the **payload → community mapping**, not the URL:

- Platform billing (`/api/webhooks/platform-billing`): `locateBillingAccount` resolves by metadata,
  subscription id or customer id, then falls back to the single oldest `billing_account` row. That
  fallback only works with one tenant. `billing_account.community_id` must become a real FK.
- Fees (`/api/webhooks/stripe`): today one community Stripe account and no tenant concept. After Stripe
  Connect (Epic 4) events carry the connected account id, which must map to a community.

**What the sweep found (2026-09-28).**

- Every absolute URL comes from `SITE_URL` through `getUrl()` in `lib/url.ts`. Nothing reads the request
  host. One seam to replace. Callers: fee checkout return URLs, platform billing success / cancel /
  portal URLs, password-reset and email-change redirects, all email links, the join link.
- No host or subdomain logic in `proxy.ts`, `lib/supabase/middleware.ts` or `next.config.ts`.
- `dustytrailstresdias.org` is a literal in `supabase/config.toml` (remote `site_url`, redirect URLs,
  SMTP sender), the default sender in `services/settings/site-settings.ts` plus its verified-domain
  validator, seven `mailto:` links, and docs.
- "Dusty Trails Tres Dias" / "DTTD" is hardcoded in three layout titles, `app/manifest.json`, both
  sidebars, the footer, every email template header and footer, the waiver text, and local-storage and
  cookie keys. Weekend references are persisted as the literal `DTTD#11`.
- Supabase prod auth lists only the apex domain in `additional_redirect_urls`: no `www`, no wildcard.
- `vercel.json` has no domains, rewrites or redirects; the deploy job sets no alias.

**Plan (frontend first, in order).**

1. **Platform config module.** `PLATFORM_NAME` and `NEXT_PUBLIC_PLATFORM_DOMAIN` env vars behind one
   module. Move the sender default to `noreply@<platform domain>`; the validator accepts the platform
   domain or the community's verified sending domain.
2. **Host resolver.** A pure function classifying a host as platform apex, platform subdomain, custom
   domain or localhost. Unit-tested with no database. It becomes the body of spec 22's
   `getCurrentCommunity()` in `lib/communities/current.ts`, reading the `Host` header directly: it must
   not rely on a header set by `proxy.ts`, because the proxy skips `/candidate/*`,
   `/payment/candidate-fee` and `/api/*`. The proxy only uses it to send apex-host requests to the
   platform route group (step 4).
3. **Replace the URL helper.** The base URL derives from the resolved community's canonical host;
   `SITE_URL` stays only as the local / CI fallback.
4. **Route groups.** Tenant-facing routes stay where they are. Add `app/(platform)/` for the landing page
   and operator area; the proxy rewrites apex-host requests to that group's internal prefix so URLs stay
   clean on both hosts.
5. **Brand seam.** Titles, sidebar logo tiles, footer, email headers and footers read the current
   community's name; the apex host shows the platform name.

**Schema dependency.** Spec 22 FR-1 and FR-9 supply what the resolver needs: `communities` with `slug`
(the subdomain label), `code`, `display_name`, `status` and the seeded DTTD row, and
`billing_account.community_id` as a NOT NULL FK with the platform webhook resolving the row by Stripe
customer id. **Gap to add to spec 22 or to this unit:** `communities.custom_domain text UNIQUE`
(nullable) so a custom host can be looked up; DTTD's row gets `dustytrailstresdias.org`. Steps 1 and 2
can start before spec 22 lands by resolving against the DTTD constants and swapping to the table later.

**Setup outside the code (owner).**

- Vercel: add the apex and the wildcard `*.tresdiasplatform.org` to the project. A wildcard requires the
  domain's nameservers on Vercel.
- Resend: verify `tresdiasplatform.org` (DKIM, SPF) before switching the sender.
- Supabase: remote auth `site_url` → the platform; add redirect URLs for the wildcard subdomain and each
  custom domain. `release.yml` pushes `config.toml` to prod on every merge, so change it in the same PR
  as the code.
- Stripe: re-point the platform billing webhook to `https://tresdiasplatform.org/api/webhooks/platform-billing`
  and rotate `PLATFORM_STRIPE_WEBHOOK_SECRET`. The fee webhook moves when Connect lands.

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

1. Make `ci.yml` a required status check on `main`; upgrade Supabase to Pro for daily backups before any
   Epic 2 migration.
2. Create the live platform Stripe account and set `PLATFORM_STRIPE_*` (see `docs/platform-billing.md`).
3. Start Epic 2: spec the in-place `community_id` retrofit, tested against a prod copy first. Epic 3 follows
   from the onboarding design canvas above.
4. Domain groundwork per [Domains and routing](#domains-and-routing-2026-10-01): owner attaches
   tresdiasplatform.org to Vercel, Resend and Supabase auth; code starts with the platform config module
   and the host resolver, then the `getUrl` replacement and the branding sweep.
