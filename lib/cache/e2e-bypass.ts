/**
 * Cookie an E2E spec sets so the dev server reads around the shared server
 * cache for its requests (see `lib/cache/cached-read.ts`). Its own file so
 * Playwright fixtures can import it without pulling in `server-only`.
 */
export const E2E_NO_CACHE_COOKIE = 'e2e-no-server-cache'
