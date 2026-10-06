import type { MasterRosterMember } from '@/services/master-roster/types'
import {
  filterPeopleForExport,
  generatePeopleCsv,
  generatePeopleCsvFilename,
} from './people-csv'

function member(overrides: Partial<MasterRosterMember>): MasterRosterMember {
  return {
    id: 'id',
    firstName: 'Jane',
    lastName: 'Doe',
    gender: 'female',
    email: 'jane@example.com',
    phoneNumber: '5125551234',
    address: null,
    communityInformation: {
      churchAffiliation: null,
      weekendAttended: null,
      essentialsTrainingDate: null,
      specialGiftsAndSkills: null,
      isClergy: false,
    },
    roles: [],
    permissions: [],
    level: 1,
    rectorReady: {
      isReady: false,
      statusLabel: 'In Progress',
      criteria: {
        hasServedHeadOrAssistantHead: false,
        hasServedTeamHead: false,
        hasGivenTwoOrMoreTalks: false,
        hasWorkedDining: false,
        hasServedAsRector: false,
      },
    },
    experience: [],
    profilePhoto: { path: null, updatedAt: null },
    ...overrides,
  }
}

const admin = member({
  id: 'a',
  firstName: 'Ann',
  lastName: 'Zane',
  email: 'ann@example.com',
  roles: [{ id: 'r1', label: 'Admin', type: 'INDIVIDUAL' as never }],
  level: 3,
})
const jane = member({ id: 'j' })

describe('filterPeopleForExport', () => {
  it('returns everyone with no search or filters', () => {
    expect(
      filterPeopleForExport([admin, jane], { search: '', columnFilters: [] })
    ).toEqual([admin, jane])
  })

  it('matches search on email, which the table does not show', () => {
    expect(
      filterPeopleForExport([admin, jane], {
        search: 'ANN@',
        columnFilters: [],
      })
    ).toEqual([admin])
  })

  it('applies select filters by the column value', () => {
    expect(
      filterPeopleForExport([admin, jane], {
        search: '',
        columnFilters: [{ id: 'role', value: ['-'] }],
      })
    ).toEqual([jane])
    expect(
      filterPeopleForExport([admin, jane], {
        search: '',
        columnFilters: [{ id: 'level', value: ['3'] }],
      })
    ).toEqual([admin])
  })
})

describe('generatePeopleCsv', () => {
  it('sorts by last name and escapes fields', () => {
    const csv = generatePeopleCsv(
      [
        admin,
        member({
          lastName: 'Adams',
          communityInformation: {
            churchAffiliation: 'First "Main" Church, Austin',
            weekendAttended: 'DTTD #10',
            essentialsTrainingDate: '2024-05-01T00:00:00Z',
            specialGiftsAndSkills: ['Music', 'Cooking'],
            isClergy: true,
          },
        }),
      ],
      { includeExperience: false }
    )
    const lines = csv.split('\n')
    expect(lines[0]).not.toContain('Level')
    expect(lines[1]).toContain('Jane,Adams,jane@example.com,512-555-1234')
    expect(lines[1]).toContain(
      '"First ""Main"" Church, Austin",DTTD #10,2024-05-01,"Music, Cooking"'
    )
    expect(lines[2]).toContain('Ann,Zane')
  })

  it('adds experience columns when allowed', () => {
    const csv = generatePeopleCsv(
      [
        member({
          experience: [
            { weekend_reference: 'DTTD#10' },
            { weekend_reference: 'DTTD#11' },
          ] as MasterRosterMember['experience'],
        }),
      ],
      { includeExperience: true }
    )
    const [header, row] = csv.split('\n')
    expect(header.endsWith('Level,Rector ready,Served')).toBe(true)
    expect(row.endsWith('1,In Progress,"DTTD #10, #11"')).toBe(true)
  })
})

describe('generatePeopleCsvFilename', () => {
  it('stamps the date', () => {
    expect(generatePeopleCsvFilename(new Date('2026-10-04T12:00:00Z'))).toBe(
      'people-2026-10-04.csv'
    )
  })
})
