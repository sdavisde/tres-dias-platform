import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { fromSupabase } from '@/lib/results'

/**
 * Only what a member needs to recognise and reach a position holder — no
 * address, experience or permissions.
 */
const RolesWithHoldersQuery = `
  id,
  label,
  type,
  description,
  user_roles (
    users (
      id,
      first_name,
      last_name,
      email,
      phone_number,
      profile_photo_path,
      profile_photo_updated_at
    )
  )
`

/** Every role with the people who hold it. */
export async function getRolesWithHolders() {
  const supabase = await createClient()
  const response = await supabase.from('roles').select(RolesWithHoldersQuery)

  return fromSupabase(response)
}
