import { Permission } from '@/lib/security'
import {
  ADMIN_ACCESS_PERMISSION,
  FULL_ACCESS_PERMISSION,
  PERMISSION_DESCRIPTIONS,
  PERMISSION_LABELS,
  PERMISSION_LADDERS,
  SENSITIVE_PERMISSIONS,
  allGroupedPermissions,
  ladderPermissions,
} from './permission-areas'

describe('permission areas', () => {
  it('covers every Permission enum value exactly once', () => {
    const grouped = allGroupedPermissions()
    const enumValues = Object.values(Permission)

    const counts = new Map<Permission, number>()
    for (const permission of grouped) {
      counts.set(permission, (counts.get(permission) ?? 0) + 1)
    }

    const missing = enumValues.filter((p) => !counts.has(p))
    const duplicated = [...counts.entries()]
      .filter(([, n]) => n > 1)
      .map(([p]) => p)
    const unknown = grouped.filter((p) => !enumValues.includes(p as Permission))

    expect({ missing, duplicated, unknown }).toEqual({
      missing: [],
      duplicated: [],
      unknown: [],
    })
    expect(grouped).toHaveLength(enumValues.length)
  })

  it('encodes the ratified ladders', () => {
    const byId = Object.fromEntries(PERMISSION_LADDERS.map((l) => [l.id, l]))

    expect(byId.candidates.view).toEqual([
      Permission.READ_CANDIDATES,
      Permission.READ_CANDIDATE_CONTACT_INFO,
      Permission.READ_CANDIDATE_CHURCH,
      Permission.READ_CANDIDATE_SHIRT_SIZE,
      Permission.READ_CANDIDATE_MARITAL_STATUS,
      Permission.READ_CANDIDATE_TABLE_ASSIGNMENT_PROPERTIES,
      Permission.READ_CANDIDATE_SPONSOR_INFO,
      Permission.READ_CANDIDATE_PAYMENTS,
    ])
    expect(byId.candidates.manage).toEqual([
      Permission.WRITE_CANDIDATES,
      Permission.DELETE_CANDIDATES,
    ])

    expect(byId.weekends.view).toEqual([
      Permission.READ_WEEKENDS,
      Permission.READ_EVENTS,
    ])
    expect(byId.weekends.manage).toEqual([
      Permission.WRITE_WEEKENDS,
      Permission.WRITE_EVENTS,
    ])

    expect(byId['team-rosters'].view).toEqual([
      Permission.READ_TEAM_ROSTER_BUILDER,
      Permission.READ_DROPPED_ROSTER,
      Permission.READ_TEAM_FORM_INFO,
    ])
    expect(byId['team-rosters'].manage).toEqual([
      Permission.WRITE_TEAM_ROSTER,
      Permission.READ_WRITE_TEAM_PAYMENTS,
    ])

    expect(byId.payments.view).toEqual([Permission.READ_PAYMENTS])
    expect(byId.payments.manage).toEqual([Permission.WRITE_PAYMENTS])

    expect(byId.files.view).toEqual([])
    expect(byId.files.manage).toEqual([
      Permission.FILES_UPLOAD,
      Permission.FILES_DELETE,
    ])
    expect(byId.files.implicitView).toBe(true)

    expect(byId.people.view).toEqual([
      Permission.READ_USER_ROLES,
      Permission.READ_USER_EXPERIENCE,
    ])
    expect(byId.people.manage).toEqual([
      Permission.WRITE_USER_ROLES,
      Permission.WRITE_SETTINGS,
      Permission.MANAGE_BILLING,
      Permission.WRITE_COMMUNITY_ENCOURAGEMENT,
    ])
  })

  it('keeps the sensitive panel, access switch and full access separate', () => {
    expect(SENSITIVE_PERMISSIONS.map((s) => s.permission)).toEqual([
      Permission.READ_CANDIDATE_MEDICAL_INFO,
      Permission.READ_CANDIDATE_EMERGENCY_CONTACT,
      Permission.READ_CANDIDATE_ADDRESS,
    ])
    expect(ADMIN_ACCESS_PERMISSION).toBe(Permission.READ_ADMIN_PORTAL)
    expect(FULL_ACCESS_PERMISSION).toBe(Permission.FULL_ACCESS)
  })

  it('has a plain-language label for every permission', () => {
    for (const permission of Object.values(Permission)) {
      expect(typeof PERMISSION_LABELS[permission]).toBe('string')
      expect(PERMISSION_LABELS[permission].length).toBeGreaterThan(0)
    }
  })

  it('has a one-line description for every ladder permission', () => {
    for (const ladder of PERMISSION_LADDERS) {
      for (const permission of ladderPermissions(ladder)) {
        expect(typeof PERMISSION_DESCRIPTIONS[permission]).toBe('string')
        expect(PERMISSION_DESCRIPTIONS[permission].length).toBeGreaterThan(0)
        expect(PERMISSION_DESCRIPTIONS[permission]).not.toContain(permission)
      }
    }
  })

  it('only the People ladder carries a caution', () => {
    expect(
      PERMISSION_LADDERS.filter((l) => l.caution !== undefined).map((l) => l.id)
    ).toEqual(['people'])
  })

  it('only Files and Fee amounts have an implicit View rung', () => {
    expect(
      PERMISSION_LADDERS.filter((l) => l.implicitView === true).map((l) => l.id)
    ).toEqual(['fees', 'files'])
    for (const ladder of PERMISSION_LADDERS) {
      if (ladder.implicitView === true) {
        expect(ladder.view).toHaveLength(0)
      } else {
        expect(ladder.view.length).toBeGreaterThan(0)
      }
      expect(ladder.manage.length).toBeGreaterThan(0)
      expect(ladderPermissions(ladder)).toEqual([
        ...ladder.view,
        ...ladder.manage,
      ])
    }
  })
})
