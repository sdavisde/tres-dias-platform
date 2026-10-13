import 'server-only'

import { isNil } from 'lodash'
import { render } from '@react-email/render'
import CommunityEmail from '@/components/email/CommunityEmail'
import { getUrl } from '@/lib/url'
import { logger } from '@/lib/logger'
import type { Result } from '@/lib/results'
import { err, isErr, ok } from '@/lib/results'
import type { User } from '@/lib/users/types'
import { COMMUNITY_DISPLAY_NAME } from '@/lib/weekend/constants'
import { formatWeekendLabelFor } from '@/lib/weekend'
import type { WeekendType } from '@/lib/weekend/types'
import { getSystemEmailFrom } from '@/services/settings/settings-service'
import {
  BATCH_SEND_LIMIT,
  sendBatchEmails,
  sendEmail,
} from '@/services/notifications/email-client'
import * as Repository from './repository'
import {
  isBodyEmpty,
  personalize,
  personalizeSubject,
  sanitizeBody,
  UNSUBSCRIBE_URL_PLACEHOLDER,
} from './content'
import {
  chunk,
  finalStatus,
  isDeliverable,
  resolveDeliveryMode,
  summarizeAudience,
} from './recipients'
import { createUnsubscribeToken, normalizeEmail } from './unsubscribe-token'
import type {
  Audience,
  AudienceOptions,
  AudienceSummary,
  Broadcast,
  BroadcastRecipient,
  BroadcastStatus,
  DeliveryMode,
  DraftUpdate,
  Recipient,
  RecipientStatus,
  SendSummary,
} from './types'
import { parseAudience } from './types'

/** Resend allows a few requests a second; spacing batches keeps us under it. */
const PAUSE_BETWEEN_BATCHES_MS = 600

export { isMissingTableError } from './errors'

function fullName(person: Repository.RawBroadcast['creator']): string | null {
  if (isNil(person)) return null
  const name = [person.first_name, person.last_name]
    .filter((part) => !isNil(part) && part.trim() !== '')
    .join(' ')
  return name === '' ? null : name
}

function toBroadcast(raw: Repository.RawBroadcast): Broadcast {
  return {
    id: raw.id,
    subject: raw.subject,
    bodyHtml: raw.body_html,
    audience: parseAudience(raw.audience),
    status: raw.status as BroadcastStatus,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    sentAt: raw.sent_at,
    createdByName: fullName(raw.creator),
    sentByName: fullName(raw.sender),
    recipientCount: raw.recipient_count,
    sentCount: raw.sent_count,
    failedCount: raw.failed_count,
    skippedCount: raw.skipped_count,
  }
}

export async function listBroadcasts(): Promise<Result<string, Broadcast[]>> {
  const result = await Repository.findBroadcasts()
  if (isErr(result)) return result
  return ok(result.data.map(toBroadcast))
}

export async function getBroadcast(
  id: string
): Promise<Result<string, Broadcast | null>> {
  const result = await Repository.findBroadcastById(id)
  if (isErr(result)) return result
  return ok(isNil(result.data) ? null : toBroadcast(result.data))
}

export async function getRecipients(
  broadcastId: string
): Promise<Result<string, BroadcastRecipient[]>> {
  const result = await Repository.findRecipients(broadcastId)
  if (isErr(result)) return result
  return ok(
    result.data.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      status: row.status as RecipientStatus,
      errorSummary: row.error_summary,
    }))
  )
}

export async function createDraft(
  user: User,
  from?: Pick<DraftUpdate, 'subject' | 'bodyHtml' | 'audience'>
): Promise<Result<string, string>> {
  return Repository.insertDraft({
    createdByUserId: user.id,
    subject: from?.subject ?? '',
    bodyHtml: sanitizeBody(from?.bodyHtml ?? ''),
    audience: from?.audience ?? { type: 'community' },
  })
}

/** Starts a new draft from an earlier email's subject, body and audience. */
export async function duplicateBroadcast(
  user: User,
  id: string
): Promise<Result<string, string>> {
  const existing = await getBroadcast(id)
  if (isErr(existing)) return existing
  if (isNil(existing.data)) return err('That email no longer exists')

  const { subject, bodyHtml, audience } = existing.data
  return createDraft(user, { subject, bodyHtml, audience })
}

export async function saveDraft(
  id: string,
  update: DraftUpdate
): Promise<Result<string, true>> {
  return Repository.updateDraft(id, {
    ...update,
    bodyHtml: sanitizeBody(update.bodyHtml),
  })
}

export async function deleteDraft(id: string): Promise<Result<string, true>> {
  return Repository.softDeleteDraft(id)
}

