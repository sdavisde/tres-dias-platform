'use client'

import { useState, useMemo } from 'react'
import {
  X,
  Calendar,
  Star,
  AlertTriangle,
  CheckCircle2,
  MoreVertical,
  UserX,
  Trash2,
  Phone,
  Mail,
  Award,
  Cross,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { RosterBuilderCommunityMember } from '@/services/roster-builder'
import type { RosterSlot } from './roster-builder-types'
import {
  fullName,
  slotLabel,
  ExperienceBadge,
  getEligibilityWarning,
} from './roster-builder-types'
import { UserAvatar } from '@/components/user-avatar'
import { cn } from '@/lib/utils'

/** Card actions stay visible (no hover reveal) and meet 44px on touch. */
const SLOT_ACTION_CLASS =
  'flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors md:size-8'

// ── Filled Slot Card ──────────────────────────────────────────────────────────

export function FilledSlotCard({
  slot,
  onRemove,
  onFinalize,
  onDrop,
}: {
  slot: RosterSlot
  onRemove: () => void
  onFinalize?: () => void
  onDrop?: () => void
}) {
  const assignment = slot.assignment
  if (assignment.type === 'empty') return null
  const member = assignment.member
  const isDraft = assignment.type === 'draft'

  return (
    <div className="relative rounded-md border bg-card p-4">
      {/* Top-right actions */}
      <div className="absolute right-1 top-1 flex items-center">
        {isDraft ? (
          <button
            onClick={onRemove}
            className={cn(
              SLOT_ACTION_CLASS,
              'hover:bg-error/10 hover:text-error'
            )}
            aria-label={`Remove ${fullName(member)}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  SLOT_ACTION_CLASS,
                  'hover:bg-muted hover:text-foreground'
                )}
                aria-label={`Actions for ${fullName(member)}`}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onDrop}>
                <UserX className="mr-2 h-4 w-4" />
                Dropped
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRemove} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Role label + draft badge */}
      <div className="mb-2 flex items-start gap-2 pr-9 md:pr-7">
        <p className="text-xs font-semibold text-muted-foreground leading-snug">
          {slotLabel(slot)}
        </p>
        {isDraft && (
          <span className="shrink-0 rounded-full border border-secondary-border bg-secondary px-2 py-0.5 text-[11px] font-semibold leading-none text-secondary-foreground">
            Draft
          </span>
        )}
      </div>

      {/* Member name */}
      <div className="flex items-center gap-2">
        <UserAvatar
          user={{
            id: member.id,
            first_name: member.firstName,
            last_name: member.lastName,
            email: member.email,
            profilePhoto: member.profilePhoto,
          }}
          size={28}
        />
        <p className="text-sm font-semibold leading-tight text-foreground truncate">
          {fullName(member)}
        </p>
      </div>

      {/* Experience badge + indicator icons — combined row */}
      <div className="mt-2 flex items-center gap-2">
        <ExperienceBadge
          level={member.experienceLevel}
          weekendsServed={member.weekendsServed}
        />
        {member.volunteerStatus !== 'none' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={
                  member.volunteerStatus === 'attended_secuela'
                    ? 'text-info'
                    : 'text-muted-foreground'
                }
              >
                <Calendar className="h-3.5 w-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {member.volunteerStatus === 'attended_secuela'
                ? 'Signed in at the secuela event'
                : 'Signed up to serve after secuela'}
            </TooltipContent>
          </Tooltip>
        )}
        {member.rectorReadyStatus.criteria.hasServedAsRector ? (
          <span title="Past Rector" className="text-primary">
            <Award className="h-3.5 w-3.5" />
          </span>
        ) : (
          member.rectorReadyStatus.isReady && (
            <span title="Rector Ready" className="text-amber-500">
              <Star className="h-3.5 w-3.5 fill-amber-500" />
            </span>
          )
        )}
        {member.isClergy && (
          <span title="Clergy" className="text-muted-foreground">
            <Cross className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      {/* Contact info */}
      {(member.phoneNumber != null || member.email != null) && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground truncate">
          {member.phoneNumber != null ? (
            <>
              <Phone className="h-3 w-3 shrink-0" />
              {member.phoneNumber}
            </>
          ) : (
            <>
              <Mail className="h-3 w-3 shrink-0" />
              {member.email}
            </>
          )}
        </p>
      )}

      {/* Finalize button for drafts */}
      {isDraft && onFinalize != null && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 h-11 w-full gap-1.5 text-[13px] md:h-9"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Finalize
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finalize Assignment</AlertDialogTitle>
              <AlertDialogDescription>
                Have you personally confirmed that{' '}
                <span className="font-semibold text-foreground">
                  {fullName(member)}
                </span>{' '}
                has accepted the{' '}
                <span className="font-semibold text-foreground">
                  {slotLabel(slot)}
                </span>{' '}
                position?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onFinalize}>
                Yes, Finalize
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

// ── Empty Slot Card ───────────────────────────────────────────────────────────

export function EmptySlotCard({
  slot,
  availableMembers,
  onAssign,
}: {
  slot: RosterSlot
  availableMembers: RosterBuilderCommunityMember[]
  onAssign: (member: RosterBuilderCommunityMember) => void
}) {
  const [open, setOpen] = useState(false)

  const sortedMembers = useMemo(() => {
    const statusOrder = { attended_secuela: 0, wants_to_serve: 1, none: 2 }
    return [...availableMembers].sort((a, b) => {
      const aSec = statusOrder[a.volunteerStatus]
      const bSec = statusOrder[b.volunteerStatus]
      if (aSec !== bSec) return aSec - bSec
      return b.weekendsServed - a.weekendsServed
    })
  }, [availableMembers])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'w-full rounded-md border border-dashed p-4 text-left transition-colors hover:border-primary/50 hover:bg-selected',
            slot.required ? 'border-muted-foreground/40' : 'border-border'
          )}
        >
          <p className="text-sm font-medium text-muted-foreground leading-snug break-words">
            {slotLabel(slot)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/80">
            {slot.required
              ? 'Required — tap to assign'
              : 'Optional — tap to assign'}
          </p>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="bottom">
        <Command>
          <CommandInput placeholder="Search members..." className="h-9" />
          <CommandList className="max-h-72">
            <CommandEmpty>No members found.</CommandEmpty>
            <CommandGroup heading={`${sortedMembers.length} available`}>
              {sortedMembers.map((m) => {
                const warning = getEligibilityWarning(slot.role, m)
                return (
                  <CommandItem
                    key={m.id}
                    value={`${fullName(m)} ${m.church ?? ''}`}
                    onSelect={() => {
                      onAssign(m)
                      setOpen(false)
                    }}
                    className="flex flex-col items-start gap-1 py-2.5"
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserAvatar
                          user={{
                            id: m.id,
                            first_name: m.firstName,
                            last_name: m.lastName,
                            email: m.email,
                            profilePhoto: m.profilePhoto,
                          }}
                          size={24}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight">
                            {fullName(m)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {m.church}
                          </p>
                        </div>
                      </div>
                      <ExperienceBadge
                        level={m.experienceLevel}
                        weekendsServed={m.weekendsServed}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {m.volunteerStatus === 'attended_secuela' && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-info">
                          <Calendar className="h-3 w-3" /> Attended Secuela
                        </span>
                      )}
                      {m.volunteerStatus === 'wants_to_serve' && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" /> Wants to Serve
                        </span>
                      )}
                      {m.rectorReadyStatus.criteria.hasServedAsRector ? (
                        <span className="inline-flex items-center gap-0.5 text-xs text-primary">
                          <Award className="h-3 w-3" /> Past Rector
                        </span>
                      ) : (
                        m.rectorReadyStatus.isReady && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-foreground">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />{' '}
                            Rector Ready
                          </span>
                        )
                      )}
                      {m.isClergy && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Cross className="h-3 w-3" /> Clergy
                        </span>
                      )}
                    </div>
                    {warning !== null && (
                      <p className="flex items-center gap-1 text-xs text-error">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {warning}
                      </p>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
