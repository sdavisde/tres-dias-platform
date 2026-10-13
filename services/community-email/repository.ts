import 'server-only'

import { isNil } from 'lodash'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { Result } from '@/lib/results'
import { err, ok } from '@/lib/results'
import type { Tables } from '@/database.types'
import type {
  AudienceMember,
  RecipientStatus,
  SendSummary,
  DraftUpdate,
} from './types'

/**
 * Community email data access.
 *
 * Reads of emails go through the session client, so RLS (READ_COMMUNITY_EMAIL
 * or SEND_COMMUNITY_EMAIL) still applies. Writes, and the audience lookups a
 * send needs (rosters, candidates, roles), use the service-role client: they
 * only run behind SEND_COMMUNITY_EMAIL-gated actions, and a sender must reach
 * every address in the group even without permission to read, say, candidate
 * contact details.
 */

type PersonName = { first_name: string | null; last_name: string | null }

export type RawBroadcast = Tables<'email_broadcasts'> & {
  creator: PersonName | null
  sender: PersonName | null
}

const BROADCAST_SELECT = `
  *,
  creator:users!email_broadcasts_created_by_user_id_fkey ( first_name, last_name ),
  sender:users!email_broadcasts_sent_by_user_id_fkey ( first_name, last_name )
`

export async function findBroadcasts(): Promise<
  Result<string, RawBroadcast[]>
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('email_broadcasts')
    .select(BROADCAST_SELECT)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (!isNil(error)) return err(error.message)
  return ok((data ?? []) as RawBroadcast[])
}

export async function findBroadcastById(
  id: string
): Promise<Result<string, RawBroadcast | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('email_broadcasts')
    .select(BROADCAST_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!isNil(error)) return err(error.message)
  return ok((data ?? null) as RawBroadcast | null)
}

export async function insertDraft(values: {
  createdByUserId: string
  subject: string
  bodyHtml: string
  audience: DraftUpdate['audience']
}): Promise<Result<string, string>> {
  const { data, error } = await createAdminClient()
    .from('email_broadcasts')
    .insert({
      created_by_user_id: values.createdByUserId,
      subject: values.subject,
      body_html: values.bodyHtml,
      audience: values.audience,
      status: 'draft',
    })
    .select('id')
    .single()

  if (!isNil(error)) return err(error.message)
  if (isNil(data)) return err('The draft was not created')
  return ok(data.id)
}

