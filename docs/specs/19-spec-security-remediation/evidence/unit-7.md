# Unit 7 evidence — auth config, redirects and the download route

Branch `feat/security-remediation`, 2026-09-27. No dev server was running (`lsof -i :3000` empty) and
none was started, so HTTP-level checks are replaced by unit tests over the exact helpers the routes
call. Browser checks remain for the branch-level pass (Gherkin `authentication.feature`,
`@E0-AUTH-*`).

## FR-7.1 Auth config

`git diff supabase/config.toml` touches one key:

```diff
-minimum_password_length = 6
+# Enforced at signup and password change only; existing users keep signing in. This key and
+# `password_requirements` are pushed to production by `release.yml` on every merge to main, so a
+# dashboard edit is overwritten on the next release.
+minimum_password_length = 8
```

`password_requirements`, `enable_confirmations`, `secure_password_change` and the captcha block are
unchanged. Supabase enforces the minimum at signup and password update only; the installed
`@supabase/auth-js` returns a session with a `weakPassword` hint (not an error) for older passwords,
so existing 6-character passwords keep working.

## FR-7.2 Shared password constant

- New `lib/auth/constants.ts`: `MIN_PASSWORD_LENGTH = 8`, `PASSWORD_TOO_SHORT_MESSAGE`.
- `components/auth/ResetPasswordForm.tsx`: the `< 6` check, its error and the help text now use the
  constant.
- `components/auth/AuthForm.tsx`: help text uses the constant, and the register path checks length
  before `signUp`, so a 7-character password fails client-side with the same message the server
  would give.
- `grep -rn "6 char\|< 6" components/auth` → no matches.

## FR-7.3 Open redirects

`lib/redirect.ts` gained `options.allowAuthPages`; both routes now pass `next` through it on every
redirect branch:

- `app/(public)/auth/callback/route.ts`: `validateRedirectUrl(next, '/home', { allowAuthPages:
['/reset-password'] })`, because `actions/password-reset.ts` sends `?next=/reset-password`.
- `app/(public)/auth/confirm/route.ts`: `validateRedirectUrl(next, '/profile')`, used by the
  success, pending and **invalid-token** branches alike (`redirectTo(appendQueryParams(next, …))`).

`lib/redirect.test.ts` (new, 4 tests) proves the helper's behaviour the routes rely on:

| Input                                   | Result            |
| --------------------------------------- | ----------------- |
| `/profile?emailChange=complete`         | kept              |
| `https://evil.example/x`                | `/home`           |
| `//evil.example` (default `/profile`)   | `/profile`        |
| `javascript:alert(1)`                   | `/home`           |
| `/reset-password` without allow-list    | `/home`           |
| `/reset-password` with `allowAuthPages` | `/reset-password` |
| `/login` with the reset allow-list      | `/home`           |

So `/auth/confirm?type=email_change&token_hash=bad&next=https://example.com` now redirects to
`/profile?emailChange=error`, and `/auth/callback?code=bad&next=//example.com` targets `/home` (and
then the login error page because the code exchange fails).

## FR-7.4 Download route

`app/api/files/download/route.ts`:

- `getLoggedInUser()` (from `services/identity/user/session`) → `401 {"error":"Unauthorized"}` when
  there is no session. `/api/*` is still skipped by the proxy, so the route gates itself.
- `bucket` must be `files` or `avatars` → otherwise `400 {"error":"Unknown bucket"}`.
- `path` goes through `normalizeStoragePath` (`lib/storage-path.ts`): empty, absolute, `..`/`.`
  segments, doubled slashes and backslashes → `400 {"error":"Invalid file path"}`.
- The session client is kept, so storage RLS still applies to what a member may read.
- Only caller in the tree is `components/file-context-menu.tsx`, which itself has no importers, so no
  UI depends on the response shape; success still streams the object as before.

`lib/storage-path.test.ts` (new, 2 tests) covers the accept and reject cases.

## Gates

- `npx tsc --noEmit`: clean
- `yarn lint`: 0 errors, 15 pre-existing warnings
- `yarn test`: 48 suites, 471 tests passing (was 46 / 465; +6 from the two new helper tests)
- `yarn build`: compiled, 43/43 pages

## Not exercised

- Logging in with an existing 6-character password, registering with 7 characters, and following a
  tampered confirmation link in a browser (`@E0-AUTH-*`).
- `curl` against `/api/files/download` (no dev server). Covered by the helper test and the route
  code path being a straight sequence of the three checks.
- Confirming the dashboard shows 8 after the next `config push` (owner step in task 7.5).
