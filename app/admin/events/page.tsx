import { getLoggedInUser } from '@/services/identity/user'
import {
  getEventsForWeekendGroup,
  getCommunityEvents,
} from '@/services/events/events-service'
import { type Event } from '@/services/events'
import {
  getActiveWeekends,
  getWeekendOptions,
} from '@/services/weekend/weekend-service'
import { WeekendType, type Weekend } from '@/services/weekend'
import type { WeekendIndividualOption } from '@/components/events/event-form-schema'
import { AdminBreadcrumbs } from '@/components/admin/breadcrumbs'
import EventsClient from './components/events-client'
import { permissionLock, userHasPermission, Permission } from '@/lib/security'
import { isErr } from '@/lib/results'
import { Errors } from '@/lib/error'
import { redirect } from 'next/navigation'
import { isNil } from 'lodash'

export default async function EventsPage() {
  // Auth, active weekends, community events, and weekend options are all
  // independent — fetch them together. The redirect below still fires before
  // anything renders. The weekend-group events fetch stays serial because it
  // depends on the resolved group id.
  const [
    userResult,
    activeWeekendsResult,
    communityEventsResult,
    weekendOptionsResult,
  ] = await Promise.all([
    getLoggedInUser(),
    getActiveWeekends(),
    getCommunityEvents(),
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

  const canEdit = userHasPermission(user, [Permission.WRITE_EVENTS])

  const communityEvents = isErr(communityEventsResult)
    ? []
    : communityEventsResult.data
  const weekendOptions = isErr(weekendOptionsResult)
    ? []
    : weekendOptionsResult.data

  // Build active group data if available
  let activeGroup: {
    groupId: string
    groupNumber: number | null
    mensWeekend: Weekend
    womensWeekend: Weekend
  } | null = null
  let activeGroupEvents: Event[] = []
  let weekendIndividualOptions: WeekendIndividualOption[] = []

  if (!isErr(activeWeekendsResult)) {
    const activeWeekends = activeWeekendsResult.data
    const mensWeekend = activeWeekends[WeekendType.MENS]
    const womensWeekend = activeWeekends[WeekendType.WOMENS]
    const groupId = mensWeekend.groupId ?? womensWeekend.groupId

    if (!isNil(groupId)) {
      activeGroup = {
        groupId,
        groupNumber: mensWeekend.number ?? womensWeekend.number,
        mensWeekend,
        womensWeekend,
      }

      const eventsResult = await getEventsForWeekendGroup(groupId)
      activeGroupEvents = isErr(eventsResult) ? [] : eventsResult.data

      weekendIndividualOptions = [
        {
          id: mensWeekend.id,
          label: `Men's #${mensWeekend.number ?? '?'}`,
          type: 'MENS' as const,
          groupId,
        },
        {
          id: womensWeekend.id,
          label: `Women's #${womensWeekend.number ?? '?'}`,
          type: 'WOMENS' as const,
          groupId,
        },
      ]
    }
  }

  return (
    <>
      <AdminBreadcrumbs
        title="Events"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }]}
      />
      <div className="container mx-auto px-4 py-6 sm:px-8">
        <EventsClient
          canEdit={canEdit}
          activeGroup={activeGroup}
          activeGroupEvents={activeGroupEvents}
          communityEvents={communityEvents}
          weekendOptions={weekendOptions}
          weekendIndividualOptions={weekendIndividualOptions}
        />
      </div>
    </>
  )
}
