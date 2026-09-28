# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `bun run dev` (with Turbopack)
- **Build for production**: `bun run build`
- **Start production server**: `bun run start`
- **Lint code**: `bun run lint`
- **Generate Supabase types**: `bun run db:generate` (regenerates `database.types.ts`)
- **Stripe webhooks (local)**: `bun run stripe:listen` forwards test-mode events to `/api/webhooks/stripe`
  (requires `stripe login` with a test-mode account; its `whsec_` secret must match `STRIPE_WEBHOOK_SECRET`)
- **Platform billing webhooks (local)**: `bun run stripe:listen:platform` forwards the PLATFORM Stripe
  account's events to `/api/webhooks/platform-billing` (see `docs/platform-billing.md`)
- **Database Operations**:
  - bun run db:start - starts all supabase containers, if they aren't already running
  - bun run db:stop - stops all supabase containers
  - bun run db:reset - resets the database to its initial state (runs migrations, roles and `bun run seed` after wiping the DB. DANGEROUS, ONLY USE WHEN TOLD)
  - bun run seed [pre-weekend|weekend|post-weekend] - wipes local app data + auth users and regenerates a
    date-relative world at that point in the weekend cycle (see `scripts/seed/README.md`). DESTRUCTIVE to
    local data, ONLY USE WHEN TOLD; `bun run seed --dry-run` is safe (rolls back)

## Dev Mode

- `isDevMode()` from `@/lib/dev-mode` returns `true` when `NODE_ENV === 'development'` (i.e., during `bun run dev`)
- Use it to conditionally render dev-only UI like "Fill with test data" buttons on forms
- Currently used in: `SponsorForm.tsx`, `candidate-forms.tsx`
- When adding new forms, include a dev-mode autofill button following the same pattern

## Project Overview

Dusty Trails Tres Dias (DTTD) is a Christian community management platform for spiritual renewal weekends. The application manages the complete candidate journey from sponsorship through weekend participation.

### Technology Stack

- **Frontend**: Next.js 16 (App Router), TypeScript 6, React 19, shadcn/ui components, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL), Supabase Auth, Supabase SSR
- **State**: TanStack React Query v5, React Hook Form + Zod v4 validation
- **Payments**: Stripe integration (stripe-node v18)
- **Email**: Resend service, React Email components
- **Logging**: Pino logger
- **UI Libraries**: Radix UI primitives, Lucide React icons, Next Themes, Sonner toasts
- **Utilities**: date-fns, clsx, class-variance-authority

## Code Architecture

### Directory Structure

- `app/` - Next.js App Router pages and layouts
  - `(public)/` - Public routes (candidate forms, payments, sponsorship, roster)
    - `api/` - API routes (webhooks for checkout completion)
    - `candidate/` - Candidate form workflows
    - `files/` - Public file access and management
    - `payment/` - Stripe payment flows
    - `sponsor/` - Sponsorship form and submission
    - `roster/` - Public roster page
  - `admin/` - Admin dashboard with role-based access
    - `files/` - File management system
    - `roles/` - Role assignment interface
    - `users/` - User management
    - `weekends/` - Weekend event management
    - `settings/` - System configuration
- `actions/` - Server actions for database operations
- `components/` - Reusable React components organized by feature
  - `ui/` - shadcn/ui component library
  - `auth/` - Authentication forms and providers
  - `file-management/` - File system operations
  - `email/` - React Email templates
- `lib/` - Shared utilities, types, and service configurations
- `hooks/` - Custom React hooks
- `util/` - Legacy utility functions (should be consolidated with `lib/`)

### Key Architectural Patterns

1. **Server Actions Pattern**: Database operations are handled via server actions in the `actions/` directory, not API routes
2. **Type Safety**: All database operations use generated types from `database.types.ts`
3. **Result Pattern**: Server actions return `Result<Error, T>` types for consistent error handling
   - Use Result helpers (`Results.unwrapOr()`, `Results.map()`, `Results.match()`, `Results.andThen()`, etc) for result manipulation wherever they simplify the code
   - Prefer `Results.unwrapOr(result, defaultValue)` over `isOk(result) ? result.data : defaultValue`
4. **Error Toasts**: Never show raw server/database errors to users. Use `toastError()` from `@/lib/toast-error` which logs the raw error via pino and shows a friendly message:
   ```tsx
   // Bad: toast.error(result.error)
   // Good:
   toastError('Unable to save changes. Please try again.', {
     error: result.error,
   })
   ```
5. **Null checks**: Use `isNil()` from lodash for null/undefined checks instead of manual `=== null || === undefined` comparisons
6. **Authentication Middleware**: Supabase auth handled in `middleware.ts` with route protection
7. **Component Co-location**: Feature-specific components are organized under their respective domain folders
8. **Separation of Concerns**: Clear separation between public and admin functionality through route grouping

### Database Architecture

The application uses Supabase with several key tables:

- `candidates` - Main candidate records with status tracking
- `candidate_sponsorship_info` - Sponsorship details
- `candidate_info` - Detailed candidate forms and medical information
- `users` - User accounts with role-based permissions
- `weekend` - Weekend event management

