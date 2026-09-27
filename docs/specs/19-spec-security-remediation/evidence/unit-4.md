# Unit 4 evidence — gate the remaining client-called actions

_2026-09-27, branch `feat/security-remediation`._

Every one of the 88 exported server actions left after Unit 3 now checks the caller against the
session. Guards mirror the UI check on the page or button that calls the action, so no legitimate
user loses access.

## Coverage

| Guard kind                                     | Count  |
| ---------------------------------------------- | ------ |
| `authorizedAction` with a permission (or list) | 62     |
| `authorizedAction` with an ownership predicate | 13     |
| `authorizedAction` `'authenticated'`           | 6      |
| Public by design, `// publicAction:` marker    | 3      |
| Self-guarded (session check inside)            | 4      |
| **Total**                                      | **88** |

The 62 permission-guarded actions are the 47 that were already wrapped before this unit plus the 15
added here; the 13 ownership guards, 6 `'authenticated'` guards and the markers are new.

## Export → guard table

Guard column: `P:` permission (any one of a list passes; `FULL_ACCESS` always passes), `O:` ownership
predicate from `lib/actions/guards.ts`, `A` = any signed-in member, `PUBLIC` = bare with marker,
`SELF` = checks the session itself.

### `actions/candidates.ts`

| Export                               | Guard               | Mirrors                                             |
| ------------------------------------ | ------------------- | --------------------------------------------------- |
| `createCandidateWithSponsorshipInfo` | A                   | Sponsor form is on the member site (login required) |
| `updateCandidateStatus`              | P: WRITE_CANDIDATES | review page `canEdit`                               |
| `addCandidateInfo`                   | PUBLIC              | candidate forms link (Unit 5 hardens)               |
| `updateCandidatePaymentOwner`        | P: WRITE_CANDIDATES | review page `canEdit` (Open Question default)       |
| `updateCandidateSponsorshipField`    | P: WRITE_CANDIDATES | review page `canEdit`                               |
| `updateCandidateInfoField`           | P: WRITE_CANDIDATES | review page `canEdit`                               |
| `updateCandidateStatusField`         | P: WRITE_CANDIDATES | review page `canEdit`                               |
| `getMoveWeekendOptions`              | P: WRITE_CANDIDATES | "Move" menu item behind `canEdit`                   |
| `moveCandidateToWeekend`             | P: WRITE_CANDIDATES | same                                                |

### `actions/checkout.ts`, `actions/email-change.ts`, `actions/password-reset.ts`

| Export                         | Guard  | Mirrors                                                        |
| ------------------------------ | ------ | -------------------------------------------------------------- |
| `beginCheckout`                | PUBLIC | candidate checkout is logged out; team branch checks ownership |
| `requestEmailChange`           | SELF   | session + current-password re-check                            |
| `sendCustomPasswordResetEmail` | PUBLIC | `/forgot-password`                                             |

### `actions/team-forms.ts`

| Export                    | Guard                | Mirrors                                  |
| ------------------------- | -------------------- | ---------------------------------------- |
| `signStatementOfBelief`   | O: `ownsGroupMember` | team-forms layout (own `teamMemberInfo`) |
| `signCommitmentForm`      | O: `ownsGroupMember` | same                                     |
| `submitReleaseOfClaim`    | O: `ownsGroupMember` | same; closes the special-needs overwrite |
| `signCampWaiver`          | O: `ownsGroupMember` | same                                     |
| `completeInfoSheet`       | O: `ownsGroupMember` | same                                     |
| `updateRosterMedicalInfo` | O: `ownsUser`        | info sheet passes the member's own id    |

### `actions/user-experience.ts`

| Export                 | Guard                      | Mirrors                                      |
| ---------------------- | -------------------------- | -------------------------------------------- |
| `upsertUserExperience` | O: `ownsUserOrAdmin`       | own team info form; admin people editor      |
| `deleteUserExperience` | O: `ownsExperienceOrAdmin` | same; the row owner is looked up server-side |

### `services/candidates/actions.ts`, `services/weekend/actions.ts`

