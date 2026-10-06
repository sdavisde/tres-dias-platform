import { z } from 'zod'
import {
  type EventTypeValue,
  SINGLETON_EVENT_TYPES,
} from '@/services/events/types'

export const CT_TIMEZONE = 'America/Chicago'

export const eventFormSchema = z
  .object({
    title: z.string().min(1, 'Event name is required'),
    date: z.date({ error: 'Date is required' }),
    time: z.string().min(1, 'Time is required'),
    location: z.string().min(1, 'Location is required'),
    type: z.string().nullable().optional(),
    hasEndDateTime: z.boolean(),
    endDate: z.date().nullable().optional(),
    endTime: z.string().nullable().optional(),
    weekendGroupId: z.string().nullable().optional(),
    weekendId: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const isSingleton =
      data.type != null &&
      SINGLETON_EVENT_TYPES.includes(data.type as EventTypeValue)
    if (isSingleton && (data.weekendId == null || data.weekendId === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select Men's or Women's weekend",
        path: ['weekendId'],
      })
    }
  })

export type EventFormData = z.infer<typeof eventFormSchema>

export interface WeekendOption {
  id: string
  label: string
}

export interface WeekendIndividualOption {
  id: string
  label: string
  type: 'MENS' | 'WOMENS'
  groupId: string
}

export interface EventFormPrefill {
  type?: EventTypeValue | null
  weekendGroupId?: string | null
  weekendId?: string | null
  title?: string | null
  /** Start time as "HH:mm"; defaults to the form's 09:00. */
  time?: string
  hideWeekendFields?: boolean
}

export const DEFAULT_FORM_VALUES: EventFormData = {
  title: '',
  date: new Date(),
  time: '09:00',
  location: '',
  type: null,
  hasEndDateTime: false,
  endDate: null,
  endTime: null,
  weekendGroupId: null,
  weekendId: null,
}
