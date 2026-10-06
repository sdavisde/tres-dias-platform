import { isNil } from 'lodash'
import { ArrowRight, CalendarHeart, CheckCircle2, MapPin } from 'lucide-react'
import type { User } from '@/lib/users/types'
import { isErr, Results } from '@/lib/results'
import { formatDateTime } from '@/lib/utils'
import { formatWeekendGroupTitle } from '@/lib/weekend'
import {
  getSecuelaAttendanceWindow,
  isDuringSecuela,
} from '@/lib/secuela/attendance-window'
import { getCachedActiveWeekends } from '@/services/weekend/cached'
import { getCachedEventsForGroup } from '@/services/events/cached'
import { EventType } from '@/services/events/types'
import { WeekendType } from '@/lib/weekend/types'
import { getSecuelaSignInForUser } from '@/services/weekend-group-member'
import { Button } from '@/components/ui/button'

type SecuelaBannerState =
  { kind: 'upcoming' } | { kind: 'open' } | { kind: 'signed_in' }

interface SecuelaBannerData {
  state: SecuelaBannerState
  groupTitle: string
  when: string
  location: string | null
}

/**
 * The active group's secuela as the member should see it right now, or null
 * once it has ended (or when none is scheduled).
 */
async function getSecuelaBannerData(
  user: User
): Promise<SecuelaBannerData | null> {
  const weekendsResult = await getCachedActiveWeekends()
  if (isErr(weekendsResult)) return null

  const mensWeekend = weekendsResult.data[WeekendType.MENS]
  const womensWeekend = weekendsResult.data[WeekendType.WOMENS]
  const groupId = mensWeekend.groupId ?? womensWeekend.groupId
  if (isNil(groupId)) return null

  const events = Results.unwrapOr(await getCachedEventsForGroup(groupId), [])
  const secuela = events.find((event) => event.type === EventType.SECUELA)
  if (isNil(secuela?.datetime)) return null

  const secuelaEvent = {
    startDate: secuela.datetime,
    endDate: secuela.endDatetime,
  }
  const { opensAt, closesAt } = getSecuelaAttendanceWindow(secuelaEvent)
  const now = Date.now()
  if (now > closesAt.getTime()) return null

  let state: SecuelaBannerState = { kind: 'upcoming' }
  if (now >= opensAt.getTime()) {
    const signIn = Results.unwrapOr(
      await getSecuelaSignInForUser(groupId, user.id),
      null
    )
    state =
      !isNil(signIn) && isDuringSecuela(signIn, secuelaEvent)
        ? { kind: 'signed_in' }
        : { kind: 'open' }
  }

  const datetime = formatDateTime(secuela.datetime)
  return {
    state,
    groupTitle: formatWeekendGroupTitle(
      mensWeekend.number ?? womensWeekend.number
    ),
    when:
      typeof datetime === 'string'
        ? datetime
        : `${datetime.dateStr} at ${datetime.timeStr}`,
    location:
      isNil(secuela.location) || secuela.location === ''
        ? null
        : secuela.location,
  }
}

/**
 * Advertises the active group's secuela on the member home page: when and
 * where beforehand, a sign-in button while sign-ins are open, and a
 * confirmation once the member has signed in. Hidden after it ends.
 */
export async function SecuelaBanner({ user }: { user: User }) {
  const data = await getSecuelaBannerData(user)
  if (isNil(data)) return null

  const { state, groupTitle, when, location } = data
  const heading =
    state.kind === 'upcoming'
      ? `${groupTitle} Secuela is coming up`
      : state.kind === 'open'
        ? `${groupTitle} Secuela is happening now`
        : `You're signed in to ${groupTitle} Secuela`

  return (
    <section className="rounded-xl border border-secondary-border bg-secondary p-5 text-secondary-foreground">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <p className="flex items-center gap-2 font-semibold">
            {state.kind === 'signed_in' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <CalendarHeart className="h-5 w-5 shrink-0" />
            )}
            {heading}
          </p>
          <p className="text-sm">{when}</p>
          {!isNil(location) && (
            <p className="flex items-center gap-1.5 text-sm">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {location}
            </p>
          )}
          {state.kind !== 'upcoming' && (
            <p className="text-sm opacity-80">
              {state.kind === 'open'
                ? 'Sign in so the team knows you came and want to serve.'
                : 'Thank you! The rectors can see you were there.'}
            </p>
          )}
        </div>

        {state.kind === 'open' && (
          <Button
            href="/secuela-signin"
            size="lg"
            className="w-full sm:w-auto"
            linkProps={{ className: 'block sm:inline-block' }}
          >
            Sign in
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </section>
  )
}
