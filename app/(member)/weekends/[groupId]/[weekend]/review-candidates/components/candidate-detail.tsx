'use client'

import Link from 'next/link'
import { isNil } from 'lodash'
import {
  Check,
  CircleDashed,
  Ellipsis,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  candidateSubline,
  primaryActionFor,
  type PrimaryAction,
  type ReviewCandidate,
} from '@/lib/candidates/review'
import { formatCurrency } from '@/lib/payments/formatters'
import { cn, formatShortDate } from '@/lib/utils'
import { WEEKEND_CANDIDATE_CAPACITY } from '@/lib/weekend/types'
import { ReviewStatusPill } from './review-status-pill'

export type DetailActions = {
  onPrimary: (action: PrimaryAction) => void
  onSendForms: () => void
  onMove: () => void
  onRecordPayment: () => void
  onReject: () => void
  onViewMedical: () => void
}

type CandidateDetailProps = {
  candidate: ReviewCandidate
  /** "Men's #12" — for the Approve button label. */
  weekendLabel: string
  detailsHref: string
  spotsLeft: number
  canEdit: boolean
  canEditPayments: boolean
  canViewMedical: boolean
  actions: DetailActions
  /** Tighter chrome inside the phone sheet. */
  compact?: boolean
}

/**
 * The right pane: who the candidate is, what their sponsor said, which forms
 * and fees are in, the gated medical row, and the decision bar.
 */
