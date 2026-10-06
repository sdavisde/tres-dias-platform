import { isNil } from 'lodash'
import {
  Heart,
  LogIn,
  UserPlus,
  ArrowRight,
  CalendarHeart,
  Clock,
  MapPin,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { isErr, Results } from '@/lib/results'
import { formatDateTime } from '@/lib/utils'
import { formatWeekendGroupTitle } from '@/lib/weekend'
import { WeekendType } from '@/lib/weekend/types'
import { getCachedActiveWeekends } from '@/services/weekend/cached'
import { getCachedEventsForGroup } from '@/services/events/cached'
import { EventType } from '@/services/events/types'
import { getSecuelaAttendanceWindow } from '@/lib/secuela/attendance-window'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface SecuelaDetails {
  groupTitle: string
  when: string
  /** "9:00 AM CT"; null when no secuela is scheduled. */
  startTime: string | null
  location: string | null
  /** False until 30 minutes before the start; true when unscheduled. */
  isRegistrationOpen: boolean
}

/**
 * The secuela members are signing up through: the active weekend group's,
 * the same group `markSecuelaAttendance` records them against.
 */
async function getActiveSecuela(): Promise<SecuelaDetails | null> {
  const weekendsResult = await getCachedActiveWeekends()
  if (isErr(weekendsResult)) return null

  const mensWeekend = weekendsResult.data[WeekendType.MENS]
  const womensWeekend = weekendsResult.data[WeekendType.WOMENS]
  const groupId = mensWeekend.groupId ?? womensWeekend.groupId
  if (isNil(groupId)) return null

  const events = Results.unwrapOr(await getCachedEventsForGroup(groupId), [])
  const secuela = events.find((event) => event.type === EventType.SECUELA)
  const datetime = formatDateTime(secuela?.datetime ?? null)
  const opensAt = isNil(secuela?.datetime)
    ? null
    : getSecuelaAttendanceWindow({
        startDate: secuela.datetime,
        endDate: secuela.endDatetime,
      }).opensAt

  return {
    groupTitle: formatWeekendGroupTitle(
      mensWeekend.number ?? womensWeekend.number
    ),
    when:
      typeof datetime === 'string'
        ? datetime
        : `${datetime.dateStr} at ${datetime.timeStr}`,
    startTime: typeof datetime === 'string' ? null : datetime.timeStr,
    isRegistrationOpen: isNil(opensAt) || Date.now() >= opensAt.getTime(),
    location:
      isNil(secuela?.location) || secuela.location === ''
        ? null
        : secuela.location,
  }
}

export default async function SecuelaSignInPage() {
  const supabase = await createClient()
  const [
    {
      data: { user },
    },
    secuela,
  ] = await Promise.all([supabase.auth.getUser(), getActiveSecuela()])

  const isLoggedIn = !isNil(user)

  if (isNil(secuela)) {
    return (
      <div className="container max-w-sm mx-auto py-8 px-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              Sign-Ups Aren&apos;t Open
            </CardTitle>
            <CardDescription className="text-base">
              There&apos;s no upcoming weekend to sign up for right now. Please
              check back closer to the next secuela.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Sign-ins only open 30 minutes before the secuela starts
  if (!secuela.isRegistrationOpen) {
    return <RegistrationNotOpen secuela={secuela} />
  }

  return (
    <div className="container max-w-sm mx-auto py-8 px-4">
      <Card className="shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Sign Up to Serve</CardTitle>
          <CardDescription className="text-base">
            Thank you for your willingness to serve on {secuela.groupTitle}!
            {isLoggedIn
              ? ' Tap the button below to sign up to serve.'
              : ' Sign in or create an account to sign up.'}
          </CardDescription>
          <SecuelaSummary secuela={secuela} />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {isLoggedIn ? (
            <Button asChild size="lg" className="w-full">
              <a href="/secuela-confirm">
                <ArrowRight className="mr-2 h-4 w-4" />
                Confirm Attendance
              </a>
            </Button>
          ) : (
            <>
              <Button asChild size="lg" className="w-full">
                <a href="/login?redirectTo=%2Fsecuela-signin">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full">
                <a href="/join?redirectTo=%2Fsecuela-signin">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Account
                </a>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RegistrationNotOpen({ secuela }: { secuela: SecuelaDetails }) {
  return (
    <div className="container max-w-sm mx-auto py-8 px-4">
      <Card className="shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            Registration Hasn&apos;t Started Yet
          </CardTitle>
          <CardDescription className="text-base">
            {secuela.groupTitle} Secuela starts at {secuela.startTime}. Sign-ins
            open 30 minutes before it begins, so come back once you&apos;ve
            arrived.
          </CardDescription>
          <SecuelaSummary secuela={secuela} />
        </CardHeader>
      </Card>
    </div>
  )
}

function SecuelaSummary({ secuela }: { secuela: SecuelaDetails }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-4 text-left space-y-1">
      <p className="flex items-center gap-2 font-semibold text-foreground">
        <CalendarHeart className="h-4 w-4 shrink-0 text-primary" />
        {secuela.groupTitle} Secuela
      </p>
      <p className="text-sm text-muted-foreground">{secuela.when}</p>
      {!isNil(secuela.location) && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {secuela.location}
        </p>
      )}
    </div>
  )
}
