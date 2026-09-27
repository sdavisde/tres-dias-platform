import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHARole } from '@/lib/weekend/types'
import { Permission, getPermissionsForCHARole } from '@/lib/security'

/**
 * `auth_user_cha_has_permission()` (SQL) mirrors CHA_ROLE_PERMISSIONS (TS) so
 * row-level security can grant roster and team-payment writes to weekend
 * leaders who hold no database role. This test fails if either side changes
 * without the other.
 */
const MIGRATION = join(
  __dirname,
  '..',
  '..',
  'supabase',
  'migrations',
  '20260927000002_permission_helpers.sql'
)

/** The permissions the SQL helper maps (only the ones RLS policies use). */
const MAPPED_PERMISSIONS = [
  Permission.WRITE_TEAM_ROSTER,
  Permission.READ_WRITE_TEAM_PAYMENTS,
  Permission.READ_TEAM_ROSTER_BUILDER,
] as const

function rolesGrantingInTypeScript(permission: Permission): string[] {
  return Object.values(CHARole)
    .filter((role) => getPermissionsForCHARole(role).includes(permission))
    .sort()
}

function rolesGrantingInSql(sql: string, permission: Permission): string[] {
  // WHEN 'PERMISSION' THEN ARRAY['Role', 'Other Role']
  const pattern = new RegExp(
    `WHEN\\s+'${permission}'\\s+THEN\\s+ARRAY\\[([^\\]]*)\\]`,
    'm'
  )
  const match = sql.match(pattern)
  if (match === null) {
    throw new Error(`No CASE branch for ${permission} in ${MIGRATION}`)
  }
  return match[1]
    .split(',')
    .map((s) => s.trim().replace(/^'|'$/g, ''))
    .filter((s) => s.length > 0)
    .sort()
}

describe('auth_user_cha_has_permission mirrors CHA_ROLE_PERMISSIONS', () => {
  const sql = readFileSync(MIGRATION, 'utf8')

  it.each(MAPPED_PERMISSIONS)(
    'grants %s to the same CHA roles in SQL and TypeScript',
    (permission) => {
      expect(rolesGrantingInSql(sql, permission)).toEqual(
        rolesGrantingInTypeScript(permission)
      )
    }
  )

  it('uses the exact CHARole enum strings', () => {
    const allSqlRoles = MAPPED_PERMISSIONS.flatMap((p) =>
      rolesGrantingInSql(sql, p)
    )
    const enumValues = new Set<string>(Object.values(CHARole))
    for (const role of allSqlRoles) {
      expect(enumValues.has(role)).toBe(true)
    }
  })
})
