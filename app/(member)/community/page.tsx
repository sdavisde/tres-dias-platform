import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { MemberBreadcrumbs } from '@/components/member/breadcrumbs'
import { PageContent } from '@/components/member/page-content'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { isErr, isOk, Results } from '@/lib/results'
import { Permission, userHasPermission } from '@/lib/security'
import { getCommunityLeadership } from '@/services/community/board'
import { getCommunityDirectory } from '@/services/community/directory'
import { getMeetingMinutesPage } from '@/services/files/file-service'
import { getLoggedInUser } from '@/services/identity/user'
import { CommunityDirectory } from './components/community-directory'
import { CommunityTabs } from './components/community-tabs'
import { PositionsSection } from './components/leadership'
import { RecentMinutes } from './components/recent-minutes'

/** A recent-first shortcut; the full set lives in Documents. */
const RECENT_MINUTES_COUNT = 4

/**
 * The community's front desk: who leads it, what the board decided, and how
 * to reach one another.
 */
export default async function CommunityPage() {
  const [userResult, leadershipResult, minutesResult, directoryResult] =
    await Promise.all([
      getLoggedInUser(),
      getCommunityLeadership(),
      getMeetingMinutesPage(1, RECENT_MINUTES_COUNT),
      getCommunityDirectory(),
    ])

  // Admin › Community has no gate of its own; the admin portal's is it.
  const canEditBoard =
    isOk(userResult) &&
    userHasPermission(userResult.data, [Permission.READ_ADMIN_PORTAL])

  if (isErr(leadershipResult)) {
    throw new Error(leadershipResult.error)
  }
  if (isErr(directoryResult)) {
    throw new Error(directoryResult.error)
  }

  const { boardPositions, committees } = leadershipResult.data
  const minutes = Results.unwrapOr(
    Results.map(minutesResult, (page) => page.currentPageItems),
    []
  )

  return (
    <PageContent>
      <MemberBreadcrumbs
        title="Community"
        breadcrumbs={[{ label: 'Home', href: '/home' }]}
      />
      <PageHeader title="Community" className="mb-4 border-b-0 pb-0">
        {canEditBoard && (
          <Button asChild variant="outline" size="default">
            <Link href="/admin/community-board">
              <Pencil className="size-4" />
              Edit community board
            </Link>
          </Button>
        )}
      </PageHeader>

      <CommunityTabs
        board={
          <div className="grid items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <PositionsSection
              title="Community Board"
              positions={boardPositions}
              emptyMessage="Board positions haven't been set up yet."
            />
            <div className="flex min-w-0 flex-col gap-8">
              <RecentMinutes
                files={minutes}
                loadFailed={isErr(minutesResult)}
              />
              {committees.length > 0 && (
                <PositionsSection
                  title="Committees & teams"
                  positions={committees}
                  emptyMessage="No committees yet."
                />
              )}
            </div>
          </div>
        }
        people={<CommunityDirectory members={directoryResult.data} />}
      />
    </PageContent>
  )
}
