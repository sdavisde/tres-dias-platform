'use client'

import { useForm, type Control, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  sponsorFormSchema,
  type SponsorFormSchema,
} from '@/lib/candidates/sponsor-form-schema'
import { useRouter } from 'next/navigation'
import { isNil } from 'lodash'
import { logger } from '@/lib/logger'
import { sendSponsorshipNotificationEmail } from '@/services/notifications'
import * as Results from '@/lib/results'
import { toastError } from '@/lib/toast-error'
import { cn } from '@/lib/utils'
import { isDevMode } from '@/lib/dev-mode'
import { useSession } from '@/components/auth/session-provider'
import { createCandidateWithSponsorshipInfo } from '@/actions/candidates'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { PhoneInput } from '@/components/ui/phone-input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  SPONSOR_FORM_TEST_DATA,
  type WeekendOption,
} from './sponsor-form.helpers'

/** What the page fills in: the chosen weekend and the sponsor's profile. */
export type { SponsorFormSchema } from '@/lib/candidates/sponsor-form-schema'
export type SponsorFormDefaults = Partial<SponsorFormSchema>

const EMPTY_FORM: SponsorFormSchema = {
  candidate_name: '',
  candidate_email: '',
  weekend_id: '',
  sponsor_name: '',
  sponsor_address: '',
  sponsor_email: '',
  sponsor_phone: '',
  sponsor_church: '',
  sponsor_weekend: '',
  reunion_group: '',
  attends_secuela: '',
  contact_frequency: '',
  church_environment: '',
  home_environment: '',
  social_environment: '',
  work_environment: '',
  god_evidence: '',
  support_plan: '',
  prayer_request: '',
  payment_owner: '',
}

// Form-first page: controls step up to the design system's phone sizes and
// settle back to the desktop height at md+.
const INPUT = 'h-12 md:h-10'
const TEXTAREA = 'min-h-28'

type SponsorFormProps = {
  weekends: WeekendOption[]
  defaults: SponsorFormDefaults
}

