import { Badge } from '@/components/ui/badge'
import type { BroadcastStatus } from '@/services/community-email/types'

const LABELS: Record<BroadcastStatus, string> = {
  draft: 'Draft',
  sending: 'Sending…',
  sent: 'Sent',
  failed: 'Failed',
}

export function EmailStatusBadge({ status }: { status: BroadcastStatus }) {
  return (
    <Badge
      variant={
        status === 'failed'
          ? 'destructive'
          : status === 'sent'
            ? 'secondary'
            : 'outline'
      }
    >
      {LABELS[status]}
    </Badge>
  )
}
