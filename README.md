# DTTD - Dusty Trails Tres Dias

A community management portal built for **Dusty Trails Tres Dias**, a Christian renewal weekend ministry based in central Texas.

## About This Project

Dusty Trails Tres Dias (DTTD) is a local chapter of the [Tres Dias](https://tresdias.org) movement — a worldwide network of Christian communities whose mission is to train servant leaders. The community invited me to build this portal to reduce the administrative friction of hosting their twice-yearly renewal weekends.

The original request was simple: online payments and digital forms instead of paper. The platform has since grown to cover the full candidate journey (sponsorship → application → payment → weekend) and team/volunteer coordination.

**Design philosophy**: DTTD has a strong emphasis on person-to-person relationship. The goal is to handle the logistics that don't need to be in person, not to automate away human connection.

**Who uses it:**

| Role                        | What they do here                                               |
| --------------------------- | --------------------------------------------------------------- |
| Candidates                  | Submit their application, fill out forms, pay their weekend fee |
| Sponsors                    | Submit a sponsorship nomination on behalf of a candidate        |
| Team members (volunteers)   | Complete required team forms, pay the team fee, view the roster |
| Admins / Pre-Weekend Couple | Manage candidate approvals, rosters, and weekend configuration  |

For a deeper explanation of how Tres Dias weekends work and why the system is structured the way it is, see [`docs/domain.md`](docs/domain.md).

## Quick Start

```bash
# Install go-task (required for automated setup)
brew install go-task

# Run the setup script (installs dependencies, configures environment)
task setup

# Run development server
bun run dev

# Optionally, if you are testing any online payments:
task dev:webhooks # will startup a webhook listener locally to receive Stripe webhook events
```

For detailed setup instructions, see [SETUP.md](./SETUP.md).

## Manual Setup (Alternative)

If you prefer manual setup or need more control:

```bash
# Install dependencies
bun install

# Start local database
bun run db:start # Spins up a local postgres database using supabase CLI
bun run db:migrate <description> # creates a template migration file
bun run db:reset # run whenever you update seed file, or add a migration
bun run db:generate # run after applying migrations to a running database, to update database.types file

# Run development server
bun run dev

# Stops the supabase docker containers running for the backend
bun run db:stop
```

## Environment Variables

Copy `.env.example` into `.env.local`, and follow the instructions inside

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) enforced via commitlint on pre-commit. All commits must follow this format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type       | Description                               | Release Impact |
| ---------- | ----------------------------------------- | -------------- |
| `feat`     | New feature                               | Minor (0.X.0)  |
| `fix`      | Bug fix                                   | Patch (0.0.X)  |
| `perf`     | Performance improvement                   | Patch (0.0.X)  |
| `revert`   | Revert a previous commit                  | Patch (0.0.X)  |
| `docs`     | Documentation only                        | No release     |
| `style`    | Code style (formatting, semicolons, etc.) | No release     |
| `refactor` | Code refactoring (no feature/fix)         | No release     |
| `test`     | Adding or updating tests                  | No release     |
| `build`    | Build system or dependencies              | No release     |
| `ci`       | CI configuration                          | No release     |
| `chore`    | Maintenance tasks                         | No release     |

## Tech Stack

- Next.js 15 + TypeScript
- Supabase (Auth + Database)
- Stripe (Payments)
- ShadCN + Tailwind CSS

## TODOs

- [ ] Test payout webhook, make sure that online payments are marked as deposited when we receive a payout
- [ ] Next, need to show some indicator on the payments page that a payment was deposited
- [ ] Create delete user action
- [ ] Add user account actions dropdown menu
- [ ] Help rectors choose people: create master roster page that can be arbitrarily filtered, or maybe where users can build their own queries? With templates / examples
