'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { isNil } from 'lodash'
import {
  ArrowLeft,
  ChevronRight,
  Church,
  Mail,
  Phone,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { UserAvatar } from '@/components/user-avatar'
import { cn } from '@/lib/utils'
import type { ExperienceLevel } from '@/services/master-roster/types'
import type { RosterBuilderCommunityMember } from '@/services/roster-builder'
import {
  buildFilterOptions,
  countActiveFilters,
  defaultFilters,
  filterCommunityMembers,
  hasQualification,
  type CommunityFilters,
  type Qualification,
} from '../lib/community-filters'
import type { MemberAssignment, RoleCategory } from './roster-builder-types'
import {
  ExperienceBadge,
  fullName,
  getEligibleRoleSummary,
  getMemberAssignments,
} from './roster-builder-types'
import { AssignMemberPopover } from './assign-member-popover'
import {
  ActiveFilterChips,
  CommunityFiltersPanel,
} from './community-filters-panel'
import { MemberIndicatorChips, QUALIFICATIONS } from './member-indicators'
import { PersonProfile, RosterAssignmentNotice } from './person-profile'

type SheetView =
  { type: 'list' } | { type: 'filters' } | { type: 'profile'; memberId: string }

// ── Community Member Card ─────────────────────────────────────────────────────

function AssignmentBadge({ assignment }: { assignment: MemberAssignment }) {
  const isDraft = assignment.type === 'draft'
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs',
        isDraft
          ? 'border-secondary-border bg-secondary text-secondary-foreground'
          : 'border-transparent bg-success/15 text-success'
      )}
    >
      {isDraft ? 'Draft' : 'Assigned'}: {assignment.slotLabel}
    </Badge>
  )
}

