import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { fromSupabase } from '@/lib/results'

/**
 * `address` is read so the service can pull the city out of it; the rest of
 * the address never leaves the service.
 */
const DirectoryQuery = `
  id,
  first_name,
  last_name,
  email,
  phone_number,
  address,
  church_affiliation,
  weekend_attended,
  profile_photo_path,
  profile_photo_updated_at
`

/** Every account holder, by last name. Candidates have no account, so none appear. */
export async function getDirectoryUsers() {
  const supabase = await createClient()
  const response = await supabase
    .from('users')
    .select(DirectoryQuery)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })

  return fromSupabase(response)
}
