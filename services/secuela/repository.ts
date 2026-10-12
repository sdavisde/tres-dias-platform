import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Result } from '@/lib/results'
import { err, ok } from '@/lib/results'
import { isSupabaseError } from '@/lib/supabase/utils'

export type RawSecuelaEvent = {
  id: number
  title: string | null
  datetime: string | null
  end_datetime: string | null
  location: string | null
  weekend_group_id: string | null
  weekend_groups: { number: number } | null
}

/**
 * Every secuela event tied to a weekend group, newest first.
 */
export async function findAllSecuelaEvents(): Promise<
  Result<string, RawSecuelaEvent[]>
> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select(
      'id, title, datetime, end_datetime, location, weekend_group_id, weekend_groups(number)'
    )
    .eq('type', 'secuela')
    .not('weekend_group_id', 'is', null)
    .not('datetime', 'is', null)
    .order('datetime', { ascending: false })

  if (isSupabaseError(error)) {
    return err(`Failed to fetch secuela events: ${error.message}`)
  }

  return ok((data ?? []) as RawSecuelaEvent[])
}

export type RawSecuelaSignIn = {
  group_id: string
  user_id: string
  attended_secuela_at: string
  users: { first_name: string | null; last_name: string | null } | null
}

/**
 * Secuela sign-ins for members of the given groups (signed-in rows only),
 * with each member's name.
 */
export async function findSecuelaSignIns(
  groupIds: string[]
): Promise<Result<string, RawSecuelaSignIn[]>> {
  if (groupIds.length === 0) return ok([])
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('weekend_group_members')
    .select(
      'group_id, user_id, attended_secuela_at, users(first_name, last_name)'
    )
    .in('group_id', groupIds)
    .not('attended_secuela_at', 'is', null)

  if (isSupabaseError(error)) {
    return err(`Failed to fetch secuela sign-ins: ${error.message}`)
  }

  return ok((data ?? []) as RawSecuelaSignIn[])
}
