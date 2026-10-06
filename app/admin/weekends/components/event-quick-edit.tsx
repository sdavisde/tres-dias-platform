'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { isNil } from 'lodash'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DateField } from '@/components/ui/date-field'
import { Input } from '@/components/ui/input'
import { TimeField } from '@/components/ui/time-field'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { AutoSaveStatusIndicator } from '@/components/auto-save/auto-save-status'
import { useAutoSave } from '@/hooks/use-auto-save'
import { isErr } from '@/lib/results'
import { toastError } from '@/lib/toast-error'
import { fromCommunityParts, toCommunityParts } from '@/lib/weekend/event-times'
import { createEvent, updateEvent, type Event } from '@/services/events'
import {
  EVENT_TYPE_LABELS,
  EventType,
  type EventTypeValue,
} from '@/services/events/types'

/** A new event's fixed details plus whatever times we can suggest. */
export type EventDraft = {
  title: string
  type: EventTypeValue
  weekendGroupId: string
  /** Set for per-weekend events (sendoff, serenade…); null for group events. */
  weekendId: string | null
  datetime: string | null
  endDatetime: string | null
  /** Start time ("10:00") to fill in when there's no suggested datetime. */
  defaultTime?: string
}

export type QuickEditTarget =
  { mode: 'edit'; event: Event } | { mode: 'create'; draft: EventDraft }

/** "2026-12-03" ↔ a local Date at midnight, for the date field. */
const toDate = (value: string): Date | undefined =>
  value === '' ? undefined : parseISO(value)
const fromDate = (date: Date | undefined): string =>
  isNil(date) ? '' : format(date, 'yyyy-MM-dd')

type FormValues = {
  title: string
  date: string
  time: string
  endDate: string
  endTime: string
  location: string
}

function initialValues(target: QuickEditTarget): FormValues {
  const source =
    target.mode === 'edit'
      ? {
          title: target.event.title ?? '',
          datetime: target.event.datetime,
          endDatetime: target.event.endDatetime,
          location: target.event.location ?? '',
        }
      : { ...target.draft, location: '' }
  const defaultTime = target.mode === 'create' ? target.draft.defaultTime : ''
  const start = isNil(source.datetime)
    ? { date: '', time: defaultTime ?? '' }
    : toCommunityParts(source.datetime)
  const end = isNil(source.endDatetime)
    ? { date: '', time: '' }
    : toCommunityParts(source.endDatetime)
  return {
    title: source.title,
    date: start.date,
    time: start.time,
    endDate: end.date,
    endTime: end.time,
    location: source.location,
  }
}

function typeOf(target: QuickEditTarget): EventTypeValue | null {
  return target.mode === 'edit' ? target.event.type : target.draft.type
}

/**
 * Turns the form into event fields, or null while it can't be saved. An end
 * time without an end date ends on the start day.
 */
function toEventFields(values: FormValues) {
  if (values.title.trim() === '' || values.date === '' || values.time === '') {
    return null
  }
  const datetime = fromCommunityParts(values.date, values.time)
  const endDatetime =
    values.endTime === ''
      ? null
      : fromCommunityParts(
          values.endDate === '' ? values.date : values.endDate,
          values.endTime
        )
  if (!isNil(endDatetime) && endDatetime < datetime) return null
  return {
    title: values.title.trim(),
    datetime,
    end_datetime: endDatetime,
    location: values.location.trim() === '' ? null : values.location.trim(),
  }
}

interface EventQuickEditPopoverProps {
  target: QuickEditTarget
  /** The row or button that opens the editor. */
  children: ReactNode
}

/**
 * A small editor for one event, opened from the Weekends page. Existing
 * events auto-save; a new one waits for "Create". Anything beyond times and
 * place (type, weekend, deleting) lives on the Events page.
 */
export function EventQuickEditPopover({
  target,
  children,
}: EventQuickEditPopoverProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))]">
        {/* Mounted only while open, so each opening starts from saved values
            and closing flushes any pending save. */}
        {open && (
          <QuickEditForm target={target} onDone={() => setOpen(false)} />
        )}
      </PopoverContent>
    </Popover>
  )
}

