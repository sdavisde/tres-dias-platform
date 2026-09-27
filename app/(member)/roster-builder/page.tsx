import { isNil } from 'lodash'
import { redirect } from 'next/navigation'
import { getLoggedInUser } from '@/services/identity/user'
import { userHasPermission, Permission } from '@/lib/security'
import { getRosterWeekendIdsForUser } from '@/services/weekend/weekend-service'
import { getCachedActiveWeekends } from '@/services/weekend/cached'
import { getRosterBuilderCommunityData } from '@/services/roster-builder/roster-builder-service'
import { getSecuelaDateForGroup } from '@/services/events/events-service'
import { isErr, isOk } from '@/lib/results'
import type { Weekend } from '@/lib/weekend/types'
import { WeekendType } from '@/lib/weekend/types'
import { RosterBuilderBoard } from './roster-builder-board'
import { WeekendPicker } from './weekend-picker'
import { PageContent } from '@/components/member/page-content'

function weekendTitle(weekend: Weekend): string {
  const label = weekend.type === WeekendType.MENS ? 'Mens' : 'Womens'
  return `DTTD #${weekend.number ?? '?'} ${label} Roster`
}

export default async function RosterBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ weekendId?: string }>
}) {
  const userResult = await getLoggedInUser()
  if (isErr(userResult)) {
    redirect('/login')
  }

  const user = userResult.data

  if (!userHasPermission(user, [Permission.READ_TEAM_ROSTER_BUILDER])) {
    return (
      <PageContent className="pt-12 text-center">
        <h1 className="text-xl font-bold text-foreground mb-2">
          Roster Builder
        </h1>
        <p className="text-muted-foreground">
          You don&apos;t have permission to access the Roster Builder.
        </p>
      </PageContent>
    )
  }

  const activeWeekendsResult = await getCachedActiveWeekends()
  if (isErr(activeWeekendsResult)) {
    return (
      <PageContent className="pt-12 text-center">
        <h1 className="text-xl font-bold text-foreground mb-2">
          Roster Builder
        </h1>
        <p className="text-muted-foreground">No active weekends found.</p>
      </PageContent>
    )
  }

  const activeWeekends = activeWeekendsResult.data
  const allWeekends = Object.values(activeWeekends)

  // If weekendId is specified in the URL, use it directly
  const params = await searchParams
  if (!isNil(params.weekendId)) {
    const selectedWeekend = allWeekends.find((w) => w.id === params.weekendId)
    if (!isNil(selectedWeekend)) {
      return renderBoard(selectedWeekend, user.id)
    }
  }

  // Try to auto-select: the first active weekend (Men's first) the user is
  // on the roster for, from one membership query rather than a roster load
  // per weekend.
  const membershipResult = await getRosterWeekendIdsForUser(
    user.id,
    allWeekends.map((w) => w.id)
  )
  if (isOk(membershipResult)) {
    const onRoster = new Set(membershipResult.data)
    const ownWeekend = allWeekends.find((w) => onRoster.has(w.id))
    if (!isNil(ownWeekend)) {
      return renderBoard(ownWeekend, user.id)
    }
  }

  // User isn't on any roster (e.g. FULL_ACCESS admin) — show picker
  return <WeekendPicker weekends={allWeekends} />
}

async function renderBoard(weekend: Weekend, userId: string) {
  const [communityResult, secuelaDateResult] = await Promise.all([
    getRosterBuilderCommunityData(weekend.id),
    !isNil(weekend.groupId)
      ? getSecuelaDateForGroup(weekend.groupId)
      : Promise.resolve(null),
  ])

  if (isErr(communityResult)) {
    return (
      <PageContent className="pt-12 text-center">
        <h1 className="text-xl font-bold text-foreground mb-2">
          Roster Builder
        </h1>
        <p className="text-destructive">
          Failed to load community data. Please try again.
        </p>
      </PageContent>
    )
  }

  const hasSecuelaEvent =
    secuelaDateResult !== null &&
    isOk(secuelaDateResult) &&
    secuelaDateResult.data !== null

  return (
    <RosterBuilderBoard
      weekendId={weekend.id}
      weekendTitle={weekendTitle(weekend)}
      weekendType={weekend.type}
      rectorUserId={userId}
      communityMembers={communityResult.data}
      hasSecuelaEvent={hasSecuelaEvent}
    />
  )
}