/** Writes a draft's editable fields. Fails once the email has been sent. */
export async function updateDraft(
  id: string,
  values: DraftUpdate
): Promise<Result<string, true>> {
  const { data, error } = await createAdminClient()
    .from('email_broadcasts')
    .update({
      subject: values.subject,
      body_html: values.bodyHtml,
      audience: values.audience,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'draft')
    .is('deleted_at', null)
    .select('id')

  if (!isNil(error)) return err(error.message)
  if (isNil(data) || data.length === 0) {
    return err('This email has already been sent and can no longer be edited')
  }
  return ok(true)
}

export async function softDeleteDraft(
  id: string
): Promise<Result<string, true>> {
  const { data, error } = await createAdminClient()
    .from('email_broadcasts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'draft')
    .is('deleted_at', null)
    .select('id')

  if (!isNil(error)) return err(error.message)
  if (isNil(data) || data.length === 0) {
    return err('Only drafts can be deleted')
  }
  return ok(true)
}

/**
 * Moves a draft to `sending` and returns it, or null when it is not a draft
 * any more. The conditional update is the guard against a double send: two
 * clicks (or two admins) can't both claim the same draft.
 */
export async function claimDraftForSending(
  id: string,
  senderUserId: string
): Promise<Result<string, Tables<'email_broadcasts'> | null>> {
  const { data, error } = await createAdminClient()
    .from('email_broadcasts')
    .update({
      status: 'sending',
      sent_by_user_id: senderUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'draft')
    .is('deleted_at', null)
    .select('*')
    .maybeSingle()

  if (!isNil(error)) return err(error.message)
  return ok(data ?? null)
}

/** Puts a claimed email back to draft when the send could not start at all. */
export async function releaseClaim(id: string): Promise<Result<string, true>> {
  const { error } = await createAdminClient()
    .from('email_broadcasts')
    .update({ status: 'draft', sent_by_user_id: null })
    .eq('id', id)
    .eq('status', 'sending')

  if (!isNil(error)) return err(error.message)
  return ok(true)
}

export async function finishSend(
  id: string,
  status: 'sent' | 'failed',
  summary: SendSummary
): Promise<Result<string, true>> {
  const now = new Date().toISOString()
  const { error } = await createAdminClient()
    .from('email_broadcasts')
    .update({
      status,
      sent_at: now,
      updated_at: now,
      recipient_count: summary.recipientCount,
      sent_count: summary.sentCount,
      failed_count: summary.failedCount,
      skipped_count: summary.skippedCount,
    })
    .eq('id', id)

  if (!isNil(error)) return err(error.message)
  return ok(true)
}

export type RecipientRow = {
  email: string
  name: string | null
  userId: string | null
  status: RecipientStatus
  resendMessageId: string | null
  errorSummary: string | null
}

export async function insertRecipients(
  broadcastId: string,
  rows: RecipientRow[]
): Promise<Result<string, true>> {
  if (rows.length === 0) return ok(true)

  const { error } = await createAdminClient()
    .from('email_broadcast_recipients')
    .insert(
      rows.map((row) => ({
        broadcast_id: broadcastId,
        email: row.email,
        name: row.name,
        user_id: row.userId,
        status: row.status,
        resend_message_id: row.resendMessageId,
        error_summary: row.errorSummary,
      }))
    )

  if (!isNil(error)) return err(error.message)
  return ok(true)
}

export async function findRecipients(
  broadcastId: string
): Promise<Result<string, Tables<'email_broadcast_recipients'>[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('email_broadcast_recipients')
    .select('*')
    .eq('broadcast_id', broadcastId)
    .order('name', { ascending: true, nullsFirst: false })

  if (!isNil(error)) return err(error.message)
  return ok(data ?? [])
}

// ---------------------------------------------------------------------------
// Audiences
// ---------------------------------------------------------------------------

function fullName(person: PersonName | null): string | null {
  if (isNil(person)) return null
  const name = [person.first_name, person.last_name]
    .filter((part) => !isNil(part) && part.trim() !== '')
    .join(' ')
  return name === '' ? null : name
}

type UserContact = PersonName & { id: string; email: string | null }

function userToMember(user: UserContact): AudienceMember {
  return {
    email: user.email,
    name: fullName(user),
    firstName: user.first_name,
    userId: user.id,
  }
}

/** First word of a free-text name, for {{first_name}}. */
function firstWord(name: string | null): string | null {
  if (isNil(name)) return null
  const [first] = name.trim().split(/\s+/)
  return first === '' || isNil(first) ? null : first
}

export async function findCommunityMembers(
  gender?: 'male' | 'female'
): Promise<Result<string, AudienceMember[]>> {
  let query = createAdminClient()
    .from('users')
    .select('id, first_name, last_name, email')
    .order('last_name', { ascending: true })

  if (!isNil(gender)) query = query.eq('gender', gender)

  const { data, error } = await query
  if (!isNil(error)) return err(error.message)
  return ok((data ?? []).map(userToMember))
}

/** Everyone on a weekend's roster who has not dropped. */
export async function findWeekendTeamMembers(
  weekendId: string
): Promise<Result<string, AudienceMember[]>> {
  const { data, error } = await createAdminClient()
    .from('weekend_roster')
    .select('users ( id, first_name, last_name, email )')
    .eq('weekend_id', weekendId)
    .or('status.is.null,status.neq.drop')

  if (!isNil(error)) return err(error.message)
  return ok(
    (data ?? [])
      .map((row) => row.users as UserContact | null)
      .filter((user): user is UserContact => !isNil(user))
      .map(userToMember)
  )
}

/**
 * Candidate and sponsor contacts from the sponsorship form, for every
 * candidate on a weekend who has not been turned down.
 */
export async function findWeekendCandidateContacts(
  weekendId: string,
  who: 'candidates' | 'sponsors'
): Promise<Result<string, AudienceMember[]>> {
  const { data, error } = await createAdminClient()
    .from('candidate_sponsorship_info')
    .select(
      'candidate_name, candidate_email, sponsor_name, sponsor_email, candidates!inner ( weekend_id, status )'
    )
    .eq('candidates.weekend_id', weekendId)
    .neq('candidates.status', 'rejected')

  if (!isNil(error)) return err(error.message)
  return ok(
    (data ?? []).map((row) => {
      const name = who === 'candidates' ? row.candidate_name : row.sponsor_name
      return {
        email: who === 'candidates' ? row.candidate_email : row.sponsor_email,
        name,
        firstName: firstWord(name),
        userId: null,
      }
    })
  )
}

export async function findRoleMembers(
  roleId: string
): Promise<Result<string, AudienceMember[]>> {
  const { data, error } = await createAdminClient()
    .from('user_roles')
    .select('users ( id, first_name, last_name, email )')
    .eq('role_id', roleId)

  if (!isNil(error)) return err(error.message)
  return ok(
    (data ?? [])
      .map((row) => row.users as UserContact | null)
      .filter((user): user is UserContact => !isNil(user))
      .map(userToMember)
  )
}

export async function findUnsubscribedEmails(): Promise<
  Result<string, string[]>
> {
  const { data, error } = await createAdminClient()
    .from('email_unsubscribes')
    .select('email')

  if (!isNil(error)) return err(error.message)
  return ok((data ?? []).map((row) => row.email))
}

/** Idempotent: unsubscribing twice keeps the first row. */
export async function insertUnsubscribe(
  email: string,
  source: 'link' | 'one_click'
): Promise<Result<string, true>> {
  const { error } = await createAdminClient()
    .from('email_unsubscribes')
    .upsert({ email, source }, { onConflict: 'email', ignoreDuplicates: true })

  if (!isNil(error)) return err(error.message)
  return ok(true)
}

export async function findWeekendsForPicker(): Promise<
  Result<
    string,
    {
      id: string
      type: Tables<'weekends'>['type']
      status: string | null
      start_date: string
      weekend_groups: { number: number | null } | null
    }[]
  >
> {
  const { data, error } = await createAdminClient()
    .from('weekends')
    .select('id, type, status, start_date, weekend_groups ( number )')
    .order('start_date', { ascending: false })

  if (!isNil(error)) return err(error.message)
  return ok(data ?? [])
}

export async function findRolesForPicker(): Promise<
  Result<string, { id: string; label: string }[]>
> {
  const { data, error } = await createAdminClient()
    .from('roles')
    .select('id, label')
    .order('label', { ascending: true })

  if (!isNil(error)) return err(error.message)
  return ok(data ?? [])
}
