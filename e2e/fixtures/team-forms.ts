import { test as base } from '@playwright/test'
import type { PostgrestError } from '@supabase/supabase-js'
import { isNil } from 'lodash'
import type { Database } from '@/database.types'
import { readPersonas, type Personas, type TeamPersona } from './personas'
import { adminClient } from './supabase'

/**
 * FR-3.1: puts the `teamForms` persona (S2) back exactly as the seed left
 * them, whatever the team forms flow wrote.
 *
 * The five forms write:
 * - `team_form_completions`: one row per form (deleted before and after, so
 *   the persona starts at 0% and S2 still holds for the next run)
 * - `weekend_roster.special_needs`: Release of Claim updates every roster row
 *   of the user in the group, so every such row is snapshotted, not only
 *   `rosterId`
 * - `users`: address, church, weekend attended, essentials date, skills
 * - `user_medical_profiles`: upserted on `user_id`
 * - `users_experience`: new rows only
 *
 * The snapshot is logged with console.info (Playwright keeps stdout in the
 * report), so a restore that fails half way can be finished by hand.
 */

type Tables = Database['public']['Tables']
type UserRow = Tables['users']['Row']
type MedicalRow = Tables['user_medical_profiles']['Row']
type ExperienceRow = Tables['users_experience']['Row']
type RosterNeeds = Pick<Tables['weekend_roster']['Row'], 'id' | 'special_needs'>

export type TeamFormsSnapshot = {
  user: UserRow
  medicalProfiles: MedicalRow[]
  experience: ExperienceRow[]
  rosterSpecialNeeds: RosterNeeds[]
}

type Response<T> = { data: T | null; error: PostgrestError | null }

/** Unwraps a query result, throwing on any error so a bad restore is loud. */
function must<T>({ data, error }: Response<T>, what: string): T {
  if (!isNil(error)) {
    throw new Error(`team-forms fixture: ${what} failed: ${error.message}`)
  }
  if (isNil(data)) {
    throw new Error(`team-forms fixture: ${what} returned no data`)
  }
  return data
}

/** Fails on an error from a query that returns no rows (delete, update). */
function check({ error }: { error: PostgrestError | null }, what: string) {
  if (!isNil(error)) {
    throw new Error(`team-forms fixture: ${what} failed: ${error.message}`)
  }
}

async function deleteCompletions(member: TeamPersona): Promise<void> {
  check(
    await adminClient()
      .from('team_form_completions')
      .delete()
      .eq('weekend_group_member_id', member.groupMemberId),
    'deleting team_form_completions'
  )
}

async function takeSnapshot(
  member: TeamPersona,
  group: Personas['group']
): Promise<TeamFormsSnapshot> {
  const admin = adminClient()
  const [user, medicalProfiles, experience, rosterSpecialNeeds] =
    await Promise.all([
      admin.from('users').select('*').eq('id', member.userId).single(),
      admin
        .from('user_medical_profiles')
        .select('*')
        .eq('user_id', member.userId),
      admin.from('users_experience').select('*').eq('user_id', member.userId),
      admin
        .from('weekend_roster')
        .select('id, special_needs')
        .eq('user_id', member.userId)
        .in('weekend_id', group.weekendIds),
    ])
  const snapshot = {
    user: must(user, 'reading users row'),
    medicalProfiles: must(medicalProfiles, 'reading user_medical_profiles'),
    experience: must(experience, 'reading users_experience'),
    rosterSpecialNeeds: must(rosterSpecialNeeds, 'reading weekend_roster'),
  }
  if (!snapshot.rosterSpecialNeeds.some((r) => r.id === member.rosterId)) {
    throw new Error(
      `team-forms fixture: roster row ${member.rosterId} is not in the active group`
    )
  }
  return snapshot
}

/** Deletes rows of `table` for the user whose id is not in `keepIds`. */
async function deleteRowsNotIn(
  table: 'users_experience',
  userId: string,
  keepIds: string[]
): Promise<void> {
  let query = adminClient().from(table).delete().eq('user_id', userId)
  if (keepIds.length > 0)
    query = query.not('id', 'in', `(${keepIds.join(',')})`)
  check(await query, `deleting new ${table} rows`)
}

async function restoreSnapshot(
  member: TeamPersona,
  snapshot: TeamFormsSnapshot
): Promise<void> {
  const admin = adminClient()

  check(
    await admin.from('users').update(snapshot.user).eq('id', member.userId),
    'restoring users row'
  )

  // user_medical_profiles is one row per user (user_id is the key).
  if (snapshot.medicalProfiles.length === 0) {
    check(
      await admin
        .from('user_medical_profiles')
        .delete()
        .eq('user_id', member.userId),
      'deleting new user_medical_profiles row'
    )
  } else {
    check(
      await admin
        .from('user_medical_profiles')
        .upsert(snapshot.medicalProfiles, { onConflict: 'user_id' }),
      'restoring user_medical_profiles'
    )
  }

  await deleteRowsNotIn(
    'users_experience',
    member.userId,
    snapshot.experience.map((e) => e.id)
  )
  if (snapshot.experience.length > 0) {
    check(
      await admin.from('users_experience').upsert(snapshot.experience),
      'restoring users_experience'
    )
  }

  for (const row of snapshot.rosterSpecialNeeds) {
    check(
      await admin
        .from('weekend_roster')
        .update({ special_needs: row.special_needs })
        .eq('id', row.id),
      `restoring weekend_roster.special_needs on ${row.id}`
    )
  }

  await deleteCompletions(member)
}

type TeamFormsFixtures = {
  /** The S2 persona, reset to zero completions for this test. */
  teamFormsMember: TeamPersona
}

export const test = base.extend<TeamFormsFixtures>({
  teamFormsMember: async ({}, use) => {
    const { teamForms: member, group } = readPersonas()

    const snapshot = await takeSnapshot(member, group)
    console.info(
      `team-forms fixture snapshot (restore by hand if teardown fails):\n${JSON.stringify(snapshot, null, 2)}`
    )
    await deleteCompletions(member)

    try {
      await use(member)
    } finally {
      await restoreSnapshot(member, snapshot)
    }
  },
})

export { expect } from '@playwright/test'