| Export                         | Guard                                         | Mirrors                                          |
| ------------------------------ | --------------------------------------------- | ------------------------------------------------ |
| `recordManualCandidatePayment` | P: READ_WRITE_TEAM_PAYMENTS or WRITE_PAYMENTS | review page `canEditPayments`                    |
| `getAllUsers`                  | O: `canImpersonate`                           | impersonation dialog (works while impersonating) |
| `recordManualPayment`          | P: READ_WRITE_TEAM_PAYMENTS or WRITE_PAYMENTS | hub team tab "+ Payment"                         |
| `getWeekendGroupsByStatus`     | P: READ_WEEKENDS                              | (pre-existing)                                   |
| `setActiveWeekendGroup`        | P: WRITE_WEEKENDS                             | (pre-existing)                                   |
| `createWeekendGroup`           | P: WRITE_WEEKENDS                             | (pre-existing)                                   |
| `updateWeekendGroup`           | P: WRITE_WEEKENDS                             | (pre-existing)                                   |
| `deleteWeekendGroup`           | P: WRITE_WEEKENDS                             | (pre-existing)                                   |
| `saveWeekendGroupFromSidebar`  | P: WRITE_WEEKENDS                             | (pre-existing)                                   |
| `addUserToWeekendRoster`       | P: WRITE_TEAM_ROSTER                          | (pre-existing)                                   |
| `updateWeekendRosterMember`    | P: WRITE_TEAM_ROSTER                          | (pre-existing)                                   |

### `services/roster-builder/actions.ts`

| Export                        | Guard                | Mirrors                                               |
| ----------------------------- | -------------------- | ----------------------------------------------------- |
| `addDraftRosterMember`        | P: WRITE_TEAM_ROSTER | roster builder page; `createdBy` now the session user |
| `removeDraftRosterMember`     | P: WRITE_TEAM_ROSTER | same                                                  |
| `finalizeDraftRosterMember`   | P: WRITE_TEAM_ROSTER | same                                                  |
| `dropFinalizedRosterMember`   | P: WRITE_TEAM_ROSTER | same                                                  |
| `removeFinalizedRosterMember` | P: WRITE_TEAM_ROSTER | same                                                  |

Compatibility: both holders of `READ_TEAM_ROSTER_BUILDER` (Rector via CHA, Leaders Committee) also
hold `WRITE_TEAM_ROSTER` (see `prod-verification-2026-09-26.md`).

### `services/events/actions.ts`

| Export          | Guard           | Mirrors                     |
| --------------- | --------------- | --------------------------- |
| `getPastEvents` | A               | admin events page (READ)    |
| `createEvent`   | P: WRITE_EVENTS | admin events page `canEdit` |
| `updateEvent`   | P: WRITE_EVENTS | same                        |
| `deleteEvent`   | P: WRITE_EVENTS | same                        |

### `services/files/actions.ts`

| Export                             | Guard           | Mirrors                  |
| ---------------------------------- | --------------- | ------------------------ |
| `getFilePublicUrlAction`           | A               | member/admin files pages |
| `getFileDownloadUrlAction`         | A               | same                     |
| `createUploadUrlAction`            | P: FILES_UPLOAD | (pre-existing)           |
| `saveMeetingMinutesLocationAction` | P: FILES_UPLOAD | (pre-existing)           |
| `createFolderAction`               | P: FILES_UPLOAD | (pre-existing)           |
| `deleteFileAction`                 | P: FILES_DELETE | (pre-existing)           |
| `deleteFolderAction`               | P: FILES_DELETE | (pre-existing)           |

### `services/identity/impersonation/actions.ts`, `services/identity/user/actions.ts`

| Export                   | Guard                | Mirrors                                                   |
| ------------------------ | -------------------- | --------------------------------------------------------- |
| `impersonateUser`        | SELF                 | FULL_ACCESS on session or `originalUser`                  |
| `clearImpersonation`     | A                    | must not require FULL_ACCESS while impersonating (FR-4.9) |
| `updateUserContactInfo`  | P: FULL_ACCESS       | admin people editor                                       |
| `updateUserAddress`      | O: `ownsUserOrAdmin` | own info sheet; admin people editor                       |
| `updateUserBasicInfo`    | O: `ownsUserOrAdmin` | same                                                      |
| `updateUserProfilePhoto` | O: `ownsUser`        | own profile page / sign-up                                |
| `removeUserProfilePhoto` | O: `ownsUser`        | own profile page                                          |
| `getLoggedInUser`        | SELF                 | returns only the caller's own (or impersonated) user      |

### `services/notifications/email-actions.ts`, `services/notifications/actions.ts`

| Export                             | Guard                | Mirrors               |
| ---------------------------------- | -------------------- | --------------------- |
| `sendSponsorshipNotificationEmail` | A                    | sponsor form          |
| `sendCandidateForms`               | P: WRITE_CANDIDATES  | review page `canEdit` |
| `sendPaymentRequestEmail`          | P: WRITE_CANDIDATES  | review page Approve   |
| `getContactInformation`            | P: READ_ADMIN_PORTAL | (pre-existing)        |
| `getEmailsSentThisMonth`           | P: FULL_ACCESS       | (pre-existing)        |
| `updateContactInformation`         | P: WRITE_USER_ROLES  | (pre-existing)        |

