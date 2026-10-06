'use client'

import * as React from 'react'
import { isNil } from 'lodash'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { DateInput } from '@/components/ui/date-input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface DateFieldProps {
  date?: Date
  onDateChange: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** The month the calendar opens on when no date is set (e.g. the weekend's). */
  defaultMonth?: Date
  minDate?: Date
  maxDate?: Date
}

/**
 * A date you can type (MM/DD/YYYY) or pick from a calendar, which opens on the
 * chosen date's month — or `defaultMonth` when empty.
 */
export function DateField({
  date,
  onDateChange,
  placeholder = 'MM/DD/YYYY',
  disabled = false,
  className,
  defaultMonth,
  minDate,
  maxDate,
}: DateFieldProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className={cn('flex items-start gap-1.5', className)}>
      <div className="min-w-0 flex-1">
        <DateInput
          date={date}
          onDateChange={onDateChange}
          placeholder={placeholder}
          disabled={disabled}
          minDate={minDate}
          maxDate={maxDate}
        />
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0"
            disabled={disabled}
            aria-label="Choose a date from the calendar"
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date ?? defaultMonth}
            startMonth={minDate}
            endMonth={maxDate}
            disabled={[
              ...(isNil(minDate) ? [] : [{ before: minDate }]),
              ...(isNil(maxDate) ? [] : [{ after: maxDate }]),
            ]}
            onSelect={(next) => {
              onDateChange(next)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