function QuickEditForm({
  target,
  onDone,
}: {
  target: QuickEditTarget
  onDone: () => void
}) {
  const router = useRouter()
  const [values, setValues] = useState(() => initialValues(target))
  const [isCreating, setIsCreating] = useState(false)
  const fields = toEventFields(values)
  const type = typeOf(target)
  // Multi-day events (the weekend itself) need an end date, not just a time
  const showEndDate =
    type === EventType.WEEKEND ||
    (values.endDate !== '' && values.endDate !== values.date)
  const endsSameDay = values.endDate === '' || values.endDate === values.date
  // An empty date opens the calendar on the suggested or current month
  const defaultMonth =
    target.mode === 'create' && !isNil(target.draft.datetime)
      ? toDate(toCommunityParts(target.draft.datetime).date)
      : undefined

  const autoSave = useAutoSave({
    value: values,
    isValid: !isNil(fields),
    enabled: target.mode === 'edit',
    errorMessage: 'Unable to save event. Please try again.',
    onSaved: () => router.refresh(),
    save: async () => {
      if (target.mode !== 'edit' || isNil(fields)) {
        return { error: 'Nothing to save' }
      }
      return updateEvent(target.event.id, fields)
    },
  })

  const set = (key: keyof FormValues) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }))

  // Date and time pickers commit a finished value, so skip the debounce
  const setPicked = (key: keyof FormValues) => (value: string) => {
    autoSave.saveImmediately()
    set(key)(value)
  }

  const handleCreate = async () => {
    if (target.mode !== 'create' || isNil(fields)) return
    setIsCreating(true)
    try {
      const result = await createEvent({
        ...fields,
        type: target.draft.type,
        weekend_group_id: target.draft.weekendGroupId,
        weekend_id: target.draft.weekendId,
      })
      if (isErr(result)) throw new Error(result.error)
      toast.success(`${EVENT_TYPE_LABELS[target.draft.type]} added`)
      router.refresh()
      onDone()
    } catch (error) {
      toastError('Unable to create event. Please try again.', { error })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          {target.mode === 'edit' ? 'Edit' : 'Add'}{' '}
          {isNil(type) ? 'event' : EVENT_TYPE_LABELS[type].toLowerCase()}
        </p>
        {target.mode === 'edit' && (
          <AutoSaveStatusIndicator
            status={autoSave.status}
            onRetry={autoSave.flush}
          />
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="quick-title">Title</Label>
        <Input
          id="quick-title"
          value={values.title}
          onChange={(e) => set('title')(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Date</Label>
        <DateField
          date={toDate(values.date)}
          onDateChange={(date) => setPicked('date')(fromDate(date))}
          defaultMonth={defaultMonth}
        />
      </div>

      {showEndDate && (
        <div className="space-y-1.5">
          <Label>End date</Label>
          <DateField
            date={toDate(values.endDate)}
            onDateChange={(date) => setPicked('endDate')(fromDate(date))}
            defaultMonth={toDate(values.date) ?? defaultMonth}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="quick-time">Starts</Label>
          <TimeField
            id="quick-time"
            value={values.time}
            onChange={setPicked('time')}
            defaultScrollTime="10:00"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="quick-end-time">
            Ends <span className="text-muted-foreground">(optional)</span>
          </Label>
          <TimeField
            id="quick-end-time"
            value={values.endTime}
            onChange={setPicked('endTime')}
            placeholder="No end"
            // Same-day events list end times after the start, with durations
            startTime={endsSameDay ? values.time : undefined}
            defaultScrollTime={values.time === '' ? '10:00' : values.time}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="quick-location">
          Location <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="quick-location"
          value={values.location}
          onChange={(e) => set('location')(e.target.value)}
        />
      </div>

      {values.date !== '' && values.time !== '' && isNil(fields) && (
        <p className="text-xs text-destructive">
          The end has to be after the start.
        </p>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <Link
          href="/admin/events"
          className="text-xs text-muted-foreground underline underline-offset-4"
        >
          More options on Events
        </Link>
        {target.mode === 'create' ? (
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={isNil(fields) || isCreating}
          >
            {isCreating ? 'Adding…' : 'Create'}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={onDone}>
            Done
          </Button>
        )}
      </div>
    </div>
  )
}
