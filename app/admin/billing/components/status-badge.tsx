import { cn } from '@/lib/utils'
import type { PlanBadge } from '@/lib/billing/format'

const TONE_CLASSES: Record<PlanBadge['tone'], string> = {
  success: 'bg-success/15 text-success',
  warning: 'border border-warning/50 bg-warning/10 text-warning-foreground',
  error: 'bg-error/15 text-error',
  info: 'bg-info/15 text-info',
  neutral: 'border border-border text-muted-foreground',
}

/**
 * Status pill for the Billing page, in the same shape as the payments
 * ledger's pill so the two pages read alike.
 */
export function StatusBadge({
  badge,
  className,
}: {
  badge: PlanBadge
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        TONE_CLASSES[badge.tone],
        className
      )}
    >
      {badge.label}
    </span>
  )
}
