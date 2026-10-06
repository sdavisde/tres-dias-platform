import { isNil } from 'lodash'
import { CHARole } from '@/lib/weekend/types'
import type { EligibilityResult } from './types'

/**
 * Context provided to eligibility check functions.
 */
type EligibilityContext = {
  hasBeenSectionHead: boolean
  hasGivenRollo: boolean
  rectorReadyIsReady: boolean
  isClergy: boolean
}

/**
 * Eligibility check function signature.
 * Returns whether a member is eligible for a role, with an optional reason if not.
 */
type EligibilityCheck = (context: EligibilityContext) => EligibilityResult

/**
 * Experience requirements per CHA role.
 * Only roles with special requirements need entries here.
 * To add a new eligibility rule, add a new entry to this map.
 */
const EXPERIENCE_CHECKS: Partial<Record<CHARole, EligibilityCheck>> = {
  [CHARole.HEAD]: (ctx) => {
    if (!ctx.hasBeenSectionHead || !ctx.hasGivenRollo) {
      const missing: string[] = []
      if (!ctx.hasBeenSectionHead) missing.push('section head experience')
      if (!ctx.hasGivenRollo) missing.push('rollo experience')
      return {
        eligible: false,
        reason: `Needs ${missing.join(' and ')}`,
      }
    }
    return { eligible: true }
  },

  [CHARole.ASSISTANT_HEAD]: (ctx) => {
    if (!ctx.hasBeenSectionHead || !ctx.hasGivenRollo) {
      const missing: string[] = []
      if (!ctx.hasBeenSectionHead) missing.push('section head experience')
      if (!ctx.hasGivenRollo) missing.push('rollo experience')
      return {
        eligible: false,
        reason: `Needs ${missing.join(' and ')}`,
      }
    }
    return { eligible: true }
  },

  [CHARole.ROVER]: (ctx) => {
    if (!ctx.rectorReadyIsReady) {
      return {
        eligible: false,
        reason: 'Not rector ready',
      }
    }
    return { eligible: true }
  },
}

/**
 * Clergy serve as spiritual directors and cannot hold any head position
 * (Head, Assistant Head, section heads) or be a Table Leader.
 */
const CLERGY_EXCLUDED_ROLES: CHARole[] = [
  CHARole.HEAD,
  CHARole.ASSISTANT_HEAD,
  CHARole.HEAD_TECH,
  CHARole.HEAD_ROLLISTA,
  CHARole.TABLE_LEADER,
  CHARole.HEAD_PRAYER,
  CHARole.HEAD_CHAPEL,
  CHARole.HEAD_CHAPEL_TECH,
  CHARole.HEAD_MUSIC,
  CHARole.HEAD_PALANCA,
  CHARole.HEAD_TABLE,
  CHARole.HEAD_DORM,
  CHARole.HEAD_DINING,
  CHARole.HEAD_MOBILE,
]

function withClergyRestriction(check?: EligibilityCheck): EligibilityCheck {
  return (ctx) => {
    if (ctx.isClergy) {
      return { eligible: false, reason: 'Clergy cannot serve in this role' }
    }
    return isNil(check) ? { eligible: true } : check(ctx)
  }
}

/**
 * Registry of eligibility checks per CHA role: experience requirements plus
 * the clergy restriction.
 */
const ELIGIBILITY_CHECKS: Partial<Record<CHARole, EligibilityCheck>> = {
  ...EXPERIENCE_CHECKS,
  ...Object.fromEntries(
    CLERGY_EXCLUDED_ROLES.map((role) => [
      role,
      withClergyRestriction(EXPERIENCE_CHECKS[role]),
    ])
  ),
}

/**
 * Computes eligibility for all roles that have special requirements.
 * Returns a map of role string → EligibilityResult.
 */
export function computeEligibility(
  context: EligibilityContext
): Record<string, EligibilityResult> {
  const result: Record<string, EligibilityResult> = {}

  for (const [role, check] of Object.entries(ELIGIBILITY_CHECKS)) {
    if (!isNil(check)) {
      result[role] = check(context)
    }
  }

  return result
}

/**
 * Returns the list of roles that have eligibility requirements.
 * Useful for UI to know which roles need eligibility indicators.
 */
export function getRolesWithEligibilityChecks(): string[] {
  return Object.keys(ELIGIBILITY_CHECKS)
}
