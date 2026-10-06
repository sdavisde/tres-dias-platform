import { isNil } from 'lodash'
import { redirect } from 'next/navigation'
import { getLoggedInUser } from '@/services/identity/user'
import { getSecuelaOverview } from '@/services/secuela'
import { getWeekendOptions } from '@/services/weekend/weekend-service'
import { AdminBreadcrumbs } from '@/components/admin/breadcrumbs'
import { permissionLock, userHasPermission, Permission } from '@/lib/security'
import { isErr, Results } from '@/lib/results'
import { Errors } from '@/lib/error'
import { getUrl } from '@/lib/url'
import SecuelaClient from './components/secuela-client'

export default async function SecuelaPage() {
  const [userResult, overviewResult, weekendOptionsResult] = await Promise.all([
    getLoggedInUser(),
    getSecuelaOverview(),
    getWeekendOptions(),
  ])
  const user = userResult?.data

  try {
    if (isErr(userResult) || isNil(user)) {
      throw new Error(Errors.NOT_LOGGED_IN.toString())
    }

    permissionLock([Permission.READ_EVENTS])(user)
  } catch (error: unknown) {
    console.error(error)
    redirect(`/?error=${(error as Error).message}`)
  }

  return (
    <>
      <AdminBreadcrumbs
        title="Secuela"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }]}
      />
      <div className="container mx-auto px-4 py-6 sm:px-8">
        <SecuelaClient
          overview={Results.unwrapOr(overviewResult, null)}
          canEdit={userHasPermission(user, [Permission.WRITE_EVENTS])}
          signInUrl={getUrl('/secuela-signin')}
          weekendOptions={Results.unwrapOr(weekendOptionsResult, [])}
        />
      </div>
    </>
  )
}
