import { isNil } from 'lodash'
import { CHARole } from '@/lib/weekend/types'
import type { RosterBuilderCommunityMember } from '@/services/roster-builder'
import {
  DEFAULT_ROSTER_TEMPLATE,
  getRolesForCategory,
} from '../roster-template'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SlotAssignment =
  | { type: 'empty' }
  | {
      type: 'draft'
      draftId: string
      member: RosterBuilderCommunityMember
    }
  | {
      type: 'finalized'
      rosterId: string
      member: RosterBuilderCommunityMember
    }

export type RosterSlot = {
  id: string
  role: string
  rollo: string | null
  required: boolean
  assignment: SlotAssignment
}

export type RoleCategory = {
  name: string
  slots: RosterSlot[]
}

export type RosterBuilderBoardProps = {
  weekendId: string
  weekendTitle: string
  weekendType: string
  communityMembers: RosterBuilderCommunityMember[]
  hasSecuelaEvent: boolean
}

export type FilterMode = 'all' | 'filled' | 'empty'

// ── Helpers ───────────────────────────────────────────────────────────────────

export function fullName(m: RosterBuilderCommunityMember): string {
  return `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim()
}

export function slotLabel(slot: RosterSlot): string {
  if (slot.rollo != null) return `${slot.role} — ${slot.rollo}`
  if (slot.role === CHARole.TABLE_LEADER) return `${slot.role} — Silent`
  return slot.role
}

export function getExperienceLabel(level: 1 | 2 | 3): {
  label: string
  color: string
} {
  if (level === 3) return { label: 'Veteran', color: 'amber' }
  if (level === 2) return { label: 'Experienced', color: 'blue' }
  return { label: 'Served', color: 'green' }
}

export function ExperienceBadge({
  level,
  weekendsServed,
}: {
  level: 1 | 2 | 3
  weekendsServed: number
}) {
  const exp = getExperienceLabel(level)
  return (
    <span
      className="inline-flex items-center rounded-full border border-transparent px-2 py-0.5 text-xs font-semibold"
      style={{
        backgroundColor: `var(--experience-level-${level})`,
        color: `var(--experience-level-${level}-fg)`,
      }}
    >
      {exp.label} · {weekendsServed}w
    </span>
  )
}

export function getEligibilityWarning(
  role: string,
  member: RosterBuilderCommunityMember
): string | null {
  const check = member.eligibility[role]
  if (!isNil(check) && !check.eligible) {
    return `Not eligible — ${check.reason}`
  }
  return null
}

export function getEligibleRoleSummary(
  member: RosterBuilderCommunityMember
): string {
  if (member.rectorReadyStatus.criteria.hasServedAsRector)
    return 'Eligible for: All roles (Past Rector)'
  if (member.rectorReadyStatus.isReady)
    return 'Eligible for: All roles including Rector/Rover'
  if (member.hasBeenSectionHead && member.hasGivenRollo)
    return 'Eligible for: Head, Asst Head, and all general positions'
  if (member.hasBeenSectionHead)
    return 'Eligible for: General positions (needs rollo for Head)'
  return 'Eligible for: General positions'
}

// ── Build initial categories from template + real data ────────────────────────

let nextSlotId = 1
export function generateSlotId(): string {
  return `slot-${nextSlotId++}`
}

export function buildInitialCategories(
  communityMembers: RosterBuilderCommunityMember[]
): RoleCategory[] {
  // Build lookup maps for assigned members
  const memberById = new Map(communityMembers.map((m) => [m.id, m]))

  // Track which (role, rollo) combos have been filled by real assignments
  // so we can match them against template slots
  const assignedMembers = communityMembers.filter(
    (m) => m.assignmentStatus.type !== 'unassigned'
  )

  return DEFAULT_ROSTER_TEMPLATE.map((templateCat) => {
    // Clone template slots as RosterSlots
    const slots: RosterSlot[] = templateCat.slots.map((ts) => ({
      id: generateSlotId(),
      role: ts.role,
      rollo: ts.rollo ?? null,
      required: ts.required,
      assignment: { type: 'empty' as const },
    }))

    // Try to fill template slots with existing assignments
    for (const member of assignedMembers) {
      const status = member.assignmentStatus
      if (status.type === 'unassigned') continue

      const role = status.chaRole
      const rollo = status.rollo

      // Find a matching empty slot in this category
      const matchIdx = slots.findIndex(
        (s) =>
          s.assignment.type === 'empty' &&
          s.role === role &&
          (s.rollo ?? null) === (rollo ?? null)
      )

      if (matchIdx !== -1) {
        if (status.type === 'finalized') {
          slots[matchIdx].assignment = {
            type: 'finalized',
            rosterId: status.rosterId,
            member,
          }
        } else if (status.type === 'draft') {
          slots[matchIdx].assignment = {
            type: 'draft',
            draftId: status.draftId,
            member,
          }
        }
      } else {
        // No matching template slot — check if this role belongs in this category
        const categoryRoles = getRolesForCategory(templateCat.name)
        if (categoryRoles.includes(role as CHARole)) {
          // Add an extra slot for this assignment
          const newSlot: RosterSlot = {
            id: generateSlotId(),
            role,
            rollo: rollo ?? null,
            required: false,
            assignment:
              status.type === 'finalized'
                ? { type: 'finalized', rosterId: status.rosterId, member }
                : { type: 'draft', draftId: status.draftId, member },
          }
          slots.push(newSlot)
        }
      }
    }

    return { name: templateCat.name, slots }
  })
}
