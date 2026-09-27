import Image from 'next/image'
import { ArrowRight, CalendarDays, HandHeart } from 'lucide-react'
import { isNil } from 'lodash'
import type { User } from '@/lib/users/types'
import { isErr, Results } from '@/lib/results'
import { getCachedActiveWeekends } from '@/services/weekend/cached'
import { getCandidateCountByWeekend } from '@/services/candidates/candidate-service'
import {
  WeekendType,
  WEEKEND_CANDIDATE_CAPACITY,
  type Weekend,
} from '@/lib/weekend/types'
import { COMMUNITY_NAME } from '@/lib/weekend/constants'
import { isUserOnActiveTeam } from '@/lib/users'
import {
  formatTeamMemberRole,
  formatTeamMemberTitle,
  formatWeekendGroupTitle,
} from '@/lib/weekend'
import { formatDateRange } from '@/lib/utils'
import { hubPath } from '@/lib/weekend/hub'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { CandidateProgressBar } from '@/components/current-weekend/CandidateProgressBar'

interface CurrentWeekendHeroProps {
  user: User
}

/**
 * Homepage centerpiece: the active weekend group at a glance — dates,
 * candidate counts vs capacity, and the viewer's team assignment if they
 * are serving. Falls back to a quiet card when no weekend is active.
 */
export async function CurrentWeekendHero({ user }: CurrentWeekendHeroProps) {
  const weekendsResult = await getCachedActiveWeekends()

  if (isErr(weekendsResult)) {
    return <EmptyWeekendHero />
  }

  const mensWeekend = weekendsResult.data[WeekendType.MENS]
  const womensWeekend = weekendsResult.data[WeekendType.WOMENS]

  const [mensCountResult, womensCountResult] = await Promise.all([
    getCandidateCountByWeekend(mensWeekend.id),
    getCandidateCountByWeekend(womensWeekend.id),
  ])

  const mensCandidateCount = Results.unwrapOr(mensCountResult, 0)
  const womensCandidateCount = Results.unwrapOr(womensCountResult, 0)

  const groupTitle = getGroupTitle(mensWeekend, womensWeekend)
  const groupId = mensWeekend.groupId ?? womensWeekend.groupId

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Brand image band — same treatment as the landing page hero */}
      <div className="relative h-32 md:h-36">
        <Image
          src="/tanglewood.jpg"
          alt="Tanglewood retreat center surrounded by Hill Country landscape"
          fill
          sizes="(min-width: 1024px) 66vw, 100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-[#2C1810]/60" />
        <div className="absolute inset-0 flex flex-col justify-center px-6">
          <p className="mb-1 text-xs uppercase tracking-[0.25em] text-white/80">
            Current Weekend
          </p>
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            {groupTitle}
          </h2>
        </div>
      </div>

      <div className="space-y-5 p-5 md:p-6">
        <WeekendRow
          label="Men's Weekend"
          weekend={mensWeekend}
          candidateCount={mensCandidateCount}
        />
        <WeekendRow
          label="Women's Weekend"
          weekend={womensWeekend}
          candidateCount={womensCandidateCount}
        />

        {isUserOnActiveTeam(user) && (
          <div className="flex items-start gap-3 rounded-lg bg-secondary px-4 py-3">
            <HandHeart className="mt-0.5 h-5 w-5 shrink-0 text-secondary-foreground" />
            <p className="text-sm leading-relaxed text-secondary-foreground">
              You&apos;re serving as{' '}
              <span className="font-semibold">
                {formatTeamMemberRole(user.teamMemberInfo)}
              </span>{' '}
              on {formatTeamMemberTitle(user.teamMemberInfo)}.
            </p>
          </div>
        )}

        <Button
          href={
            isNil(groupId) ? '/weekends' : hubPath(groupId, 'overview', null)
          }
          className="w-full sm:w-auto"
          linkProps={{ className: 'block sm:inline-block' }}
        >
          Open the weekend hub
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  )
}

interface WeekendRowProps {
  label: string
  weekend: Weekend
  candidateCount: number
}

function WeekendRow({ label, weekend, candidateCount }: WeekendRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-sm text-muted-foreground">
          {formatDateRange(weekend.start_date, weekend.end_date)}
        </span>
      </div>
      <CandidateProgressBar
        label="Candidates"
        count={candidateCount}
        capacity={WEEKEND_CANDIDATE_CAPACITY}
      />
    </div>
  )
}

function getGroupTitle(mensWeekend: Weekend, womensWeekend: Weekend): string {
  return formatWeekendGroupTitle(mensWeekend.number ?? womensWeekend.number)
}

function EmptyWeekendHero() {
  return (
    <section className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm md:p-6">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary">
        <CalendarDays className="h-6 w-6 text-secondary-foreground" />
      </div>
      <div>
        <Typography variant="h4">No Active Weekend</Typography>
        <Typography variant="muted">
          There isn&apos;t a weekend in progress right now. Check back soon for
          details on the next one.
        </Typography>
      </div>
    </section>
  )
}

export function CurrentWeekendHeroSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Skeleton className="h-32 w-full rounded-none md:h-36" />
      <div className="space-y-5 p-5 md:p-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-full" />
        </div>
        <Skeleton className="h-10 w-full sm:w-56" />
      </div>
    </div>
  )
}
