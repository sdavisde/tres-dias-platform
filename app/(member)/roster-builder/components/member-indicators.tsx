'use client'

import {
  Award,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle2,
  Cross,
  Star,
  type LucideIcon,
} from 'lucide-react'
import { isNil } from 'lodash'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { RosterBuilderCommunityMember } from '@/services/roster-builder'
import type { Qualification } from '../lib/community-filters'

/** One quiet chip for every qualification; the icon tells them apart. */
const INDICATOR_CHIP_CLASS = 'border-border bg-card text-xs text-nav-foreground'

/** Labels and icons shared by the chips and the qualification filters. */
export const QUALIFICATIONS: Array<{
  value: Qualification
  label: string
  icon: LucideIcon
}> = [
  { value: 'secuela', label: 'Secuela', icon: Calendar },
  { value: 'rollista', label: 'Has given a rollo', icon: Briefcase },
  { value: 'sectionHead', label: 'Section head', icon: CheckCircle2 },
  { value: 'rectorReady', label: 'Rector ready', icon: Star },
  { value: 'clergy', label: 'Clergy', icon: Cross },
  { value: 'essentials', label: 'Essentials trained', icon: BookOpen },
]

type Indicator = {
  key: string
  label: string
  icon: LucideIcon
  iconClassName?: string
  tooltip?: string
}

function getIndicators(member: RosterBuilderCommunityMember): Indicator[] {
  const indicators: Indicator[] = []
  if (member.volunteerStatus === 'attended_secuela') {
    indicators.push({
      key: 'secuela',
      label: 'Attended Secuela',
      icon: Calendar,
      tooltip: 'Signed in during secuela',
    })
  }
  if (member.volunteerStatus === 'wants_to_serve') {
    indicators.push({
      key: 'secuela',
      label: 'Wants to Serve',
      icon: Calendar,
      tooltip: 'Signed up to serve after secuela ended',
    })
  }
  if (member.rectorReadyStatus.criteria.hasServedAsRector) {
    indicators.push({ key: 'rector', label: 'Past Rector', icon: Award })
  } else if (member.rectorReadyStatus.isReady) {
    indicators.push({
      key: 'rector',
      label: 'Rector Ready',
      icon: Star,
      iconClassName: 'fill-amber-500 text-amber-500',
    })
  }
  if (member.hasGivenRollo) {
    indicators.push({ key: 'rollo', label: 'Rollista', icon: Briefcase })
  }
  if (member.hasBeenSectionHead) {
    indicators.push({
      key: 'sectionHead',
      label: 'Section Head',
      icon: CheckCircle2,
    })
  }
  if (member.isClergy) {
    indicators.push({ key: 'clergy', label: 'Clergy', icon: Cross })
  }
  return indicators
}

export function MemberIndicatorChips({
  member,
  className,
}: {
  member: RosterBuilderCommunityMember
  className?: string
}) {
  const indicators = getIndicators(member)
  if (indicators.length === 0) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {indicators.map(({ key, label, icon: Icon, iconClassName, tooltip }) => {
        const chip = (
          <Badge variant="outline" className={INDICATOR_CHIP_CLASS}>
            <Icon className={cn('mr-1 h-3 w-3', iconClassName)} />
            {label}
          </Badge>
        )
        if (isNil(tooltip)) return <span key={key}>{chip}</span>
        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>{chip}</TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
