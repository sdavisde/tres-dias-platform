'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isNil } from 'lodash'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { useQueryParam } from '@/hooks/url-state'
import {
  moveCandidateToWeekend,
  updateCandidateStatus,
} from '@/actions/candidates'
import {
  sendCandidateForms,
  sendPaymentRequestEmail,
} from '@/services/notifications'
import {
  CANDIDATE_PARAM,
  candidateDetailsPath,
  matchesQueueFilter,
  matchesQueueSearch,
  resolveSelection,
  sortQueue,
  spotsLeft,
  type PrimaryAction,
  type QueueFilter,
  type ReviewCandidate,
} from '@/lib/candidates/review'
import { isErr } from '@/lib/results'
import { toastError } from '@/lib/toast-error'
import type { WeekendType } from '@/lib/weekend/types'
import { CandidateQueue } from './candidate-queue'
import { CandidateDetail, type DetailActions } from './candidate-detail'
import { MedicalNotesDialog } from './medical-notes-dialog'
import { SendFormsConfirmationModal } from './SendFormsConfirmationModal'
import { SendPaymentRequestConfirmationModal } from './SendPaymentRequestConfirmationModal'
import { RejectCandidateConfirmationModal } from './RejectCandidateConfirmationModal'
import { MoveCandidateConfirmationModal } from './MoveCandidateConfirmationModal'
import { CandidateCashCheckPaymentModal } from './CandidateCashCheckPaymentModal'

type ReviewWorkspaceProps = {
  groupId: string
  weekendType: WeekendType
  /** "Men's #12" */
  weekendLabel: string
  candidates: ReviewCandidate[]
  canEdit: boolean
  canEditPayments: boolean
  canViewMedical: boolean
}

type Dialog =
  | { kind: 'send-forms'; resend: boolean }
  | { kind: 'approve'; resend: boolean }
  | { kind: 'reject' }
  | { kind: 'move' }
  | { kind: 'payment' }
  | { kind: 'medical' }
  | null

const CANDIDATE_MARSHALLER = {
  marshal: (value: string | null) => value,
  unmarshal: (raw: string | null) => raw,
}

/**
 * The review page's two panes and every dialog they open. Selection lives in
 * `?candidate=` (History API, so the queue never re-renders the server page),
 * the chip and search are local state, and each action refreshes the server
 * data once it lands.
 */
