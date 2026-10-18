import { isNil } from 'lodash'
import type {
  Audience,
  AudienceOptions,
} from '@/services/community-email/types'

/** "Whole community", "Men in the community", "DTTD #11 Men's team", … */
export function describeAudience(
  audience: Audience,
  options: AudienceOptions
): string {
  const weekend = (id: string) =>
    options.weekends.find((w) => w.id === id)?.label ?? 'a weekend'
  const group = (id: string) =>
    options.groups.find((g) => g.id === id)?.label ?? 'a weekend group'

  switch (audience.type) {
    case 'community':
      if (audience.gender === 'male') return 'Men in the community'
      if (audience.gender === 'female') return 'Women in the community'
      return 'Whole community'
    case 'weekend_team':
      return `${weekend(audience.weekendId)} team`
    case 'weekend_candidates':
      return `${weekend(audience.weekendId)} candidates`
    case 'weekend_sponsors':
      return `Sponsors of ${weekend(audience.weekendId)} candidates`
    case 'role': {
      const role = options.roles.find((r) => r.id === audience.roleId)
      return isNil(role) ? 'People with a role' : `${role.label} role`
    }
    case 'group_team':
      return `${group(audience.groupId)} Men's and Women's teams`
    case 'group_pescadores':
      return `${group(audience.groupId)} new pescadores`
  }
}
