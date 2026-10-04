import { isEmpty, isNil } from 'lodash'
import type { ColumnFiltersState } from '@tanstack/react-table'
import type { MasterRosterMember } from '@/services/master-roster/types'
import { formatPhoneNumber } from '@/lib/utils'
import { formatServedSummary } from './served-summary'

/** "First Last", or "Unknown User" when neither is set. */
export function memberDisplayName(member: MasterRosterMember): string {
  const name = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim()
  return name !== '' ? name : 'Unknown User'
}

/** Role labels joined with commas, or "-" for none. */
export function memberRolesLabel(member: MasterRosterMember): string {
  if (isEmpty(member.roles)) return '-'
  return member.roles.map((r) => r.label).join(', ')
}

/**
 * The value each select-filterable column filters on — the same value its
 * accessor feeds the table, so the export keeps exactly the rows on screen.
 */
const FILTER_VALUES: Record<string, (member: MasterRosterMember) => string> = {
  role: memberRolesLabel,
  level: (member) => String(member.level),
  rectorReady: (member) => member.rectorReady.statusLabel,
}

/**
 * Search across name, email, phone and role labels (email stays searchable
 * even though the board drops the email column).
 */
export function memberMatchesSearch(
  member: MasterRosterMember,
  search: string
): boolean {
  const query = search.toLowerCase().trim()
  if (query === '') return true

  const name =
    `${member.firstName ?? ''} ${member.lastName ?? ''}`.toLowerCase()
  const email = (member.email ?? '').toLowerCase()
  const phone = (member.phoneNumber ?? '').toLowerCase()
  const roleLabels = member.roles.map((r) => r.label.toLowerCase())

  return (
    name.includes(query) ||
    email.includes(query) ||
    phone.includes(query) ||
    roleLabels.some((label) => label.includes(query))
  )
}

/** The members the People table shows for this search and column filters. */
export function filterPeopleForExport(
  members: MasterRosterMember[],
  {
    search,
    columnFilters,
  }: { search: string; columnFilters: ColumnFiltersState }
): MasterRosterMember[] {
  return members.filter((member) => {
    if (!memberMatchesSearch(member, search)) return false
    return columnFilters.every(({ id, value }) => {
      const valueFor = FILTER_VALUES[id]
      if (isNil(valueFor) || !Array.isArray(value) || isEmpty(value)) {
        return true
      }
      return value.includes(valueFor(member))
    })
  })
}

/**
 * Escape a CSV field: quote it when it holds a comma, quote or line break.
 */
function escapeCsvField(value: string | null | undefined): string {
  if (isNil(value) || value === '') return ''
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

type CsvColumn = {
  header: string
  value: (member: MasterRosterMember) => string
  /** Only exported for users who can read service experience. */
  experienceOnly?: boolean
}

/** The table's columns plus the contact and community detail in the editor. */
export const PEOPLE_CSV_COLUMNS: CsvColumn[] = [
  { header: 'First name', value: (m) => m.firstName ?? '' },
  { header: 'Last name', value: (m) => m.lastName ?? '' },
  { header: 'Email', value: (m) => m.email ?? '' },
  {
    header: 'Phone',
    value: (m) =>
      isNil(m.phoneNumber) ? '' : formatPhoneNumber(m.phoneNumber),
  },
  { header: 'Gender', value: (m) => m.gender ?? '' },
  { header: 'Address line 1', value: (m) => m.address?.addressLine1 ?? '' },
  { header: 'Address line 2', value: (m) => m.address?.addressLine2 ?? '' },
  { header: 'City', value: (m) => m.address?.city ?? '' },
  { header: 'State', value: (m) => m.address?.state ?? '' },
  { header: 'Zip', value: (m) => m.address?.zip ?? '' },
  {
    header: 'Church',
    value: (m) => m.communityInformation.churchAffiliation ?? '',
  },
  {
    header: 'Weekend attended',
    value: (m) => m.communityInformation.weekendAttended ?? '',
  },
  {
    header: 'Essentials training',
    value: (m) =>
      m.communityInformation.essentialsTrainingDate?.slice(0, 10) ?? '',
  },
  {
    header: 'Gifts & skills',
    value: (m) =>
      (m.communityInformation.specialGiftsAndSkills ?? []).join(', '),
  },
  {
    header: 'Roles',
    value: (m) => m.roles.map((r) => r.label).join(', '),
  },
  {
    header: 'Level',
    value: (m) => String(m.level),
    experienceOnly: true,
  },
  {
    header: 'Rector ready',
    value: (m) => m.rectorReady.statusLabel,
    experienceOnly: true,
  },
  {
    header: 'Served',
    value: (m) =>
      formatServedSummary(m.experience)?.replace(/^served /, '') ?? '',
    experienceOnly: true,
  },
]

/** Convert members to a CSV string, sorted by last then first name. */
export function generatePeopleCsv(
  members: MasterRosterMember[],
  { includeExperience }: { includeExperience: boolean }
): string {
  const columns = PEOPLE_CSV_COLUMNS.filter(
    (col) => includeExperience || col.experienceOnly !== true
  )
  const sorted = [...members].sort((a, b) => {
    const byLast = (a.lastName ?? '').localeCompare(b.lastName ?? '')
    if (byLast !== 0) return byLast
    return (a.firstName ?? '').localeCompare(b.firstName ?? '')
  })
  const headerRow = columns.map((col) => escapeCsvField(col.header)).join(',')
  const dataRows = sorted.map((member) =>
    columns.map((col) => escapeCsvField(col.value(member))).join(',')
  )
  return [headerRow, ...dataRows].join('\n')
}

/** `people-2026-10-04.csv` */
export function generatePeopleCsvFilename(now: Date = new Date()): string {
  return `people-${now.toISOString().split('T')[0]}.csv`
}
