'use server'

import { revalidatePath } from 'next/cache'
import { isNil } from 'lodash'
import { authorizedAction } from '@/lib/actions/authorized-action'
import { Permission } from '@/lib/security'
import type { Result } from '@/lib/results'
import { err, isErr, ok } from '@/lib/results'
import * as CommunityEmailService from './community-email-service'
import { verifyUnsubscribeToken } from './unsubscribe-token'
import type { User } from '@/lib/users/types'
import { canSendSomeEmail, canSendToAudience } from './audience-access'
import type {
  Audience,
  AudienceSummary,
  DraftUpdate,
  SendSummary,
} from './types'
import { AudienceSchema, DraftUpdateSchema } from './types'

/**
 * Community email actions. Admin → Email's own actions (blank drafts,
 * duplicates) need SEND_COMMUNITY_EMAIL. Everything that touches one email
 * checks the caller may send to *its* audience ({@link canSendToAudience}),
 * so a weekend leader can only work on emails to their own team. The one
 * exception is {@link unsubscribeFromCommunityEmail}, which is public by
 * design and is authorized by its signed token instead of a session.
 */

const SEND = Permission.SEND_COMMUNITY_EMAIL

/** The caller may send to the stored email's audience. */
async function canSendStored(user: User, id: string): Promise<boolean> {
  const email = await CommunityEmailService.getBroadcastForSender(id)
  return (
    !isErr(email) &&
    !isNil(email.data) &&
    canSendToAudience(user, email.data.audience)
  )
}

/** The caller may send to an audience passed in from the client. */
function canSendTo(user: User, audience: unknown): boolean {
  const parsed = AudienceSchema.safeParse(audience)
  return parsed.success && canSendToAudience(user, parsed.data)
}

function revalidatingEmail<T>(
  result: Result<string, T>,
  id?: string
): Result<string, T> {
  if (!isErr(result)) {
    revalidatePath('/admin/email')
    if (!isNil(id)) revalidatePath(`/admin/email/${id}`)
  }
  return result
}

/** Starts an empty draft and returns its id. */
export const createCommunityEmail = authorizedAction<[], string>(
  SEND,
  async (user) =>
    revalidatingEmail(await CommunityEmailService.createDraft(user))
)

/** Starts a new draft from an earlier email and returns its id. */
export const duplicateCommunityEmail = authorizedAction<[string], string>(
  SEND,
  async (user, id) =>
    revalidatingEmail(await CommunityEmailService.duplicateBroadcast(user, id))
)

/**
 * Starts a draft already addressed to `audience` (the weekend hub's and
 * Secuela's "Email …" buttons) and returns its id.
 */
export const createCommunityEmailFor = authorizedAction<[Audience], string>(
  canSendTo,
  async (user, audience) =>
    revalidatingEmail(
      await CommunityEmailService.createDraft(user, {
        subject: '',
        bodyHtml: '',
        audience: AudienceSchema.parse(audience),
      })
    )
)

/** Auto-save target for the composer. */
export const saveCommunityEmailDraft = authorizedAction<
  [string, DraftUpdate],
  true
>(
  async (user, id, update) =>
    canSendTo(user, update?.audience) && (await canSendStored(user, id)),
  async (_user, id, update) => {
    const parsed = DraftUpdateSchema.safeParse(update)
    if (!parsed.success) return err('The email could not be saved')
    return revalidatingEmail(
      await CommunityEmailService.saveDraft(id, parsed.data),
      id
    )
  }
)

export const deleteCommunityEmailDraft = authorizedAction<[string], true>(
  canSendStored,
  async (_user, id) =>
    revalidatingEmail(await CommunityEmailService.deleteDraft(id))
)

export type AudiencePreview = {
  count: number
  missingEmailCount: number
  unsubscribedCount: number
  people: { name: string | null; email: string }[]
}

function toPreview(summary: AudienceSummary): AudiencePreview {
  return {
    count: summary.recipients.length,
    missingEmailCount: summary.missingEmailCount,
    unsubscribedCount: summary.unsubscribedCount,
    people: summary.recipients.map(({ name, email }) => ({ name, email })),
  }
}

/** The live "N people will receive this" line under the audience picker. */
export const previewCommunityEmailAudience = authorizedAction<
  [unknown],
  AudiencePreview
>(canSendTo, async (_user, audience) => {
  const parsed = AudienceSchema.safeParse(audience)
  if (!parsed.success) return err('Choose who this email goes to')
  const summary = await CommunityEmailService.summarizeRecipients(parsed.data)
  if (isErr(summary)) return summary
  return ok(toPreview(summary.data))
})

/** The email as it will arrive, for the composer's Preview tab. */
export const renderCommunityEmailPreview = authorizedAction<
  [Pick<DraftUpdate, 'subject' | 'bodyHtml'>],
  string
>(canSendSomeEmail, async (user, update) =>
  CommunityEmailService.renderPreview(
    { subject: update.subject ?? '', bodyHtml: update.bodyHtml ?? '' },
    user
  )
)

/** Sends the draft to the signed-in sender only. Returns their address. */
export const sendCommunityEmailTest = authorizedAction<
  [Pick<DraftUpdate, 'subject' | 'bodyHtml'>],
  string
>(canSendSomeEmail, async (user, update) =>
  CommunityEmailService.sendTest(user, {
    subject: update.subject ?? '',
    bodyHtml: update.bodyHtml ?? '',
  })
)

export const sendCommunityEmail = authorizedAction<[string], SendSummary>(
  canSendStored,
  async (user, id) =>
    revalidatingEmail(await CommunityEmailService.sendBroadcast(user, id), id)
)

/**
 * The unsubscribe page's button. Public: the signed token proves the caller
 * received a community email at that address.
 */
export async function unsubscribeFromCommunityEmail(
  token: string
): Promise<Result<string, string>> {
  const email = verifyUnsubscribeToken(token)
  if (isNil(email)) return err('This unsubscribe link is not valid')

  const result = await CommunityEmailService.unsubscribe(email, 'link')
  if (isErr(result)) return result
  return ok(email)
}
