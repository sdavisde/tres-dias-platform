'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Search,
  X,
  Users,
  Calendar,
  Star,
  ChevronDown,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  History,
  Church,
  Phone,
  Mail,
  Award,
  Cross,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import type { RosterBuilderCommunityMember } from '@/services/roster-builder'
import type { RoleCategory } from './roster-builder-types'
import {
  fullName,
  slotLabel,
  ExperienceBadge,
  getExperienceLabel,
  getEligibilityWarning,
  getEligibleRoleSummary,
} from './roster-builder-types'
import { UserAvatarWithPreview } from '@/components/user-avatar'

// ── Types ─────────────────────────────────────────────────────────────────────

type GenderFilter = 'all' | 'male' | 'female'

type SheetFilters = {
  search: string
  gender: GenderFilter
  secuela: boolean
  hasGivenRollo: boolean
  hasBeenSectionHead: boolean
  isRectorReady: boolean
  isClergy: boolean
  experienceLevel: 'all' | 'veteran' | 'experienced' | 'served'
}

function defaultGenderFilter(weekendType: string): GenderFilter {
  if (weekendType === 'MENS') return 'male'
  if (weekendType === 'WOMENS') return 'female'
  return 'all'
}

// ── Community Member Card ─────────────────────────────────────────────────────

/** One quiet chip for every qualification; the icon tells them apart. */
const INDICATOR_CHIP_CLASS = 'border-border bg-card text-xs text-nav-foreground'

function AssignmentBadge({ member }: { member: RosterBuilderCommunityMember }) {
  const status = member.assignmentStatus
  if (status.type === 'unassigned') return null

  const isDraft = status.type === 'draft'
  const roleLabel =
    status.rollo != null
      ? `${status.chaRole} — ${status.rollo}`
      : status.chaRole

  return (
    <Badge
      variant="outline"
      className={`text-xs ${
        isDraft
          ? 'border-secondary-border bg-secondary text-secondary-foreground'
          : 'border-transparent bg-success/15 text-success'
      }`}
    >
      {isDraft ? 'Draft' : 'Assigned'}: {roleLabel}
    </Badge>
  )
}

