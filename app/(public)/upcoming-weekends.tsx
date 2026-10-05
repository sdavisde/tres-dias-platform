import { Calendar, CalendarHeart } from 'lucide-react'
import { isNil } from 'lodash'
import type { LucideIcon } from 'lucide-react'
import { isErr, Results } from '@/lib/results'
import { formatDateRange, formatDateTime } from '@/lib/utils'
import { formatWeekendGroupTitle } from '@/lib/weekend'
import { WeekendType, type Weekend } from '@/lib/weekend/types'
import { getCachedActiveWeekends } from '@/services/weekend/cached'
import { getCachedEventsForGroup } from '@/services/events/cached'
import { EventType } from '@/services/events/types'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Landing page cards for the active weekend group: its Men's and Women's
 * weekends, plus the group's secuela once one is scheduled. Renders nothing
 * when no group is active, leaving the section's call to action on its own.
 */
export async function UpcomingWeekends() {
  const weekendsResult = await getCachedActiveWeekends()
  if (isErr(weekendsResult)) return null

  const mensWeekend = weekendsResult.data[WeekendType.MENS]
  const womensWeekend = weekendsResult.data[WeekendType.WOMENS]
  const groupId = mensWeekend.groupId ?? womensWeekend.groupId
  const groupTitle = getGroupTitle(mensWeekend, womensWeekend)

  const events = isNil(groupId)
    ? []
    : Results.unwrapOr(await getCachedEventsForGroup(groupId), [])
  const secuela = events.find((event) => event.type === EventType.SECUELA)
  const secuelaDate = isNil(secuela) ? null : formatDateTime(secuela.datetime)

  return (
    <div
      className={`grid gap-6 mx-auto ${
        isNil(secuela) ? 'sm:grid-cols-2 max-w-2xl' : 'md:grid-cols-3'
      }`}
    >
      <EventCard
        icon={Calendar}
        title={`${groupTitle} Men's`}
        detail={formatDateRange(mensWeekend.start_date, mensWeekend.end_date)}
      />
      <EventCard
        icon={Calendar}
        title={`${groupTitle} Women's`}
        detail={formatDateRange(
          womensWeekend.start_date,
          womensWeekend.end_date
        )}
      />
      {!isNil(secuelaDate) && (
        <EventCard
          icon={CalendarHeart}
          title={`${groupTitle} Secuela`}
          detail={
            typeof secuelaDate === 'string'
              ? secuelaDate
              : `${secuelaDate.dateStr} at ${secuelaDate.timeStr}`
          }
          location={secuela?.location}
        />
      )}
    </div>
  )
}

interface EventCardProps {
  icon: LucideIcon
  title: string
  detail: string
  location?: string | null
}

function EventCard({ icon: Icon, title, detail, location }: EventCardProps) {
  return (
    <div className="bg-card rounded-xl border p-6 text-left shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 shrink-0 rounded-full bg-secondary flex items-center justify-center">
          <Icon className="w-5 h-5 text-secondary-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{detail}</p>
          {!isNil(location) && location !== '' && (
            <p className="text-sm text-muted-foreground">{location}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function getGroupTitle(mensWeekend: Weekend, womensWeekend: Weekend): string {
  return formatWeekendGroupTitle(mensWeekend.number ?? womensWeekend.number)
}

export function UpcomingWeekendsSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
      <Skeleton className="h-[90px] rounded-xl" />
      <Skeleton className="h-[90px] rounded-xl" />
    </div>
  )
}
