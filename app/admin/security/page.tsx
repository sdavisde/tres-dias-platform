import { Permission } from '@/lib/security'
import { guardAdminPage } from '@/lib/admin/page-guard'
import { getFullAccessImpact, getRoleUsage } from '@/services/identity/roles'
import { getRoles } from '@/services/identity/roles/role-service'
import { isErr, unwrapOr } from '@/lib/results'
import { AdminBreadcrumbs } from '@/components/admin/breadcrumbs'
import { SecurityWorkspace } from './components/security-workspace'

export default async function SecurityPage() {
  const [{ canEdit }, rolesResult, usageResult, impactResult] =
    await Promise.all([
      guardAdminPage({
        required: [Permission.READ_USER_ROLES],
        edit: [Permission.WRITE_USER_ROLES],
      }),
      getRoles(),
      getRoleUsage(),
      getFullAccessImpact(),
    ])

  if (isErr(rolesResult)) {
    throw new Error(`Failed to fetch roles: ${rolesResult.error}`)
  }

  return (
    <>
      <AdminBreadcrumbs
        title="Security"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }]}
      />
      <div className="container mx-auto px-4 pb-10 sm:px-8 py-6">
        <SecurityWorkspace
          roles={rolesResult.data}
          usage={unwrapOr(usageResult, {})}
          fullAccessImpact={unwrapOr(impactResult, {
            totalHolders: 0,
            holdersLostIfRemoved: {},
          })}
          canEdit={canEdit}
        />
      </div>
    </>
  )
}
