'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ArrowLeft, Mail } from 'lucide-react'
import { sendCustomPasswordResetEmail } from '@/actions/password-reset'
import { isErr } from '@/lib/results'
import Link from 'next/link'
import AuthHeading from './AuthHeading'
import { isNil } from 'lodash'

interface ForgotPasswordFormProps {
  onBackToLogin?: () => void
}

export default function ForgotPasswordForm({
  onBackToLogin,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (email.trim() === '') {
      setError('Email address is required')
      setLoading(false)
      return
    }

    try {
      const result = await sendCustomPasswordResetEmail(email.trim())

      if (isErr(result)) {
        setError(result.error)
      } else {
        setEmailSent(true)
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="flex w-full flex-col gap-4">
        <AuthHeading
          icon={
            <div className="flex size-12 items-center justify-center rounded-full bg-success/10">
              <Mail className="size-6 text-success" />
            </div>
          }
          title="Check your email"
          description="If an account with that email exists, we've sent you a password reset link."
        />

        <Alert variant="info">
          <AlertDescription>
            Check your email for a password reset link. The link will expire in
            1 hour.
          </AlertDescription>
        </Alert>

        <div className="mt-2 space-y-3">
          <Button
            variant="outline"
            onClick={() => {
              setEmailSent(false)
              setEmail('')
              setError(null)
            }}
            className="w-full"
          >
            Send another email
          </Button>

          <Button
            variant="ghost"
            onClick={onBackToLogin}
            className="w-full"
            asChild
          >
            <Link
              href="/login"
              className="flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <AuthHeading
        title="Forgot your password?"
        description="Enter your email address and we'll send you a link to reset your password."
      />

      {!isNil(error) && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address"
          required
          disabled={loading}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="mt-2 w-full"
        disabled={loading || email.trim() === ''}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending reset email...
          </>
        ) : (
          'Send reset email'
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        onClick={onBackToLogin}
        className="w-full mt-2"
        asChild
      >
        <Link href="/login" className="flex items-center justify-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>
      </Button>
    </form>
  )
}
