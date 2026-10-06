'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/components/auth/session-provider'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, MailQuestion } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { PhoneInput } from '@/components/ui/phone-input'
import { PageHeader } from '@/components/ui/page-header'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isNil } from 'lodash'
import { Button } from '@/components/ui/button'
import { UserAvatar, avatarUserFromDto } from '@/components/user-avatar'
import { AvatarCropperDialog } from '@/components/avatar/avatar-cropper-dialog'
import { uploadAvatar, deleteAvatar } from '@/lib/avatar/upload-client'
import {
  updateUserProfilePhoto,
  removeUserProfilePhoto,
} from '@/services/identity/user'
import { sendCustomPasswordResetEmail } from '@/actions/password-reset'
import { isErr } from '@/lib/results'
import { toastError } from '@/lib/toast-error'
import { toast } from 'sonner'
import { ChangeEmailDialog } from './change-email-dialog'
import { PageContent } from '@/components/member/page-content'
import { MemberBreadcrumbs } from '@/components/member/breadcrumbs'

const profileFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .refine(
      (v) => v.replace(/\D/g, '').length === 10,
      'Please enter a valid 10-digit phone number'
    ),
  isClergy: z.boolean(),
})
type ProfileFormValues = z.infer<typeof profileFormSchema>

function ProfilePageSkeleton() {
  return (
    <PageContent size="narrow">
      <div className="mb-4 flex h-7 items-center gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="mb-8 space-y-2 border-b border-border pb-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <div className="space-y-8">
        <div className="space-y-6 rounded-xl border bg-card p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="size-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-52" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-6 rounded-xl border bg-card p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </PageContent>
  )
}

