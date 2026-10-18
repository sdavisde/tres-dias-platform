import { isNil } from 'lodash'
import type { CandidateStatus, HydratedCandidate } from '@/lib/candidates/types'
import type { PaymentStatus } from '@/lib/payments/utils'
import {
  WEEKEND_CANDIDATE_CAPACITY,
  type WeekendType,
} from '@/lib/weekend/types'
import { hubPath } from '@/lib/weekend/hub'

// Pure helpers for the "Review candidates" queue. No server imports so the
// whole module stays unit-testable in Jest.

/** The query-string key that selects a candidate in the queue. */
export const CANDIDATE_PARAM = 'candidate'

/** `/weekends/<group>/mens/review-candidates[?candidate=<id>]` */
export function reviewQueuePath(
  groupId: string,
  weekendType: WeekendType,
  candidateId?: string | null
): string {
  const base = hubPath(groupId, 'review-candidates', weekendType)
  return isNil(candidateId) ? base : `${base}?${CANDIDATE_PARAM}=${candidateId}`
}

/** `/weekends/<group>/mens/review-candidates/<id>` — the full details page. */
export function candidateDetailsPath(
  groupId: string,
  weekendType: WeekendType,
  candidateId: string
): string {
  return `${hubPath(groupId, 'review-candidates', weekendType)}/${candidateId}`
}

export type PaymentOwner = 'candidate' | 'sponsor'

/**
 * What the queue page sends to the browser for each candidate: everything
 * the queue, the detail pane and the action dialogs need, and nothing a
 * reviewer without the matching permission may not see. Medical notes are
 * only present when the viewer holds medical access.
 */
export type ReviewCandidate = {
  id: string
  weekendId: string | null
  status: CandidateStatus
  /** When the sponsorship was submitted (`candidates.created_at`). */
  submittedAt: string
  name: string
  email: string | null
  sponsor: {
    name: string | null
    email: string | null
    church: string | null
    /** Free text from the sponsor form, e.g. "DTTD #7, Kerrville". */
    weekend: string | null
    contactFrequency: string | null
    paymentOwner: PaymentOwner
  }
  /** Null until the candidate has submitted their forms. */
  info: {
    age: number | null
    city: string | null
    church: string | null
    hasEmergencyContact: boolean
    campWaiverSignedAt: string | null
    hasMedicalNotes: boolean
    /** Only present for viewers with medical access. */
    medicalNotes?: string | null
  } | null
  fee: {
    status: PaymentStatus
    totalPaid: number
    totalFee: number
    balance: number
    /** The most recent payment, when there is one. */
    lastPaidAt: string | null
  }
}

function presence(value: string | null | undefined): boolean {
  return !isNil(value) && value.trim() !== ''
}

/**
 * Projects a hydrated candidate onto the client shape. `canViewMedical`
 * decides whether the medical text travels at all; the flag that notes exist
 * always does, so the row can say "on file" without revealing anything.
 */
export function toReviewCandidate(
  candidate: HydratedCandidate,
  options: { canViewMedical: boolean }
): ReviewCandidate {
  const sponsorship = candidate.candidate_sponsorship_info
  const info = candidate.candidate_info
  const fullName =
    presence(info?.first_name) || presence(info?.last_name)
      ? [info?.first_name, info?.last_name]
          .filter((part): part is string => presence(part))
          .join(' ')
      : null
  const latestPayment = (candidate.payments ?? [])
    .map((payment) => payment.created_at)
    .sort()
    .at(-1)

  return {
    id: candidate.id,
    weekendId: candidate.weekend_id,
    status: candidate.status,
    submittedAt: candidate.created_at,
    name: fullName ?? sponsorship?.candidate_name ?? 'Unnamed candidate',
    email: info?.email ?? sponsorship?.candidate_email ?? null,
    sponsor: {
      name: sponsorship?.sponsor_name ?? null,
      email: sponsorship?.sponsor_email ?? null,
      church: sponsorship?.sponsor_church ?? null,
      weekend: sponsorship?.sponsor_weekend ?? null,
      contactFrequency: sponsorship?.contact_frequency ?? null,
      paymentOwner:
        sponsorship?.payment_owner === 'sponsor' ? 'sponsor' : 'candidate',
    },
    info: isNil(info)
      ? null
      : {
          age: info.age ?? null,
          city: info.city ?? null,
          church: info.church ?? null,
          hasEmergencyContact:
            presence(info.emergency_contact_name) &&
            presence(info.emergency_contact_phone),
          campWaiverSignedAt: info.camp_waiver_signed_at ?? null,
          hasMedicalNotes: presence(info.medical_conditions),
          ...(options.canViewMedical
            ? { medicalNotes: info.medical_conditions ?? null }
            : {}),
        },
    fee: {
      status: candidate.paymentSummary.status,
      totalPaid: candidate.paymentSummary.totalPaid,
      totalFee: candidate.paymentSummary.totalFee,
      balance: candidate.paymentSummary.balance,
      lastPaidAt: latestPayment ?? null,
    },
  }
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export type QueueFilter = 'needs-review' | 'all' | 'dropped'

export const QUEUE_FILTERS: Array<{ filter: QueueFilter; label: string }> = [
  { filter: 'needs-review', label: 'Needs review' },
  { filter: 'all', label: 'All' },
  { filter: 'dropped', label: 'Dropped' },
]

/** Which candidates a queue chip shows. */
export function matchesQueueFilter(
  candidate: Pick<ReviewCandidate, 'status'>,
  filter: QueueFilter
): boolean {
  switch (filter) {
    case 'needs-review':
      return candidate.status === 'pending_approval'
    case 'dropped':
      return candidate.status === 'rejected'
    case 'all':
      return candidate.status !== 'rejected'
  }
}

/** Case-insensitive match on the candidate's name, email or sponsor. */
export function matchesQueueSearch(
  candidate: Pick<ReviewCandidate, 'name' | 'email' | 'sponsor'>,
  query: string
): boolean {
  const needle = query.trim().toLowerCase()
  if (needle === '') return true
  return [candidate.name, candidate.email, candidate.sponsor.name]
    .filter((value): value is string => !isNil(value))
    .some((value) => value.toLowerCase().includes(needle))
}

const STATUS_RANK: Record<CandidateStatus, number> = {
  pending_approval: 0,
  awaiting_payment: 1,
  awaiting_forms: 2,
  sponsored: 3,
  confirmed: 4,
  rejected: 5,
}

/** Decisions first, then the rest in workflow order, then by name. */
export function sortQueue<T extends Pick<ReviewCandidate, 'status' | 'name'>>(
  candidates: T[]
): T[] {
  return [...candidates].sort((a, b) => {
    const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status]
    return byStatus !== 0 ? byStatus : a.name.localeCompare(b.name)
  })
}

