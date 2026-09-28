/**
 * Spec test 2 (FR-8.2): the anonymous role can no longer read PII or grant roles.
 *
 * Runs only against the local Supabase stack (URL on localhost / 127.0.0.1 and
 * the REST endpoint answering). Anywhere else, including CI until Epic 1 adds a
 * database job, the whole suite is skipped so `yarn test` stays green.
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function readLocalEnv(): Record<string, string> {
  const file = join(process.cwd(), '.env.local')
  if (!existsSync(file)) return {}
  const out: Record<string, string> = {}
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (match !== null) out[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
  return out
}

const env = { ...readLocalEnv(), ...process.env }
const url = env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const anonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''

function localStackReachable(): boolean {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(url)) return false
  if (anonKey === '') return false
  try {
    execSync(`curl -s -o /dev/null -m 2 "${url}/rest/v1/"`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const describeLocal = localStackReachable() ? describe : describe.skip

describeLocal('RLS: anonymous role against the local stack', () => {
  // Built in beforeAll, not at collection time: a skipped describe still runs
  // its body, and createClient throws when the URL is empty (CI's checks job).
  let anon: SupabaseClient

  beforeAll(() => {
    anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  })

  it('cannot read candidate_info', async () => {
    const { data, error } = await anon.from('candidate_info').select('id')
    expect(error !== null || (data ?? []).length === 0).toBe(true)
    // Grants were revoked, so PostgREST answers with a permission error.
    expect(error?.code).toBe('42501')
  })

  it('cannot read users or user_roles', async () => {
    const users = await anon.from('users').select('id').limit(1)
    const userRoles = await anon.from('user_roles').select('user_id').limit(1)
    expect(users.error?.code).toBe('42501')
    expect(userRoles.error?.code).toBe('42501')
  })

  it('cannot insert into user_roles', async () => {
    const { error } = await anon.from('user_roles').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      role_id: '00000000-0000-0000-0000-000000000000',
    })
    expect(error).not.toBeNull()
    expect(error?.code).toBe('42501')
  })
})
