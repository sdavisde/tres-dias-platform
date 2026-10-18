'use client'

import { useState, type ReactNode } from 'react'
import { isNil } from 'lodash'
import {
  Check,
  ChevronsUpDown,
  Mars,
  Users,
  Venus,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import type { ExperienceLevel } from '@/services/master-roster/types'
import {
  defaultGenderFilter,
  type CommunityFilters,
  type FilterOption,
  type FilterOptions,
  type GenderFilter,
  type Qualification,
} from '../lib/community-filters'
import { QUALIFICATIONS } from './member-indicators'

/** How many skills show before "Show all". */
const SKILL_PREVIEW_COUNT = 10

const GENDER_OPTIONS: Array<{
  value: GenderFilter
  label: string
  icon: LucideIcon
}> = [
  { value: 'male', label: 'Men', icon: Mars },
  { value: 'female', label: 'Women', icon: Venus },
  { value: 'all', label: 'Everyone', icon: Users },
]

const EXPERIENCE_OPTIONS: Array<{ level: ExperienceLevel; weekends: string }> =
  [
    { level: 1, weekends: '0–1 weekends' },
    { level: 2, weekends: '2–3 weekends' },
    { level: 3, weekends: '4+ weekends' },
  ]

/** A large selectable tile for the gender and experience pickers. */
const TILE_CLASS =
  'flex flex-col items-center justify-center gap-1 rounded-lg border-2 px-2 py-3 text-center transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none'

function tileStateClass(active: boolean) {
  return active
    ? 'border-primary bg-primary/10'
    : 'border-border bg-card hover:border-primary/40 hover:bg-accent'
}

function TileCount({ count }: { count: number }) {
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {count} {count === 1 ? 'person' : 'people'}
    </span>
  )
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value]
}

/**
 * Keeps a selected value on offer even when nobody in the current scope
 * matches it, so it can still be seen and unselected.
 */
function withSelected(options: FilterOption[], selected: string[]) {
  const offered = new Set(options.map((o) => o.value))
  return [
    ...options,
    ...selected
      .filter((value) => !offered.has(value))
      .map((value) => ({ value, count: 0 })),
  ]
}

// ── Filter view ───────────────────────────────────────────────────────────────

function FilterSection({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3 border-b border-divider px-5 py-5 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {!isNil(hint) && (
          <span className="text-xs text-muted-foreground">{hint}</span>
        )}
      </div>
      {children}
    </section>
  )
}

