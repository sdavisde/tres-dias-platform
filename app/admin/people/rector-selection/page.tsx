import { Permission } from '@/lib/security'
import { guardAdminPage } from '@/lib/admin/page-guard'
import { getMasterRoster } from '@/services/master-roster'
import { getCurrentRectorUserIds } from '@/services/weekend/weekend-service'
import { isErr } from '@/lib/results'
import { AdminBreadcrumbs } from '@/components/admin/breadcrumbs'
import { PageHeader } from '@/components/ui/page-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { PeopleTabs, RECTOR_SELECTION_PATH } from '../components/people-tabs'
import { buildRectorSelection } from '../lib/rector-selection'
import { RectorSelectionBoard } from './components/rector-selection-board'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function RectorSelectionPage({ searchParams }: PageProps) {
  const [, query] = await Promise.all([
    guardAdminPage({ required: [Permission.READ_USER_EXPERIENCE] }),
    searchParams,
  ])
  const weekend = query.weekend === 'womens' ? 'womens' : 'mens'

  const [rosterResult, rectorsResult] = await Promise.all([
    getMasterRoster(),
    getCurrentRectorUserIds(),
  ])
  if (isErr(rosterResult)) {
    throw new Error(`Failed to fetch master roster: ${rosterResult.error}`)
  }
  if (isErr(rectorsResult)) {
    throw new Error(`Failed to fetch current rectors: ${rectorsResult.error}`)
  }
  const selection = buildRectorSelection(
    rosterResult.data.members,
    weekend === 'mens' ? 'male' : 'female',
    rectorsResult.data
  )

  return (
    <>
      <AdminBreadcrumbs
        title="Rector Selection"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'People', href: '/admin/people' },
        ]}
      />
      <div className="container mx-auto px-4 py-6 sm:px-8">
        <PageHeader
          title="People"
          description="Everyone with an account — contact details, experience, and roles."
          className="mb-0 border-b-0 pb-4"
        >
          <SegmentedControl
            aria-label="Weekend"
            value={weekend}
            options={[
              { value: 'mens', label: "Men's", href: RECTOR_SELECTION_PATH },
              {
                value: 'womens',
                label: "Women's",
                href: `${RECTOR_SELECTION_PATH}?weekend=womens`,
              },
            ]}
          />
        </PageHeader>
        <PeopleTabs canViewExperience />
        <RectorSelectionBoard selection={selection} />
      </div>
    </>
  )
}
