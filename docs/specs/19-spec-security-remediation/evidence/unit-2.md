# Unit 2 evidence — signed impersonation cookie

Files: `services/identity/impersonation/impersonation-cookie.ts` (pure sign/verify helpers),
`impersonation-service.ts` (reader and writer), `actions.ts` (returns the service `Result`),
`services/identity/user/user-service.ts` (exports the cached `getAuthenticatedUser`).

## Secret

- `IMPERSONATION_COOKIE_SECRET` added to the Vercel project on 2026-09-27 for **Production** and
  **Preview** as Sensitive ("Hidden Secret" in `vercel env ls`), each from its own
  `openssl rand -base64 32`. Not added to GitHub secrets (not needed there).
- Added to `.env.example` with a placeholder and comment, and to the owner's `.env.local`.
- When the variable is unset, `findImpersonatingUser` and `isImpersonatingUser` return
  null/false and one warn-level pino line is written per process; `impersonateUser` returns an
  error Result ("Impersonation is not configured on this server") so the dialog shows a toast
  instead of silently doing nothing.

## Unit test (`impersonation-cookie.test.ts`, 7 cases, all passing)

```
yarn test
Test Suites: 44 passed, 44 total
Tests:       454 passed, 454 total   (447 before Unit 2)
```

Cases: valid round trip; raw UUID (old format) rejected; tampered payload rejected; tampered
signature rejected; different secret rejected; expired and future-dated rejected; empty, missing
and malformed values rejected.

## Forgery check (node, against the compiled helper)

```
raw UUID cookie verifies?   false   ← the pre-Unit-2 attack (paste an admin's id) is dead
signed cookie verifies?     true
swapped-target forgery?     false   ← payload edited, signature kept
other secret verifies?      false
```

## Reader behaviour (FR-2.3), by inspection of `findImpersonatingUser`

1. Signature and age verified with `timingSafeEqual` after a length check; 24 h max age.
2. Real session user loaded through the request-cached `getAuthenticatedUser()`.
3. Requires `session.id === payload.adminUserId` **and** `userHasPermission(session, [FULL_ACCESS])`
   on the freshly loaded user, so a revoked admin's cookie stops working immediately.
4. Only then `getUserById(targetUserId)`. Any failure returns `null`; the function never sets or
   deletes cookies (it runs during Server Component render).
5. `getLoggedInUser` still returns `{ ...impersonatedUser, originalUser }` (unchanged).

Cookie flags on write: `httpOnly`, `secure` in production, `sameSite: 'lax'`, `path: '/'`,
`maxAge: 86400`.

## Not exercised here

The browser flow (open the impersonation dialog, pick a member, browse the hub and admin, clear)
was not driven in this session; it needs a running dev server and a FULL_ACCESS login. The code
path the dialog calls (`impersonateUser` → `impersonation-service.impersonateUser`) is the one
tested above, and `clearImpersonation` is unchanged apart from the shared cookie key constant.
