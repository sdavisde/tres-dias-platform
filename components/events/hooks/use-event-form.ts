'use client'

import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { toastError } from '@/lib/toast-error'

import { type Event } from '@/services/events'
import { createEvent, updateEvent, deleteEvent } from '@/services/events'
import {
  type EventTypeValue,
  SINGLETON_EVENT_TYPES,
} from '@/services/events/types'
import { isErr } from '@/lib/results'
import { isNil } from 'lodash'
import { useAutoSave } from '@/hooks/use-auto-save'
import type {
  EventFormData,
  EventFormPrefill,
  WeekendIndividualOption,
} from '../event-form-schema'
import {
  eventFormSchema,
  DEFAULT_FORM_VALUES,
  CT_TIMEZONE,
} from '../event-form-schema'

interface UseEventFormProps {
  event?: Event | null
  onClose: () => void
  prefill?: EventFormPrefill
  weekendIndividualOptions?: WeekendIndividualOption[]
}

/** Fields you type into wait for the debounce; everything else saves at once. */
const TYPED_FIELDS = new Set<string>(['title', 'location', 'time', 'endTime'])

function initialValues(
  event: Event | null | undefined,
  prefill: EventFormPrefill | undefined
): EventFormData {
  if (!isNil(event)) {
    const resetData: Partial<EventFormData> = {
      title: event.title ?? '',
      time: '09:00',
      location: event.location ?? '',
      type: event.type ?? null,
      hasEndDateTime: !isNil(event.endDatetime),
      endDate: null,
      endTime: null,
      weekendGroupId: event.weekendGroupId ?? null,
      weekendId: event.weekendId ?? null,
    }

    if (!isNil(event.datetime)) {
      const utcDate = new Date(event.datetime)
      const ctDate = toZonedTime(utcDate, CT_TIMEZONE)
      resetData.date = ctDate
      resetData.time = format(ctDate, 'HH:mm')
    }

    if (!isNil(event.endDatetime)) {
      const utcEndDate = new Date(event.endDatetime)
      const ctEndDate = toZonedTime(utcEndDate, CT_TIMEZONE)
      resetData.endDate = ctEndDate
      resetData.endTime = format(ctEndDate, 'HH:mm')
    }

    return resetData as EventFormData
  }
  if (isNil(prefill)) return DEFAULT_FORM_VALUES
  return {
    ...DEFAULT_FORM_VALUES,
    title: prefill.title ?? '',
    time: prefill.time ?? DEFAULT_FORM_VALUES.time,
    type: prefill.type ?? null,
    weekendGroupId: prefill.weekendGroupId ?? null,
    weekendId: prefill.weekendId ?? null,
  }
}

/**
 * Form state for one event. Mount it once per event (the sidebar keys its body
 * by event id): an existing event auto-saves once valid, a new one waits for
 * "Create event".
 */
