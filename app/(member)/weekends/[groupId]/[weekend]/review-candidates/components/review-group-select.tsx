'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { reviewQueuePath } from '@/lib/candidates/review'
import type { WeekendType } from '@/lib/weekend/types'

export type ReviewGroupOption = { groupId: string; label: string }

type ReviewGroupSelectProps = {
  groupId: string
  weekendType: WeekendType
  groups: ReviewGroupOption[]
}

/**
 * Picks which weekend group's queue to review, so past weekends' candidates
 * stay reachable. Keeps the Men's / Women's side; the selected candidate
 * belongs to this group, so the switch drops it.
 */
export function ReviewGroupSelect({
  groupId,
  weekendType,
  groups,
}: ReviewGroupSelectProps) {
  const router = useRouter()

  return (
    <Select
      value={groupId}
      onValueChange={(next) => router.push(reviewQueuePath(next, weekendType))}
    >
      <SelectTrigger aria-label="Weekend group" size="sm" className="w-auto">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {groups.map((group) => (
          <SelectItem key={group.groupId} value={group.groupId}>
            {group.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