function CommunityMemberCard({
  member,
  categories,
  onAssign,
  scrollAreaRef,
}: {
  member: RosterBuilderCommunityMember
  categories: RoleCategory[]
  onAssign: (slotId: string, member: RosterBuilderCommunityMember) => void
  scrollAreaRef: React.RefObject<HTMLDivElement | null>
}) {
  const [expanded, setExpanded] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)

  const isAssigned = member.assignmentStatus.type !== 'unassigned'

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
      if (cat == null) return null
      return (
        cat.slots.find(
          (s) => s.assignment.type === 'empty' && slotLabel(s) === roleLabel
        ) ?? null
      )
    },
    [categories]
  )

  return (
    <div
      className={`rounded-md border bg-card ${isAssigned ? 'opacity-50' : ''}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <UserAvatarWithPreview
              user={{
                id: member.id,
                first_name: member.firstName,
                last_name: member.lastName,
                email: member.email,
                phone_number: member.phoneNumber,
                profilePhoto: member.profilePhoto,
              }}
              size={36}
            />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold leading-tight text-foreground">
                {fullName(member)}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                <Church className="h-3.5 w-3.5 shrink-0" />
                {member.church}
              </p>
              {member.phoneNumber != null ? (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3 shrink-0" />
                  {member.phoneNumber}
                </p>
              ) : member.email != null ? (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground truncate">
                  <Mail className="h-3 w-3 shrink-0" />
                  {member.email}
                </p>
              ) : null}
            </div>
          </div>
          <ExperienceBadge
            level={member.experienceLevel}
            weekendsServed={member.weekendsServed}
          />
        </div>

        {/* Assignment status for assigned members */}
        {isAssigned && (
          <div className="mt-2">
            <AssignmentBadge member={member} />
          </div>
        )}

        {/* Indicator badges */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {member.volunteerStatus === 'attended_secuela' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={INDICATOR_CHIP_CLASS}>
                  <Calendar className="mr-1 h-3 w-3" />
                  Attended Secuela
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Signed in during secuela</TooltipContent>
            </Tooltip>
          )}
          {member.volunteerStatus === 'wants_to_serve' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={INDICATOR_CHIP_CLASS}>
                  <Calendar className="mr-1 h-3 w-3" />
                  Wants to Serve
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Signed up to serve after secuela ended
              </TooltipContent>
            </Tooltip>
          )}
          {member.rectorReadyStatus.criteria.hasServedAsRector ? (
            <Badge variant="outline" className={INDICATOR_CHIP_CLASS}>
              <Award className="mr-1 h-3 w-3" />
              Past Rector
            </Badge>
          ) : (
            member.rectorReadyStatus.isReady && (
              <Badge variant="outline" className={INDICATOR_CHIP_CLASS}>
                <Star className="mr-1 h-3 w-3 fill-amber-500 text-amber-500" />
                Rector Ready
              </Badge>
            )
          )}
          {member.hasGivenRollo && (
            <Badge variant="outline" className={INDICATOR_CHIP_CLASS}>
              <Briefcase className="mr-1 h-3 w-3" />
              Rollista
            </Badge>
          )}
          {member.hasBeenSectionHead && (
            <Badge variant="outline" className={INDICATOR_CHIP_CLASS}>
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Section Head
            </Badge>
          )}
          {member.isClergy && (
            <Badge variant="outline" className={INDICATOR_CHIP_CLASS}>
              <Cross className="mr-1 h-3 w-3" />
              Clergy
            </Badge>
          )}
        </div>

        {!isAssigned && (
          <p className="mt-2 text-xs text-muted-foreground">
            {getEligibleRoleSummary(member)}
          </p>
        )}

        {/* Action row */}
        <div className="mt-3 flex items-center gap-2">
          {isAssigned ? (
            <Button size="sm" className="h-8 flex-1 text-sm" disabled>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Already assigned
            </Button>
          ) : (
            <Popover open={assignOpen} onOpenChange={setAssignOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" className="h-8 flex-1 text-sm">
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
                          const warning = getEligibilityWarning(
                            slot.role,
                            member
                          )
                          const label = slotLabel(slot)
                          return (
                            <CommandItem
                              key={slot.id}
                              value={`${label} ${cat.name}`}
                              onSelect={() => {
                                const target = findFirstEmptySlot(
                                  cat.name,
                                  label
                                )
                                if (target != null) {
                                  onAssign(target.id, member)
                                }
                                setAssignOpen(false)
                              }}
                              className="text-sm"
                            >
                              <div className="flex flex-col gap-0.5 min-w-0">
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
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 shrink-0"
            onClick={() => setExpanded((v) => !v)}
            aria-label={
              expanded
                ? 'Collapse experience history'
                : 'Expand experience history'
            }
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <History className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Expandable experience history */}
      {expanded && (
        <div className="rounded-b-md border-t bg-muted/40 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Experience History
          </p>
          {member.experience.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No recorded experience.
            </p>
          ) : (
            <ul className="space-y-1">
              {member.experience.map((r, i) => (
                <li key={i} className="text-sm text-foreground/80 leading-snug">
                  {r.weekend_reference} — {r.cha_role}
                  {r.rollo != null ? `: ${r.rollo}` : ''}
                </li>
              ))}
            </ul>
          )}
          <Separator className="my-2" />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span
              className={
                member.hasBeenSectionHead
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground'
              }
            >
              {member.hasBeenSectionHead ? '\u2713' : '\u2717'} Section Head
            </span>
            <span
              className={
                member.hasGivenRollo
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground'
              }
            >
              {member.hasGivenRollo ? '\u2713' : '\u2717'} Given Rollo
            </span>
            <span
              className={
                member.rectorReadyStatus.criteria.hasServedAsRector
                  ? 'font-medium text-primary'
                  : member.rectorReadyStatus.isReady
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground'
              }
            >
              {member.rectorReadyStatus.criteria.hasServedAsRector
                ? '\u2605 Past Rector'
                : member.rectorReadyStatus.isReady
                  ? '\u2605 Rector Ready'
                  : '\u2606 Rector Ready'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Community Sheet ───────────────────────────────────────────────────────────

export function CommunitySheet({
  weekendType,
  communityMembers,
  categories,
  onAssign,
}: {
  weekendType: string
  communityMembers: RosterBuilderCommunityMember[]
  categories: RoleCategory[]
  onAssign: (slotId: string, member: RosterBuilderCommunityMember) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pendingScrollRef = useRef(false)

  useEffect(() => {
    if (!pendingScrollRef.current) return
    pendingScrollRef.current = false
    const viewport = scrollRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]'
    )
    viewport?.scrollTo({ top: 0 })
  }, [categories])

  const [filters, setFilters] = useState<SheetFilters>(() => ({
    search: '',
    gender: defaultGenderFilter(weekendType),
    secuela: false,
    hasGivenRollo: false,
    hasBeenSectionHead: false,
    isRectorReady: false,
    isClergy: false,
    experienceLevel: 'all',
  }))

  // Get the set of assigned member IDs from the categories
  const assignedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const cat of categories) {
      for (const slot of cat.slots) {
        if (slot.assignment.type !== 'empty') {
          ids.add(slot.assignment.member.id)
        }
      }
    }
    return ids
  }, [categories])

  const unassignedCount = useMemo(
    () => communityMembers.filter((m) => !assignedIds.has(m.id)).length,
    [communityMembers, assignedIds]
  )

  const filteredMembers = useMemo(() => {
    let list = [...communityMembers]
    const q = filters.search.trim().toLowerCase()
    if (q.length > 0) {
      list = list.filter(
        (m) =>
          fullName(m).toLowerCase().includes(q) ||
          (m.church ?? '').toLowerCase().includes(q)
      )
    }
    if (filters.gender !== 'all') {
      list = list.filter((m) => m.gender?.toLowerCase() === filters.gender)
    }
    if (filters.secuela) list = list.filter((m) => m.volunteerStatus !== 'none')
    if (filters.hasGivenRollo) list = list.filter((m) => m.hasGivenRollo)
    if (filters.hasBeenSectionHead)
      list = list.filter((m) => m.hasBeenSectionHead)
    if (filters.isRectorReady)
      list = list.filter((m) => m.rectorReadyStatus.isReady)
    if (filters.isClergy) list = list.filter((m) => m.isClergy)
    if (filters.experienceLevel !== 'all') {
      list = list.filter((m) => {
        const { label } = getExperienceLabel(m.experienceLevel)
        return label.toLowerCase() === filters.experienceLevel
      })
    }
    // Sort: unassigned first, assigned last
    list.sort((a, b) => {
      const aAssigned = assignedIds.has(a.id) ? 1 : 0
      const bAssigned = assignedIds.has(b.id) ? 1 : 0
      return aAssigned - bAssigned
    })
    return list
  }, [communityMembers, assignedIds, filters])

  const defaultGender = defaultGenderFilter(weekendType)
  const hasActiveFilters =
    filters.secuela ||
    filters.hasGivenRollo ||
    filters.hasBeenSectionHead ||
    filters.isRectorReady ||
    filters.isClergy ||
    filters.experienceLevel !== 'all' ||
    filters.gender !== defaultGender ||
    filters.search.length > 0

  function clearFilters() {
    setFilters({
      search: '',
      gender: defaultGender,
      secuela: false,
      hasGivenRollo: false,
      hasBeenSectionHead: false,
      isRectorReady: false,
      isClergy: false,
      experienceLevel: 'all',
    })
  }

  function toggleBool(
    key: keyof Pick<
      SheetFilters,
      | 'secuela'
      | 'hasGivenRollo'
      | 'hasBeenSectionHead'
      | 'isRectorReady'
      | 'isClergy'
    >
  ) {
    setFilters((f) => ({ ...f, [key]: !f[key] }))
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-11 gap-2 md:h-9">
          <Users className="h-4 w-4" />
          Browse Community
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="sm:max-w-lg flex flex-col p-0 gap-0"
      >
        <SheetHeader className="px-5 pt-5 pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold">
              Community Members
            </SheetTitle>
            <Badge variant="secondary" className="text-sm px-2.5">
              {unassignedCount} unassigned
            </Badge>
          </div>
          <SheetDescription className="text-sm">
            Browse, filter, and assign community members to open roster slots.
          </SheetDescription>
        </SheetHeader>

        {/* Filters */}
        <div className="px-5 py-4 border-b space-y-3 bg-muted/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or church..."
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
              className="h-9 pl-9 text-sm"
            />
            {filters.search.length > 0 && (
              <button
                onClick={() => setFilters((f) => ({ ...f, search: '' }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                {
                  key: 'secuela',
                  label: 'Secuela',
                  icon: Calendar,
                },
                {
                  key: 'hasGivenRollo',
                  label: 'Has Given Rollo',
                  icon: Briefcase,
                },
                {
                  key: 'hasBeenSectionHead',
                  label: 'Section Head',
                  icon: CheckCircle2,
                },
                { key: 'isRectorReady', label: 'Rector Ready', icon: Star },
                { key: 'isClergy', label: 'Clergy', icon: Cross },
              ] as const
            ).map(({ key, label, icon: Icon }) => {
              const active = filters[key]
              return (
                <button
                  key={key}
                  onClick={() => toggleBool(key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <select
                value={filters.gender}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    gender: e.target.value as GenderFilter,
                  }))
                }
                className="w-full appearance-none rounded-md border border-input bg-background px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              >
                <option value="all">All genders</option>
                <option value="male">Men</option>
                <option value="female">Women</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
            <div className="relative flex-1">
              <select
                value={filters.experienceLevel}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    experienceLevel: e.target
                      .value as SheetFilters['experienceLevel'],
                  }))
                }
                className="w-full appearance-none rounded-md border border-input bg-background px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              >
                <option value="all">All experience levels</option>
                <option value="veteran">Veteran (4+ weekends)</option>
                <option value="experienced">Experienced (2–3)</option>
                <option value="served">Served (1)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 shrink-0 text-xs text-muted-foreground"
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Showing{' '}
            <span className="font-semibold text-foreground">
              {filteredMembers.length}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-foreground">
              {communityMembers.length}
            </span>{' '}
            members ({unassignedCount} unassigned)
          </p>
        </div>

        {/* Member list */}
        <ScrollArea ref={scrollRef} className="flex-1 min-h-0">
          <div className="px-5 py-4 space-y-3">
            {filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    No members match filters
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try clearing some filters
                  </p>
                </div>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear all filters
                  </Button>
                )}
              </div>
            ) : (
              filteredMembers.map((member) => (
                <CommunityMemberCard
                  key={member.id}
                  member={member}
                  categories={categories}
                  scrollAreaRef={scrollRef}
                  onAssign={(slotId, m) => {
                    onAssign(slotId, m)
                    pendingScrollRef.current = true
                  }}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
