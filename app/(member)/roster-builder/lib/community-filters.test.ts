import { CHARole } from '@/lib/weekend/types'
import type { RosterBuilderCommunityMember } from '@/services/roster-builder'
import {
  buildFilterOptions,
  countActiveFilters,
  defaultFilters,
  filterCommunityMembers,
} from './community-filters'

function member(
  overrides: Partial<RosterBuilderCommunityMember> & { id: string }
): RosterBuilderCommunityMember {
  return {
    firstName: 'Pat',
    lastName: overrides.id,
    email: null,
    phoneNumber: null,
    church: null,
    gender: 'male',
    isClergy: false,
    weekendAttended: null,
    essentialsTrainingDate: null,
    skills: [],
    experience: [],
    experienceLevel: 1,
    weekendsServed: 0,
    rectorReadyStatus: {
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
    hasBeenSectionHead: false,
    hasGivenRollo: false,
    volunteerStatus: 'none',
    assignmentStatus: { type: 'unassigned' },
    eligibility: {},
    profilePhoto: { path: null, updatedAt: null },
    ...overrides,
  }
}

function served(role: CHARole) {
  return {
    id: crypto.randomUUID(),
    user_id: crypto.randomUUID(),
    weekend_id: null,
    cha_role: role,
    weekend_reference: 'DTTD#10',
    rollo: null,
    created_at: new Date(),
    updated_at: new Date(),
  }
}

const ids = (list: RosterBuilderCommunityMember[]) => list.map((m) => m.id)
const none = new Set<string>()

describe('filterCommunityMembers', () => {
  const filters = { ...defaultFilters('MENS') }

  it('matches any selected skill, ignoring case and spacing', () => {
    const members = [
      member({ id: 'a', skills: ['Photography'] }),
      member({ id: 'b', skills: [' photography '] }),
      member({ id: 'c', skills: ['Sewing'] }),
      member({ id: 'd' }),
    ]
    expect(
      ids(
        filterCommunityMembers(
          members,
          { ...filters, skills: ['Photography', 'Sewing'] },
          none
        )
      )
    ).toEqual(['a', 'b', 'c'])
  })

  it('requires every selected qualification', () => {
    const members = [
      member({
        id: 'both',
        isClergy: true,
        essentialsTrainingDate: '2025-03-08',
      }),
      member({ id: 'clergy', isClergy: true }),
    ]
    expect(
      ids(
        filterCommunityMembers(
          members,
          { ...filters, qualifications: ['clergy', 'essentials'] },
          none
        )
      )
    ).toEqual(['both'])
  })

  it('leaves past rectors out of Rector ready', () => {
    const ready = member({ id: 'ready' })
    ready.rectorReadyStatus = { ...ready.rectorReadyStatus, isReady: true }
    const past = member({ id: 'past' })
    past.rectorReadyStatus = {
      ...past.rectorReadyStatus,
      isReady: true,
      criteria: { ...past.rectorReadyStatus.criteria, hasServedAsRector: true },
    }
    expect(
      ids(
        filterCommunityMembers(
          [ready, past],
          { ...filters, qualifications: ['rectorReady'] },
          none
        )
      )
    ).toEqual(['ready'])
  })

  it('filters by past role and church', () => {
    const members = [
      member({
        id: 'a',
        church: 'Grace',
        experience: [served(CHARole.DINING)],
      }),
      member({ id: 'b', church: 'Hope', experience: [served(CHARole.DINING)] }),
      member({
        id: 'c',
        church: 'Grace',
        experience: [served(CHARole.CHAPEL)],
      }),
    ]
    expect(
      ids(
        filterCommunityMembers(
          members,
          { ...filters, servedAs: [CHARole.DINING], churches: ['Grace'] },
          none
        )
      )
    ).toEqual(['a'])
  })

  it('searches skills as well as names', () => {
    const members = [
      member({ id: 'a', skills: ['Audio/video'] }),
      member({ id: 'b' }),
    ]
    expect(
      ids(
        filterCommunityMembers(members, { ...filters, search: 'audio' }, none)
      )
    ).toEqual(['a'])
  })

  it('sorts assigned members last, or hides them', () => {
    const members = [member({ id: 'a' }), member({ id: 'b' })]
    const assigned = new Set(['a'])
    expect(ids(filterCommunityMembers(members, filters, assigned))).toEqual([
      'b',
      'a',
    ])
    expect(
      ids(
        filterCommunityMembers(
          members,
          { ...filters, hideAssigned: true },
          assigned
        )
      )
    ).toEqual(['b'])
  })

  it('defaults to the weekend gender', () => {
    const members = [
      member({ id: 'm', gender: 'male' }),
      member({ id: 'f', gender: 'female' }),
    ]
    expect(ids(filterCommunityMembers(members, filters, none))).toEqual(['m'])
  })
})

describe('buildFilterOptions', () => {
  it('counts distinct members, most common first', () => {
    const options = buildFilterOptions([
      member({ id: 'a', skills: ['Sewing', 'sewing', 'Photography'] }),
      member({ id: 'b', skills: ['Photography'] }),
      member({ id: 'c', church: ' Grace ' }),
    ])
    expect(options.skills).toEqual([
      { value: 'Photography', count: 2 },
      { value: 'Sewing', count: 1 },
    ])
    expect(options.churches).toEqual([{ value: 'Grace', count: 1 }])
  })
})

describe('countActiveFilters', () => {
  it('ignores search and the weekend default gender', () => {
    const filters = { ...defaultFilters('WOMENS'), search: 'pat' }
    expect(countActiveFilters(filters, 'WOMENS')).toBe(0)
    expect(
      countActiveFilters(
        { ...filters, gender: 'all', skills: ['Sewing', 'Crafts'] },
        'WOMENS'
      )
    ).toBe(3)
  })
})

describe('experience filter', () => {
  it('matches any selected level, and everyone when none are selected', () => {
    const members = [
      member({ id: 'one', experienceLevel: 1 }),
      member({ id: 'two', experienceLevel: 2 }),
      member({ id: 'three', experienceLevel: 3 }),
    ]
    const filters = defaultFilters('MENS')
    expect(ids(filterCommunityMembers(members, filters, none))).toEqual([
      'one',
      'two',
      'three',
    ])
    expect(
      ids(
        filterCommunityMembers(
          members,
          { ...filters, experience: [2, 3] },
          none
        )
      )
    ).toEqual(['two', 'three'])
  })
})