export function CandidateDetail({
  candidate,
  weekendLabel,
  detailsHref,
  spotsLeft,
  canEdit,
  canEditPayments,
  canViewMedical,
  actions,
  compact = false,
}: CandidateDetailProps) {
  const subline = candidateSubline(candidate)
  const primary = primaryActionFor(candidate.status, weekendLabel)
  const formsIn = !isNil(candidate.info)
  const feeLine = describeFee(candidate)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto',
          compact ? 'px-4 py-4' : 'px-5 py-5 lg:px-8'
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="font-serif text-[26px] leading-tight font-semibold tracking-tight break-words">
              {candidate.name}
            </h2>
            <p className="text-[14.5px] text-muted-foreground">
              {subline ?? candidate.email ?? 'Forms not submitted yet'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ReviewStatusPill status={candidate.status} size="md" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More actions">
                  <Ellipsis className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuItem asChild>
                  <Link href={detailsHref}>Full details</Link>
                </DropdownMenuItem>
                {canEdit && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={actions.onSendForms}>
                      {candidate.status === 'sponsored'
                        ? 'Send forms'
                        : 'Resend forms'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={actions.onMove}>
                      Move to another weekend
                    </DropdownMenuItem>
                  </>
                )}
                {canEditPayments && (
                  <DropdownMenuItem onSelect={actions.onRecordPayment}>
                    Record a cash or check payment
                  </DropdownMenuItem>
                )}
                {canEdit && candidate.status !== 'rejected' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={actions.onReject}
                    >
                      Drop candidate
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
          <section className="flex flex-col gap-2.5 rounded-lg border bg-card px-4.5 py-3.5">
            <h3 className="font-serif text-base font-semibold tracking-tight">
              Sponsorship
            </h3>
            <Field label="Sponsor">
              {candidate.sponsor.name ?? 'Not on file'}
              {!isNil(candidate.sponsor.weekend) &&
                candidate.sponsor.weekend.trim() !== '' && (
                  <span className="text-muted-foreground">
                    {' '}
                    · attended {candidate.sponsor.weekend}
                  </span>
                )}
            </Field>
            {!isNil(candidate.sponsor.church) && (
              <Field label="Sponsor's church">{candidate.sponsor.church}</Field>
            )}
            {!isNil(candidate.sponsor.contactFrequency) && (
              <Field label="Contact">
                {candidate.sponsor.contactFrequency}
              </Field>
            )}
            <Field label="Submitted">
              {formatShortDate(candidate.submittedAt)}
            </Field>
          </section>

          <section className="flex flex-col gap-1.5 rounded-lg border bg-card px-4.5 py-3.5">
            <h3 className="pb-1 font-serif text-base font-semibold tracking-tight">
              Forms &amp; fee
            </h3>
            <CheckRow done={formsIn} label="Candidate information" />
            <CheckRow
              done={candidate.info?.hasEmergencyContact === true}
              label="Emergency contact"
            />
            <CheckRow
              done={!isNil(candidate.info?.campWaiverSignedAt)}
              label="Camp waiver"
            />
            <CheckRow done={candidate.fee.status === 'Paid'} label={feeLine} />
          </section>
        </div>

        <section className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4.5 py-3.5">
          <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-[14.5px] font-semibold">
              {!formsIn
                ? 'Medical history not yet in'
                : candidate.info?.hasMedicalNotes === true
                  ? 'Medical history on file'
                  : 'No medical notes provided'}
            </p>
            <p className="text-[13.5px] text-muted-foreground">
              {canViewMedical
                ? 'Visible only to reviewers with medical access'
                : 'Only reviewers with medical access can view this'}
            </p>
          </div>
          {canViewMedical && formsIn && (
            <Button
              variant="outline"
              size="default"
              onClick={actions.onViewMedical}
            >
              View
            </Button>
          )}
        </section>
      </div>

      <div
        className={cn(
          'flex shrink-0 flex-wrap items-center gap-2.5 border-t border-border bg-card',
          compact ? 'px-4 py-3' : 'px-5 py-4 lg:px-8'
        )}
      >
        <PrimaryButton
          action={primary}
          disabled={!canEdit}
          onClick={() => actions.onPrimary(primary)}
        />
        <SoonButton label="Move to waitlist" variant="outline" />
        <SoonButton label="Ask the sponsor" variant="ghost" />
        <p className="ml-auto text-[13.5px] text-muted-foreground tabular-nums">
          {spotsLeft} of {WEEKEND_CANDIDATE_CAPACITY} spots left
        </p>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-[14.5px] text-foreground">{children}</p>
    </div>
  )
}

function CheckRow({ done, label }: { done: boolean; label: string }) {
  const Icon: LucideIcon = done ? Check : CircleDashed
  return (
    <p className="flex items-center gap-2 text-[14.5px]">
      <Icon
        className={cn(
          'size-4 shrink-0',
          done ? 'text-success' : 'text-muted-foreground/70'
        )}
        aria-hidden
      />
      <span className={cn(!done && 'text-muted-foreground')}>{label}</span>
      <span className="sr-only">{done ? ' — done' : ' — not yet'}</span>
    </p>
  )
}

function describeFee(candidate: ReviewCandidate): string {
  const { fee } = candidate
  const total = formatCurrency(fee.totalFee)
  if (fee.status === 'Paid') {
    const when = isNil(fee.lastPaidAt)
      ? ''
      : ` ${formatShortDate(fee.lastPaidAt)}`
    return `Candidate fee · ${formatCurrency(fee.totalPaid)} paid${when}`
  }
  if (fee.status === 'Partial') {
    return `Candidate fee · ${formatCurrency(fee.totalPaid)} of ${total} paid`
  }
  if (fee.status === 'Not owed') {
    return 'Candidate fee · not set for this weekend'
  }
  return `Candidate fee · ${total} not yet paid`
}

function PrimaryButton({
  action,
  disabled,
  onClick,
}: {
  action: PrimaryAction
  disabled: boolean
  onClick: () => void
}) {
  if (action.kind === 'none') {
    return (
      <span
        className={cn(
          'inline-flex h-11 items-center gap-2 rounded-md px-4 text-[14.5px] font-semibold md:h-10',
          action.label === 'Confirmed'
            ? 'bg-success/15 text-success'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {action.label === 'Confirmed' && (
          <Check className="size-4" aria-hidden />
        )}
        {action.label}
      </span>
    )
  }
  return (
    <Button
      size="default"
      variant={
        action.kind === 'approve' && action.resend ? 'outline' : 'default'
      }
      className="text-[14.5px] font-semibold"
      disabled={disabled}
      onClick={onClick}
    >
      {action.label}
    </Button>
  )
}

/** A footer action the owner has deferred: visible, disabled, explained. */
function SoonButton({
  label,
  variant,
}: {
  label: string
  variant: 'outline' | 'ghost'
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Disabled buttons don't fire pointer events, so the wrapper
            carries the tooltip. */}
        <span tabIndex={0} className="inline-flex rounded-md">
          <Button
            size="default"
            variant={variant}
            disabled
            aria-disabled="true"
            className={cn(
              'text-[14.5px] font-semibold',
              variant === 'ghost' && 'text-muted-foreground'
            )}
          >
            {label}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>Coming soon</TooltipContent>
    </Tooltip>
  )
}
