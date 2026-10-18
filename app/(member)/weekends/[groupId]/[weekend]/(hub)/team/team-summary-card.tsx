import { isNil } from 'lodash'
import { formatDistanceToNow } from 'date-fns'
import { CalendarClock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import { CHARole } from '@/lib/weekend/types'
import { upcomingEvents } from '@/lib/weekend/hub'
import type { Event } from '@/services/events'
import type { WeekendRosterMember } from '@/services/weekend'
import { ContactButtons } from '@/app/(member)/community/components/contact-buttons'

/** Who leads a weekend, in the order the card lists them. */
const LEADERSHIP_ORDER: readonly string[] = [
  CHARole.RECTOR,
  CHARole.HEAD,
  CHARole.ASSISTANT_HEAD,
]

function leadersOf(roster: WeekendRosterMember[]) {
  return roster
    .filter(
      (member) =>
        member.status !== 'drop' &&
        !isNil(member.users) &&
        LEADERSHIP_ORDER.includes(member.cha_role ?? '')
    )
    .sort(
      (a, b) =>
        LEADERSHIP_ORDER.indexOf(a.cha_role ?? '') -
        LEADERSHIP_ORDER.indexOf(b.cha_role ?? '')
    )
}

function formatWhen(datetime: string | null): string {
  const formatted = formatDateTime(datetime)
  return typeof formatted === 'string'
    ? formatted
    : `${formatted.dateStr} at ${formatted.timeStr}`
}

/**
 * The Team tab's opening card, beside the experience chart: who leads this
 * weekend (and how to reach them) and, when one is scheduled, the next team
 * meeting.
 */
export function TeamSummaryCard({
  roster,
  events,
}: {
  roster: WeekendRosterMember[]
  /** This weekend's events; the next `meeting` after now is shown. */
  events: Event[]
}) {
  const leaders = leadersOf(roster)
  const [meeting] = upcomingEvents(
    events.filter((event) => event.type === 'meeting'),
    new Date(),
    1
  )

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Leadership</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {leaders.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No leaders assigned yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {leaders.map((member) => {
              const name =
                `${member.users?.first_name ?? ''} ${member.users?.last_name ?? ''}`.trim()
              return (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{name}</p>
                    <p className="text-muted-foreground">{member.cha_role}</p>
                  </div>
                  <ContactButtons
                    name={name}
                    phoneNumber={member.users?.phone_number ?? null}
                    email={member.users?.email ?? null}
                  />
                </li>
              )
            })}
          </ul>
        )}

        {!isNil(meeting) && !isNil(meeting.datetime) && (
          <div className="space-y-1 border-t pt-4 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Upcoming team meeting
            </p>
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {meeting.title ?? 'Team meeting'}
                  <span className="font-normal text-muted-foreground">
                    {' · '}
                    {formatDistanceToNow(new Date(meeting.datetime), {
                      addSuffix: true,
                    })}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  {formatWhen(meeting.datetime)}
                  {!isNil(meeting.location) &&
                    meeting.location !== '' &&
                    ` · ${meeting.location}`}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
