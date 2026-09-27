'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { CampWaiverText } from '@/components/forms/camp-waiver-text'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { submitCandidateForms } from '@/actions/candidates'
import { isErr } from '@/lib/results'
import { formatDateNumeric } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { isDevMode } from '@/lib/dev-mode'
import { CANDIDATE_FORM_TEST_DATA } from './candidate-forms.helpers'
import {
  candidateFormsSchema,
  type CandidateFormsValues,
} from '@/lib/candidates/candidate-forms-schema'

const formSchema = candidateFormsSchema
type FormValues = CandidateFormsValues

type CandidateFormsProps = {
  candidateId: string
}

export function CandidateForms({ candidateId }: CandidateFormsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()
  const form = useForm<FormValues>({
    defaultValues: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      firstName: '',
      lastName: '',
      email: '',
      dateOfBirth: '',
      shirtSize: '',
      maritalStatus: undefined,
      hasSpouseAttendedWeekend: false,
      spouseWeekendLocation: '',
      spouseName: '',
      hasFriendsAttendingWeekend: false,
      isChristian: false,
      church: '',
      memberOfClergy: false,
      reasonForAttending: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      medicalConditions: '',
      medicalPermission: false,
      emergencyContactPermission: false,
      signature: '',
    },
    resolver: zodResolver(formSchema),
  })

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true)

    try {
      const result = await submitCandidateForms(candidateId, data)
      if (isErr(result)) {
        form.setError('root', { message: result.error })
        return
      }

      router.push(`/candidate/${candidateId}/forms/success`)
    } catch (error) {
      form.setError('root', {
        message: 'An error occurred while submitting the form',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const fillTestData = () => {
    form.reset(CANDIDATE_FORM_TEST_DATA)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {isDevMode() && (
          <Button type="button" variant="outline" onClick={fillTestData}>
            Fill with test data
          </Button>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="you@example.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={
                          field.value !== '' ? new Date(field.value) : undefined
                        }
                        onDateChange={(date) =>
                          field.onChange(date?.toISOString() ?? '')
                        }
                        className="w-full"
                        startMonth={new Date(new Date().getFullYear() - 100, 0)}
                        endMonth={new Date(new Date().getFullYear() - 18, 11)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shirtSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shirt Size</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select shirt size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="XS">XS</SelectItem>
                        <SelectItem value="S">S</SelectItem>
                        <SelectItem value="M">M</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="XL">XL</SelectItem>
                        <SelectItem value="XXL">XXL</SelectItem>
                        <SelectItem value="XXXL">XXXL</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maritalStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marital Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select marital status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="separated">Separated</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Conditional spouse fields */}
              {form.watch('maritalStatus') === 'married' && (
                <>
                  <FormField
                    control={form.control}
                    name="hasSpouseAttendedWeekend"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Has your spouse attended a Tres Dias weekend?
                        </FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="hasSpouseAttendedWeekend"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                            <Label htmlFor="hasSpouseAttendedWeekend">
                              Yes
                            </Label>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="spouseWeekendLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          If spouse has already attended a Tres Dias, please
                          state below which community/location they attended.
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="spouseName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          If spouse has submitted an application for next
                          weekend, please print their name below:
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="hasFriendsAttendingWeekend"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Do you have any friends or relatives that will also be
                      attending this weekend?
                    </FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hasFriendsAttendingWeekend"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor="hasFriendsAttendingWeekend">Yes</Label>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isChristian"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Are you a Christian?</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isChristian"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor="isChristian">Yes</Label>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="church"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Church Attending</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="memberOfClergy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Are you a member of the Clergy or Ordained?
                    </FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="memberOfClergy"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor="memberOfClergy">Yes</Label>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reasonForAttending"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      What is your heartfelt reasoning for wanting to attend
                      this Dusty Trails Tres Dias weekend?
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Address Section */}
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2 (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <PhoneInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact & Health Section */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact & Health Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
              <FormField
                control={form.control}
                name="emergencyContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emergencyContactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact Phone</FormLabel>
                    <FormControl>
                      <PhoneInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="medicalConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Any medical conditions that you would like us to be aware
                      of, please let us know
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormDescription>
                      Example: food allergies, medications at certain times
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Camp Waiver Section */}
        <Card>
          <CardHeader>
            <CardTitle>Camp Waiver</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Waiver of Claim — Tanglewood Christian Camp. Please read carefully
              and sign below.
            </p>
            <CampWaiverText />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-secondary/10 rounded-md items-end">
              <div className="space-y-1">
                <Label className="text-muted-foreground">
                  Name of Attendee
                </Label>
                <p className="font-medium text-lg">
                  {(() => {
                    const name = [
                      form.watch('firstName'),
                      form.watch('lastName'),
                    ]
                      .filter(Boolean)
                      .join(' ')
                    return name === '' ? '—' : name
                  })()}
                </p>
              </div>

              <FormField
                control={form.control}
                name="signature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signature of Attendee</FormLabel>
                    <FormControl>
                      <Input placeholder="Sign with full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-1">
                <Label className="text-muted-foreground">Date</Label>
                <div className="h-10 flex items-center px-3 border rounded-md bg-muted text-muted-foreground">
                  {formatDateNumeric(new Date())}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {successMessage !== '' && (
          <Alert variant="success">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {Object.values(form.formState.errors).length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {Object.values(form.formState.errors)
                .map((error) => error.message)
                .join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="min-w-[200px]"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
