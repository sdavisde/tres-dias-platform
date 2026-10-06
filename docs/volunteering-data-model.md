# Volunteering Data Model

This document explains the mental model for how volunteer (team member) data is structured and saved in DTTD.

## Core Concept: Two Scopes of Data

Volunteer data lives at two distinct scopes. Understanding the boundary between them is the key to working with this system correctly.

### Group-Level (shared across a full weekend group)

A **weekend group** represents one DTTD number — e.g., "DTTD #11". It contains both a Men's weekend and a Women's weekend. Data at this scope is created and paid for **once**, regardless of whether a volunteer serves on one or both weekends.

| Data             | Table                   | Notes                                                   |
| ---------------- | ----------------------- | ------------------------------------------------------- |
| Group membership | `weekend_group_members` | One row per (group, user) pair — the hub                |
| Team forms       | `team_form_completions` | All 5 forms completed once per group                    |
| Team fee payment | `payment_transaction`   | `target_type = 'weekend_group_member'`                  |
| Medical info     | `user_medical_profiles` | Keyed by `user_id`, shared globally across all weekends |

Secuela sign-ins also live on the group membership: `weekend_group_members.attended_secuela_at` holds
when the member confirmed through `/secuela-signin` (null = never). Whether that counts as attending or
as wanting to serve is derived from the group's secuela event — see "Secuela" in
[`docs/domain.md`](domain.md).

### Weekend-Level (specific to one MENS or WOMENS weekend)

Each `weekend_roster` row represents a volunteer's assignment to one specific weekend. A volunteer serving on both Men's and Women's weekends in the same group will have **two** roster rows.

| Data                | Table/Column                         | Notes                                                           |
| ------------------- | ------------------------------------ | --------------------------------------------------------------- |
| CHA role            | `weekend_roster.cha_role`            | May differ between Men's and Women's                            |
| Rollo               | `weekend_roster.rollo`               | Only for applicable roles                                       |
| Additional CHA role | `weekend_roster.additional_cha_role` | Optional secondary role                                         |
| Special needs       | `weekend_roster.special_needs`       | Set the same across all roster rows in the group when submitted |
| Roster status       | `weekend_roster.status`              | `awaiting_payment`, `paid`, `drop` — admin-managed              |

## Database Schema

```
weekend_groups
  └── id, number (e.g. 11)

weekends
  └── id, type (MENS|WOMENS), status (ACTIVE|PLANNING|FINISHED), group_id → weekend_groups

weekend_group_members          ← the hub
  └── id, group_id → weekend_groups, user_id → users, attended_secuela_at

team_form_completions
  └── weekend_group_member_id → weekend_group_members, form_type, completed_at

payment_transaction
  └── target_type = 'weekend_group_member', target_id = weekend_group_members.id

user_medical_profiles
  └── user_id → users, emergency_contact_name, emergency_contact_phone, medical_conditions

weekend_roster                 ← one per (user, weekend)
  └── id, weekend_id → weekends, user_id → users, cha_role, rollo, additional_cha_role,
      special_needs, status
```

## TypeScript Representation

When a user is loaded, `teamMemberInfo` is derived from the above tables via a single joined query. `null` means the user is not on the active weekend group roster.

```typescript
type TeamMemberInfo = {
  groupMemberId: string // weekend_group_members.id
  groupId: string // weekend_groups.id
  groupNumber: number | null // weekend_groups.number (e.g. 11)
  weekendAssignments: WeekendAssignment[]
}

type WeekendAssignment = {
  rosterId: string // weekend_roster.id
  weekendId: string | null // weekend_roster.weekend_id
  weekendType: string | null // 'MENS' | 'WOMENS'
  chaRole: string | null // weekend_roster.cha_role
  rollo: string | null // weekend_roster.rollo
  additionalChaRole: string | null
}
```

### Invariants

- `weekendAssignments` only contains **active** assignments. Roster rows with `status = 'drop'` are filtered out at normalization time — they only appear in the admin roster view.
- If all of a user's roster rows in a group are dropped, `teamMemberInfo` will be `null` (the user is not considered a team member).
- A volunteer serving on both Men's and Women's weekends will have `weekendAssignments.length === 2`.

## Common Patterns

### Checking if a user is a team member

```typescript
if (!isNil(user.teamMemberInfo)) {
  // user is on the active weekend roster
}
```

### Accessing group-level data (forms, payment)

```typescript
const { groupMemberId } = user.teamMemberInfo
await hasCompletedAllTeamForms(groupMemberId)
await hasTeamPayment(groupMemberId)
```

### Accessing weekend-specific data

```typescript
const { weekendAssignments } = user.teamMemberInfo

// Single-weekend volunteer: weekendAssignments.length === 1
// Multi-weekend volunteer: weekendAssignments.length === 2

// Getting all roles (for display or permission logic)
const roles = weekendAssignments.map((a) => a.chaRole)
```

### Display helpers (for forms and UI)

```typescript
import { formatTeamMemberTitle, formatTeamMemberRole } from '@/lib/weekend'

// "Mens DTTD #11" (single) or "DTTD #11" (multi-weekend)
const title = formatTeamMemberTitle(user.teamMemberInfo)

// "Table Leader" (single/same role) or "Table Leader (Mens) and Rector (Womens)"
const role = formatTeamMemberRole(user.teamMemberInfo)
```

## Permissions

A user's permissions are computed as the union of:

1. All permissions granted by their assigned `roles` (from `user_roles`)
2. All permissions granted by their CHA role on **each** of their `weekendAssignments`

This means a multi-weekend volunteer with different roles on each weekend receives the union of permissions from all their roles.

## What `weekend_roster.status` Means

`status` on `weekend_roster` is an admin-managed field with three values:

| Value              | Meaning                                               |
| ------------------ | ----------------------------------------------------- |
| `awaiting_payment` | Volunteer is confirmed but hasn't paid the team fee   |
| `paid`             | Team fee has been paid (may be set manually by admin) |
| `drop`             | Volunteer has been removed from this weekend          |

> **Note:** The team fee payment source of truth is `payment_transaction` (with `target_type = 'weekend_group_member'`). The `paid` status on `weekend_roster` may be used by admins for tracking but is not the authoritative record.

`drop` rows are filtered out of `TeamMemberInfo.weekendAssignments` and are only visible in the admin weekend roster view.
