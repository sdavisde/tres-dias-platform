import { z } from 'zod'

/**
 * Shared by the sponsor form (client validation) and the server action, which
 * re-parses the payload so only these columns ever reach
 * `candidate_sponsorship_info` (the keys match the table 1:1).
 */
export const sponsorFormSchema = z.object({
  candidate_name: z.string().min(1, 'Enter their name'),
  candidate_email: z.string().email({ message: 'Enter a valid email address' }),
  weekend_id: z.string().min(1, 'Choose a weekend'),
  sponsor_name: z.string().min(1, 'Enter your name'),
  sponsor_address: z.string().min(1, 'Enter your address'),
  sponsor_email: z.string().optional(),
  sponsor_phone: z
    .string()
    .min(1, 'Enter your phone number')
    .refine(
      (v) => v.replace(/\D/g, '').length === 10,
      'Enter a 10-digit phone number'
    ),
  sponsor_church: z.string().min(1, 'Enter your church'),
  sponsor_weekend: z.string().min(1, 'Enter the weekend you attended'),
  reunion_group: z.string().min(1, 'Enter your reunion group'),
  attends_secuela: z.string().min(1, 'Choose yes or no'),
  contact_frequency: z.string().min(1, 'Tell us how often you’re in touch'),
  church_environment: z.string().min(1, 'Tell us about their church life'),
  home_environment: z.string().min(1, 'Tell us about their home life'),
  social_environment: z.string().min(1, 'Tell us about their social life'),
  work_environment: z.string().min(1, 'Tell us about their work life'),
  god_evidence: z.string().min(1, 'Share what you’ve seen'),
  support_plan: z.string().min(1, 'Tell us how you’ll support them'),
  prayer_request: z.string(),
  payment_owner: z.string().min(1, 'Choose who is paying'),
})

export type SponsorFormSchema = z.infer<typeof sponsorFormSchema>
