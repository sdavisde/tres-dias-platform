# Unit 3 evidence — `authorizedAction` extension, dead code and demotions

_2026-09-26, branch `feat/security-remediation`. Zero intended behavior change._

## Endpoint surface, before → after

|                                            | Before | After |
| ------------------------------------------ | ------ | ----- |
| `'use server'` files                       | 27     | 20    |
| Exported server actions (public endpoints) | 151    | 88    |

Every remaining export is either called from a `'use client'` component/hook or public by design.
Unit 4 gates them.

## Deleted (no callers)

`deleteCandidate`, `getHydratedCandidate`\*, `getAllCandidatesWithDetails`\* (`actions/candidates.ts`);
`updatePasswordWithToken`, `sendPasswordResetEmail` (`actions/password-reset.ts`; the profile page now
uses `sendCustomPasswordResetEmail`, which is identical); `getAllCandidates`, `getCandidateIdsByWeekend`
(`services/candidates/actions.ts`); `getEvents`, `getEvent`, `getUpcomingEventsForPeriod`
(`services/events/actions.ts`); `deleteUser` (`services/identity/user/actions.ts`); `getDraftRoster`
(`services/roster-builder/actions.ts`); `getWeekendRoster`, `getWeekendRosterRecord`
(`services/weekend/actions.ts`). Whole files: `actions/review-candidates.ts`, `actions/roster.ts`,
`services/contact-information/actions.ts`, `services/deposit/actions.ts` (service and repository files
kept; `services/deposit/index.ts` no longer re-exports actions).

\* moved, see below. The dead `notifyAssistantHeadForTeamPayment` import in
`app/(member)/payment/team-fee/success/page.tsx` is gone too.

## Demoted to `server-only` (endpoint removed, same function)

| Former action export                                                                                                                                                                                                                     | Now imported from                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `getActiveWeekends`, `getWeekendById`, `getRosterSpecialNeeds`, `getWeekendOptions`, `getActiveWeekendLeadershipTeam`, `getRosterCountByWeekend`, `getRosterWeekendIdsForUser`, `getRosterAssignmentForUser`, `getWeekendRosterViewData` | `@/services/weekend/weekend-service`                             |
| `getWeekendGroup`, `getAllWeekendGroups`, `getActiveGroupId`                                                                                                                                                                             | already served by `@/services/weekend/cached`                    |
| `getCandidateById`, `getCandidateCountByWeekend`, `getCandidateReviewCountByWeekend`, `getCandidateCountsByWeekends`, `getConfirmedCandidateCountByWeekend`, `getSponsoredCandidatesForWeekend`                                          | `@/services/candidates/candidate-service`                        |
| `getHydratedCandidate`, `getAllCandidatesWithDetails` (+ `CandidateFilterOptions`)                                                                                                                                                       | new `@/services/candidates/hydrated-candidates`                  |
| `getCommunityEncouragement`                                                                                                                                                                                                              | `@/services/community/community-service`                         |
| `getCommunityBoardData`                                                                                                                                                                                                                  | `@/services/community/board/actions` (file is now `server-only`) |
| `getUpcomingEvents`, `getEventsForWeekendGroup`, `getSecuelaDateForGroup`, `getCommunityEvents`                                                                                                                                          | `@/services/events/events-service`                               |
| `getGroupFees`, `getFeeDefaults`, `getTrackedGroupFees` → `getTrackedGroups`                                                                                                                                                             | `@/services/fees/fees-service`                                   |
| `getRoles`                                                                                                                                                                                                                               | `@/services/identity/roles/role-service`                         |
| `notifyCandidatePaymentReceivedAdmin`, `getPreWeekendCoupleEmail`, `notifyAssistantHeadForTeamPayment`, `sendCandidateFormsCompletedEmail`                                                                                               | `@/services/notifications/notification-service`                  |
| `getActiveWeekendFinancials`                                                                                                                                                                                                             | `@/services/payment/payment-service`                             |
| `getRosterBuilderCommunityData`                                                                                                                                                                                                          | `@/services/roster-builder/roster-builder-service`               |
| `getPrayerWheelUrls`, `getPrayerWheelUrlForGender`                                                                                                                                                                                       | already served by `@/services/settings/cached`                   |
| `getMasterRoster`, `getWeekendRosterExperienceDistribution`, `getCommunityDataForRosterBuilder`                                                                                                                                          | `@/services/master-roster` (file is now `server-only`)           |
| `getTeamFormsProgress`, `hasCompletedAllTeamForms` (+ `TeamFormsProgress` type)                                                                                                                                                          | `@/services/weekend-group-member/weekend-group-member-service`   |
| `getUserServiceHistory`                                                                                                                                                                                                                  | new `@/services/user-experience/user-experience-service`         |
| `getTeamTodoData`                                                                                                                                                                                                                        | `@/lib/weekend/team/todos.actions` (file is now `server-only`)   |

Caller-supplied identity removed (FR-3.8): `getWeekendRosterViewData(weekendId, weekend?)` and
`getTeamTodoData()` resolve the viewer from `getLoggedInUser()`; the todo loader returns `null` when
the viewer has no `teamMemberInfo`. `WeekendRosterView` keeps its `user` prop for UI flags;
`TeamMemberTodo` no longer takes one.

## Wrapper (FR-3.1–3.3)

`authorizedAction(guard, (user, ...args) => …)` now accepts `Permission | Permission[] |
'authenticated' | predicate` and passes positional arguments through. The 47 existing wrapped
actions were rewritten mechanically to `authorizedAction<[T], R>(perm, async (_user, data) => …)`;
no call site of a wrapped action changed. Ownership predicates live in `lib/actions/guards.ts`
(`ownsUser`, `ownsUserOrAdmin`, `ownsGroupMember`, async `ownsExperienceOrAdmin`, `canImpersonate`).

## Gates

```
npx tsc --noEmit      → clean
yarn lint             → 0 errors, 15 warnings (all pre-existing)
yarn test             → 45 suites, 459 tests passing (was 44 / 454; +5 from
                        lib/actions/authorized-action.test.ts, Unit 8 test 1)
yarn build            → ✓ Compiled successfully (27s wall)
```

Client/server boundary check (FR-3.9/3.10): for every `'use client'` file, resolve each `@/…`
import and flag any target whose first line is `import 'server-only'`:

```
$ for f in $(grep -rl "^'use client'" app components hooks lib services); do
    for m in $(grep -oE "from '@/[^']+'" "$f" | sed "s/from '@\///; s/'//"); do
      for c in "$m.ts" "$m.tsx" "$m/index.ts"; do
        [ -f "$c" ] && grep -q "^import 'server-only'" "$c" && echo "$f -> $c"; done; done; done
(no output)
```

Remaining `'use server'` files (export counts): actions/candidates 9, actions/checkout 1,
actions/email-change 1, actions/password-reset 1, actions/team-forms 6, actions/user-experience 2,
services/candidates 1, community 1, events 4, fees 4, files 7, identity/impersonation 2,
identity/roles 10, identity/user 6, notifications/actions 3, notifications/email-actions 3,
payment 9, roster-builder 5, settings 3, weekend 10.

## Not exercised

The browser walk-through in task 3.10 (hub tabs, review candidates, admin dashboard, weekends,
events, payments, roster builder, team forms, home dashboard) was not driven in this pass; the
production build and type-check are the evidence that every moved read resolves, and no function
body changed apart from the two identity lookups described above. PR opening is left to the
rollout step.
