import { isNil } from 'lodash'
import {
  ArrowRight,
  CalendarHeart,
  CheckCircle2,
  HandHeart,
  MapPin,
} from 'lucide-react'
import type { User } from '@/lib/users/types'
import { isErr, Results } from '@/lib/results'
import { formatDateTime } from '@/lib/utils'
import { formatWeekendGroupTitle } from '@/lib/weekend'
import {
  getSecuelaAttendanceWindow,
  isDuringSecuela,
  SECUELA_SERVE_PROMPT_DURATION_MS,
} from '@/lib/secuela/attendance-window'
import { getCachedActiveWeekends } from '@/services/weekend/cached'
import { getCachedEventsForGroup } from '@/services/events/cached'
import { EventType } from '@/services/events/types'
import { WeekendType } from '@/lib/weekend/types'
import { getSecuelaSignInForUser } from '@/services/weekend-group-member'
import { Button } from '@/components/ui/button'

type SecuelaBannerState =
  | { kind: 'upcoming' }
  | { kind: 'open' }
  | { kind: 'signed_in' }
  /** Secuela is over and the member never signed in. */
  | { kind: 'passed' }

interface SecuelaBannerData {
  state: SecuelaBannerState
  groupTitle: string
  when: string
  location: string | null
}

/**
 * The active group's secuela as the member should see it right now, or null
 * when none is scheduled, it ended over SECUELA_SERVE_PROMPT_DURATION_MS ago,
 * or it has ended and the member already signed in.
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
  if (now > closesAt.getTime() + SECUELA_SERVE_PROMPT_DURATION_MS) return null

  let state: SecuelaBannerState = { kind: 'upcoming' }
  if (now >= opensAt.getTime()) {
    const signIn = Results.unwrapOr(
      await getSecuelaSignInForUser(groupId, user.id),
      null
    )
    if (now > closesAt.getTime()) {
      // Anyone who signed in, at secuela or since, has already told the team
      if (!isNil(signIn)) return null
      state = { kind: 'passed' }
    } else {
      state =
        !isNil(signIn) && isDuringSecuela(signIn, secuelaEvent)
          ? { kind: 'signed_in' }
          : { kind: 'open' }
    }
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
 * where beforehand and while it runs (no sign-in link: only people at the
 * secuela should sign in there), and a confirmation once the member has
 * signed in. After it ends, members who never
 * signed in are invited to say they're interested in serving, for
 * SECUELA_SERVE_PROMPT_DURATION_MS.
 */
export async function SecuelaBanner({ user }: { user: User }) {
  const data = await getSecuelaBannerData(user)
  if (isNil(data)) return null

  const { state, groupTitle, when, location } = data
  if (state.kind === 'passed') {
    return <SecuelaPassedBanner groupTitle={groupTitle} />
  }

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
          {state.kind === 'signed_in' && (
            <p className="text-sm opacity-80">
              Thank you! The rectors can see you were there.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function SecuelaPassedBanner({ groupTitle }: { groupTitle: string }) {
  return (
    <section className="rounded-xl border border-secondary-border bg-secondary p-5 text-secondary-foreground">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <p className="flex items-center gap-2 font-semibold">
            <HandHeart className="h-5 w-5 shrink-0" />
            Are you interested in serving on {groupTitle}?
          </p>
          <p className="text-sm opacity-80">
            Secuela for {groupTitle} has passed, but you can still let the
            leadership team know you&apos;re interested in serving.
          </p>
        </div>

        <Button
          href="/secuela-signin"
          variant="outline"
          size="lg"
          className="w-full sm:w-auto"
          linkProps={{ className: 'block sm:inline-block' }}
        >
          I&apos;m interested
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  )
}
