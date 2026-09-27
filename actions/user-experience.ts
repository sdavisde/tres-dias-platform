'use server'

import { createClient } from '@/lib/supabase/server'
import type { Result } from '@/lib/results'
import { err, ok } from '@/lib/results'
import { isNil } from 'lodash'
import type { UserExperienceFormValue } from '@/components/team-forms/schemas'
import {
  formatCommunityWeekendRef,
  toCommunityWeekendRef,
} from '@/lib/weekend/weekend-reference'

/**
 * Upserts a single user experience entry (External)
 * @deprecated - move a version of this function to the master roster service and call that instead
 */
export async function upsertUserExperience(
  userId: string,
  entry: UserExperienceFormValue
): Promise<Result<string, void>> {
  try {
    const supabase = await createClient()

    if (isNil(entry.community) || isNil(entry.weekend_number)) {
      return err('Missing community or weekend number')
    }

    const weekend_reference = toCommunityWeekendRef({
      community: entry.community,
      number: parseInt(entry.weekend_number),
    })

    const payload = {
      user_id: userId,
      cha_role: entry.cha_role, // Enum string
      weekend_reference: formatCommunityWeekendRef(weekend_reference),
      updated_at: new Date().toISOString(),
      // Ensure weekend_id is null for external
      weekend_id: null,
      ...(!isNil(entry.id) ? { id: entry.id } : {}),
    }

    const { error } = await supabase.from('users_experience').upsert([payload]) // Upsert on ID (primary key)

    if (!isNil(error)) {
      console.error('Error saving experience:', error)
      // Check for specific unique violation if constraint name differs
      return err(`Failed to save experience: ${error.message}`)
    }

    return ok(undefined)
  } catch (e) {
    console.error('Unexpected error saving experience:', e)
    return err('Unexpected error')
  }
}

/**
 * @deprecated - move a version of this function to the master roster service and call that instead
 */
export async function deleteUserExperience(
  experienceId: string
): Promise<Result<string, void>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('users_experience')
      .delete()
      .eq('id', experienceId)

    if (!isNil(error)) {
      console.error('Error deleting experience:', error)
      return err(`Failed to delete experience: ${error.message}`)
    }

    return ok(undefined)
  } catch (e) {
    console.error('Unexpected error deleting experience:', e)
    return err('Unexpected error')
  }
}
