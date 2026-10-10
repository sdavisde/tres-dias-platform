import 'server-only'

import { unstable_cache } from 'next/cache'
import { cookies } from 'next/headers'
import { E2E_NO_CACHE_COOKIE } from '@/lib/cache/e2e-bypass'
import {
  createAdminClient,
  currentAuditScope,
  type DbClient,
} from '@/lib/supabase/server'

/**
 * The shared-data server cache: one place to define a read whose result is
 * the same for every signed-in viewer (weekend groups, events, the role
 * graph, site settings, fees) and reuse it across requests until a write
 * invalidates it by tag.
 *
 * Contract for a cached reader:
 * - it receives the admin client and its own arguments, and nothing else.
 *   No request data (`cookies()`, `headers()`, the viewer) may be read inside
 *   it, which is why the user-session client cannot be used; authorization
 *   is the caller's job, before it calls the reader;
 * - its arguments form the cache key, so keep them low-cardinality ids, never
 *   tokens or e-mail addresses;
 * - its result must survive JSON serialisation (plain data, no Dates, Maps
 *   or Sets);
 * - `tags` must name every tag a write to the underlying rows updates (see
 *   `lib/cache/tags.ts`).
 *
 * This is the only file to change to move the store: with `cacheComponents`
 * on, replace `unstable_cache` here with a `'use cache: remote'` function
 * that calls `cacheTag(...tags)` and `cacheLife({ revalidate })`; the readers
 * and their call sites stay as they are.
 *
 * Readers built with this must live in `server-only` modules, never in a
 * `'use server'` file, so they are not exposed as public action endpoints.
 */

type CacheKeyArg = string | number | boolean | null

/**
 * E2E specs that rearrange cached rows straight in the database (no write
 * path, so no `updateTag`) read around the cache: on the dev server when the
 * request carries {@link E2E_NO_CACHE_COOKIE}, and on the CI production build
 * when `E2E_DISABLE_SERVER_CACHE=1` (set only by .github/workflows/e2e.yml).
 */
async function shouldBypassCache(): Promise<boolean> {
  if (process.env.E2E_DISABLE_SERVER_CACHE === '1') return true
  if (process.env.NODE_ENV !== 'development') return false
  try {
    return (await cookies()).get(E2E_NO_CACHE_COOKIE)?.value === '1'
  } catch {
    // Outside a request (nothing to opt in with)
    return false
  }
}

type CachedReadOptions<Args extends CacheKeyArg[]> = {
  /** Every tag whose `updateTag` must drop this entry. */
  tags: (...args: NoInfer<Args>) => string[]
  /** How long an entry is served before it is recomputed in the background. */
  revalidateSeconds: number
}

export function defineCachedRead<Args extends CacheKeyArg[], T>(
  name: string,
  read: (client: DbClient, ...args: Args) => Promise<T>,
  options: CachedReadOptions<Args>
): (...args: Args) => Promise<T> {
  return async (...args: Args): Promise<T> => {
    // Audit-only request correlation, resolved outside the cache scope
    // (request APIs are forbidden inside it).
    const audit = await currentAuditScope()
    if (await shouldBypassCache()) {
      return read(createAdminClient({ audit }), ...args)
    }
    const cached = unstable_cache(
      async () => read(createAdminClient({ audit }), ...args),
      [name, ...args.map(String)],
      { tags: options.tags(...args), revalidate: options.revalidateSeconds }
    )
    return cached()
  }
}
