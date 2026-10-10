# Tres Dias & DTTD Domain Context

This document explains the Tres Dias ministry and how Dusty Trails operates their weekends. It is primarily written for AI agents and developers who need to understand the business domain when building features.

---

## What Is Tres Dias?

Tres Dias ("three days" in Spanish) is a worldwide Christian nonprofit movement, most active in the United States. The mission is to **train servant leaders** — inviting Christians into a community and equipping them to lead their families, friendships, and ministries the way Christ leads.

The movement is structured into local **communities** (also called chapters or secretariats). Each community is self-governed and runs its own weekends independently, following the shared Tres Dias format.

**Dusty Trails Tres Dias (DTTD)** is the specific community based in central Texas that this portal was built for.

---

## The Weekend

The flagship event of any Tres Dias community is the **weekend** — a 72-hour spiritual renewal experience for guests called **candidates**.

### Structure

Every DTTD weekend is actually **two separate weekends under a single number**:

- **Men's weekend** — always first
- **Women's weekend** — always one week after Men's

So "DTTD #11" means the 11th weekend group, which consists of a Men's weekend and a Women's weekend.

Weekends happen **twice a year**, generally in spring and fall.

Each weekend starts **Thursday evening** and runs through **Sunday morning** (~72 hours).

### Capacity

Each individual weekend (Men's or Women's) holds approximately **42 candidates**. The team of volunteers is typically 75+ people.

---

## The People

### Candidates

Candidates are the guests of the weekend. They are invited into the community by a sponsor. Every candidate goes through:

1. **Sponsorship** — A sponsor nominates them and completes a sponsorship form
2. **Candidate application** — The candidate fills out their info and medical forms
3. **Payment** — A fee is due for their spot (covers lodging, food, etc.)
4. **Approval** — The Pre-Weekend Couple reviews and approves the candidate

Payment is required for every candidate spot, but it doesn't always come from the candidate directly. Sometimes a scholarship covers part or all of it, or it is otherwise arranged. The system's goal is to ensure every spot is accounted for — not necessarily that every individual pays.

### Sponsors

Sponsors are community members who invite candidates. They are responsible for:

- Nominating the candidate
- Completing the sponsorship form
- Supporting the candidate before, during, and after the weekend

Sponsorship is a relational act, not just a form submission. The sponsor maintains a personal connection with their candidate.

### Team (Volunteers)

The team is the group of 75+ volunteers who put on the weekend. Each team member has a **CHA role** that defines their specific responsibilities on the weekend (e.g., Table Leader, Rector, Music, Kitchen). Some roles serve on both Men's and Women's weekends; others only one.

Team members are also paying participants — they pay a team fee to cover their costs for the weekend(s) they serve on.

See [`docs/cha-roles.md`](cha-roles.md) for a full breakdown of CHA roles and their responsibilities.

### Pre-Weekend Couple (PWC)

The Pre-Weekend Couple is the primary administrative leadership for a given weekend group. They are responsible for:

- Candidate review and approval
- Coordinating the team roster
- Managing the overall weekend logistics

In the portal, PWC members typically have admin-level access.

### Secuela

Secuela is the community gathering where members sign up to serve on the active weekend group's team,
usually starting around 10 AM. Rectors lean on who attended when building their rosters. Each weekend group has one secuela event (`events.type =
'secuela'`, linked by `weekend_group_id`), managed from `/admin/secuela`.

Members sign in by scanning a QR code that opens `/secuela-signin` (one code works every time; sign-ins
always go to the active weekend group). The rules live in `lib/secuela/attendance-window.ts`:

- **Before secuela:** until the start time, the page says "Registration hasn't started yet" and
  nothing is recorded.
- **During secuela:** from the start time until the end time (start + 3 hours when no
  end time is set), confirming marks the member **Attended Secuela**.
- **After secuela:** the link keeps working; confirming marks the member **Wants to Serve**. A sign-in
  made during secuela is never overwritten by a later one.

The roster builder shows these as badges and lists attendees first.

---

## Weekend Numbering & Data Model

- A **weekend group** (`weekend_groups`) represents one DTTD number (e.g., DTTD #11)
- Each group contains two **weekends** (`weekends`): one `MENS` and one `WOMENS`
- A volunteer's **group membership** (`weekend_group_members`) is the hub — forms, payment, and medical info are recorded at the group level
- A volunteer's **roster assignment** (`weekend_roster`) is weekend-specific — CHA role, rollo, and status are per-weekend

This means a volunteer serving on both Men's and Women's weekends has one group membership record but two roster rows.

For the full data model, see [`docs/volunteering-data-model.md`](volunteering-data-model.md).

---

## Key Design Constraints

- **Not everything should be automated.** The community values person-to-person interaction. Features should reduce friction, not replace relationship.
- **Payment flexibility.** The system must accommodate scholarships, comped spots, and manual payment tracking — not just direct online payments.
- **Two-weekend symmetry.** Most features that apply to candidates also apply to team members, but the data structures differ (candidates are per-weekend; team members are per-group with weekend-specific roster rows).
