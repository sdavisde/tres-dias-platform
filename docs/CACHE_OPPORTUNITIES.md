# Cache and latency opportunities

Status of the caching work that started with the September 2026 latency audit, and everything
that remains. The full audit, charts, design and measured results live in the
[DTTD Cache Blueprint](https://claude.ai/artifact/1x3T5EN3C76du8ddU3H8di).

## What shipped (v1.55.1, 2026-09-25)

| Layer                   | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Where                                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 · stop repeating work | Proxy skips `<Link>` prefetches, the Sentry tunnel and `/_vercel/*`; the member/admin shells hand their resolved user to the session context instead of a server action per navigation; impersonation dialog fetches on open; roster and candidate N+1 queries batched; admin weekends uses count queries; roster builder checks membership with one query; hub group resolution split from the viewer; weekends index links straight to the gendered overview | `proxy.ts`, `components/auth/session-provider.tsx`, `services/weekend/weekend-service.ts`, `actions/candidates.ts`, `app/(member)/weekends/[groupId]/hub-context.ts` |
| 1 · shared server cache | Weekend groups, active group, events, role graph, site settings and group fees are read once through the service-role client and shared across requests behind tags; the writing actions call `updateTag`                                                                                                                                                                                                                                                      | `lib/cache/cached-read.ts`, `lib/cache/tags.ts`, `services/*/cached.ts`                                                                                              |
| 2 · client reuse        | Hub tab links and the Men's/Women's switch prefetch in full on hover/focus/touch; `experimental.staleTimes.dynamic = 60` lets the router reuse a visited tab for a minute                                                                                                                                                                                                                                                                                      | `components/ui/intent-link.tsx`, `next.config.ts`                                                                                                                    |

Measured on a production build with a 40 ms simulated Supabase hop: Supabase calls across the
audit run 3,079 → 527, auth-server calls 1,221 → 129, Team tab 95 → 13 queries, admin weekends
183 → 22, tab revisits 350–700 ms → 40–80 ms with no server request.

The cache adapter (`lib/cache/cached-read.ts`) wraps `unstable_cache`. It is the one file to change
when moving to `'use cache: remote'` under Cache Components; readers, tags and invalidation stay.

### Rules that hold for every cached read

- Authorization runs before a cached read and again inside every server action. A cached reader
  never decides who may see data.
- Nothing per user and nothing medical goes in a shared cache. `user_medical_profiles`, `email_log`
  and `weekend_group_fee_changes` are the only tables whose row-level security filters by viewer.
- Cached readers use `createAdminClient()` (the cookie client calls `cookies()`, which is forbidden
  inside a cache scope), live in `server-only` modules, never in `'use server'` files, and take only
  low-cardinality ids as arguments (keys and tags are stored in plain text).
- Every write to a cached table invalidates its tag in the same action; route handlers use
  `revalidateTag(tag, 'max')` because `updateTag` is server-action only.

### Re-measuring

The Supabase clients and the proxy carry a dev-only call logger (`lib/supabase/audit-fetch.ts`)
that is inert unless `AUDIT_LOG=<file>` is set. `AUDIT_SIM_LATENCY_MS=40` adds a simulated hop.
Run a production build (`yarn build && AUDIT_LOG=... yarn start`), drive the app, then group the
JSONL by `reqId` to get per-navigation call counts, waterfalls and sequential depth.

## Remaining opportunities

Ordered within each group by expected payoff. Suggested overall order: security items first
(small and real), then proxy session verification and the phase-2 caches, then Cache Components
as its own project.

### Performance

1. **Phase-2 caches for data that changes during active use.** Candidates per weekend
   (`candidates:weekend:{id}`, projected without medical text), the assembled roster per weekend
   (`roster:weekend:{id}`, without medical profiles), payments and balances (`payments`), and the
   resolved user record keyed by id (`user:{id}`). Each needs `updateTag` in every writer listed
   in the data-flow map and `revalidateTag` in the Stripe webhook
   (`app/(public)/api/webhooks/stripe/route.ts`), which invalidates nothing today. Prerequisite:
   move the profile page's browser-side `users` update (`app/(member)/profile/page.tsx`) to a
   server action, or the cache can never see that write. `user:{id}` must also be invalidated by
   `user_roles`, `weekend_roster` and `weekend_group_members` writes, since they change permissions.
2. **Verify the session locally in the proxy.** `lib/supabase/middleware.ts` calls
   `auth.getUser()` on every request it matches: one auth-server round trip per page, RSC
   navigation and server action, and the slowest single call in the audit. `getClaims()` verifies
   the JWT against the project's public signing key with no network call. Trade-off: a server-side
   revocation is not noticed until the access token expires. This is a security-model decision.
3. **Replace the remaining `router.refresh()` calls with tag invalidation.** About 34 call sites;
   each re-renders both layouts' auth and DB work. Once the action they follow invalidates a tag,
   the refresh is redundant.
4. **Serial waterfalls.** `/home` awaits the prayer-wheel setting before rendering and awaits
   `UpcomingEvents` and `CommunityEncouragement` outside Suspense; the team-forms layout and page
   both read progress; the files layout and page both list the root folder; admin payments summary
   runs three serial rounds; the admin dashboard walks storage on every render
   (`lib/storage.ts`, a natural cache-with-`files`-tag candidate).
5. **`Server-Timing` header** carrying the query span, so regressions show in the browser's
   network panel without the audit harness.
6. **React's 300 ms Suspense reveal throttle.** On a first visit to a tab the skeleton stays until
   300 ms even when data arrives at 95 ms, because nothing else commits after the fallback. The
   old per-navigation session POST was masking this by accident. A small state update after the
   transition would defeat it; decide whether that is wanted.
7. **Delete the `/weekends/[groupId]` redirect page** once nothing links to it (cards now link to
   the gendered overview).

### Cache Components (Partial Prerendering)

Switching the flag on is small; benefiting from it is large. Every authenticated route's static
shell is currently the root spinner because the member, admin and hub layouts await the user at
the top.

8. **Switch on.** Add `unstable_rethrow` to the two `try/catch` blocks that swallow Next's
   prerender control-flow errors (`lib/actions/authorized-action.ts`,
   `app/api/files/download/route.ts`), set `cacheComponents: true`, run
   `npx @next/codemod@canary cache-components-instant-false ./app`, and QA the `<Activity>`
   behaviour: previously visited routes stay mounted but hidden, so check dialogs, popovers,
   roster-builder drag state and auto-save editors (hidden is not unmounted; pending saves must
   still flush).
9. **Benefit.** Restructure `app/(member)/layout.tsx`, `app/admin/layout.tsx` and the hub layout so
   the chrome renders without awaiting the user (Suspense islands, user promise via context);
   wrap the seven layout-level `usePathname` readers and the two `useSearchParams` hooks in
   Suspense; remove `instant = false` layout by layout; swap `lib/cache/cached-read.ts` to
   `'use cache: remote'` with `cacheLife` per reader; enable `partialPrefetching`. Roughly 70–80
   files. This is what makes prefetched App Shells and instant navigation real.

### Security (found during the audit, independent of speed)

10. **The hub Candidates tab has no permission check** (`app/(member)/weekends/[groupId]/[weekend]/(hub)/candidates/page.tsx`)
    and serializes full `HydratedCandidate` objects, including `candidate_info` medical fields,
    into the RSC payload for every viewer. Columns are hidden client-side only. Gate the page and
    project the rows before they reach a client component.
11. **Unguarded mutating server actions.** Events create/update/delete
    (`services/events/actions.ts`), all `users` updates and `deleteUser`
    (`services/identity/user/actions.ts`), roster-builder actions
    (`services/roster-builder/actions.ts`), team-form actions (`actions/team-forms.ts`),
    `recordManualPayment` and `recordManualCandidatePayment`, `createCandidateWithSponsorshipInfo`,
    `deleteCandidate`, `updateCandidatePaymentOwner`, `clearImpersonation`. Row-level security is
    `USING (true)` almost everywhere, so nothing enforces these on the server. Wrap them in
    `authorizedAction`.
12. **Anonymous reads.** `users`, `user_roles`, `roles`, `candidates`, `candidate_info` and
    `candidate_sponsorship_info` are SELECT-able with the publishable key and no session. Tighten
    the policies to `authenticated` where the public candidate form does not need them.
13. **Write during a GET render.** `/secuela-confirm` marks attendance while rendering; it must
    never be cached or prefetched. Consider moving the write to a server action triggered on the
    page.

### Housekeeping

14. `next dev` on Next 16.3 appends an agent-rules block to `CLAUDE.md`; set `agentRules: false`
    in `next.config.ts` if that is unwanted.
15. `experimental.staleTimes` is still marked experimental by Next; check release notes on upgrades.
16. `conventional-changelog-conventionalcommits` must stay on 9.x at the top level until
    `@semantic-release/commit-analyzer` and `release-notes-generator` move to
    conventional-changelog-writer 9; 10.x breaks the Release job's note generation.
17. Remove the spike worktrees and branches (`spike/cache-audit`, `spike/ppr-probe`).
