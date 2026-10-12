'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from '@/components/ui/command'
import type { CHARole } from '@/lib/weekend/types'
import type { RosterBuilderCommunityMember } from '@/services/roster-builder'
import { getRolesForCategory } from '../roster-template'
import type { RoleCategory, FilterMode } from './roster-builder-types'
import { fullName } from './roster-builder-types'
import { FilledSlotCard, EmptySlotCard } from './slot-cards'

export function KanbanColumn({
  category,
  availableMembers,
  searchQuery,
  filterMode,
  onAssign,
  onRemove,
  onFinalize,
  onDrop,
  onAddSlot,
  onViewMember,
}: {
  category: RoleCategory
  availableMembers: RosterBuilderCommunityMember[]
  searchQuery: string
  filterMode: FilterMode
  onAssign: (slotId: string, member: RosterBuilderCommunityMember) => void
  onRemove: (slotId: string) => void
  onFinalize: (slotId: string) => void
  onDrop: (slotId: string) => void
  onAddSlot: (categoryName: string, role: CHARole) => void
  onViewMember: (memberId: string) => void
}) {
  const [addOpen, setAddOpen] = useState(false)
  // Phones stack the columns, so they start collapsed to a list of
  // categories; the board is always expanded from md up.
  const [expanded, setExpanded] = useState(false)
  const filled = category.slots.filter(
    (s) => s.assignment.type !== 'empty'
  ).length
  const total = category.slots.length
  const allFilled = filled === total

  const visibleSlots = useMemo(() => {
    let slots = category.slots
    const q = searchQuery.trim().toLowerCase()
    if (q.length > 0) {
      slots = slots.filter(
        (s) =>
          s.role.toLowerCase().includes(q) ||
          (s.rollo ?? '').toLowerCase().includes(q) ||
          (s.assignment.type !== 'empty'
            ? fullName(s.assignment.member).toLowerCase().includes(q)
            : false)
      )
    }
    if (filterMode === 'filled')
      slots = slots.filter((s) => s.assignment.type !== 'empty')
    if (filterMode === 'empty')
      slots = slots.filter((s) => s.assignment.type === 'empty')
    return slots
  }, [category.slots, searchQuery, filterMode])

  const categoryRoles = useMemo(
    () => getRolesForCategory(category.name),
    [category.name]
  )

  if (visibleSlots.length === 0 && !addOpen) return null

  // An active search or filter opens every matching column so hits are
  // never hidden inside a collapsed one.
  const isOpen =
    expanded || searchQuery.trim().length > 0 || filterMode !== 'all'

  return (
    <div className="flex w-full flex-col rounded-md border bg-card md:w-72 md:shrink-0">
      {/* Column header — a collapse toggle on phones only */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={isOpen}
        className={cn(
          'flex min-h-11 items-center justify-between gap-2 px-4 py-3 text-left md:pointer-events-none md:border-b',
          isOpen && 'border-b'
        )}
      >
        <span className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {category.name}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
              allFilled
                ? 'bg-success/15 text-success'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {filled}/{total}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform md:hidden',
              isOpen && 'rotate-180'
            )}
          />
        </span>
      </button>

      <div className={cn(!isOpen && 'hidden', 'md:block')}>
        {/* Slots */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden h-12 bg-gradient-to-t from-card via-card/60 to-transparent md:block" />
          <div className="flex flex-col gap-2 px-3 pt-3 pb-3 md:max-h-[560px] md:overflow-y-auto md:pb-6">
            {visibleSlots.map((slot) =>
              slot.assignment.type !== 'empty' ? (
                <FilledSlotCard
                  key={slot.id}
                  slot={slot}
                  onRemove={() => onRemove(slot.id)}
                  onFinalize={() => onFinalize(slot.id)}
                  onDrop={() => onDrop(slot.id)}
                  onViewDetails={() => {
                    if (slot.assignment.type !== 'empty') {
                      onViewMember(slot.assignment.member.id)
                    }
                  }}
                />
              ) : (
                <EmptySlotCard
                  key={slot.id}
                  slot={slot}
                  availableMembers={availableMembers}
                  onAssign={(m) => onAssign(slot.id, m)}
                />
              )
            )}
          </div>
        </div>

        {/* Add Position button */}
        <div className="border-t px-3 py-2">
          <Popover open={addOpen} onOpenChange={setAddOpen}>
            <PopoverTrigger asChild>
              <button className="flex h-11 w-full items-center justify-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:h-9">
                <Plus className="h-3.5 w-3.5" />
                Add Position
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="start">
              <Command>
                <CommandInput placeholder="Search roles..." className="h-9" />
                <CommandList className="max-h-48">
                  <CommandEmpty>No roles found.</CommandEmpty>
                  <CommandGroup>
                    {categoryRoles.map((role) => (
                      <CommandItem
                        key={role}
                        value={role}
                        onSelect={() => {
                          onAddSlot(category.name, role)
                          setAddOpen(false)
                        }}
                        className="text-sm"
                      >
                        {role}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}
