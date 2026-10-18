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

/**
 * Deliverable addresses on a weekend's team, the way the app resolves the
 * "weekend team" audience: roster rows not dropped, lower-cased, de-duplicated.
 */
export async function teamEmailsForWeekend(
  weekendId: string
): Promise<string[]> {
  const { data, error } = await adminClient()
    .from('weekend_roster')
    .select('status, users ( email )')
    .eq('weekend_id', weekendId)
  if (!isNil(error)) throw new Error(error.message)

  const emails = (data ?? [])
    .filter((row) => row.status !== 'drop')
    .map((row) => row.users?.email?.trim().toLowerCase() ?? '')
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  return [...new Set(emails)]
}

/** A sent community email (with one recipient) for the read-only specs. */
export async function insertSentE2EBroadcast(
  subject: string,
  createdByUserId: string
): Promise<string> {
  const admin = adminClient()
  const { data, error } = await admin
    .from('email_broadcasts')
    .insert({
      subject,
      body_html: '<p>Sent by the e2e suite.</p>',
      audience: { type: 'community' },
      status: 'sent',
      created_by_user_id: createdByUserId,
      sent_by_user_id: createdByUserId,
      sent_at: new Date().toISOString(),
      recipient_count: 1,
      skipped_count: 1,
    })
    .select('id')
    .single()
  if (!isNil(error) || isNil(data)) {
    throw new Error(error?.message ?? 'broadcast not inserted')
  }

  const recipient = await admin.from('email_broadcast_recipients').insert({
    broadcast_id: data.id,
    email: 'e2e-recipient@example.org',
    name: 'E2E Recipient',
    status: 'skipped',
  })
  if (!isNil(recipient.error)) throw new Error(recipient.error.message)
  return data.id
}

/** Drafts the "Email" buttons started; they have no subject to match on. */
export async function deleteDraftsBy(userIds: string[]): Promise<void> {
  const { error } = await adminClient()
    .from('email_broadcasts')
    .delete()
    .eq('status', 'draft')
    .in('created_by_user_id', userIds)
  if (!isNil(error)) throw new Error(error.message)
}

export async function unsubscribe(email: string): Promise<void> {
  const { error } = await adminClient()
    .from('email_unsubscribes')
    .upsert(
      { email: email.toLowerCase(), source: 'link' },
      { onConflict: 'email' }
    )
  if (!isNil(error)) throw new Error(error.message)
}