export function ReviewWorkspace({
  groupId,
  weekendType,
  weekendLabel,
  candidates,
  canEdit,
  canEditPayments,
  canViewMedical,
}: ReviewWorkspaceProps) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [filter, setFilter] = useState<QueueFilter>('needs-review')
  const [search, setSearch] = useState('')
  const [requestedId, setRequestedId] = useQueryParam<string | null>(
    CANDIDATE_PARAM,
    CANDIDATE_MARSHALLER
  )
  const [sheetOpen, setSheetOpen] = useState(false)
  const [dialog, setDialog] = useState<Dialog>(null)

  const sorted = useMemo(() => sortQueue(candidates), [candidates])
  const counts = useMemo(
    () => ({
      'needs-review': sorted.filter((c) =>
        matchesQueueFilter(c, 'needs-review')
      ).length,
      all: sorted.filter((c) => matchesQueueFilter(c, 'all')).length,
      dropped: sorted.filter((c) => matchesQueueFilter(c, 'dropped')).length,
    }),
    [sorted]
  )
  const rows = useMemo(
    () =>
      sorted.filter(
        (c) => matchesQueueFilter(c, filter) && matchesQueueSearch(c, search)
      ),
    [sorted, filter, search]
  )

  // A candidate opened from a link sits in whichever chip holds it, so the
  // first paint shows it rather than an empty "Needs review" list.
  const [initialised, setInitialised] = useState(false)
  if (!initialised) {
    setInitialised(true)
    const requested = sorted.find((c) => c.id === requestedId)
    if (!isNil(requested) && !matchesQueueFilter(requested, filter)) {
      setFilter(requested.status === 'rejected' ? 'dropped' : 'all')
    }
  }

  const selectedId = resolveSelection(sorted, requestedId, filter)
  const selected = sorted.find((c) => c.id === selectedId) ?? null
  const open = spotsLeft(sorted)

  const select = (candidate: ReviewCandidate) => {
    setRequestedId(candidate.id)
    setSheetOpen(true)
  }

  const changeFilter = (next: QueueFilter) => {
    setFilter(next)
    // Keep the selection when it survives the switch; otherwise the first row
    // of the new chip takes over.
    if (!isNil(selected) && !matchesQueueFilter(selected, next)) {
      setRequestedId(null)
    }
  }

  const finish = (message: string) => {
    toast.success(message)
    setDialog(null)
    router.refresh()
  }

  const handleSendForms = async () => {
    if (isNil(selected)) return
    if (selected.status === 'sponsored') {
      const statusResult = await updateCandidateStatus({
        candidateId: selected.id,
        status: 'awaiting_forms',
      })
      if (isErr(statusResult)) {
        toastError('Unable to update the candidate. Please try again.', {
          error: statusResult.error,
        })
        return
      }
    }
    const result = await sendCandidateForms(selected.id)
    if (isErr(result)) {
      toastError('Unable to send the forms email. Please try again.', {
        error: result.error,
      })
      return
    }
    finish(`Forms sent to ${selected.name}`)
  }

  const handleApprove = async () => {
    if (isNil(selected)) return
    const result = await sendPaymentRequestEmail(selected.id)
    if (isErr(result)) {
      toastError('Unable to send the fee request. Please try again.', {
        error: result.error,
      })
      return
    }
    finish(
      selected.status === 'awaiting_payment'
        ? `Fee request resent for ${selected.name}`
        : `${selected.name} approved · fee requested`
    )
  }

  const handleReject = async () => {
    if (isNil(selected)) return
    const result = await updateCandidateStatus({
      candidateId: selected.id,
      status: 'rejected',
    })
    if (isErr(result)) {
      toastError('Unable to drop the candidate. Please try again.', {
        error: result.error,
      })
      return
    }
    finish(`${selected.name} dropped`)
  }

  const handleMove = async (targetWeekendId: string) => {
    if (isNil(selected)) return
    const result = await moveCandidateToWeekend({
      candidateId: selected.id,
      targetWeekendId,
    })
    if (isErr(result)) {
      toastError('Unable to move the candidate. Please try again.', {
        error: result.error,
      })
      return
    }
    finish(`${selected.name} moved`)
  }

  const actions: DetailActions = {
    onPrimary: (action: PrimaryAction) => {
      if (action.kind === 'send-forms') {
        setDialog({
          kind: 'send-forms',
          resend: selected?.status !== 'sponsored',
        })
      } else if (action.kind === 'approve') {
        setDialog({ kind: 'approve', resend: action.resend })
      }
    },
    onSendForms: () =>
      setDialog({
        kind: 'send-forms',
        resend: selected?.status !== 'sponsored',
      }),
    onMove: () => setDialog({ kind: 'move' }),
    onRecordPayment: () => setDialog({ kind: 'payment' }),
    onReject: () => setDialog({ kind: 'reject' }),
    onViewMedical: () => setDialog({ kind: 'medical' }),
  }

  const detail = isNil(selected) ? null : (
    <CandidateDetail
      key={selected.id}
      candidate={selected}
      weekendLabel={weekendLabel}
      detailsHref={candidateDetailsPath(groupId, weekendType, selected.id)}
      spotsLeft={open}
      canEdit={canEdit}
      canEditPayments={canEditPayments}
      canViewMedical={canViewMedical}
      actions={actions}
      compact={isMobile}
    />
  )

  return (
    <>
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border bg-card md:grid md:grid-cols-[350px_minmax(0,1fr)]">
        <div className="min-h-0 w-full md:border-r md:border-border">
          <CandidateQueue
            rows={rows}
            counts={counts}
            filter={filter}
            search={search}
            selectedId={selectedId}
            onFilterChange={changeFilter}
            onSearchChange={setSearch}
            onSelect={select}
          />
        </div>
        <div className="hidden min-h-0 min-w-0 bg-background md:block">
          {isNil(detail) ? (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Pick a candidate on the left to review them.
            </div>
          ) : (
            !isMobile && detail
          )}
        </div>
      </div>

      {isMobile && (
        <Sheet
          open={sheetOpen && !isNil(detail)}
          onOpenChange={(next) => {
            if (!next) setSheetOpen(false)
          }}
        >
          <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-full">
            <SheetTitle className="sr-only">
              {selected?.name ?? 'Candidate'}
            </SheetTitle>
            <div className="min-h-0 flex-1 pt-10">{detail}</div>
          </SheetContent>
        </Sheet>
      )}

      <SendFormsConfirmationModal
        isOpen={dialog?.kind === 'send-forms'}
        candidate={selected}
        resend={dialog?.kind === 'send-forms' && dialog.resend}
        onCancel={() => setDialog(null)}
        onConfirm={handleSendForms}
      />
      <SendPaymentRequestConfirmationModal
        isOpen={dialog?.kind === 'approve'}
        candidate={selected}
        resend={dialog?.kind === 'approve' && dialog.resend}
        onCancel={() => setDialog(null)}
        onConfirm={handleApprove}
      />
      <RejectCandidateConfirmationModal
        isOpen={dialog?.kind === 'reject'}
        candidate={selected}
        onCancel={() => setDialog(null)}
        onConfirm={handleReject}
      />
      <MoveCandidateConfirmationModal
        isOpen={dialog?.kind === 'move'}
        candidate={selected}
        onCancel={() => setDialog(null)}
        onConfirm={handleMove}
      />
      <CandidateCashCheckPaymentModal
        open={dialog?.kind === 'payment'}
        onClose={() => setDialog(null)}
        candidate={selected}
      />
      <MedicalNotesDialog
        open={dialog?.kind === 'medical'}
        onOpenChange={(next) => {
          if (!next) setDialog(null)
        }}
        candidateName={selected?.name ?? 'the candidate'}
        notes={selected?.info?.medicalNotes}
      />
    </>
  )
}