export function SponsorForm({ weekends, defaults }: SponsorFormProps) {
  const router = useRouter()
  const { user } = useSession()

  const form = useForm<SponsorFormSchema>({
    resolver: zodResolver(sponsorFormSchema),
    defaultValues: { ...EMPTY_FORM, ...defaults },
  })

  const onSubmit = async (data: SponsorFormSchema) => {
    const sponsorEmail = user?.email
    if (isNil(sponsorEmail) || sponsorEmail === '') {
      form.setError('root', {
        message: 'We couldn’t confirm who you are. Please sign in again.',
      })
      logger.error('Sponsor form submitted without a session email')
      return
    }

    const candidateResult = await createCandidateWithSponsorshipInfo({
      ...data,
      sponsor_email: sponsorEmail,
    })
    if (Results.isErr(candidateResult)) {
      form.setError('root', {
        message: 'Your sponsorship wasn’t sent. Please try again.',
      })
      toastError('Your sponsorship wasn’t sent. Please try again.', {
        error: candidateResult.error,
      })
      return
    }

    const candidateId = candidateResult.data.id
    // The candidate exists either way; a failed notice only delays the
    // pre-weekend couple hearing about it, so it doesn't block the thank-you.
    await sendSponsorshipNotificationEmail(candidateId)
    logger.info({ candidateId }, 'Sponsorship submitted')
    router.push(`/sponsor/submitted?id=${candidateId}`)
  }

  const { control } = form
  const rootError = form.formState.errors.root?.message

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
        noValidate
      >
        {isDevMode() && (
          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={() =>
              form.reset({
                ...SPONSOR_FORM_TEST_DATA,
                weekend_id:
                  form.getValues('weekend_id') === ''
                    ? weekends[0].id
                    : form.getValues('weekend_id'),
              })
            }
          >
            Fill with test data
          </Button>
        )}

        <FormSection
          title="About your candidate"
          description="Who you'd like to sponsor, and for which weekend."
        >
          <TextField
            control={control}
            name="candidate_name"
            label="Their full name"
            autoComplete="off"
          />
          <TextField
            control={control}
            name="candidate_email"
            label="Their email"
            type="email"
            autoComplete="off"
            description="Once they're approved, we'll email their forms here."
          />
          <FormField
            control={control}
            name="weekend_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Which weekend?</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                  >
                    {weekends.map((weekend) => (
                      <ChoiceCard
                        key={weekend.id}
                        value={weekend.id}
                        label={weekend.label}
                        detail={weekend.dates}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <FormSection
          title="About you"
          description="Filled in from your profile. Change anything that's out of date."
        >
          <TextField
            control={control}
            name="sponsor_name"
            label="Your name"
            autoComplete="name"
          />
          <FormField
            control={control}
            name="sponsor_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your phone</FormLabel>
                <FormControl>
                  <PhoneInput {...field} autoComplete="tel" className={INPUT} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <TextField
            control={control}
            name="sponsor_address"
            label="Your address"
            autoComplete="street-address"
          />
          <TextField
            control={control}
            name="sponsor_church"
            label="Your church"
          />
          <TextField
            control={control}
            name="sponsor_weekend"
            label="The weekend you attended"
            description="Which Tres Dias weekend, and where — for example, DTTD #40, Dusty Trails."
          />
          <TextField
            control={control}
            name="reunion_group"
            label="Your reunion group"
            description="Its name and where it meets."
          />
          <FormField
            control={control}
            name="attends_secuela"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Do you attend Secuela regularly?</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="grid grid-cols-2 gap-2 sm:max-w-sm"
                  >
                    <ChoiceCard value="yes" label="Yes" />
                    <ChoiceCard value="no" label="No" />
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <TextField
            control={control}
            name="contact_frequency"
            label="How often are you in touch with them?"
          />
        </FormSection>

        <FormSection
          title="Their life today"
          description="A few sentences on what each part of their life looks like right now."
        >
          <TextAreaField
            control={control}
            name="church_environment"
            label="Church"
          />
          <TextAreaField
            control={control}
            name="home_environment"
            label="Home"
          />
          <TextAreaField
            control={control}
            name="social_environment"
            label="Social life"
          />
          <TextAreaField
            control={control}
            name="work_environment"
            label="Work"
          />
        </FormSection>

        <FormSection title="Your commitment">
          <TextAreaField
            control={control}
            name="god_evidence"
            label="What have you seen that tells you God is leading them to this weekend?"
          />
          <TextAreaField
            control={control}
            name="support_plan"
            label="How will you support them before, during and after the weekend (their Fourth Day)?"
          />
          <TextField
            control={control}
            name="prayer_request"
            label="Have they asked you to share a prayer request for them?"
            description="Optional."
          />
          <FormField
            control={control}
            name="payment_owner"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Who is paying the candidate fee?</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                  >
                    <ChoiceCard
                      value="sponsor"
                      label="I am"
                      detail="We'll email you the fee request once they're approved."
                    />
                    <ChoiceCard
                      value="candidate"
                      label="The candidate"
                      detail="We'll email them the fee request once they're approved."
                    />
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          {!isNil(rootError) && (
            <p role="alert" className="text-sm text-destructive sm:mr-auto">
              {rootError}
            </p>
          )}
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="h-12 w-full sm:w-auto md:h-10"
          >
            {form.formState.isSubmitting ? 'Sending…' : 'Send sponsorship'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-5 rounded-lg border bg-card px-5 py-5 md:px-6">
      <div className="space-y-1">
        <h2 className="font-serif text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {!isNil(description) && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

type FieldProps = {
  control: Control<SponsorFormSchema>
  name: FieldPath<SponsorFormSchema>
  label: string
  description?: string
}

function TextField({
  control,
  name,
  label,
  description,
  type,
  autoComplete,
}: FieldProps & { type?: string; autoComplete?: string }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              type={type}
              autoComplete={autoComplete}
              className={INPUT}
            />
          </FormControl>
          {!isNil(description) && (
            <FormDescription>{description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function TextAreaField({ control, name, label, description }: FieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="leading-snug">{label}</FormLabel>
          <FormControl>
            <Textarea {...field} className={TEXTAREA} />
          </FormControl>
          {!isNil(description) && (
            <FormDescription>{description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/** A radio option drawn as a bordered, full-width touch target. */
function ChoiceCard({
  value,
  label,
  detail,
}: {
  value: string
  label: string
  detail?: string | null
}) {
  return (
    <FormItem>
      <FormLabel
        className={cn(
          'flex min-h-12 cursor-pointer items-center gap-3 rounded-md border bg-background px-3.5 py-3 font-normal transition-colors hover:bg-muted',
          'has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-secondary'
        )}
      >
        <FormControl>
          <RadioGroupItem value={value} />
        </FormControl>
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">{label}</span>
          {!isNil(detail) && (
            <span className="text-[13px] text-muted-foreground">{detail}</span>
          )}
        </span>
      </FormLabel>
    </FormItem>
  )
}