### Business Domain

> For a full explanation of the Tres Dias ministry, weekend structure, and participant roles, see [`docs/domain.md`](docs/domain.md). Read it before working on features that touch the candidate journey, team roster, or weekend management.

**Core Concepts**:

- **Weekend group**: One DTTD number (e.g., DTTD #11) containing both a Men's and Women's weekend
- **Weekend**: 72-hour spiritual renewal event (42 candidate capacity); Men's always first, Women's one week later
- **Candidate**: Guest participant requiring sponsorship, approval, and payment
- **Sponsor**: Community member who nominates a candidate and maintains a personal relationship with them
- **Team member**: Volunteer with a CHA role; serves on one or both weekends in a group
- **Pre-Weekend Couple (PWC)**: Weekend organizers with admin-level access who manage candidate approval and team logistics

**User Permissions**:

- `FULL_ACCESS` - Complete system access
- `READ_MEDICAL_HISTORY` - Access to medical information
- `FILES_UPLOAD` - File upload permissions
- `FILES_DELETE` - File deletion permissions

### Component Patterns

**IMPORTANT: ONLY use shadcn/ui components - NO Material-UI or other UI libraries allowed**

- shadcn/ui components for UI consistency (built on Radix UI primitives)
- React Hook Form with Zod schemas for form validation
- Server/client component separation following Next.js best practices
- Import UI components from `@/components/ui/` directory only

### Auto-save Instead of Save Buttons

Edit forms auto-save rather than showing a "Save changes" button: if auto-saving is more convenient for
the user, do it.

- Use `useAutoSave` from `@/hooks/use-auto-save`: 800ms debounce once the form is valid; call
  `saveImmediately()` before selects, toggles and pickers change. It serialises saves and flushes on
  unmount, so key the editor by record id (`key={id}`) so each record starts from its own values.
- Show `AutoSaveStatusIndicator` (`@/components/auto-save/auto-save-status`) in the editor header, not
  a footer. For a single inline value (pencil → input), use `InlineAutoSaveField`.
- Creating a record keeps an explicit Create button. Exception: the Edit payment dialog keeps its
  explicit save.

### Responsive Design Guidelines for Admin Pages

**CRITICAL: ALL admin pages and data tables MUST implement mobile-responsive designs following these patterns:**

#### Mobile-First Data Display Requirements

1. **Dual Layout Strategy**:
   - **Desktop (md+)**: Preserve existing table layouts - NO changes to desktop behavior
   - **Mobile (sm and below)**: Implement card-based layouts for better mobile UX

2. **Responsive Implementation Pattern**:

   ```tsx
   {
     /* Desktop Table - Hidden on mobile */
   }
   ;<div className="relative hidden md:block">
     <Table>{/* Existing desktop table implementation */}</Table>
   </div>

   {
     /* Mobile Card Layout - Shown only on mobile */
   }
   ;<div className="md:hidden space-y-3">
     {data.map((item) => (
       <div key={item.id} className="bg-card border rounded-lg p-4 space-y-3">
         {/* Mobile card content */}
       </div>
     ))}
   </div>
   ```

3. **Mobile Card Design Standards**:
   - **Header**: Primary identifier (name, title) prominently displayed with larger font (`text-lg`, `font-medium`)
   - **Content Organization**: Use labeled sections with consistent spacing (`space-y-2`, `space-y-3`)
   - **Labels**: Muted foreground labels with fixed width for alignment (`text-muted-foreground w-16`)
   - **Action Buttons**: Position in header with proper touch targets (minimum 44px)
   - **Status/Badges**: Group together with flexbox (`flex flex-wrap items-center gap-2`)
   - **Borders**: Use card styling (`bg-card border rounded-lg p-4`)

4. **Functional Requirements**:
   - **Search/Filter**: Must work identically on both desktop and mobile layouts
   - **Interactions**: All dropdowns, modals, and actions must function on mobile cards
   - **State Management**: Preserve all existing state management and data flow
   - **Empty States**: Show appropriate messages for both layouts

5. **Touch Optimization**:
   - Minimum 44px touch targets for interactive elements
   - Proper spacing between interactive elements (minimum 8px gaps)
   - Hover states replaced with appropriate mobile interactions

6. **Example Implementation**:
   Reference: the shared `components/ui/data-table/data-table.tsx` (which renders
   `components/ui/data-table/data-table-mobile-card.tsx` below `md`) — most admin tables get the dual
   layout for free by going through `DataTable`. For a hand-rolled mobile card layout, see
   `components/file-management/FileBrowserTable.tsx`.

#### When to Apply These Guidelines

- **New Admin Pages**: Always implement responsive design from the start
- **Existing Admin Tables**: When modifying any admin table, add mobile card layout
- **Data Display Components**: Any component showing tabular data in admin routes
- **Form Lists**: Lists of editable items in admin interfaces

**DO NOT modify desktop behavior** - only add mobile-responsive alternatives alongside existing layouts.

### File Organization

- Server components in page directories
- Client components marked with 'use client'
- Shared types in `lib/` subdirectories by domain
- Email templates using React Email in `components/email/`
- use `bun run build` to confirm compilation
