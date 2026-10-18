import 'server-only'

import { isNil } from 'lodash'
import { format } from 'date-fns'
import { Results } from '@/lib/results'
import type { User } from '@/lib/users/types'
import { formatWeekendGender } from '@/lib/weekend'
import type { Weekend, WeekendType } from '@/lib/weekend/types'
import { describeAudience } from '@/app/admin/email/components/audience-label'
import { canSendToAudience } from '@/services/community-email/audience-access'
import {
  getAudienceOptions,
  listSentBroadcastsForGroup,
} from '@/services/community-email/community-email-service'
import type { EmailChoice, EmailMenuProps, SentEmail } from './email-menu'

/**
 * Loads an {@link EmailMenu}'s props: the choices this viewer may send to,
 * and the group's sent emails. Null when the viewer
 * may send to none of them, so the page shows no menu.
 */
async function loadEmailMenu(
  user: User,
  groupId: string,
  weekendIds: string[],
  choices: EmailChoice[]
): Promise<EmailMenuProps | null> {
  const allowed = choices.filter((choice) =>
    canSendToAudience(user, choice.audience)
  )
  if (allowed.length === 0) return null

  const [sentResult, optionsResult] = await Promise.all([
    listSentBroadcastsForGroup(groupId, weekendIds),
    getAudienceOptions(),
  ])
  Results.logFailures(sentResult)
  Results.logFailures(optionsResult)
  const options = Results.unwrapOr(optionsResult, null)

  const sent: SentEmail[] = isNil(options)
    ? []
    : Results.unwrapOr(sentResult, []).map((email) => ({
        id: email.id,
        subject: email.subject,
        detail: [
          describeAudience(email.audience, options),
          `${email.sentCount} sent`,
          isNil(email.sentAt) ? null : format(new Date(email.sentAt), 'MMM d'),
          email.sentByName,
        ]
          .filter((part) => !isNil(part))
          .join(' · '),
      }))

  return { choices: allowed, sent }
}

/**
 * Team tab: the weekend's leaders email their team; admins also both teams.
 */
export function loadTeamEmailMenu({
  user,
  groupId,
  weekend,
  weekendType,
}: {
  user: User
  groupId: string
  weekend: Weekend
  weekendType: WeekendType
}) {
  const gender = formatWeekendGender(weekendType, 'possessive') ?? 'This'
  return loadEmailMenu(
    user,
    groupId,
    [weekend.id],
    [
      {
        label: `The ${gender} team`,
        audience: { type: 'weekend_team', weekendId: weekend.id },
      },
      {
        label: "Both teams (Men's and Women's)",
        audience: { type: 'group_team', groupId },
      },
    ]
  )
}

/** Secuela: email the group's new pescadores, or the whole community. */
export function loadSecuelaEmailMenu(user: User, groupId: string) {
  return loadEmailMenu(
    user,
    groupId,
    [],
    [
      {
        label: 'New pescadores',
        audience: { type: 'group_pescadores', groupId },
      },
      { label: 'The whole community', audience: { type: 'community' } },
    ]
  )
}