function CommunityMemberCard({
  member,
  assignment,
  categories,
  onAssign,
  onViewProfile,
}: {
  member: RosterBuilderCommunityMember
  assignment: MemberAssignment | undefined
  categories: RoleCategory[]
  onAssign: (slotId: string, member: RosterBuilderCommunityMember) => void
  onViewProfile: () => void
}) {
  const isAssigned = !isNil(assignment)

  return (
    <div
      className={cn('rounded-md border bg-card', isAssigned && 'opacity-60')}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onViewProfile}
            className="group flex min-w-0 flex-1 items-start gap-2.5 rounded-md text-left focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <UserAvatar
              user={{
                id: member.id,
                first_name: member.firstName,
                last_name: member.lastName,
                email: member.email,
                profilePhoto: member.profilePhoto,
              }}
              size={36}
            />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold leading-tight text-foreground group-hover:underline">
                {fullName(member)}
              </p>
              {!isNil(member.church) && (
                <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <Church className="h-3.5 w-3.5 shrink-0" />
                  {member.church}
                </p>
              )}
              {!isNil(member.phoneNumber) ? (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3 shrink-0" />
                  {member.phoneNumber}
                </p>
              ) : !isNil(member.email) ? (
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <Mail className="h-3 w-3 shrink-0" />
                  {member.email}
                </p>
              ) : null}
            </div>
          </button>
          <ExperienceBadge
            level={member.experienceLevel}
            weekendsServed={member.weekendsServed}
          />
        </div>

        {isAssigned && (
          <div className="mt-2">
            <AssignmentBadge assignment={assignment} />
          </div>
        )}

        <MemberIndicatorChips member={member} className="mt-3" />

        {!isAssigned && (
          <p className="mt-2 text-xs text-muted-foreground">
            {getEligibleRoleSummary(member)}
          </p>
        )}

        {/* Action row */}
        <div className="mt-3 flex items-center gap-2">
          {isAssigned ? (
            <Button size="sm" className="h-11 flex-1 text-sm md:h-9" disabled>
              Already assigned
            </Button>
          ) : (
            <AssignMemberPopover
              member={member}
              categories={categories}
              onAssign={onAssign}
              className="flex-1"
            />
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-11 shrink-0 gap-1 text-sm md:h-9"
            onClick={onViewProfile}
          >
            Profile
            <ChevronRight aria-hidden className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
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

  const [open, setOpen] = useState(false)
  const [view, setView] = useState<SheetView>({ type: 'list' })
  const [filters, setFilters] = useState<CommunityFilters>(() =>
    defaultFilters(weekendType)
  )

  const assignments = useMemo(
    () => getMemberAssignments(categories),
    [categories]
  )
  const assignedIds = useMemo(() => new Set(assignments.keys()), [assignments])

  const unassignedCount = useMemo(
    () => communityMembers.filter((m) => !assignedIds.has(m.id)).length,
    [communityMembers, assignedIds]
  )

  // Options and counts cover the chosen gender: that's who this weekend can
  // draw from, so a skill only women list shouldn't tempt a Men's rector.
  const genderScoped = useMemo(
    () =>
      filters.gender === 'all'
        ? communityMembers
        : communityMembers.filter(
            (m) => m.gender?.toLowerCase() === filters.gender
          ),
    [communityMembers, filters.gender]
  )
  const filterOptions = useMemo(
    () => buildFilterOptions(genderScoped),
    [genderScoped]
  )
  const genderCounts = useMemo(() => {
    const countOf = (gender: string) =>
      communityMembers.filter((m) => m.gender?.toLowerCase() === gender).length
    return {
      male: countOf('male'),
      female: countOf('female'),
      all: communityMembers.length,
    }
  }, [communityMembers])
  const experienceCounts = useMemo(() => {
    const countOf = (level: ExperienceLevel) =>
      genderScoped.filter((m) => m.experienceLevel === level).length
    return { 1: countOf(1), 2: countOf(2), 3: countOf(3) }
  }, [genderScoped])
  const qualificationCounts = useMemo(
    () =>
      Object.fromEntries(
        QUALIFICATIONS.map(({ value }) => [
          value,
          genderScoped.filter((m) => hasQualification(m, value)).length,
        ])
      ) as Record<Qualification, number>,
    [genderScoped]
  )

  const filteredMembers = useMemo(
    () => filterCommunityMembers(communityMembers, filters, assignedIds),
    [communityMembers, filters, assignedIds]
  )

  const activeFilterCount = countActiveFilters(filters, weekendType)

  function resetFilters() {
    setFilters((f) => ({ ...defaultFilters(weekendType), search: f.search }))
  }

  function handleAssign(slotId: string, member: RosterBuilderCommunityMember) {
    onAssign(slotId, member)
    pendingScrollRef.current = true
  }

  const profileMember =
    view.type === 'profile'
      ? communityMembers.find((m) => m.id === view.memberId)
      : undefined
  const profileAssignment = isNil(profileMember)
    ? undefined
    : assignments.get(profileMember.id)

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setView({ type: 'list' })
      }}
    >
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-11 gap-2 md:h-9">
          <Users className="h-4 w-4" />
          Browse Community
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetDescription className="sr-only">
          Browse, filter, and assign community members to open roster slots.
        </SheetDescription>

        {/* ── List header ── */}
        {view.type === 'list' && (
          <>
            <SheetHeader className="border-b px-5 pt-5 pb-4 pr-12">
              <div className="flex items-center gap-3">
                <SheetTitle className="text-lg font-bold">
                  Community Members
                </SheetTitle>
                <Badge variant="secondary" className="px-2.5 text-sm">
                  {unassignedCount} unassigned
                </Badge>
              </div>
            </SheetHeader>

            <div className="space-y-3 border-b bg-muted/20 px-5 py-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search name, church, or skill..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, search: e.target.value }))
                    }
                    className="h-11 pr-10 pl-9 text-sm md:h-9"
                  />
                  {filters.search.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilters((f) => ({ ...f, search: '' }))}
                      className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="h-11 shrink-0 gap-2 md:h-9"
                  onClick={() => setView({ type: 'filters' })}
                >
                  <SlidersHorizontal aria-hidden className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </div>

              <ActiveFilterChips
                filters={filters}
                weekendType={weekendType}
                onChange={setFilters}
                onClearAll={resetFilters}
              />

              <p className="text-xs text-muted-foreground">
                Showing{' '}
                <span className="font-semibold text-foreground">
                  {filteredMembers.length}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-foreground">
                  {communityMembers.length}
                </span>{' '}
                members
              </p>
            </div>
          </>
        )}

        {/* ── Member list: stays mounted so Back keeps your scroll spot ── */}
        <ScrollArea
          ref={scrollRef}
          className={cn('min-h-0 flex-1', view.type !== 'list' && 'hidden')}
        >
          <div className="space-y-3 px-5 py-4">
            {filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    No members match filters
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try clearing some filters
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters(defaultFilters(weekendType))}
                >
                  Clear all filters
                </Button>
              </div>
            ) : (
              filteredMembers.map((member) => (
                <CommunityMemberCard
                  key={member.id}
                  member={member}
                  assignment={assignments.get(member.id)}
                  categories={categories}
                  onAssign={handleAssign}
                  onViewProfile={() =>
                    setView({ type: 'profile', memberId: member.id })
                  }
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* ── Filters ── */}
        {view.type === 'filters' && (
          <>
            <SheetHeader className="flex-row items-center gap-2 border-b px-3 py-3 pr-12">
              <Button
                variant="ghost"
                size="icon"
                className="size-11 md:size-9"
                aria-label="Back to members"
                onClick={() => setView({ type: 'list' })}
              >
                <ArrowLeft aria-hidden className="h-4 w-4" />
              </Button>
              <SheetTitle className="flex-1 text-lg font-bold">
                Filters
              </SheetTitle>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 text-sm text-muted-foreground md:h-9"
                  onClick={resetFilters}
                >
                  Reset
                </Button>
              )}
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1">
              <CommunityFiltersPanel
                filters={filters}
                onChange={setFilters}
                options={filterOptions}
                genderCounts={genderCounts}
                experienceCounts={experienceCounts}
                qualificationCounts={qualificationCounts}
              />
            </ScrollArea>
            <div className="border-t bg-card px-5 py-3">
              <Button
                className="h-11 w-full text-sm md:h-10"
                onClick={() => setView({ type: 'list' })}
              >
                Show {filteredMembers.length}{' '}
                {filteredMembers.length === 1 ? 'member' : 'members'}
              </Button>
            </div>
          </>
        )}

        {/* ── Profile ── */}
        {view.type === 'profile' && (
          <>
            <div className="border-b px-3 py-3 pr-12">
              <Button
                variant="ghost"
                size="sm"
                className="h-11 gap-1.5 px-2 text-sm text-nav-foreground md:h-9"
                onClick={() => setView({ type: 'list' })}
              >
                <ArrowLeft aria-hidden className="h-4 w-4" />
                All members
              </Button>
            </div>
            <ScrollArea key={view.memberId} className="min-h-0 flex-1">
              {isNil(profileMember) ? (
                <SheetTitle className="px-5 py-12 text-center text-sm font-normal text-muted-foreground">
                  This person is no longer in the community list.
                </SheetTitle>
              ) : (
                <PersonProfile
                  member={profileMember}
                  nameAsSheetTitle
                  action={
                    !isNil(profileAssignment) ? (
                      <RosterAssignmentNotice assignment={profileAssignment} />
                    ) : (
                      <AssignMemberPopover
                        member={profileMember}
                        categories={categories}
                        onAssign={handleAssign}
                        className="w-full"
                      />
                    )
                  }
                />
              )}
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
