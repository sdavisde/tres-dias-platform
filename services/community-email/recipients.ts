import { isNil } from 'lodash'
import type {
  AudienceMember,
  AudienceSummary,
  DeliveryMode,
  Recipient,
} from './types'
import { normalizeEmail } from './unsubscribe-token'

/**
 * Pure recipient rules, kept apart from the database so they are unit-tested
 * directly: address validation, de-duplication, unsubscribes, and the
 * non-production safety rail.
 */

// Deliberately loose: Resend rejects a whole batch on one bad address, so this
// only filters what is clearly not an address (blank, no @, spaces).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isUsableEmail(email: string | null | undefined): boolean {
  return !isNil(email) && EMAIL_PATTERN.test(email.trim())
}

/**
 * Turns the raw members of an audience into deliverable recipients: drops
 * people without a usable address, keeps the first entry per address, and
 * removes unsubscribed addresses. Order follows the input.
 */
export function summarizeAudience(
  members: AudienceMember[],
  unsubscribed: ReadonlySet<string>
): AudienceSummary {
  const seen = new Set<string>()
  const recipients: Recipient[] = []
  let missingEmailCount = 0
  let unsubscribedCount = 0

  for (const member of members) {
    if (!isUsableEmail(member.email)) {
      missingEmailCount += 1
      continue
    }
    const email = normalizeEmail(member.email as string)
    if (seen.has(email)) continue
    seen.add(email)

    if (unsubscribed.has(email)) {
      unsubscribedCount += 1
      continue
    }
    recipients.push({
      email,
      name: member.name,
      firstName: member.firstName,
      userId: member.userId,
    })
  }

  return { recipients, missingEmailCount, unsubscribedCount }
}

/**
 * Production deployments email everyone. Every other deployment (Vercel
 * previews, which share the production database, local dev, CI) emails only
 * the sender plus `COMMUNITY_EMAIL_SANDBOX_ALLOWLIST`, so trying the feature
 * out can never mail the real community. `COMMUNITY_EMAIL_LIVE_SENDS=true`
 * turns the rail off on a non-production deployment on purpose.
 */
export function resolveDeliveryMode(
  env: Record<string, string | undefined>,
  senderEmail: string | null
): DeliveryMode {
  if (
    env.VERCEL_ENV === 'production' ||
    env.COMMUNITY_EMAIL_LIVE_SENDS === 'true'
  ) {
    return { kind: 'live' }
  }

  const allowlist = (env.COMMUNITY_EMAIL_SANDBOX_ALLOWLIST ?? '')
    .split(',')
    .map((entry) => normalizeEmail(entry))
    .filter((entry) => entry.length > 0)

  const allowed = isNil(senderEmail)
    ? allowlist
    : [normalizeEmail(senderEmail), ...allowlist]

  return { kind: 'sandbox', allowed: [...new Set(allowed)] }
}

export function isDeliverable(mode: DeliveryMode, email: string): boolean {
  return mode.kind === 'live' || mode.allowed.includes(normalizeEmail(email))
}

/** `draft` never comes out of a send; `failed` only when nothing went out. */
export function finalStatus(summary: {
  sentCount: number
  failedCount: number
}): 'sent' | 'failed' {
  return summary.sentCount === 0 && summary.failedCount > 0 ? 'failed' : 'sent'
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}
