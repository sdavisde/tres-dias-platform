'use client'

import { useState } from 'react'
import { isNil } from 'lodash'
import { Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ReviewCandidate } from '@/lib/candidates/review'
import { ReviewStatusPill } from './review-status-pill'

interface RejectCandidateConfirmationModalProps {
  isOpen: boolean
  candidate: ReviewCandidate | null
  onCancel: () => void
  onConfirm: () => Promise<void>
}

/** Confirms dropping a candidate (the `rejected` status). */
export function RejectCandidateConfirmationModal({
  isOpen,
  candidate,
  onCancel,
  onConfirm,
}: RejectCandidateConfirmationModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  if (isNil(candidate)) return null

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) onCancel()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl font-semibold tracking-tight">
            Drop this candidate
          </DialogTitle>
          <DialogDescription>
            Take{' '}
            <span className="font-semibold text-foreground">
              {candidate.name}
            </span>{' '}
            off this weekend&rsquo;s list. They stay in the Dropped chip, and
            their status can be changed back from the full details page.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <Info
            className="mt-0.5 size-4 shrink-0 text-destructive"
            aria-hidden
          />
          <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
            <span>This moves the candidate to</span>
            <ReviewStatusPill status="rejected" />
            <span>and hides them from the Candidates tab.</span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="default"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="default"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Dropping…' : 'Drop candidate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
