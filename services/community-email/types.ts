import { z } from 'zod'

/**
 * Who a community email goes to. Stored as JSON on `email_broadcasts.audience`
 * and resolved to addresses only at send time, so a draft written on Monday
 * reaches whoever is on the team when it is sent on Friday.
 */
export const AudienceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('community'),
    /** Narrow the whole community to men or women. Absent means everyone. */
    gender: z.enum(['male', 'female']).optional(),
  }),
  z.object({ type: z.literal('weekend_team'), weekendId: z.string() }),
  z.object({ type: z.literal('weekend_candidates'), weekendId: z.string() }),
  z.object({ type: z.literal('weekend_sponsors'), weekendId: z.string() }),
  z.object({ type: z.literal('role'), roleId: z.string() }),
])

export type Audience = z.infer<typeof AudienceSchema>
export type AudienceType = Audience['type']

export const DEFAULT_AUDIENCE: Audience = { type: 'community' }

export const AUDIENCE_TYPE_LABELS: Record<AudienceType, string> = {
  community: 'Whole community',
  weekend_team: 'A weekend team',
  weekend_candidates: "A weekend's candidates",
  weekend_sponsors: "Sponsors of a weekend's candidates",
  role: 'People with a community role',
}

/** Parses a stored audience, falling back to the whole community. */
export function parseAudience(value: unknown): Audience {
  const parsed = AudienceSchema.safeParse(value)
  return parsed.success ? parsed.data : DEFAULT_AUDIENCE
}

export type BroadcastStatus = 'draft' | 'sending' | 'sent' | 'failed'
export type RecipientStatus = 'sent' | 'failed' | 'skipped'

export type Broadcast = {
  id: string
  subject: string
  bodyHtml: string
  audience: Audience
  status: BroadcastStatus
  createdAt: string
  updatedAt: string
  sentAt: string | null
  createdByName: string | null
  sentByName: string | null
  recipientCount: number
  sentCount: number
  failedCount: number
  skippedCount: number
}

export type BroadcastRecipient = {
  id: string
  email: string
  name: string | null
  status: RecipientStatus
  errorSummary: string | null
}

/** One person an audience resolved to, before unsubscribes are removed. */
export type AudienceMember = {
  email: string | null
  name: string | null
  firstName: string | null
  userId: string | null
}

/** A deliverable address: valid, de-duplicated, not unsubscribed. */
export type Recipient = {
  email: string
  name: string | null
  firstName: string | null
  userId: string | null
}

export type AudienceSummary = {
  /** Who will be emailed. */
  recipients: Recipient[]
  /** People in the group with no usable email address. */
  missingEmailCount: number
  /** People in the group who unsubscribed from community email. */
  unsubscribedCount: number
}

/** Choices for the audience picker. */
export type AudienceOptions = {
  weekends: { id: string; label: string; status: string | null }[]
  roles: { id: string; label: string }[]
}

/** The editable part of a draft; what auto-save sends. */
export const DraftUpdateSchema = z.object({
  subject: z.string().max(200),
  bodyHtml: z.string().max(200_000),
  audience: AudienceSchema,
})

export type DraftUpdate = z.infer<typeof DraftUpdateSchema>

/** How a send is delivered on this deployment. */
export type DeliveryMode =
  | { kind: 'live' }
  /**
   * Non-production: only these (lower-cased) addresses are actually emailed;
   * everyone else is recorded as skipped.
   */
  | { kind: 'sandbox'; allowed: string[] }

export type SendSummary = {
  recipientCount: number
  sentCount: number
  failedCount: number
  skippedCount: number
}
