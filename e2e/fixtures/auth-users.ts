import type { User } from '@supabase/supabase-js'
import { adminClient } from './supabase'

const PAGE_SIZE = 200

/**
 * Every auth user, paging through `auth.admin.listUsers` (the seed has ~245,
 * more than one page).
 */
export async function listAllAuthUsers(): Promise<User[]> {
  const admin = adminClient()
  const users: User[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    })
    if (error !== null) {
      throw new Error(`Failed to list auth users: ${error.message}`)
    }
    users.push(...data.users)
    if (data.users.length < PAGE_SIZE) return users
  }
}

/**
 * A unique address for a signup test account. The run id makes accounts left
 * behind by a crashed run identifiable, and keeps them from colliding with
 * the next run.
 */
export function e2eEmail(): string {
  return `e2e+${process.env.GITHUB_RUN_ID ?? Date.now()}@example.com`
}

/** Deletes the auth user with this email; a no-op when there is none. */
export async function deleteAuthUser(email: string): Promise<void> {
  const target = email.toLowerCase()
  const user = (await listAllAuthUsers()).find(
    (u) => u.email?.toLowerCase() === target
  )
  if (user === undefined) return
  const { error } = await adminClient().auth.admin.deleteUser(user.id)
  if (error !== null) {
    throw new Error(`Failed to delete auth user ${email}: ${error.message}`)
  }
}

/**
 * Removes every signup test account (`e2e+…@example.com`). Not called by the
 * suite; for cleaning up by hand after crashed runs.
 */
export async function deleteE2EAuthUsers(): Promise<number> {
  const leftovers = (await listAllAuthUsers()).filter((u) =>
    /^e2e\+.*@example\.com$/i.test(u.email ?? '')
  )
  for (const user of leftovers) {
    const { error } = await adminClient().auth.admin.deleteUser(user.id)
    if (error !== null) {
      throw new Error(
        `Failed to delete auth user ${user.email ?? user.id}: ${error.message}`
      )
    }
  }
  return leftovers.length
}