// ---------------------------------------------------------------------------
// Audiences
// ---------------------------------------------------------------------------

async function resolveMembers(audience: Audience) {
  switch (audience.type) {
    case 'community':
      return Repository.findCommunityMembers(audience.gender)
    case 'weekend_team':
      return Repository.findWeekendTeamMembers(audience.weekendId)
    case 'weekend_candidates':
      return Repository.findWeekendCandidateContacts(
        audience.weekendId,
        'candidates'
      )
    case 'weekend_sponsors':
      return Repository.findWeekendCandidateContacts(
        audience.weekendId,
        'sponsors'
      )
    case 'role':
      return Repository.findRoleMembers(audience.roleId)
  }
}

/** Who an audience reaches right now, after unsubscribes and duplicates. */
export async function summarizeRecipients(
  audience: Audience
): Promise<Result<string, AudienceSummary>> {
  const [members, unsubscribed] = await Promise.all([
    resolveMembers(audience),
    Repository.findUnsubscribedEmails(),
  ])
  if (isErr(members)) return members
  if (isErr(unsubscribed)) return unsubscribed

  return ok(summarizeAudience(members.data, new Set(unsubscribed.data)))
}

export async function getAudienceOptions(): Promise<
  Result<string, AudienceOptions>
> {
  const [weekends, roles] = await Promise.all([
    Repository.findWeekendsForPicker(),
    Repository.findRolesForPicker(),
  ])
  if (isErr(weekends)) return weekends
  if (isErr(roles)) return roles

  return ok({
    weekends: weekends.data.map((weekend) => ({
      id: weekend.id,
      status: weekend.status,
      label: formatWeekendLabelFor({
        number: weekend.weekend_groups?.number,
        gender: weekend.type as WeekendType,
      }),
    })),
    roles: roles.data,
  })
}

/** How sends behave on this deployment, for the confirm dialog. */
export function getDeliveryMode(sender: User): DeliveryMode {
  return resolveDeliveryMode(process.env, sender.email)
}

// ---------------------------------------------------------------------------
// Rendering and sending
// ---------------------------------------------------------------------------

type RenderedEmail = { html: string; text: string }

/** Renders the layout once; {@link personalize} fills each copy. */
async function renderEmail(
  subject: string,
  bodyHtml: string
): Promise<RenderedEmail> {
  const element = CommunityEmail({
    communityName: COMMUNITY_DISPLAY_NAME,
    bodyHtml: sanitizeBody(bodyHtml),
    previewText: subject,
    unsubscribeUrl: UNSUBSCRIBE_URL_PLACEHOLDER,
  })
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ])
  return { html, text }
}

function unsubscribeUrlFor(email: string): string {
  return getUrl(
    `/unsubscribe?t=${encodeURIComponent(createUnsubscribeToken(email))}`
  )
}

function oneClickUrlFor(email: string): string {
  return getUrl(
    `/api/email/unsubscribe?t=${encodeURIComponent(createUnsubscribeToken(email))}`
  )
}

/** The preview pane: the email as one recipient would see it. */
export async function renderPreview(
  update: Pick<DraftUpdate, 'subject' | 'bodyHtml'>,
  viewer: User
): Promise<Result<string, string>> {
  const rendered = await renderEmail(update.subject, update.bodyHtml)
  return ok(
    personalize(rendered.html, {
      firstName: viewer.firstName ?? null,
      unsubscribeUrl: '#',
    })
  )
}

function validateForSending(subject: string, bodyHtml: string): string | null {
  if (subject.trim() === '') return 'Add a subject before sending'
  if (isBodyEmpty(bodyHtml)) return 'Write a message before sending'
  return null
}

type BuiltEmail = {
  from: string
  to: string
  replyTo?: string
  subject: string
  html: string
  text: string
  headers: Record<string, string>
}

