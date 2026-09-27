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
      <div className="flex flex-col gap-4 w-full max-w-md mx-auto p-6">
        <div className="text-center mb-4">
          <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Mail className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Check your email
          </h2>
          <p className="text-gray-600 text-sm">
            If an account with that email exists, we&apos;ve sent you a password
            reset link.
          </p>
        </div>

        <Alert variant="info">
          <AlertDescription>
            Check your email for a password reset link. The link will expire in
            1 hour.
          </AlertDescription>
        </Alert>

        <div className="space-y-3 mt-6">
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
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 w-full max-w-md mx-auto p-6"
    >
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Forgot your password?
        </h2>
        <p className="text-gray-600 text-sm">
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </p>
      </div>

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
        className="w-full mt-4"
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
