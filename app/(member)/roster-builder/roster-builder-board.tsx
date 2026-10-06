'use client'

import { useState, useMemo, useCallback, useTransition } from 'react'
import { AlertTriangle, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { isNil } from 'lodash'
import { toast } from 'sonner'
import { toastError } from '@/lib/toast-error'
import { isErr } from '@/lib/results'
import type { RosterBuilderCommunityMember } from '@/services/roster-builder'
import {
  addDraftRosterMember,
  removeDraftRosterMember,
  finalizeDraftRosterMember,
  dropFinalizedRosterMember,
  removeFinalizedRosterMember,
} from '@/services/roster-builder'
import type { CHARole } from '@/lib/weekend/types'
import type {
  RosterSlot,
  RosterBuilderBoardProps,
  FilterMode,
} from './components/roster-builder-types'
import {
  buildInitialCategories,
  generateSlotId,
} from './components/roster-builder-types'
import { StatsHeader } from './components/stats-header'
import { KanbanColumn } from './components/kanban-column'
import { Toolbar } from './components/toolbar'

// ── Main Component ────────────────────────────────────────────────────────────

export function RosterBuilderBoard({
  weekendId,
  weekendTitle,
  weekendType,
  communityMembers,
  hasSecuelaEvent,
}: RosterBuilderBoardProps) {
  const [isPending, startTransition] = useTransition()
  const [categories, setCategories] = useState(() =>
    buildInitialCategories(communityMembers)
  )
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')

  // Derived: unassigned community members
  const availableMembers = useMemo(() => {
    const assignedIds = new Set<string>()
    for (const cat of categories) {
      for (const slot of cat.slots) {
        if (slot.assignment.type !== 'empty') {
          assignedIds.add(slot.assignment.member.id)
        }
      }
    }
    return communityMembers.filter((m) => !assignedIds.has(m.id))
  }, [categories, communityMembers])

  // Assign a member to a slot (creates a draft via server action)
  const handleAssign = useCallback(
    (slotId: string, member: RosterBuilderCommunityMember) => {
      // Find the slot to get role/rollo
      let targetSlot: RosterSlot | undefined
      for (const cat of categories) {
        targetSlot = cat.slots.find((s) => s.id === slotId)
        if (!isNil(targetSlot)) break
      }
      if (isNil(targetSlot)) return

      // Optimistic update
      const tempDraftId = `temp-${Date.now()}`
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          slots: cat.slots.map((s) =>
            s.id === slotId
              ? {
                  ...s,
                  assignment: {
                    type: 'draft' as const,
                    draftId: tempDraftId,
                    member,
                  },
                }
              : s
          ),
        }))
      )

      // Server action
      startTransition(async () => {
        const result = await addDraftRosterMember(
          weekendId,
          member.id,
          targetSlot!.role,
          targetSlot!.rollo ?? undefined
        )

        if (isErr(result)) {
          // Rollback optimistic update
          setCategories((prev) =>
            prev.map((cat) => ({
              ...cat,
              slots: cat.slots.map((s) =>
                s.id === slotId
                  ? { ...s, assignment: { type: 'empty' as const } }
                  : s
              ),
            }))
          )
          toastError('Unable to assign member. Please try again.', {
            error: result.error,
          })
        } else {
          // Replace temp draftId with real one from the database
          const realDraftId = result.data
          setCategories((prev) =>
            prev.map((cat) => ({
              ...cat,
              slots: cat.slots.map((s) =>
                s.id === slotId &&
                s.assignment.type === 'draft' &&
                s.assignment.draftId === tempDraftId
                  ? {
                      ...s,
                      assignment: {
                        type: 'draft' as const,
                        draftId: realDraftId,
                        member,
                      },
                    }
                  : s
              ),
            }))
          )
        }
      })
    },
    [categories, weekendId]
  )

  // Remove a member from a slot (handles both draft and finalized)
  const handleRemove = useCallback(
    (slotId: string) => {
      let targetSlot: RosterSlot | undefined
      for (const cat of categories) {
        targetSlot = cat.slots.find((s) => s.id === slotId)
        if (!isNil(targetSlot)) break
      }
      if (isNil(targetSlot) || targetSlot.assignment.type === 'empty') return

      const savedAssignment = targetSlot.assignment

      // Optimistic update
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          slots: cat.slots.map((s) =>
            s.id === slotId
              ? { ...s, assignment: { type: 'empty' as const } }
              : s
          ),
        }))
      )

      startTransition(async () => {
        const result =
          savedAssignment.type === 'draft'
            ? await removeDraftRosterMember(savedAssignment.draftId)
            : await removeFinalizedRosterMember(savedAssignment.rosterId)

        if (isErr(result)) {
          // Rollback
          setCategories((prev) =>
            prev.map((cat) => ({
              ...cat,
              slots: cat.slots.map((s) =>
                s.id === slotId ? { ...s, assignment: savedAssignment } : s
              ),
            }))
          )
          toastError('Unable to remove member. Please try again.', {
            error: result.error,
          })
        }
      })
    },
    [categories]
  )

  // Finalize a draft member
  const handleFinalize = useCallback(
    (slotId: string) => {
      let targetSlot: RosterSlot | undefined
      for (const cat of categories) {
        targetSlot = cat.slots.find((s) => s.id === slotId)
        if (!isNil(targetSlot)) break
      }
      if (isNil(targetSlot) || targetSlot.assignment.type !== 'draft') return

      const draftId = targetSlot.assignment.draftId
      const member = targetSlot.assignment.member
      const tempRosterId = `temp-roster-${Date.now()}`

      // Optimistic update: draft → finalized
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          slots: cat.slots.map((s) =>
            s.id === slotId
              ? {
                  ...s,
                  assignment: {
                    type: 'finalized' as const,
                    rosterId: tempRosterId,
                    member,
                  },
                }
              : s
          ),
        }))
      )

      startTransition(async () => {
        const result = await finalizeDraftRosterMember(draftId)
        if (isErr(result)) {
          // Rollback to draft
          setCategories((prev) =>
            prev.map((cat) => ({
              ...cat,
              slots: cat.slots.map((s) =>
                s.id === slotId
                  ? {
                      ...s,
                      assignment: {
                        type: 'draft' as const,
                        draftId,
                        member,
                      },
                    }
                  : s
              ),
            }))
          )
          toastError('Unable to finalize member. Please try again.', {
            error: result.error,
          })
        } else {
          // Replace temp rosterId with real one from the database
          const realRosterId = result.data
          setCategories((prev) =>
            prev.map((cat) => ({
              ...cat,
              slots: cat.slots.map((s) =>
                s.id === slotId &&
                s.assignment.type === 'finalized' &&
                s.assignment.rosterId === tempRosterId
                  ? {
                      ...s,
                      assignment: {
                        type: 'finalized' as const,
                        rosterId: realRosterId,
                        member,
                      },
                    }
                  : s
              ),
            }))
          )
          toast.success(
            `${member.firstName ?? ''} ${member.lastName ?? ''} finalized.`
          )
        }
      })
    },
    [categories]
  )

  // Drop a finalized member (sets status to 'drop')
  const handleDrop = useCallback(
    (slotId: string) => {
      let targetSlot: RosterSlot | undefined
      for (const cat of categories) {
        targetSlot = cat.slots.find((s) => s.id === slotId)
        if (!isNil(targetSlot)) break
      }
      if (isNil(targetSlot) || targetSlot.assignment.type !== 'finalized')
        return

      const rosterId = targetSlot.assignment.rosterId
      const savedAssignment = targetSlot.assignment

      // Optimistic update
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          slots: cat.slots.map((s) =>
            s.id === slotId
              ? { ...s, assignment: { type: 'empty' as const } }
              : s
          ),
        }))
      )

      startTransition(async () => {
        const result = await dropFinalizedRosterMember(rosterId)
        if (isErr(result)) {
          // Rollback
          setCategories((prev) =>
            prev.map((cat) => ({
              ...cat,
              slots: cat.slots.map((s) =>
                s.id === slotId ? { ...s, assignment: savedAssignment } : s
              ),
            }))
          )
          toastError('Unable to drop member. Please try again.', {
            error: result.error,
          })
        }
      })
    },
    [categories]
  )

  // Add a new empty slot to a category
  const handleAddSlot = useCallback((categoryName: string, role: CHARole) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.name === categoryName
          ? {
              ...cat,
              slots: [
                ...cat.slots,
                {
                  id: generateSlotId(),
                  role,
                  rollo: null,
                  required: false,
                  assignment: { type: 'empty' as const },
                },
              ],
            }
          : cat
      )
    )
  }, [])

  // Filter columns
  const visibleCategories = useMemo(() => {
    if (search.trim().length === 0 && filterMode === 'all') return categories

    return categories
      .map((cat) => {
        let slots = cat.slots
        const q = search.trim().toLowerCase()
        if (q.length > 0) {
          slots = slots.filter(
            (s) =>
              s.role.toLowerCase().includes(q) ||
              (s.rollo ?? '').toLowerCase().includes(q) ||
              (s.assignment.type !== 'empty'
                ? `${s.assignment.member.firstName ?? ''} ${s.assignment.member.lastName ?? ''}`
                    .toLowerCase()
                    .includes(q)
                : false)
          )
        }
        if (filterMode === 'filled')
          slots = slots.filter((s) => s.assignment.type !== 'empty')
        if (filterMode === 'empty')
          slots = slots.filter((s) => s.assignment.type === 'empty')
        return { ...cat, slots }
      })
      .filter((cat) => cat.slots.length > 0)
  }, [categories, search, filterMode])

  return (
    <div className="flex min-w-0 flex-col">
      {/* Page header */}
      <header className="border-b bg-card px-4 py-4 md:px-6">
        <div className="mx-auto max-w-screen-2xl flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center gap-3 shrink-0">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">
              {weekendTitle}
            </h1>
          </div>
          <div className="sm:ml-auto overflow-x-auto">
            <StatsHeader categories={categories} />
          </div>
        </div>
      </header>

      {/* Missing secuela event warning */}
      {!hasSecuelaEvent && (
        <div className="border-b border-secondary-border bg-secondary px-4 py-3 md:px-6">
          <div className="mx-auto flex max-w-screen-2xl items-center gap-2 text-sm text-secondary-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p>
              There&apos;s no Secuela on the calendar for this weekend yet, so
              you won&apos;t see who attended or signed up to serve until an
              admin schedules one on the Secuela page.
            </p>
          </div>
        </div>
      )}

      {/* Sticky toolbar */}
      <div className="sticky top-14 z-20 border-b bg-background/95 px-4 py-3 backdrop-blur-sm md:px-6">
        <div className="mx-auto max-w-screen-2xl">
          <Toolbar
            search={search}
            onSearchChange={setSearch}
            filterMode={filterMode}
            onFilterModeChange={setFilterMode}
            weekendType={weekendType}
            communityMembers={communityMembers}
            categories={categories}
            onAssign={handleAssign}
          />
        </div>
      </div>

      {/* Horizontal kanban board */}
      <div className="min-w-0 flex-1 overflow-hidden px-4 py-5 md:px-6">
        <div className="mx-auto max-w-screen-2xl">
          {/* Phones stack the columns; md+ scrolls them sideways. Radix sizes
              its viewport content as a table, which would let long names
              widen the stacked layout, so it stays a block there. */}
          <ScrollArea className="w-full pb-2 max-md:[&_[data-slot=scroll-area-viewport]>div]:!block">
            <div className="flex flex-col gap-3 pb-4 md:flex-row md:gap-5">
              {visibleCategories.length === 0 ? (
                <div className="flex h-48 w-full items-center justify-center">
                  <div className="text-center">
                    <p className="text-base font-medium text-muted-foreground">
                      No columns match your current filters.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setSearch('')
                        setFilterMode('all')
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                </div>
              ) : (
                visibleCategories.map((cat) => (
                  <KanbanColumn
                    key={cat.name}
                    category={cat}
                    availableMembers={availableMembers}
                    searchQuery={search}
                    filterMode={filterMode}
                    onAssign={handleAssign}
                    onRemove={handleRemove}
                    onFinalize={handleFinalize}
                    onDrop={handleDrop}
                    onAddSlot={handleAddSlot}
                  />
                ))
              )}
            </div>
            <ScrollBar orientation="horizontal" className="hidden md:flex" />
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
