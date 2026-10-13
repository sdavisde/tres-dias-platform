import { isNil } from 'lodash'
import { adminClient } from './supabase'

/**
 * Arrange / assert / clean up for the community email spec. Rows it creates
 * are identifiable: emails have a subject starting with
 * {@link E2E_SUBJECT_PREFIX}, and unsubscribes are deleted by address.
 */

export const E2E_SUBJECT_PREFIX = 'E2E community email'

/**
 * Deliverable candidate addresses on a weekend, the way the app resolves the
 * "weekend's candidates" audience: not rejected, has an address, lower-cased,
 * de-duplicated. Unsubscribes are not removed here; the spec clears its own.
 */
export async function candidateEmailsForWeekend(
  weekendId: string
): Promise<string[]> {
  const { data, error } = await adminClient()
    .from('candidate_sponsorship_info')
    .select('candidate_email, candidates!inner ( weekend_id, status )')
    .eq('candidates.weekend_id', weekendId)
    .neq('candidates.status', 'rejected')
  if (!isNil(error)) throw new Error(error.message)

  const emails = (data ?? [])
    .map((row) => row.candidate_email?.trim().toLowerCase() ?? '')
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  return [...new Set(emails)]
}

export async function findE2EBroadcast(subject: string) {
  const { data, error } = await adminClient()
    .from('email_broadcasts')
    .select('*, email_broadcast_recipients ( email, status )')
    .eq('subject', subject)
    .maybeSingle()
  if (!isNil(error)) throw new Error(error.message)
  return data
}

export async function deleteE2EBroadcasts(): Promise<void> {
  const { error } = await adminClient()
    .from('email_broadcasts')
    .delete()
    .like('subject', `${E2E_SUBJECT_PREFIX}%`)
  if (!isNil(error)) throw new Error(error.message)
}

export async function unsubscribeRows(emails: string[]) {
  const { data, error } = await adminClient()
    .from('email_unsubscribes')
    .select('email, source')
    .in('email', emails)
  if (!isNil(error)) throw new Error(error.message)
  return data ?? []
}

export async function deleteUnsubscribes(emails: string[]): Promise<void> {
  if (emails.length === 0) return
  const { error } = await adminClient()
    .from('email_unsubscribes')
    .delete()
    .in('email', emails)
  if (!isNil(error)) throw new Error(error.message)
}
