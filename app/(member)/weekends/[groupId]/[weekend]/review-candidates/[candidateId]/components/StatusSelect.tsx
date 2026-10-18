'use client'

import type { CandidateStatus } from '@/lib/candidates/types'
import { updateCandidateStatusField } from '@/actions/candidates'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import * as Results from '@/lib/results'
import { toastError } from '@/lib/toast-error'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface StatusSelectProps {
  candidateId: string
  currentStatus: CandidateStatus
}

const STATUS_OPTIONS: { value: CandidateStatus; label: string }[] = [
  { value: 'sponsored', label: 'Sponsored' },
  { value: 'awaiting_forms', label: 'Awaiting Forms' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'awaiting_payment', label: 'Awaiting Payment' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rejected', label: 'Dropped' },
]

export function StatusSelect({
  candidateId,
  currentStatus,
}: StatusSelectProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (newStatus: CandidateStatus) => {
    if (newStatus === currentStatus) return

    setIsUpdating(true)
    try {
      const result = await updateCandidateStatusField({
        candidateId,
        status: newStatus,
      })

      if (Results.isErr(result)) {
        toastError('Unable to update status. Please try again.', {
          error: result.error,
        })
        return
      }

      toast.success('Status updated')
      router.refresh()
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Select
      value={currentStatus}
      onValueChange={(value) => handleStatusChange(value as CandidateStatus)}
      disabled={isUpdating}
    >
      <SelectTrigger className="w-[180px]" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
