import { isAuthApiError } from '@supabase/supabase-js'
import { isNil } from 'lodash'
import { MIN_PASSWORD_LENGTH } from './constants'

export type AuthHintAction =
  'forgot-password' | 'switch-to-login' | 'switch-to-register'

export type AuthErrorDescription = {
  message: string
  hint?: { text: string; action: AuthHintAction }
}

export const AUTH_MESSAGES = {
  invalidCredentials:
    "That email and password don't match. Check for typos, or reset your password.",
  alreadyRegistered:
    'An account with that email already exists. Sign in instead.',
  weakPassword: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
  rateLimited: 'Too many attempts. Please wait a few minutes and try again.',
  emailNotConfirmed: 'Please confirm your email address, then sign in.',
  invalidEmail: 'Please enter a valid email address.',
  generic: 'Something went wrong. Please try again.',
} as const

export const AUTH_HINTS = {
  resetPassword: { text: 'Reset password', action: 'forgot-password' },
  goToSignIn: { text: 'Go to sign in', action: 'switch-to-login' },
} as const satisfies Record<string, AuthErrorDescription['hint']>

type AuthMode = 'login' | 'register'

const invalidCredentials = (): AuthErrorDescription => ({
  message: AUTH_MESSAGES.invalidCredentials,
  hint: AUTH_HINTS.resetPassword,
})

// "Go to sign in" is only useful from the register form; on the login form the
// user is already where the hint would send them.
const alreadyRegistered = (mode: AuthMode): AuthErrorDescription =>
  mode === 'register'
    ? { message: AUTH_MESSAGES.alreadyRegistered, hint: AUTH_HINTS.goToSignIn }
    : { message: AUTH_MESSAGES.alreadyRegistered }

function describeByCode(
  code: string | undefined,
  mode: AuthMode
): AuthErrorDescription | null {
  // Every code below is a member of auth-js's `ErrorCode` union.
  switch (code) {
    case 'invalid_credentials':
      return invalidCredentials()
    case 'user_already_exists':
    case 'email_exists':
      return alreadyRegistered(mode)
    case 'weak_password':
      return { message: AUTH_MESSAGES.weakPassword }
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return { message: AUTH_MESSAGES.rateLimited }
    case 'email_not_confirmed':
      return { message: AUTH_MESSAGES.emailNotConfirmed }
    case 'validation_failed':
    case 'email_address_invalid':
      return { message: AUTH_MESSAGES.invalidEmail }
    default:
      return null
  }
}

// Fallback for errors without a `code` (older GoTrue responses): match the raw text.
function describeByMessage(
  message: string,
  mode: AuthMode
): AuthErrorDescription | null {
  if (/invalid login credentials/i.test(message)) return invalidCredentials()
  if (/already registered/i.test(message)) return alreadyRegistered(mode)
  if (/password should be at least/i.test(message))
    return { message: AUTH_MESSAGES.weakPassword }
  if (/rate limit/i.test(message)) return { message: AUTH_MESSAGES.rateLimited }
  if (/email not confirmed/i.test(message))
    return { message: AUTH_MESSAGES.emailNotConfirmed }
  return null
}

/**
 * Maps a Supabase Auth error to a member-facing message and optional remediation hint.
 * Pure: never logs and never exposes the raw error text.
 */
export function describeAuthError(
  error: unknown,
  mode: AuthMode
): AuthErrorDescription {
  // An AuthApiError with an unmapped code still gets the message fallback below.
  const byCode = isAuthApiError(error) ? describeByCode(error.code, mode) : null
  if (!isNil(byCode)) return byCode

  const byMessage =
    error instanceof Error ? describeByMessage(error.message, mode) : null
  return byMessage ?? { message: AUTH_MESSAGES.generic }
}
