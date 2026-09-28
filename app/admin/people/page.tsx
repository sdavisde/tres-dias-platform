import { Permission, userHasPermission } from '@/lib/security'
import { guardAdminPage } from '@/lib/admin/page-guard'
import { getRoles } from '@/services/identity/roles/role-service'
import { getMasterRoster } from '@/services/master-roster'
import { isErr } from '@/lib/results'
import { AdminBreadcrumbs } from '@/components/admin/breadcrumbs'
import { PageHeader } from '@/components/ui/page-header'
import { getUrl } from '@/lib/url'
import { CopyJoinLinkButton } from './components/copy-join-link-button'
import PeopleTable from './components/people-table'

export default async function PeoplePage() {
  const { user, canEdit } = await guardAdminPage({
    edit: [Permission.FULL_ACCESS],
  })

  const [masterRosterResult, rolesResult] = await Promise.all([
    getMasterRoster(),
    getRoles(),
  ])

  if (isErr(masterRosterResult)) {
    throw new Error(
      `Failed to fetch master roster: ${masterRosterResult.error}`
    )
  }

  if (isErr(rolesResult)) {
    throw new Error(`Failed to fetch roles: ${rolesResult.error}`)
  }

  const canViewExperience = userHasPermission(user, [
    Permission.READ_USER_EXPERIENCE,
  ])

  return (
    <>
      <AdminBreadcrumbs
        title="People"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }]}
      />
      <div className="container mx-auto px-4 sm:px-8 py-6">
        <PageHeader
          title="People"
          description="Everyone with an account — contact details, experience, and roles."
        >
          {/* Built server-side so preview deploys copy their own host, not prod's. */}
          <CopyJoinLinkButton joinUrl={getUrl('/join')} />
        </PageHeader>
        <PeopleTable
          masterRoster={masterRosterResult.data}
          roles={rolesResult.data}
          canViewExperience={canViewExperience}
          canEdit={canEdit}
        />
      </div>
    </>
  )
}
