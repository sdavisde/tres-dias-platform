import 'server-only'

import { isNil } from 'lodash'
import type { Result } from '@/lib/results'
import { isErr, ok } from '@/lib/results'
import { getSecuelaAttendanceWindow } from '@/lib/secuela/attendance-window'
import { computeVolunteerStatus } from '@/services/roster-builder/volunteer-status'
import { getActiveWeekends } from '@/services/weekend/weekend-service'
import { WeekendType } from '@/services/weekend'
import * as Repository from './repository'
import type { RawSecuelaEvent } from './repository'
import type { SecuelaOverview, SecuelaSummary } from './types'

function summarize(
  event: RawSecuelaEvent & { datetime: string; weekend_group_id: string },
  signIns: string[]
): SecuelaSummary {
  const secuelaEvent = {
    startDate: event.datetime,
    endDate: event.end_datetime,
  }
  const { opensAt, closesAt } = getSecuelaAttendanceWindow(secuelaEvent)

  let attendedCount = 0
  let wantsToServeCount = 0
  for (const signIn of signIns) {
    const status = computeVolunteerStatus(signIn, secuelaEvent)
    if (status === 'attended_secuela') attendedCount++
    else if (status === 'wants_to_serve') wantsToServeCount++
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
    attendedCount,
    wantsToServeCount,
  }
}

/**
 * The active group's secuela and every earlier one, each with how many
 * members attended versus signed up to serve outside the event.
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

  const signInsByGroup = new Map<string, string[]>()
  for (const row of signInsResult.data) {
    const list = signInsByGroup.get(row.group_id) ?? []
    list.push(row.attended_secuela_at)
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
