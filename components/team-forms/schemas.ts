import { z } from 'zod'
import { addressSchema } from '@/lib/users/validation'
import { UserExperienceSchema } from '@/lib/users/experience'

export const BasicInfoSchema = z.object({
  church_affiliation: z.string().min(1, 'Church affiliation is required'),
  weekend_attended: z.object({
    community: z.string().min(1, 'Community is required'),
    weekend_number: z.string().min(1, 'Weekend number is required'),
  }),
  essentials_training_date: z.date().optional(),
  special_gifts_and_skills: z.array(z.string()).optional(),
  is_clergy: z.boolean(),
})

export type BasicInfo = z.infer<typeof BasicInfoSchema>

const ExperienceEntrySchema = UserExperienceSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
  weekend_id: true,
  weekend_reference: true,
}).extend({
  id: z.uuid().optional(),
  community: z.string(),
  weekend_number: z.string(),
})

/**
 * A thinner version of UserExperience, to be used when rendering
 * experience in a form.
 */
export type UserExperienceFormValue = z.infer<typeof ExperienceEntrySchema>

export const MedicalInfoSchema = z.object({
  emergency_contact_name: z
    .string()
    .min(1, 'Emergency contact name is required'),
  emergency_contact_phone: z
    .string()
    .min(1, 'Emergency contact phone is required')
    .refine(
      (v) => v.replace(/\D/g, '').length === 10,
      'Please enter a valid 10-digit phone number'
    ),
  medical_conditions: z.string().optional(),
})

export type MedicalInfo = z.infer<typeof MedicalInfoSchema>

export const TeamInfoSchema = z.object({
  address: addressSchema,
  basicInfo: BasicInfoSchema,
  experience: z.array(ExperienceEntrySchema).optional(),
  medicalInfo: MedicalInfoSchema,
})

export type TeamInfoFormValues = z.infer<typeof TeamInfoSchema>