function buildEmail(
  from: string,
  replyTo: string | null,
  subject: string,
  rendered: RenderedEmail,
  recipient: Pick<Recipient, 'email' | 'firstName'>
): BuiltEmail {
  const values = {
    firstName: recipient.firstName,
    unsubscribeUrl: unsubscribeUrlFor(recipient.email),
  }
  return {
    from,
    to: recipient.email,
    ...(isNil(replyTo) ? {} : { replyTo }),
    subject: personalizeSubject(subject, recipient.firstName),
    html: personalize(rendered.html, values),
    text: personalize(rendered.text, values),
    headers: {
      'List-Unsubscribe': `<${oneClickUrlFor(recipient.email)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  }
}

/** Sends the current draft to the sender only, marked as a test. */
export async function sendTest(
  sender: User,
  update: Pick<DraftUpdate, 'subject' | 'bodyHtml'>
): Promise<Result<string, string>> {
  if (isNil(sender.email)) return err('Your account has no email address')
  const problem = validateForSending(update.subject, update.bodyHtml)
  if (!isNil(problem)) return err(problem)

  const [rendered, from] = await Promise.all([
    renderEmail(update.subject, update.bodyHtml),
    getSystemEmailFrom(),
  ])
  const email = buildEmail(from, null, `[Test] ${update.subject}`, rendered, {
    email: sender.email,
    firstName: sender.firstName ?? null,
  })

  const result = await sendEmail('community-email-test', email)
  if (isErr(result)) return result
  return ok(sender.email)
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Sends a draft to its audience.
 *
 * 1. Claims the draft (draft → sending) so it can only be sent once.
 * 2. Resolves the audience now, minus unsubscribes and duplicates.
 * 3. Applies the delivery mode: off production, only the sender (and the
 *    allowlist) are emailed and everyone else is recorded as skipped.
 * 4. Sends in Resend batches of 100, recording every recipient's outcome.
 */
export async function sendBroadcast(
  sender: User,
  id: string
): Promise<Result<string, SendSummary>> {
  const claimed = await Repository.claimDraftForSending(id, sender.id)
  if (isErr(claimed)) return claimed
  if (isNil(claimed.data)) return err('This email has already been sent')
  const draft = claimed.data

  const problem = validateForSending(draft.subject, draft.body_html)
  if (!isNil(problem)) {
    await Repository.releaseClaim(id)
    return err(problem)
  }

  const summary = await summarizeRecipients(parseAudience(draft.audience))
  if (isErr(summary)) {
    await Repository.releaseClaim(id)
    return summary
  }
  const recipients = summary.data.recipients
  if (recipients.length === 0) {
    await Repository.releaseClaim(id)
    return err('Nobody in this group can receive email')
  }

  const mode = getDeliveryMode(sender)
  const [rendered, from] = await Promise.all([
    renderEmail(draft.subject, draft.body_html),
    getSystemEmailFrom(),
  ])
  const replyTo = isNil(sender.email) ? null : normalizeEmail(sender.email)

  const deliverable = recipients.filter((r) => isDeliverable(mode, r.email))
  const skipped = recipients.filter((r) => !isDeliverable(mode, r.email))

  const rows: Repository.RecipientRow[] = skipped.map((recipient) => ({
    email: recipient.email,
    name: recipient.name,
    userId: recipient.userId,
    status: 'skipped',
    resendMessageId: null,
    errorSummary: 'Not sent: non-production deployment',
  }))

  const batches = chunk(deliverable, BATCH_SEND_LIMIT)
  for (const [index, batch] of batches.entries()) {
    if (index > 0) await sleep(PAUSE_BETWEEN_BATCHES_MS)

    const result = await sendBatchEmails(
      'community-email',
      batch.map((recipient) =>
        buildEmail(from, replyTo, draft.subject, rendered, recipient)
      ),
      `community-email-${id}-${index}`
    )

    batch.forEach((recipient, position) => {
      rows.push({
        email: recipient.email,
        name: recipient.name,
        userId: recipient.userId,
        status: isErr(result) ? 'failed' : 'sent',
        resendMessageId: isErr(result) ? null : (result.data[position] ?? null),
        errorSummary: isErr(result) ? result.error : null,
      })
    })

    if (isErr(result)) {
      logger.error(
        { broadcastId: id, batch: index, error: result.error },
        'Community email: a batch failed'
      )
    }
  }

  const sendSummary: SendSummary = {
    recipientCount: recipients.length,
    sentCount: rows.filter((row) => row.status === 'sent').length,
    failedCount: rows.filter((row) => row.status === 'failed').length,
    skippedCount: rows.filter((row) => row.status === 'skipped').length,
  }

  const recorded = await Repository.insertRecipients(id, rows)
  if (isErr(recorded)) {
    logger.error(
      { broadcastId: id, error: recorded.error },
      'Community email: recipients could not be recorded'
    )
  }

  const finished = await Repository.finishSend(
    id,
    finalStatus(sendSummary),
    sendSummary
  )
  if (isErr(finished)) return finished

  return ok(sendSummary)
}

// ---------------------------------------------------------------------------
// Unsubscribing
// ---------------------------------------------------------------------------

export async function unsubscribe(
  email: string,
  source: 'link' | 'one_click'
): Promise<Result<string, true>> {
  return Repository.insertUnsubscribe(normalizeEmail(email), source)
}
