'use client'

import { useCallback, useMemo, useState } from 'react'
import { isNil } from 'lodash'
import { AlertTriangle, ChevronDown, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import type { RosterBuilderCommunityMember } from '@/services/roster-builder'
import type { RoleCategory } from './roster-builder-types'
import { getEligibilityWarning, slotLabel } from './roster-builder-types'

/**
 * "Assign to..." for one community member: lists each open role once per
 * category and drops the member into the first empty slot for it.
 */
export function AssignMemberPopover({
  member,
  categories,
  onAssign,
  className,
}: {
  member: RosterBuilderCommunityMember
  categories: RoleCategory[]
  onAssign: (slotId: string, member: RosterBuilderCommunityMember) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)

  // Deduplicate empty slots by role label so the selector shows
  // each unique role once per category (e.g. one "Chapel" instead of two).
  // When selected, we assign to the first available slot for that role.
  const uniqueEmptySlotsByCategory = useMemo(() => {
    return categories
      .map((cat) => {
        const seen = new Set<string>()
        const uniqueSlots = cat.slots.filter((s) => {
          if (s.assignment.type !== 'empty') return false
          const label = slotLabel(s)
          if (seen.has(label)) return false
          seen.add(label)
          return true
        })
        return { name: cat.name, slots: uniqueSlots }
      })
      .filter((cat) => cat.slots.length > 0)
  }, [categories])

  // Find the first empty slot matching a given role label within a category
  const findFirstEmptySlot = useCallback(
    (categoryName: string, roleLabel: string) => {
      const cat = categories.find((c) => c.name === categoryName)
      if (isNil(cat)) return null
      return (
        cat.slots.find(
          (s) => s.assignment.type === 'empty' && slotLabel(s) === roleLabel
        ) ?? null
      )
    },
    [categories]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" className={cn('text-sm', className)}>
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Assign to...
          <ChevronDown className="ml-auto h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        align="start"
        side="bottom"
        collisionPadding={16}
        onWheel={(e) => e.stopPropagation()}
        onCloseAutoFocus={(e) => {
          // When the popover closes after assignment, the card
          // re-sorts to the bottom. Radix tries to restore focus
          // to the trigger (now at the bottom), scrolling the list.
          // Prevent that focus restoration to keep scroll stable.
          e.preventDefault()
        }}
      >
        <Command>
          <CommandInput placeholder="Search slots..." className="h-9" />
          <CommandList>
            <CommandEmpty>No empty slots found.</CommandEmpty>
            {uniqueEmptySlotsByCategory.map((cat) => (
              <CommandGroup key={cat.name} heading={cat.name}>
                {cat.slots.map((slot) => {
                  const warning = getEligibilityWarning(slot.role, member)
                  const label = slotLabel(slot)
                  return (
                    <CommandItem
                      key={slot.id}
                      value={`${label} ${cat.name}`}
                      onSelect={() => {
                        const target = findFirstEmptySlot(cat.name, label)
                        if (!isNil(target)) {
                          onAssign(target.id, member)
                        }
                        setOpen(false)
                      }}
                      className="text-sm"
                    >
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate">{label}</span>
                        {warning !== null && (
                          <span className="flex items-center gap-1 text-xs text-error">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            {warning}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
