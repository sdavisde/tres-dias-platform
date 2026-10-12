import { isNil } from 'lodash'
import type { ExperienceLevel } from '@/services/master-roster/types'
import type { RosterBuilderCommunityMember } from '@/services/roster-builder'

// ── Types ─────────────────────────────────────────────────────────────────────

export type GenderFilter = 'all' | 'male' | 'female'

export type Qualification =
  | 'secuela'
  | 'rollista'
  | 'sectionHead'
  | 'rectorReady'
  | 'clergy'
  | 'essentials'

export type CommunityFilters = {
  search: string
  gender: GenderFilter
  /** Experience levels (1–3) to include; empty means any. */
  experience: ExperienceLevel[]
  hideAssigned: boolean
  /** Every selected qualification must hold. */
  qualifications: Qualification[]
  /** Matches anyone with at least one of these skills. */
  skills: string[]
  /** Matches anyone who has served in at least one of these CHA roles. */
  servedAs: string[]
  /** Matches anyone attending one of these churches. */
  churches: string[]
}

export type FilterOption = { value: string; count: number }

export type FilterOptions = {
  skills: FilterOption[]
  servedAs: FilterOption[]
  churches: FilterOption[]
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export function defaultGenderFilter(weekendType: string): GenderFilter {
  if (weekendType === 'MENS') return 'male'
  if (weekendType === 'WOMENS') return 'female'
  return 'all'
}

export function defaultFilters(weekendType: string): CommunityFilters {
  return {
    search: '',
    gender: defaultGenderFilter(weekendType),
    experience: [],
    hideAssigned: false,
    qualifications: [],
    skills: [],
    servedAs: [],
    churches: [],
  }
}

/**
 * How many filters differ from the weekend's defaults, for the Filters
 * button's badge. Search is shown in its own box, so it doesn't count.
 */
export function countActiveFilters(
  filters: CommunityFilters,
  weekendType: string
): number {
  return (
    (filters.gender !== defaultGenderFilter(weekendType) ? 1 : 0) +
    filters.experience.length +
    (filters.hideAssigned ? 1 : 0) +
    filters.qualifications.length +
    filters.skills.length +
    filters.servedAs.length +
    filters.churches.length
  )
}

// ── Matching ──────────────────────────────────────────────────────────────────

/** Skills are free text, so compare them without case or stray spaces. */
export function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase()
}

export function hasQualification(
  member: RosterBuilderCommunityMember,
  qualification: Qualification
): boolean {
  switch (qualification) {
    case 'secuela':
      return member.volunteerStatus !== 'none'
    case 'rollista':
      return member.hasGivenRollo
    case 'sectionHead':
      return member.hasBeenSectionHead
    case 'rectorReady':
      // Past rectors have their own badge; this finds the next ones.
      return (
        member.rectorReadyStatus.isReady &&
        !member.rectorReadyStatus.criteria.hasServedAsRector
      )
    case 'clergy':
      return member.isClergy
    case 'essentials':
      return !isNil(member.essentialsTrainingDate)
  }
}

function matchesSearch(member: RosterBuilderCommunityMember, query: string) {
  const name = `${member.firstName ?? ''} ${member.lastName ?? ''}`
  return (
    name.toLowerCase().includes(query) ||
    (member.church ?? '').toLowerCase().includes(query) ||
    member.skills.some((s) => s.toLowerCase().includes(query))
  )
}

/**
 * Applies the Browse Community filters. Members already on the roster sort
 * to the bottom (or drop out entirely with `hideAssigned`).
 */
export function filterCommunityMembers(
  members: RosterBuilderCommunityMember[],
  filters: CommunityFilters,
  assignedIds: ReadonlySet<string>
): RosterBuilderCommunityMember[] {
  const query = filters.search.trim().toLowerCase()
  const skills = new Set(filters.skills.map(normalizeSkill))
  const servedAs = new Set(filters.servedAs)
  const churches = new Set(filters.churches)

  const list = members.filter((m) => {
    if (filters.hideAssigned && assignedIds.has(m.id)) return false
    if (query.length > 0 && !matchesSearch(m, query)) return false
    if (
      filters.gender !== 'all' &&
      m.gender?.toLowerCase() !== filters.gender
    ) {
      return false
    }
    if (
      filters.experience.length > 0 &&
      !filters.experience.includes(m.experienceLevel)
    ) {
      return false
    }
    if (!filters.qualifications.every((q) => hasQualification(m, q))) {
      return false
    }
    if (
      skills.size > 0 &&
      !m.skills.some((s) => skills.has(normalizeSkill(s)))
    ) {
      return false
    }
    if (
      servedAs.size > 0 &&
      !m.experience.some((r) => servedAs.has(r.cha_role))
    ) {
      return false
    }
    if (churches.size > 0 && !churches.has(m.church?.trim() ?? '')) {
      return false
    }
    return true
  })

  return list.sort(
    (a, b) => Number(assignedIds.has(a.id)) - Number(assignedIds.has(b.id))
  )
}

// ── Options ───────────────────────────────────────────────────────────────────

function toOptions(counts: Map<string, number>): FilterOption[] {
  return Array.from(counts, ([value, count]) => ({ value, count })).sort(
    (a, b) =>
      b.count !== a.count ? b.count - a.count : a.value.localeCompare(b.value)
  )
}

/**
 * Builds the skill, role and church choices from the community itself, so
 * custom skills show up and nothing offered can match zero people. Each
 * option counts distinct members, most common first.
 */
export function buildFilterOptions(
  members: RosterBuilderCommunityMember[]
): FilterOptions {
  // Keyed by normalized skill; the first spelling seen is the label.
  const skillLabels = new Map<string, string>()
  const skillCounts = new Map<string, number>()
  const roleCounts = new Map<string, number>()
  const churchCounts = new Map<string, number>()

  for (const m of members) {
    for (const skill of new Set(m.skills.map(normalizeSkill))) {
      if (skill === '') continue
      skillCounts.set(skill, (skillCounts.get(skill) ?? 0) + 1)
    }
    for (const skill of m.skills) {
      const key = normalizeSkill(skill)
      if (key !== '' && !skillLabels.has(key))
        skillLabels.set(key, skill.trim())
    }
    for (const role of new Set(m.experience.map((r) => r.cha_role))) {
      roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1)
    }
    const church = m.church?.trim() ?? ''
    if (church !== '') {
      churchCounts.set(church, (churchCounts.get(church) ?? 0) + 1)
    }
  }

  const labelledSkills = new Map(
    Array.from(skillCounts, ([key, count]) => [
      skillLabels.get(key) ?? key,
      count,
    ])
  )

  return {
    skills: toOptions(labelledSkills),
    servedAs: toOptions(roleCounts),
    churches: toOptions(churchCounts),
  }
}
