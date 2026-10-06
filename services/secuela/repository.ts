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

/**
 * Secuela sign-in times for members of the given groups (signed-in rows only).
 */
export async function findSecuelaSignIns(
  groupIds: string[]
): Promise<
  Result<string, Array<{ group_id: string; attended_secuela_at: string }>>
> {
  if (groupIds.length === 0) return ok([])
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('weekend_group_members')
    .select('group_id, attended_secuela_at')
    .in('group_id', groupIds)
    .not('attended_secuela_at', 'is', null)

  if (isSupabaseError(error)) {
    return err(`Failed to fetch secuela sign-ins: ${error.message}`)
  }

  return ok(
    (data ?? []) as Array<{ group_id: string; attended_secuela_at: string }>
  )
}
