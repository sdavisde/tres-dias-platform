import 'server-only'

import { isNil } from 'lodash'
import type { Result } from '@/lib/results'
import { isErr, ok } from '@/lib/results'
import { getSecuelaAttendanceWindow } from '@/lib/secuela/attendance-window'
import { computeVolunteerStatus } from '@/services/roster-builder/volunteer-status'
import { getActiveWeekends } from '@/services/weekend/weekend-service'
import { WeekendType } from '@/services/weekend'
import * as Repository from './repository'
import type { RawSecuelaEvent, RawSecuelaSignIn } from './repository'
import type { SecuelaOverview, SecuelaSignIn, SecuelaSummary } from './types'

function toSignIn(signIn: RawSecuelaSignIn): SecuelaSignIn {
  const name = [signIn.users?.first_name, signIn.users?.last_name]
    .filter((part) => !isNil(part) && part.trim() !== '')
    .join(' ')
  return {
    userId: signIn.user_id,
    name: name === '' ? 'Unnamed member' : name,
    signedInAt: signIn.attended_secuela_at,
  }
}

function summarize(
  event: RawSecuelaEvent & { datetime: string; weekend_group_id: string },
  signIns: RawSecuelaSignIn[]
): SecuelaSummary {
  const secuelaEvent = {
    startDate: event.datetime,
    endDate: event.end_datetime,
  }
  const { opensAt, closesAt } = getSecuelaAttendanceWindow(secuelaEvent)

  const attended: SecuelaSignIn[] = []
  const wantsToServe: SecuelaSignIn[] = []
  const sorted = [...signIns].sort((a, b) =>
    a.attended_secuela_at.localeCompare(b.attended_secuela_at)
  )
  for (const signIn of sorted) {
    const person = toSignIn(signIn)
    const status = computeVolunteerStatus(
      signIn.attended_secuela_at,
      secuelaEvent
    )
    if (status === 'attended_secuela') attended.push(person)
    else if (status === 'wants_to_serve') wantsToServe.push(person)
  }

  return {
    eventId: event.id,
    groupId: event.weekend_group_id,
    groupNumber: event.weekend_groups?.number ?? null,
    title: event.title,
    startsAt: event.datetime,
    endsAt: event.end_datetime,
    location: event.location,
    windowOpensAt: opensAt.toISOString(),
    windowClosesAt: closesAt.toISOString(),
    attendedCount: attended.length,
    wantsToServeCount: wantsToServe.length,
    attended,
    wantsToServe,
  }
}

/**
 * The active group's secuela and every earlier one, each with who attended
 * versus signed up to serve outside the event.
 */
export async function getSecuelaOverview(
  now: Date = new Date()
): Promise<Result<string, SecuelaOverview>> {
  const [activeWeekendsResult, eventsResult] = await Promise.all([
    getActiveWeekends(),
    Repository.findAllSecuelaEvents(),
  ])
  if (isErr(eventsResult)) return eventsResult

  let activeGroup: SecuelaOverview['activeGroup'] = null
  if (!isErr(activeWeekendsResult)) {
    const mens = activeWeekendsResult.data[WeekendType.MENS]
    const womens = activeWeekendsResult.data[WeekendType.WOMENS]
    const groupId = mens.groupId ?? womens.groupId
    if (!isNil(groupId)) {
      activeGroup = { groupId, groupNumber: mens.number ?? womens.number }
    }
  }

  // One secuela per group: the earliest, matching the roster builder's lookup
  const byGroup = new Map<
    string,
    RawSecuelaEvent & { datetime: string; weekend_group_id: string }
  >()
  for (const event of eventsResult.data) {
    if (isNil(event.datetime) || isNil(event.weekend_group_id)) continue
    byGroup.set(event.weekend_group_id, {
      ...event,
      datetime: event.datetime,
      weekend_group_id: event.weekend_group_id,
    })
  }

  const signInsResult = await Repository.findSecuelaSignIns([...byGroup.keys()])
  if (isErr(signInsResult)) return signInsResult

  const signInsByGroup = new Map<string, RawSecuelaSignIn[]>()
  for (const row of signInsResult.data) {
    const list = signInsByGroup.get(row.group_id) ?? []
    list.push(row)
    signInsByGroup.set(row.group_id, list)
  }

  const summaries = [...byGroup.values()].map((event) =>
    summarize(event, signInsByGroup.get(event.weekend_group_id) ?? [])
  )

  const active =
    summaries.find((s) => s.groupId === activeGroup?.groupId) ?? null
  const previous = summaries
    .filter(
      (s) =>
        s.groupId !== activeGroup?.groupId &&
        new Date(s.startsAt).getTime() <= now.getTime()
    )
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))

  return ok({ activeGroup, active, previous })
}
