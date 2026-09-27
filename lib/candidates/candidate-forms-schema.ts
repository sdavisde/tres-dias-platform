import { z } from 'zod'

/**
 * The candidate registration form, as the candidate fills it in. Shared by the
 * public form component (client validation) and `submitCandidateForms` (the
 * server re-parses every submission before it touches the database).
 */
export const candidateFormsSchema = z.object({
  /** Personal Info */
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.email('Invalid email address'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  shirtSize: z.string().min(1, 'Shirt size is required'),
  maritalStatus: z
    .enum(['single', 'married', 'widowed', 'divorced', 'separated'])
    .optional(),
  /** Make these fields conditionally render only if maritalStatus is married */
  hasSpouseAttendedWeekend: z.boolean().optional(),
  spouseWeekendLocation: z.string().optional(),
  spouseName: z.string().optional(),
  hasFriendsAttendingWeekend: z.boolean().optional(),
  isChristian: z.boolean().optional(),
  church: z.string().optional(),
  memberOfClergy: z.boolean().optional(),
  reasonForAttending: z.string().optional(),
  /** Address*/
  addressLine1: z.string().min(1, 'Address Line 1 is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zip: z.string().min(1, 'ZIP code is required'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .refine(
      (v) => v.replace(/\D/g, '').length === 10,
      'Please enter a valid 10-digit phone number'
    ),
  /** Health section */
  emergencyContactName: z.string().min(1, 'Emergency contact name is required'),
  emergencyContactPhone: z
    .string()
    .min(1, 'Emergency contact phone is required')
    .refine(
      (v) => v.replace(/\D/g, '').length === 10,
      'Please enter a valid 10-digit phone number'
    ),
  medicalConditions: z.string().optional(),
  medicalPermission: z.boolean(),
  emergencyContactPermission: z.boolean(),
  /** Camp Waiver — typed signature acknowledging the Tanglewood waiver */
  signature: z.string().min(2, 'Signature is required'),
})

export type CandidateFormsValues = z.infer<typeof candidateFormsSchema>

/** Candidate statuses in which the registration form can still be filled in. */
export const CANDIDATE_FORMS_OPEN_STATUSES = [
  'sponsored',
  'awaiting_forms',
] as const
