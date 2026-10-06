'use client'

import type { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DateField } from '@/components/ui/date-field'
import { TimeField } from '@/components/ui/time-field'
import { Checkbox } from '@/components/ui/checkbox'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  EVENT_TYPE_VALUES,
  EVENT_TYPE_LABELS,
  SINGLETON_EVENT_TYPES,
} from '@/services/events/types'
import type { EventTypeValue } from '@/services/events/types'
import type {
  EventFormData,
  EventFormPrefill,
  WeekendOption,
  WeekendIndividualOption,
} from './event-form-schema'

interface EventFormFieldsProps {
  form: UseFormReturn<EventFormData>
  hasEndDateTime: boolean
  weekendOptions: WeekendOption[]
  weekendIndividualOptions?: WeekendIndividualOption[]
  prefill?: EventFormPrefill
}

export function EventFormFields({
  form,
  hasEndDateTime,
  weekendOptions,
  weekendIndividualOptions = [],
  prefill,
}: EventFormFieldsProps) {
  const selectedType = form.watch('type') as EventTypeValue | null | undefined
  const selectedGroupId = form.watch('weekendGroupId')
  const isSingletonType =
    selectedType != null &&
    SINGLETON_EVENT_TYPES.includes(selectedType as EventTypeValue)

  // Filter individual weekend options to the selected group
  const filteredIndividualOptions = weekendIndividualOptions.filter(
    (w) => w.groupId === selectedGroupId
  )

  // When prefill provides type or weekendId, hide those fields
  const hideTypeField = prefill?.type != null
  const hideWeekendField =
    prefill?.hideWeekendFields === true ||
    prefill?.weekendId != null ||
    prefill?.weekendGroupId != null

  return (
    <div className="space-y-4 px-4 pb-4">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Event name</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Team Meeting 1" {...field} required />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Date</FormLabel>
            <FormControl>
              <DateField date={field.value} onDateChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="time"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Time (CT)</FormLabel>
            <FormControl>
              <TimeField
                id={field.name}
                value={field.value}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Location</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Where is it? e.g. First Baptist, Fellowship Hall"
                className="min-h-20"
                required
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {!hideTypeField && (
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event type</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an event type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EVENT_TYPE_VALUES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {EVENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {!hideWeekendField && weekendOptions.length > 0 && (
        <FormField
          control={form.control}
          name="weekendGroupId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Weekend</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a weekend (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {weekendOptions.map((weekend) => (
                    <SelectItem key={weekend.id} value={weekend.id}>
                      {weekend.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {!hideWeekendField &&
        isSingletonType &&
        filteredIndividualOptions.length > 0 && (
          <FormField
            control={form.control}
            name="weekendId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Men&apos;s or Women&apos;s</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose Men's or Women's" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredIndividualOptions.map((weekend) => (
                      <SelectItem key={weekend.id} value={weekend.id}>
                        {weekend.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

      <FormField
        control={form.control}
        name="hasEndDateTime"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Add an end date and time</FormLabel>
            </div>
          </FormItem>
        )}
      />

      {hasEndDateTime && (
        <>
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End date</FormLabel>
                <FormControl>
                  <DateField
                    date={field.value ?? undefined}
                    onDateChange={field.onChange}
                    defaultMonth={form.getValues('date')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End time (CT)</FormLabel>
                <FormControl>
                  <TimeField
                    id={field.name}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="Add end time"
                    defaultScrollTime={form.getValues('time')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </div>
  )
}
