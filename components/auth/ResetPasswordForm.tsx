'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import PasswordInput from './PasswordInput'
import Link from 'next/link'
import AuthHeading from './AuthHeading'
import { isNil } from 'lodash'
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_TOO_SHORT_MESSAGE,
} from '@/lib/auth/constants'

interface ResetPasswordFormProps {
  searchParams?: { [key: string]: string | string[] | undefined }
}

export default function ResetPasswordForm({
  searchParams,
}: ResetPasswordFormProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [passwordReset, setPasswordReset] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [hasValidSession, setHasValidSession] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()

      try {
        // Primary path: session already established by /auth/callback (PKCE flow)
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!isNil(session)) {
          setHasValidSession(true)
          return
        }

        // Fallback: check for hash fragment tokens (implicit flow / legacy links)
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        )
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (!isNil(accessToken) && !isNil(refreshToken)) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (!isNil(error)) {
            logger.error({ error }, 'Failed to set session from hash tokens')
            setError(
              'Invalid or expired reset link. Please request a new password reset.'
            )
          } else if (!isNil(data.session)) {
            setHasValidSession(true)
          }
        } else {
          setError(
            'Invalid or expired reset link. Please request a new password reset.'
          )
        }
      } catch (error) {
        setError('An error occurred while validating your reset link.')
      } finally {
        setSessionLoading(false)
      }
    }

    checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password strength
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(PASSWORD_TOO_SHORT_MESSAGE)
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()

      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (!isNil(updateError)) {
        logger.error({ error: updateError }, 'Password update failed')
        setError(
          'Unable to update your password. Please try again or request a new reset link.'
        )
      } else {
        setPasswordReset(true)

        // Sign out the user after password reset to force fresh login
        setTimeout(async () => {
          await supabase.auth.signOut()
          router.push(
            '/login?message=Password reset successful. Please log in with your new password.'
          )
        }, 3000)
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sessionLoading) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Validating reset link...</p>
      </div>
    )
  }

  if (!hasValidSession) {
    return (
      <div className="flex w-full flex-col gap-4">
        <AuthHeading
          title="Invalid reset link"
          description="This password reset link is invalid or has expired."
        />

        <Alert variant="destructive">
          <AlertDescription>
            {error ?? 'Please request a new password reset link.'}
          </AlertDescription>
        </Alert>

        <Button asChild size="lg" className="mt-2 w-full">
          <Link href="/forgot-password">Request New Reset Link</Link>
        </Button>

        <Button variant="ghost" asChild className="w-full">
          <Link href="/login">Back to Login</Link>
        </Button>
      </div>
    )
  }

  if (passwordReset) {
    return (
      <div className="flex w-full flex-col gap-4">
        <AuthHeading
          icon={
            <div className="flex size-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="size-6 text-success" />
            </div>
          }
          title="Password reset"
          description="Your password has been updated. You will be redirected to the login page shortly."
        />

        <Alert variant="success">
          <AlertDescription>
            Redirecting to login page in a few seconds...
          </AlertDescription>
        </Alert>

        <Button asChild size="lg" className="mt-2 w-full">
          <Link href="/login">Go to Login Now</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <AuthHeading
        title="Reset your password"
        description="Enter your new password below."
      />

      {!isNil(error) && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <PasswordInput
        id="password"
        label="New password"
        value={password}
        onChange={setPassword}
        required
        helpText={PASSWORD_TOO_SHORT_MESSAGE}
        disabled={loading}
      />

      <PasswordInput
        id="confirmPassword"
        label="Confirm new password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        required
        disabled={loading}
      />

      <Button
        type="submit"
        size="lg"
        className="mt-2 w-full"
        disabled={loading || password === '' || confirmPassword === ''}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating password...
          </>
        ) : (
          'Update password'
        )}
      </Button>

      <Button variant="ghost" asChild className="w-full mt-2">
        <Link href="/login">Cancel and return to login</Link>
      </Button>
    </form>
  )
}