export default function ProfilePage() {
  const {
    user,
    isAuthenticated,
    loading: sessionLoading,
    refreshSession,
  } = useSession()
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [pendingNewEmail, setPendingNewEmail] = useState<string | null>(null)
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phoneNumber: user?.phoneNumber ?? '',
      isClergy: user?.communityInformation.isClergy ?? false,
    },
  })

  // A staged email change keeps auth.users.new_email set until both
  // confirmation links are clicked — surface it as a pending banner.
  const refreshPendingEmail = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    setPendingNewEmail(authUser?.new_email ?? null)
  }, [])

  useEffect(() => {
    refreshPendingEmail()
  }, [refreshPendingEmail])

  // Handle redirects back from /auth/confirm email change links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get('emailChange')
    if (isNil(status)) {
      return
    }

    if (status === 'complete') {
      toast.success('Your email has been updated.')
      refreshSession()
      router.refresh()
    } else if (status === 'pending') {
      toast.info(
        'Almost there — click the link in your new email address’s inbox to finish changing your email.'
      )
    } else if (status === 'error') {
      toastError(
        'That confirmation link is invalid or has expired. Please request the email change again.'
      )
    }

    params.delete('emailChange')
    const query = params.toString()
    window.history.replaceState(
      null,
      '',
      query !== ''
        ? `${window.location.pathname}?${query}`
        : window.location.pathname
    )
    refreshPendingEmail()
  }, [refreshSession, router, refreshPendingEmail])

  useEffect(() => {
    if (!sessionLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (!isNil(user)) {
      form.setValue('firstName', user.firstName ?? '')
      form.setValue('lastName', user.lastName ?? '')
      form.setValue('phoneNumber', user.phoneNumber ?? '')
      form.setValue('isClergy', user.communityInformation.isClergy)
    }
  }, [user, sessionLoading, isAuthenticated, router, form])

  const handleCroppedPhoto = async (blob: Blob) => {
    if (isNil(user?.id)) return
    setPhotoBusy(true)
    try {
      const upload = await uploadAvatar(user.id, blob)
      if (isErr(upload)) {
        toastError(upload.error)
        return
      }

      const persisted = await updateUserProfilePhoto(user.id, upload.data.path)
      if (isErr(persisted)) {
        toastError('Could not save your photo. Please try again.', {
          error: persisted.error,
        })
        return
      }

      toast.success('Profile photo updated')
      refreshSession()
      router.refresh()
    } finally {
      setPhotoBusy(false)
    }
  }

  const handleRemovePhoto = async () => {
    if (isNil(user?.id)) return
    setPhotoBusy(true)
    try {
      const removed = await deleteAvatar(user.id)
      if (isErr(removed)) {
        toastError(removed.error)
        return
      }

      const persisted = await removeUserProfilePhoto(user.id)
      if (isErr(persisted)) {
        toastError('Could not remove your photo. Please try again.', {
          error: persisted.error,
        })
        return
      }

      toast.success('Profile photo removed')
      refreshSession()
      router.refresh()
    } finally {
      setPhotoBusy(false)
    }
  }

  const handleUpdateProfile = async (values: ProfileFormValues) => {
    setIsUpdating(true)
    try {
      if (isNil(user?.id)) {
        toastError(
          'Looks like you have been automatically logged out. Please log in again.'
        )
        return
      }

      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({
          first_name: values.firstName,
          last_name: values.lastName,
          phone_number: values.phoneNumber,
          is_clergy: values.isClergy,
        })
        .eq('id', user.id)

      if (!isNil(error)) {
        toastError('Unable to save your profile. Please try again.', { error })
        return
      }

      toast.success('Profile updated')
      refreshSession()
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSendPasswordReset = async () => {
    if (isNil(user?.email)) return
    setResetBusy(true)
    try {
      const result = await sendCustomPasswordResetEmail(user.email)
      if (isErr(result)) {
        toastError('Unable to send the reset email. Please try again.', {
          error: result.error,
        })
        return
      }
      toast.success('Password reset email sent — check your inbox.')
    } finally {
      setResetBusy(false)
    }
  }

  if (sessionLoading) {
    return <ProfilePageSkeleton />
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <PageContent size="narrow">
      <MemberBreadcrumbs
        title="My account"
        breadcrumbs={[{ label: 'Home', href: '/home' }]}
      />
      <PageHeader
        title="My account"
        description="Your profile, your photo, and how you sign in."
      />

      <div className="space-y-8">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Your name, photo, and contact details as they appear to the
              community.
            </CardDescription>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateProfile)}>
              <CardContent className="space-y-6">
                {!isNil(user) && (
                  <div className="flex items-center gap-4">
                    <UserAvatar user={avatarUserFromDto(user)} size={80} />
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCropperOpen(true)}
                          disabled={photoBusy}
                        >
                          Edit photo
                        </Button>
                        {!isNil(user.profilePhotoPath) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemovePhoto}
                            disabled={photoBusy}
                          >
                            {photoBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Remove photo'
                            )}
                          </Button>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        JPEG, PNG, or WebP. Up to 5MB.
                      </p>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
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
                        <FormLabel>Last name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone number</FormLabel>
                      <FormControl>
                        <PhoneInput className="w-full" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isClergy"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) =>
                            field.onChange(checked === true)
                          }
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        I am ordained clergy
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </CardContent>

              <CardFooter className="mt-6 justify-end border-t">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Save changes'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Sign-in &amp; security</CardTitle>
            <CardDescription>How you access your account.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-muted-foreground text-sm">{user?.email}</p>
                </div>
                <ChangeEmailDialog
                  currentEmail={user?.email ?? ''}
                  onRequested={refreshPendingEmail}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Changing your email requires your password and a confirmation
                from the new address.
              </p>
              {!isNil(pendingNewEmail) && (
                <Alert>
                  <MailQuestion />
                  <AlertTitle>Email change pending</AlertTitle>
                  <AlertDescription>
                    A change to {pendingNewEmail} is awaiting confirmation.
                    Click the link we sent to that inbox to complete it.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Separator />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Password</p>
                <p className="text-muted-foreground text-sm">
                  We&apos;ll email you a secure link to set a new password.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSendPasswordReset}
                disabled={resetBusy}
              >
                {resetBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Send reset email'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AvatarCropperDialog
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        onConfirm={handleCroppedPhoto}
      />
    </PageContent>
  )
}
