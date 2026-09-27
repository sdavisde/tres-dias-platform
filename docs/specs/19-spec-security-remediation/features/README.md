# Epic 0 regression suite (Gherkin)

Plain-Gherkin scenarios that describe what users can and cannot do after the security remediation in
`../19-spec-security-remediation.md`. They exist for two reasons:

1. **Regression list.** Each unit's manual check-off before merge walks the positive scenarios for the
   personas the unit touches. If a positive scenario fails, the remediation broke something users rely on.
2. **E2E seeds.** These are the intended first residents of the Epic 1 Playwright harness. Steps are
   declarative (no selectors), so they can be bound to page objects later without rewriting.

## Files

| File                                 | Area                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `anonymous-access.feature`           | Logged-out pages, candidate forms, candidate fee checkout, REST + actions |
| `authentication.feature`             | Sign-up, login, password rules, reset, redirect validation                |
| `member-self-service.feature`        | Profile, experience, team forms, secuela confirm, own fees, files         |
| `sponsorship-and-candidates.feature` | Sponsor form, review queue, PWC actions, candidate payments               |
| `roster-and-leadership.feature`      | Roster builder, CHA-derived permissions, team cash payments               |
| `admin-portal.feature`               | Admin pages by permission, events, weekends, settings, roles, files       |
| `impersonation.feature`              | Full Access impersonation and the signed cookie                           |
| `notifications.feature`              | Every email the flows send, including the two fixed by Unit 5             |
| `data-integrity.feature`             | REST-level RLS matrix (table × command × persona)                         |
| `personas.md`                        | Who each `Given I am signed in as …` step means                           |

## Tags

- Persona: `@anonymous`, `@member`, `@team-member`, `@rector`, `@asst-head`, `@pwc`, `@treasurer`,
  `@leaders`, `@admin`, `@full-access`
- Kind: `@regression` (legitimate behaviour that must keep working), `@security` (a closed door that
  must stay closed), `@api` (exercised against REST / a server action / a route handler rather than a
  page), `@fixed-bug` (behaviour that was broken before Epic 0 and now works)
- Unit: `@unit-1` … `@unit-8`, matching the spec unit that introduces or changes the behaviour
- Id: every scenario carries one stable id `@E0-<AREA>-<NNN>`. Areas: `ANON`, `AUTH`, `MEMBER`,
  `CAND`, `ROSTER`, `ADMIN`, `IMP`, `NOTIF`, `RLS`. Reference ids from PR descriptions, the evidence
  docs and future Playwright test titles; never renumber an id, retire it instead.

## Mapping to the spec

Each `Feature:` description names the FRs it covers, and scenario comments (`# FR-x.y`) point at the
requirement behind a step. When a spec FR changes, search these files for its number.

## Assumptions

Scenarios marked `# assumption:` describe behaviour the author could not confirm from code alone
(usually copy text or an exact redirect target). Verify those during the first manual pass and edit
the step rather than the implementation.

## Fixtures the E2E harness will need

- One weekend group in status ACTIVE with a Men's and Women's weekend, and one in PLANNING
- Users for every persona in `personas.md`, including a Rector whose only source of permissions is
  the roster row on the ACTIVE weekend
- One candidate in status `sponsored`/`awaiting_forms` with no `candidate_info` row, one in
  `pending_approval`, one `awaiting_payment`
- Stripe test mode with the CLI forwarding webhooks (`yarn stripe:listen`)
- A mailbox capture for Resend (or a stub) to assert the notifications feature
