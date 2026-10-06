'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { buildUrlWithRedirect } from '@/lib/url'
import AuthHeading from './AuthHeading'
import PasswordInput from './PasswordInput'
import RegistrationFields from './RegistrationFields'
import { AvatarCropperDialog } from '@/components/avatar/avatar-cropper-dialog'
import { uploadAvatar } from '@/lib/avatar/upload-client'
import { updateUserProfilePhoto } from '@/services/identity/user'
import { getInitials } from '@/lib/avatar/initials'
import { isErr } from '@/lib/results'
import { toastError } from '@/lib/toast-error'
import { isNil } from 'lodash'
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_TOO_SHORT_MESSAGE,
} from '@/lib/auth/constants'
import { logger } from '@/lib/logger'
import {
  describeAuthError,
  type AuthErrorDescription,
} from '@/lib/auth/auth-errors'

const FORGOT_PASSWORD_PATH = '/forgot-password'

interface AuthFormProps {
  onSuccess?: () => void
  redirectTo?: string
  defaultMode?: 'login' | 'register'
}

export default function AuthForm({
  onSuccess,
  redirectTo,
  defaultMode = 'login',
}: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | null>(null)
  const [isClergy, setIsClergy] = useState(false)
  const [error, setError] = useState<AuthErrorDescription | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const router = useRouter()

  // Keep a preview object URL in sync with the chosen (not-yet-uploaded) blob,
  // revoking the previous one so we never leak blob URLs.
  useEffect(() => {
    if (isNil(avatarBlob)) {
      setAvatarPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(avatarBlob)
    setAvatarPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [avatarBlob])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    if (mode === 'register' && password.length < MIN_PASSWORD_LENGTH) {
      setError({ message: PASSWORD_TOO_SHORT_MESSAGE })
      setLoading(false)
      return
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError({ message: 'Passwords do not match' })
      setLoading(false)
      return
    }

    const supabase = createClient()

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (!isNil(error)) throw error
        onSuccess?.()
        router.refresh()
      } else {
        if (isNil(gender)) {
          setError({ message: 'Please select your gender' })
          return
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              gender,
              is_clergy: isClergy,
            },
          },
        })

        if (!isNil(error)) throw error

        // Sign in the user immediately after registration
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (!isNil(signInError)) throw signInError

        // Optional avatar: upload only after a session exists so RLS allows the
        // write. A missing or failed photo must never block account creation —
        // surface failures as a non-blocking toast and continue the redirect.
        const newUserId = data.user?.id
        if (!isNil(avatarBlob) && !isNil(newUserId)) {
          const upload = await uploadAvatar(newUserId, avatarBlob)
          if (isErr(upload)) {
            toastError(upload.error)
          } else {
            const persisted = await updateUserProfilePhoto(
              newUserId,
              upload.data.path
            )
            if (isErr(persisted)) {
              toastError('Could not save your photo. You can add it later.', {
                error: persisted.error,
              })
            }
          }
        }

        onSuccess?.()
        router.refresh()
      }
    } catch (error) {
      logger.warn({ error, mode }, 'Email auth failed')
      setError(describeAuthError(error, mode))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (!isNil(error)) throw error
    } catch (error) {
      logger.warn({ error, mode }, 'Google auth failed')
      setError(describeAuthError(error, mode))
    }
  }

  const handleHint = (hint: AuthErrorDescription['hint']) => {
    switch (hint?.action) {
      case 'forgot-password':
        router.push(FORGOT_PASSWORD_PATH)
        break
      case 'switch-to-login':
        setMode('login')
        setError(null)
        break
      case 'switch-to-register':
        setMode('register')
        setError(null)
        break
    }
  }

  return (
    <form onSubmit={handleEmailAuth} className="flex w-full flex-col gap-4">
      {mode === 'login' ? (
        <AuthHeading
          title="Welcome back"
          description="Sign in to the Dusty Trails community."
        />
      ) : (
        <AuthHeading
          title="Join the community"
          description="Create an account to serve, sponsor and stay connected."
        />
      )}

      {!isNil(error) && (
        <Alert variant="destructive" data-testid="auth-error">
          <AlertDescription>
            <p>{error.message}</p>
            {!isNil(error.hint) && (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-sm"
                data-testid="auth-error-hint"
                onClick={() => handleHint(error.hint)}
              >
                {error.hint.text}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {!isNil(message) && (
        <Alert variant="info">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {mode === 'register' && (
        <RegistrationFields
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          gender={gender}
          setGender={setGender}
          isClergy={isClergy}
          setIsClergy={setIsClergy}
        />
      )}

      {mode === 'register' && (
        <div className="space-y-2">
          <Label>Profile Photo</Label>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {!isNil(avatarPreviewUrl) && (
                <AvatarImage
                  src={avatarPreviewUrl}
                  alt="Profile photo preview"
                />
              )}
              <AvatarFallback className="bg-muted text-muted-foreground">
                {getInitials({
                  first_name: firstName,
                  last_name: lastName,
                  email,
                })}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCropperOpen(true)}
                >
                  {isNil(avatarBlob) ? 'Add photo' : 'Change photo'}
                </Button>
                {!isNil(avatarBlob) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAvatarBlob(null)}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Please add a clear photo of just you, with your face big enough
                to see, so the community can recognize you in person!
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete={mode === 'login' ? 'email' : 'email'}
            className="pl-9"
            required
          />
        </div>
      </div>

      <PasswordInput
        id="password"
        label="Password"
        value={password}
        onChange={setPassword}
        required
        helpText={mode === 'register' ? PASSWORD_TOO_SHORT_MESSAGE : undefined}
      />

      {mode === 'register' && (
        <PasswordInput
          id="confirmPassword"
          label="Confirm Password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
        />
      )}

      {mode === 'login' && (
        <div className="-mt-2 text-right">
          <Button
            type="button"
            href={FORGOT_PASSWORD_PATH}
            variant="link"
            className="h-auto p-0 text-sm"
          >
            Forgot your password?
          </Button>
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="mt-2 w-full"
        disabled={loading}
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {mode === 'login' ? 'Sign In' : 'Create Account'}
      </Button>

      {/* <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">OR</span>
        </div>
      </div>

      <Button
        variant="outline"
        onClick={handleGoogleAuth}
        className="w-full"
      >
        Continue with Google
      </Button> */}

      <p className="mt-2 text-center text-sm text-muted-foreground">
        {mode === 'login' ? (
          <>
            Don&apos;t have an account?{' '}
            <Button variant="link" asChild className="p-0 h-auto text-sm">
              <a href={buildUrlWithRedirect('/join', redirectTo)}>Create one</a>
            </Button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Button variant="link" asChild className="p-0 h-auto text-sm">
              <a href={buildUrlWithRedirect('/login', redirectTo)}>Sign in</a>
            </Button>
          </>
        )}
      </p>

      <AvatarCropperDialog
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        onConfirm={(blob) => setAvatarBlob(blob)}
        confirmLabel="Use photo"
      />
    </form>
  )
}