export function useEventForm({
  event,
  onClose,
  prefill,
  weekendIndividualOptions = [],
}: UseEventFormProps) {
  const isEditing = !isNil(event)
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: initialValues(event, prefill),
    mode: 'onTouched',
  })

  const hasEndDateTime = form.watch('hasEndDateTime')

  // When type changes to a group type, clear weekendId since it's not applicable
  const watchedType = form.watch('type') as EventTypeValue | null | undefined
  const isSingletonType =
    watchedType != null && SINGLETON_EVENT_TYPES.includes(watchedType)
  useEffect(() => {
    if (!isSingletonType) {
      form.setValue('weekendId', null)
    }
  }, [isSingletonType, form])

  // When weekendId is selected, auto-set weekendGroupId from the individual weekend's group
  const watchedWeekendId = form.watch('weekendId')
  useEffect(() => {
    if (!isNil(watchedWeekendId)) {
      const match = weekendIndividualOptions.find(
        (w) => w.id === watchedWeekendId
      )
      if (!isNil(match) && form.getValues('weekendGroupId') !== match.groupId) {
        form.setValue('weekendGroupId', match.groupId)
      }
    }
  }, [watchedWeekendId, weekendIndividualOptions, form])

  // When weekendGroupId changes, clear weekendId if it no longer belongs to the selected group
  const watchedGroupId = form.watch('weekendGroupId')
  useEffect(() => {
    if (!isNil(watchedWeekendId) && !isNil(watchedGroupId)) {
      const match = weekendIndividualOptions.find(
        (w) => w.id === watchedWeekendId
      )
      if (!isNil(match) && match.groupId !== watchedGroupId) {
        form.setValue('weekendId', null)
      }
    }
  }, [watchedGroupId, watchedWeekendId, weekendIndividualOptions, form])

  const toEventData = (data: EventFormData) => {
    const [hours, minutes] = data.time.split(':').map(Number)
    const ctDateTime = new Date(data.date)
    ctDateTime.setHours(hours, minutes, 0, 0)
    const utcDateTime = fromZonedTime(ctDateTime, CT_TIMEZONE)

    let endDatetimeUtc: string | null = null
    if (data.hasEndDateTime && !isNil(data.endDate) && !isNil(data.endTime)) {
      const [endHours, endMinutes] = data.endTime.split(':').map(Number)
      const ctEndDateTime = new Date(data.endDate)
      ctEndDateTime.setHours(endHours, endMinutes, 0, 0)
      endDatetimeUtc = fromZonedTime(ctEndDateTime, CT_TIMEZONE).toISOString()
    }

    const dataType = (data.type as EventTypeValue) ?? null
    const isSubmittingSingleton =
      dataType != null && SINGLETON_EVENT_TYPES.includes(dataType)

    // For singleton types, derive weekendGroupId from the selected individual weekend
    // For group types, clear weekendId since it doesn't apply
    let weekendGroupId = data.weekendGroupId ?? null
    let weekendId = data.weekendId ?? null
    if (isSubmittingSingleton && !isNil(weekendId)) {
      const match = weekendIndividualOptions.find((w) => w.id === weekendId)
      if (!isNil(match)) weekendGroupId = match.groupId
    } else if (!isSubmittingSingleton) {
      weekendId = null
    }

    return {
      title: data.title,
      datetime: utcDateTime.toISOString(),
      location: data.location ?? null,
      type: dataType,
      end_datetime: endDatetimeUtc,
      weekend_group_id: weekendGroupId,
      weekend_id: weekendId,
    }
  }

  const values = useWatch({ control: form.control }) as EventFormData
  const parsed = eventFormSchema.safeParse(values)
  const autoSave = useAutoSave({
    value: values,
    isValid: parsed.success,
    enabled: isEditing,
    errorMessage: 'Unable to save event. Please try again.',
    onSaved: () => router.refresh(),
    save: async (next) => {
      if (isNil(event)) return { error: 'No event to update' }
      return updateEvent(event.id, toEventData(eventFormSchema.parse(next)))
    },
  })

  // Selects, pickers and the checkbox skip the debounce.
  const { saveImmediately } = autoSave
  useEffect(() => {
    const subscription = form.watch((_, { name }) => {
      if (!isNil(name) && !TYPED_FIELDS.has(name)) saveImmediately()
    })
    return () => subscription.unsubscribe()
  }, [form, saveImmediately])

  // Only a new event submits; an existing one auto-saves above.
  const handleSubmit = async (data: EventFormData) => {
    if (isEditing) return
    setIsSubmitting(true)
    try {
      const result = await createEvent(toEventData(data))
      if (isErr(result)) {
        throw new Error(result.error)
      }
      toast.success('Event created successfully')
      router.refresh()
      handleClose()
    } catch (error) {
      toastError('Unable to create event. Please try again.', { error })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (isNil(event) || !isEditing) return

    setIsDeleting(true)
    try {
      const result = await deleteEvent(event.id)
      if (isErr(result)) {
        throw new Error(result.error)
      }
      toast.success('Event deleted successfully')
      setShowDeleteDialog(false)
      router.refresh()
      handleClose()
    } catch (error) {
      toastError('Unable to delete event. Please try again.', { error })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    setShowDeleteDialog(false)
    onClose()
  }

  const isSaveDisabled = !form.formState.isValid || isSubmitting

  return {
    form,
    isEditing,
    isSubmitting,
    isDeleting,
    showDeleteDialog,
    setShowDeleteDialog,
    hasEndDateTime,
    isSaveDisabled,
    handleSubmit,
    handleDelete,
    handleClose,
    saveStatus: autoSave.status,
    retrySave: autoSave.flush,
  }
}
