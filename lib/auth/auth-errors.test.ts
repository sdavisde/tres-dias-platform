import { AuthApiError } from '@supabase/supabase-js'
import {
  AUTH_HINTS,
  AUTH_MESSAGES,
  describeAuthError,
  type AuthErrorDescription,
} from './auth-errors'
import { MIN_PASSWORD_LENGTH } from './constants'

const apiError = (code: string, message = 'raw gotrue text') =>
  new AuthApiError(message, 400, code)

describe('describeAuthError', () => {
  describe('AuthApiError codes', () => {
    const cases: Array<[string, AuthErrorDescription]> = [
      [
        'invalid_credentials',
        {
          message: AUTH_MESSAGES.invalidCredentials,
          hint: AUTH_HINTS.resetPassword,
        },
      ],
      [
        'user_already_exists',
        {
          message: AUTH_MESSAGES.alreadyRegistered,
          hint: AUTH_HINTS.goToSignIn,
        },
      ],
      [
        'email_exists',
        {
          message: AUTH_MESSAGES.alreadyRegistered,
          hint: AUTH_HINTS.goToSignIn,
        },
      ],
      ['weak_password', { message: AUTH_MESSAGES.weakPassword }],
      ['over_request_rate_limit', { message: AUTH_MESSAGES.rateLimited }],
      ['over_email_send_rate_limit', { message: AUTH_MESSAGES.rateLimited }],
      ['email_not_confirmed', { message: AUTH_MESSAGES.emailNotConfirmed }],
      ['validation_failed', { message: AUTH_MESSAGES.invalidEmail }],
      ['email_address_invalid', { message: AUTH_MESSAGES.invalidEmail }],
    ]

    it.each(cases)('maps %s', (code, expected) => {
      expect(describeAuthError(apiError(code), 'register')).toEqual(expected)
    })

    it('never exposes the raw GoTrue message', () => {
      const result = describeAuthError(
        apiError('invalid_credentials', 'Invalid login credentials'),
        'login'
      )
      expect(result.message).not.toContain('Invalid login credentials')
    })

    it('falls back to the generic message for an unmapped code', () => {
      expect(describeAuthError(apiError('bad_jwt'), 'login')).toEqual({
        message: AUTH_MESSAGES.generic,
      })
    })
  })

  describe('message fallback (no code)', () => {
    const cases: Array<[string, AuthErrorDescription]> = [
      [
        'Invalid login credentials',
        {
          message: AUTH_MESSAGES.invalidCredentials,
          hint: AUTH_HINTS.resetPassword,
        },
      ],
      [
        'User already registered',
        {
          message: AUTH_MESSAGES.alreadyRegistered,
          hint: AUTH_HINTS.goToSignIn,
        },
      ],
      [
        'Password should be at least 6 characters.',
        { message: AUTH_MESSAGES.weakPassword },
      ],
      ['Email rate limit exceeded', { message: AUTH_MESSAGES.rateLimited }],
      ['Email not confirmed', { message: AUTH_MESSAGES.emailNotConfirmed }],
    ]

    it.each(cases)('maps "%s"', (message, expected) => {
      expect(describeAuthError(new Error(message), 'register')).toEqual(
        expected
      )
    })

    it('returns the generic message for an unrecognised Error', () => {
      expect(describeAuthError(new Error('boom'), 'login')).toEqual({
        message: AUTH_MESSAGES.generic,
      })
    })
  })

  describe('generic fallback', () => {
    it('handles a thrown string', () => {
      expect(describeAuthError('Invalid login credentials', 'login')).toEqual({
        message: AUTH_MESSAGES.generic,
      })
    })

    it('handles null', () => {
      expect(describeAuthError(null, 'login')).toEqual({
        message: AUTH_MESSAGES.generic,
      })
    })
  })

  describe('mode', () => {
    it('only offers "Go to sign in" in register mode', () => {
      const error = apiError('user_already_exists')
      expect(describeAuthError(error, 'register')).toEqual({
        message: AUTH_MESSAGES.alreadyRegistered,
        hint: AUTH_HINTS.goToSignIn,
      })
      expect(describeAuthError(error, 'login')).toEqual({
        message: AUTH_MESSAGES.alreadyRegistered,
      })
    })

    it('offers "Reset password" for invalid credentials in both modes', () => {
      const error = apiError('invalid_credentials')
      expect(describeAuthError(error, 'login')).toEqual(
        describeAuthError(error, 'register')
      )
      expect(describeAuthError(error, 'login').hint).toEqual(
        AUTH_HINTS.resetPassword
      )
    })

    it('does not change the message', () => {
      for (const code of ['user_already_exists', 'weak_password', 'bad_jwt']) {
        expect(describeAuthError(apiError(code), 'login').message).toBe(
          describeAuthError(apiError(code), 'register').message
        )
      }
    })
  })

  it('gives identical output for a wrong password and an unknown email', () => {
    // GoTrue returns the same error for both, so the mapping cannot leak which one it was.
    const wrongPassword = new AuthApiError(
      'Invalid login credentials',
      400,
      'invalid_credentials'
    )
    const unknownEmail = new AuthApiError(
      'Invalid login credentials',
      400,
      'invalid_credentials'
    )
    expect(describeAuthError(wrongPassword, 'login')).toEqual(
      describeAuthError(unknownEmail, 'login')
    )
  })

  it('reads the weak-password minimum from constants', () => {
    expect(AUTH_MESSAGES.weakPassword).toContain(String(MIN_PASSWORD_LENGTH))
  })
})