### `services/payment/actions.ts`

| Export                          | Guard             | Mirrors                       |
| ------------------------------- | ----------------- | ----------------------------- |
| `getMyTeamFeeStatus`            | SELF              | owner check on the fee target |
| `getAllPayments`                | P: READ_PAYMENTS  | (pre-existing)                |
| `getAllPaymentsIncludingVoided` | P: READ_PAYMENTS  | (pre-existing)                |
| `getPaymentTargetOptions`       | P: WRITE_PAYMENTS | (pre-existing)                |
| `reassignPayment`               | P: WRITE_PAYMENTS | (pre-existing)                |
| `voidPayment`                   | P: WRITE_PAYMENTS | (pre-existing)                |
| `updatePaymentDetails`          | P: WRITE_PAYMENTS | (pre-existing)                |
| `recordAdminPayment`            | P: WRITE_PAYMENTS | (pre-existing)                |
| `getFeeBalances`                | P: READ_PAYMENTS  | (pre-existing)                |

### `services/identity/roles/actions.ts`

| Export                        | Guard               |
| ----------------------------- | ------------------- |
| `getRoleUsage`                | P: READ_USER_ROLES  |
| `getFullAccessImpact`         | P: READ_USER_ROLES  |
| `getRoleEffectivePermissions` | P: READ_USER_ROLES  |
| `updateRole`                  | P: WRITE_USER_ROLES |
| `deleteRole`                  | P: WRITE_USER_ROLES |
| `createRole`                  | P: WRITE_USER_ROLES |
| `duplicateRole`               | P: WRITE_USER_ROLES |
| `updateUserRoles`             | P: WRITE_USER_ROLES |
| `removeAllUserRoles`          | P: WRITE_USER_ROLES |
| `setRoleMembers`              | P: WRITE_USER_ROLES |

### `services/settings/actions.ts`, `services/fees/actions.ts`, `services/community/actions.ts`

| Export                         | Guard                            |
| ------------------------------ | -------------------------------- |
| `updateSetting`                | P: WRITE_SETTINGS                |
| `updateSystemEmailAddress`     | P: WRITE_SETTINGS                |
| `setNotificationToggle`        | P: WRITE_SETTINGS                |
| `updateFeeDefaults`            | P: MANAGE_FEES                   |
| `updateGroupFees`              | P: MANAGE_FEES                   |
| `previewGroupFeeChange`        | P: MANAGE_FEES                   |
| `getGroupFeeHistory`           | P: READ_PAYMENTS                 |
| `updateCommunityEncouragement` | P: WRITE_COMMUNITY_ENCOURAGEMENT |

## Other changes in this unit

- `services/identity/user/session.ts` (new, `server-only`): `getLoggedInUser` lives here so
  `authorizedAction` no longer imports the `'use server'` module it wraps. The action export of the
  same name delegates to it.
- `addDraftRosterMember` lost its `createdBy` parameter; the draft row is attributed to the session
  user. `RosterBuilderBoard` lost the `rectorUserId` prop and `renderBoard` its `userId` argument.
- Deleted comments: "Public - no auth per user request" (×2), "relies on RLS for authorization" (×3),
  "Access control enforced at page level", "Don't really care to protect this function".
- `services/identity/user/actions.test.ts` (spec test 3) now asserts `updateUserProfilePhoto` is
  rejected with no session and for a different user, and succeeds for the owner.

## Gates

| Gate               | Result                                              |
| ------------------ | --------------------------------------------------- |
| `npx tsc --noEmit` | clean                                               |
| `yarn lint`        | 0 errors, 15 warnings (all pre-existing)            |
| `yarn test`        | 45 suites, 461 tests passing (459 before; +2 cases) |
| `yarn build`       | compiled successfully, 26 s                         |

## Not exercised

The browser walk-throughs in task 4.11 (no-role member console calls; Rector-by-CHA roster build and
team cash payment; impersonate → switch → clear) were not driven in this pass. The guards are the same
`authorizedAction` path proven by `lib/actions/authorized-action.test.ts`, and every permission chosen
matches the button gate on the calling page, so the remaining risk is a wrong guard choice, which the
table above makes reviewable. These scenarios are in the Gherkin suite (`features/`) for the manual
pass.
