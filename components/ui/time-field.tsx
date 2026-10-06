'use client'

import * as React from 'react'
import { isNil } from 'lodash'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import {
  formatDuration,
  formatTimeOfDay,
  nearestOption,
  parseTimeOfDay,
  timeOfDayOptions,
} from '@/lib/time/time-of-day'

const OPTIONS = timeOfDayOptions(15)

export interface TimeFieldProps {
  /** "HH:mm" (24-hour), or '' when empty. */
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  /**
   * For an end time: the start, so the list begins there and shows how long
   * the event runs ("8:00 PM · 1 hr").
   */
  startTime?: string
  /** Where the list opens when the field is empty, e.g. "19:00". */
  defaultScrollTime?: string
  'aria-invalid'?: boolean
}

/**
 * A time field that works like Google Calendar's: type "7p", "7:30 pm" or
 * "1930" straight into it, or pick from the 15-minute list that drops down
 * beneath. Settles to "7:30 PM" when you leave it.
 */
export function TimeField({
  value,
  onChange,
  id,
  placeholder = 'Add time',
  disabled = false,
  className,
  startTime,
  defaultScrollTime = '09:00',
  'aria-invalid': ariaInvalid,
}: TimeFieldProps) {
  const [open, setOpen] = React.useState(false)
  // What's in the box while typing; null shows the formatted value
  const [draft, setDraft] = React.useState<string | null>(null)
  const [highlighted, setHighlighted] = React.useState<string | null>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const listboxId = React.useId()

  const options = React.useMemo(
    () =>
      isNil(startTime) || startTime === ''
        ? OPTIONS
        : OPTIONS.filter((option) => option > startTime),
    [startTime]
  )

  const display = draft ?? (value === '' ? '' : formatTimeOfDay(value))
  const parsedDraft = isNil(draft) ? null : parseTimeOfDay(draft)
  const invalidDraft =
    !isNil(draft) && draft.trim() !== '' && isNil(parsedDraft)

  // Keep the current (or typed) time in view while the list is open
  const anchorTime =
    highlighted ?? parsedDraft ?? (value === '' ? defaultScrollTime : value)
  const scrollTarget =
    options.length === 0 ? null : nearestOption(options, anchorTime)
  React.useEffect(() => {
    if (!open || isNil(scrollTarget)) return
    const frame = requestAnimationFrame(() => {
      listRef.current
        ?.querySelector(`[data-time="${scrollTarget}"]`)
        ?.scrollIntoView({ block: 'nearest' })
    })
    return () => cancelAnimationFrame(frame)
  }, [open, scrollTarget])

  const commit = (next: string) => {
    onChange(next)
    setDraft(null)
    setHighlighted(null)
  }

  const commitDraft = () => {
    if (isNil(draft)) return
    if (draft.trim() === '') commit('')
    else if (!isNil(parsedDraft)) commit(parsedDraft)
    // An unreadable entry stays in the box, flagged, until it's fixed
  }

  const move = (delta: number) => {
    if (options.length === 0) return
    const current = highlighted ?? scrollTarget ?? options[0]
    const index = Math.max(0, options.indexOf(current))
    const next = Math.min(options.length - 1, Math.max(0, index + delta))
    setHighlighted(options[next])
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setOpen(true)
        move(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        setOpen(true)
        move(-1)
        break
      case 'Enter':
        event.preventDefault()
        if (!isNil(highlighted)) commit(highlighted)
        else commitDraft()
        setOpen(false)
        break
      case 'Escape':
        setDraft(null)
        setHighlighted(null)
        setOpen(false)
        break
      case 'Tab':
        commitDraft()
        setOpen(false)
        break
    }
  }

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className={cn('relative', className)}>
          <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id={id}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-invalid={invalidDraft || ariaInvalid === true || undefined}
            autoComplete="off"
            disabled={disabled}
            placeholder={placeholder}
            value={display}
            onFocus={(e) => {
              e.target.select()
              setOpen(true)
            }}
            onClick={() => setOpen(true)}
            onChange={(e) => {
              setDraft(e.target.value)
              setHighlighted(null)
              setOpen(true)
            }}
            onBlur={commitDraft}
            onKeyDown={handleKeyDown}
            className={cn(
              'flex h-10 w-full min-w-0 rounded-md border border-input bg-transparent py-1 pl-9 pr-3 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',
              'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
              'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40'
            )}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-44 p-1"
        // Keep typing in the field while the list is open
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if ((e.target as HTMLElement | null)?.id === id && !isNil(id)) {
            e.preventDefault()
          }
        }}
      >
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="max-h-60 overflow-y-auto overscroll-contain"
        >
          {options.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              No later times
            </p>
          )}
          {options.map((option) => {
            const duration =
              isNil(startTime) || startTime === ''
                ? null
                : formatDuration(startTime, option)
            const isSelected = option === value
            const isActive = option === (highlighted ?? null)
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-time={option}
                // Pick before the input's blur commits its draft
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  commit(option)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full cursor-pointer items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-accent text-accent-foreground',
                  isSelected && 'font-semibold'
                )}
              >
                <span>{formatTimeOfDay(option)}</span>
                {!isNil(duration) && (
                  <span className="text-xs text-muted-foreground">
                    {duration}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
