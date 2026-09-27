# Local seed data

Generates a production-shaped local world, positioned at a chosen point in the six-month weekend
cycle **relative to today**, so the data never goes stale.

```sh
bun run seed                              # pre-weekend (default)
bun run seed weekend
bun run seed post-weekend
bun run seed weekend --date 2027-01-15    # pretend today is another date
bun run seed --dry-run                    # apply in a transaction, then roll back
bun run seed --print > out.sql
bun run seed weekend --yes                # skip the confirmation prompt
bun run db:reset                          # migrations + roles (supabase/seed.sql) + `bun run seed`
```

Each run asks for confirmation first (not `--print` or `--dry-run`; `--yes` skips it, and non-interactive
runs require it). Reseeding wipes all app data **and every auth user** in the local database (roles and site settings are
kept), then rebuilds everything in one transaction. It only talks to the local `supabase_db_<project_id>`
container. Every account's password is `password`.

## Phases

Each phase is a fresh snapshot of one moment in the cycle, not a step applied on top of your current data.
Switching phases replaces anything you created by hand.

### `pre-weekend` (default): the team is getting ready

**Use it to test** anything a team member or the PWC does in the months before a weekend: paying a team
fee, filling in team forms, sponsoring and reviewing candidates, recording candidate payments, and the
roster, meetings and calendar views. It's also the baseline for E2E tests (see below).

**What's there:** #45's men's weekend is ~60 days out. The secuela and 2 team meetings are done, 2 are
upcoming. About 70% of the team has paid and most forms are done. Candidates are in every status, from
sponsored to confirmed. You have an unpaid fee and forms left.

### `weekend`: the weekends are happening

**Use it to test** what people see while the weekends run: the men's weekend is underway or just
finished and the women's is next week. Covers the hub and calendar at weekend time, the last few unpaid
team fees, and candidate lists that are down to confirmed or rejected.

**What's there:** the men's weekend started this week; the women's starts in under a week. Nearly the whole
team has paid and finished their forms. Candidates are confirmed, except a few rejected.

### `post-weekend`: close out and start the next group

**Use it to test** the end-of-cycle admin work: closing out #45 (activating #46 marks #45 `FINISHED` and
writes everyone's service history), then setting up #46 by scheduling its secuela and meetings and building
its roster.

**What's there:** both #45 weekends ended at least a day ago, but #45 is still `ACTIVE` because nobody has
closed it out. #46 exists in `PLANNING` with fees set and nothing else (no secuela, meetings, roster or
candidates). Everything on #45 is paid.

### In every phase

#43 and #44 are `FINISHED`, with full rosters, the `users_experience` rows that
closing them out would have written, and their confirmed candidates now community members who serve
on later teams. #43 has no fees, like pre-fee-tracking groups in production.

## You

`sdavisde@gmail.com` has Full Access and is on the team: Dining on #43, Palanca on #44, **Table Leader
(Study rollo) on #45**. In `pre-weekend` your team fee is unpaid and 2 of 5 forms are done; you also
sponsor two #45 candidates. `nick44fierro@gmail.com` is also Full Access.

## E2E fixtures

E2E tests run against `bun run seed pre-weekend --yes`. These people are in a fixed state there, set in
`PINNED_PRE_WEEKEND` / `NEVER_ROSTERED_ID` in `world.ts` and not by chance, and `world.test.ts` checks this
table. All passwords are `password`.

| Invariant                                     | Who                                                                                                      |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| One ACTIVE group, all fees set                | #45: team $200, candidate $200, $10 online surcharge                                                     |
| Team member: no forms, no payments            | `david.cox@example.com`: men's Head Dorm                                                                 |
| Team-fee scenario: forms done, fee unpaid     | `david.harris@example.com`: men's Head Palanca                                                           |
| Team-forms scenario: no forms, fee unpaid     | `helen.kelly@example.com`: women's Head Table                                                            |
| Candidate awaiting payment, nothing paid      | Luke Thompson (`luke.thompson@example.com`): men's #45                                                   |
| Candidate awaiting payment, partially paid    | Timothy Martinez (`timothy.martinez@example.com`): men's #45, $100 of $200 paid                          |
| Member on no roster, no roles (negative case) | `steven.kim@example.com`                                                                                 |
| Admin (Full Access, also a team member)       | `sdavisde@gmail.com`: men's Table Leader, 2/5 forms, fee unpaid; avoid for flows that need a clean slate |

Every auth user is email-confirmed. Candidates aren't users; reach them by the id in their forms or fee
link. Tests that change these people (pay a fee, submit a form) should reseed first or clean up after
themselves.

## Shape

- ~245 users: 150 base members in tiers (veteran / experienced / newer) with matching prior service
  history, 5 clergy, and graduates of #43 and #44.
- Each weekend has 52 positions plus 4 spiritual directors (clergy serving both weekends, fees waived).
  The men's Head Chapel Tech also serves the women's weekend. Leadership goes to the most experienced people.
  Each weekend has 1–2 drops whose slot was refilled; on #45 one dropped member had already paid.
- Board roles (PWC, President, Treasurer, …) are assigned to seeded members.

Names and role assignments are deterministic (seeded PRNG + stable UUIDs), so reseeding keeps the same
people in the same seats and the same URLs; only the dates move.

## Files

- `index.ts` — CLI, SQL rendering, applies via `docker exec … psql`
- `world.ts` — timeline and world builder
- `data.ts` — name pools, team template, candidate profiles
- `lib.ts` — PRNG, stable ids, day math, SQL literals

Runs on Node's built-in TypeScript support (no build step), so stick to erasable syntax (no `enum`s,
parameter properties or path aliases outside `import type`).
