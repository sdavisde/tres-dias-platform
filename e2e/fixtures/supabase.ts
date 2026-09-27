import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/database.types'

/**
 * Reads a required environment variable, failing loudly rather than letting a
 * test fail later with an unhelpful connection error.
 */
function requireEnv(name: string): string {
  const value = process.env[name]
  if (value === undefined || value === '') {
    throw new Error(
      `${name} is not set. E2E tests need a local Supabase — see docs/e2e-testing.md`
    )
  }
  return value
}

/**
 * Service-role client used by fixtures to arrange and inspect test data.
 * Bypasses RLS, so never use it to assert that a policy allows something —
 * use anonClient() signed in as a real user for that.
 */
export function adminClient(): SupabaseClient<Database> {
  return createClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SECRET_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

/**
 * Anon-key client, subject to RLS exactly as the browser is. Sign in with
 * signInAs() to exercise a policy as a specific user.
 */
export function anonClient(): SupabaseClient<Database> {
  return createClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

/**
 * Signs an anon client in as a seeded user. Every seeded account uses the
 * password 'password' (see supabase/seed.sql).
 */
export async function signInAs(
  client: SupabaseClient<Database>,
  email: string,
  password = 'password'
): Promise<void> {
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error !== null) {
    throw new Error(`Failed to sign in as ${email}: ${error.message}`)
  }
}
