import { Badge } from '@/components/ui/badge'
import type { CandidateStatus } from '@/lib/candidates/types'

interface StatusChipProps {
  status: CandidateStatus
}

export function StatusChip({ status }: StatusChipProps) {
  const statusConfig: Record<
    CandidateStatus,
    {
      color: 'info' | 'warning' | 'secondary' | 'success' | 'error'
      label: string
    }
  > = {
    sponsored: { color: 'error', label: 'Sponsored' },
    awaiting_forms: { color: 'warning', label: 'Awaiting Forms' },
    pending_approval: { color: 'error', label: 'Pending Approval' },
    awaiting_payment: { color: 'warning', label: 'Awaiting Payment' },
    confirmed: { color: 'success', label: 'Confirmed' },
    rejected: { color: 'error', label: 'Dropped' },
  }

  const config = statusConfig[status] ?? {
    color: 'secondary' as const,
    label: 'Unknown',
  }
  return (
    <Badge color={config.color} className="text-xs">
      {config.label}
    </Badge>
  )
}