/**
 * The second line of a queue row: who sponsored them and where they are in
 * the process, phrased from the reviewer's side of the screen.
 */
export function queueSubtitle(
  candidate: Pick<ReviewCandidate, 'sponsor' | 'info' | 'fee' | 'status'>
): string {
  const sponsor = isNil(candidate.sponsor.name)
    ? 'No sponsor on file'
    : `Sponsored by ${candidate.sponsor.name}`
  return `${sponsor} · ${progressNote(candidate)}`
}

function progressNote(
  candidate: Pick<ReviewCandidate, 'info' | 'fee' | 'status'>
): string {
  if (candidate.fee.status === 'Paid') return 'fee paid'
  if (candidate.fee.status === 'Partial') return 'fee partly paid'
  if (candidate.status === 'awaiting_payment') return 'fee still pending'
  return isNil(candidate.info) ? 'forms not yet in' : 'forms complete'
}

// ---------------------------------------------------------------------------
// Status pills
// ---------------------------------------------------------------------------

export type PillTone = 'cream' | 'muted' | 'success' | 'outline'

export const STATUS_PILLS: Record<
  CandidateStatus,
  { label: string; tone: PillTone }
> = {
  sponsored: { label: 'Sponsored', tone: 'muted' },
  awaiting_forms: { label: 'Forms sent', tone: 'muted' },
  pending_approval: { label: 'Ready to review', tone: 'cream' },
  awaiting_payment: { label: 'Payment requested', tone: 'cream' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  rejected: { label: 'Dropped', tone: 'outline' },
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type PrimaryAction =
  | { kind: 'send-forms'; label: string }
  | { kind: 'approve'; label: string; resend: boolean }
  | { kind: 'none'; label: string }

/**
 * What the big button in the footer does for a candidate in this state.
 * "Approve" is the payment request: today approving a candidate means asking
 * for their fee, and the Stripe webhook confirms them once it arrives.
 */
export function primaryActionFor(
  status: CandidateStatus,
  weekendLabel: string
): PrimaryAction {
  switch (status) {
    case 'sponsored':
      return { kind: 'send-forms', label: 'Send forms' }
    case 'awaiting_forms':
      return { kind: 'send-forms', label: 'Resend forms' }
    case 'pending_approval':
      return {
        kind: 'approve',
        label: `Approve for ${weekendLabel}`,
        resend: false,
      }
    case 'awaiting_payment':
      return { kind: 'approve', label: 'Resend payment request', resend: true }
    case 'confirmed':
      return { kind: 'none', label: 'Confirmed' }
    case 'rejected':
      return { kind: 'none', label: 'Dropped' }
  }
}

/** Spots still open on the weekend: capacity minus everyone not dropped. */
export function spotsLeft(
  candidates: Array<Pick<ReviewCandidate, 'status'>>,
  capacity: number = WEEKEND_CANDIDATE_CAPACITY
): number {
  const taken = candidates.filter((c) => c.status !== 'rejected').length
  return Math.max(capacity - taken, 0)
}

/**
 * The picked candidate, or the first one the active chip shows when the
 * requested id isn't in this weekend's queue.
 */
export function resolveSelection(
  candidates: Array<Pick<ReviewCandidate, 'id' | 'status'>>,
  requested: string | null | undefined,
  filter: QueueFilter
): string | null {
  if (!isNil(requested) && candidates.some((c) => c.id === requested)) {
    return requested
  }
  return candidates.find((c) => matchesQueueFilter(c, filter))?.id ?? null
}

/** "Age 41 · Llano · Grace Fellowship Church", skipping what's unknown. */
export function candidateSubline(
  candidate: Pick<ReviewCandidate, 'info'>
): string | null {
  const info = candidate.info
  if (isNil(info)) return null
  const parts = [
    isNil(info.age) ? null : `Age ${info.age}`,
    presence(info.city) ? info.city : null,
    presence(info.church) ? info.church : null,
  ].filter((part): part is string => !isNil(part))
  return parts.length === 0 ? null : parts.join(' · ')
}