/** A pill that toggles one filter value, with how many people it matches. */
function FilterChip({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon?: ReactNode
  label: string
  count?: number
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-11 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none md:h-8',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-nav-foreground hover:border-foreground/30 hover:text-foreground'
      )}
    >
      {icon}
      {label}
      {!isNil(count) && (
        <span
          className={cn(
            'text-xs tabular-nums',
            active ? 'text-primary-foreground/80' : 'text-muted-foreground'
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

/** Searchable multi-select for long lists (roles, churches). */
function OptionCombobox({
  options,
  selected,
  onChange,
  placeholder,
  searchPlaceholder,
}: {
  options: FilterOption[]
  selected: string[]
  onChange: (next: string[]) => void
  placeholder: string
  searchPlaceholder: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-sm font-normal text-muted-foreground"
          >
            {placeholder}
            <ChevronsUpDown aria-hidden className="h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onWheel={(e) => e.stopPropagation()}
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} className="h-9" />
            <CommandList className="max-h-64">
              <CommandEmpty>No matches.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selected.includes(option.value)
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => onChange(toggle(selected, option.value))}
                      className="text-sm"
                    >
                      <Check
                        aria-hidden
                        className={cn(
                          'h-4 w-4',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="flex-1 truncate">{option.value}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {option.count}
                      </span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((value) => (
            <RemovableChip
              key={value}
              label={value}
              onRemove={() => onChange(toggle(selected, value))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * The Browse Community filter view: every way to narrow the list, grouped,
 * with live counts. Counts cover the members in the chosen gender, since
 * that's who the weekend can draw from.
 */
export function CommunityFiltersPanel({
  filters,
  onChange,
  options,
  genderCounts,
  experienceCounts,
  qualificationCounts,
}: {
  filters: CommunityFilters
  onChange: (next: CommunityFilters) => void
  options: FilterOptions
  /** Across the whole community. */
  genderCounts: Record<GenderFilter, number>
  experienceCounts: Record<ExperienceLevel, number>
  qualificationCounts: Record<Qualification, number>
}) {
  const [showAllSkills, setShowAllSkills] = useState(false)
  const set = (patch: Partial<CommunityFilters>) =>
    onChange({ ...filters, ...patch })

  const skillOptions = withSelected(options.skills, filters.skills)
  const visibleSkills = showAllSkills
    ? skillOptions
    : skillOptions.slice(0, SKILL_PREVIEW_COUNT)

  return (
    <div>
      <FilterSection title="Show">
        <div
          role="radiogroup"
          aria-label="Gender"
          className="grid grid-cols-3 gap-2"
        >
          {GENDER_OPTIONS.map(({ value, label, icon: Icon }) => {
            const active = filters.gender === value
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set({ gender: value })}
                className={cn(TILE_CLASS, tileStateClass(active))}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    'size-6',
                    active ? 'text-primary' : 'text-nav-foreground'
                  )}
                />
                <span className="text-sm font-semibold text-foreground">
                  {label}
                </span>
                <TileCount count={genderCounts[value]} />
              </button>
            )
          })}
        </div>
        <div className="flex min-h-11 items-center justify-between gap-3">
          <Label htmlFor="hide-assigned" className="text-sm font-normal">
            Hide people already on this roster
          </Label>
          <Switch
            id="hide-assigned"
            checked={filters.hideAssigned}
            onCheckedChange={(hideAssigned) => set({ hideAssigned })}
          />
        </div>
      </FilterSection>

      <FilterSection title="Experience level" hint="Match any">
        <div className="grid grid-cols-3 gap-2">
          {EXPERIENCE_OPTIONS.map(({ level, weekends }) => {
            const active = filters.experience.includes(level)
            return (
              <button
                key={level}
                type="button"
                aria-pressed={active}
                aria-label={`Level ${level}, ${weekends}`}
                onClick={() =>
                  set({ experience: toggle(filters.experience, level) })
                }
                className={cn(TILE_CLASS, tileStateClass(active))}
              >
                <span
                  aria-hidden
                  className="flex size-9 items-center justify-center rounded-full font-serif text-lg font-semibold"
                  style={{
                    backgroundColor: `var(--experience-level-${level})`,
                    color: `var(--experience-level-${level}-fg)`,
                  }}
                >
                  {level}
                </span>
                <span className="text-[13px] font-medium text-foreground">
                  {weekends}
                </span>
                <TileCount count={experienceCounts[level]} />
              </button>
            )
          })}
        </div>
      </FilterSection>

      <FilterSection title="Qualifications" hint="Must match all">
        <div className="flex flex-wrap gap-2">
          {QUALIFICATIONS.map(({ value, label, icon: Icon }) => (
            <FilterChip
              key={value}
              active={filters.qualifications.includes(value)}
              onClick={() =>
                set({ qualifications: toggle(filters.qualifications, value) })
              }
              icon={<Icon aria-hidden className="h-3.5 w-3.5" />}
              label={label}
              count={qualificationCounts[value]}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Gifts & skills" hint="Match any">
        {skillOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nobody has listed any skills yet.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {visibleSkills.map((option) => (
                <FilterChip
                  key={option.value}
                  active={filters.skills.includes(option.value)}
                  onClick={() =>
                    set({ skills: toggle(filters.skills, option.value) })
                  }
                  label={option.value}
                  count={option.count}
                />
              ))}
            </div>
            {skillOptions.length > SKILL_PREVIEW_COUNT && (
              <Button
                variant="link"
                size="sm"
                className="h-auto px-0 text-[13px]"
                onClick={() => setShowAllSkills((v) => !v)}
              >
                {showAllSkills
                  ? 'Show fewer'
                  : `Show all ${skillOptions.length} skills`}
              </Button>
            )}
          </>
        )}
      </FilterSection>

      <FilterSection title="Has served as" hint="Match any">
        <OptionCombobox
          options={withSelected(options.servedAs, filters.servedAs)}
          selected={filters.servedAs}
          onChange={(servedAs) => set({ servedAs })}
          placeholder="Choose roles..."
          searchPlaceholder="Search roles..."
        />
      </FilterSection>

      <FilterSection title="Church" hint="Match any">
        <OptionCombobox
          options={withSelected(options.churches, filters.churches)}
          selected={filters.churches}
          onChange={(churches) => set({ churches })}
          placeholder="Choose churches..."
          searchPlaceholder="Search churches..."
        />
      </FilterSection>
    </div>
  )
}

// ── Active filter summary ─────────────────────────────────────────────────────

function RemovableChip({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <span className="inline-flex h-7 items-center gap-0.5 rounded-full border border-secondary-border bg-secondary pl-2.5 text-xs font-medium text-secondary-foreground">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="flex size-7 items-center justify-center rounded-full hover:bg-secondary-border/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <X aria-hidden className="h-3 w-3" />
      </button>
    </span>
  )
}

/**
 * One removable chip per active filter, shown under the search box so the
 * list never looks mysteriously short.
 */
export function ActiveFilterChips({
  filters,
  weekendType,
  onChange,
  onClearAll,
}: {
  filters: CommunityFilters
  weekendType: string
  onChange: (next: CommunityFilters) => void
  onClearAll: () => void
}) {
  const chips: Array<{ key: string; label: string; remove: () => void }> = []
  const set = (patch: Partial<CommunityFilters>) =>
    onChange({ ...filters, ...patch })

  if (filters.gender !== defaultGenderFilter(weekendType)) {
    chips.push({
      key: 'gender',
      label:
        GENDER_OPTIONS.find((o) => o.value === filters.gender)?.label ??
        filters.gender,
      remove: () => set({ gender: defaultGenderFilter(weekendType) }),
    })
  }
  for (const level of [...filters.experience].sort()) {
    chips.push({
      key: `level:${level}`,
      label: `Level ${level}`,
      remove: () =>
        set({ experience: filters.experience.filter((v) => v !== level) }),
    })
  }
  if (filters.hideAssigned) {
    chips.push({
      key: 'hideAssigned',
      label: 'Hiding assigned',
      remove: () => set({ hideAssigned: false }),
    })
  }
  for (const q of filters.qualifications) {
    chips.push({
      key: `q:${q}`,
      label: QUALIFICATIONS.find((o) => o.value === q)?.label ?? q,
      remove: () =>
        set({ qualifications: filters.qualifications.filter((v) => v !== q) }),
    })
  }
  for (const skill of filters.skills) {
    chips.push({
      key: `skill:${skill}`,
      label: skill,
      remove: () => set({ skills: filters.skills.filter((v) => v !== skill) }),
    })
  }
  for (const role of filters.servedAs) {
    chips.push({
      key: `role:${role}`,
      label: `Served as ${role}`,
      remove: () =>
        set({ servedAs: filters.servedAs.filter((v) => v !== role) }),
    })
  }
  for (const church of filters.churches) {
    chips.push({
      key: `church:${church}`,
      label: church,
      remove: () =>
        set({ churches: filters.churches.filter((v) => v !== church) }),
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <RemovableChip
          key={chip.key}
          label={chip.label}
          onRemove={chip.remove}
        />
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="text-xs text-muted-foreground"
      >
        Clear all
      </Button>
    </div>
  )
}
