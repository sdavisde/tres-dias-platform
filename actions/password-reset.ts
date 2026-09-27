'use server'

import { createClient } from '@/lib/supabase/server'
import type { Result } from '@/lib/results'
import { err, ok } from '@/lib/results'
import { isNil } from 'lodash'
import { logger } from '@/lib/logger'
import type { CreateEmailResponseSuccess } from 'resend'
import { getUrl } from '@/lib/url'

/**
 * Sends a password reset email to the specified email address.
 * Public by design: the forgot-password page and the profile page both use it,
 * and Supabase handles unknown addresses silently.
 */
export async function sendCustomPasswordResetEmail(
  email: string
): Promise<Result<string, { data: CreateEmailResponseSuccess | null }>> {
  try {
    logger.info(`Starting custom password reset request for email: ${email}`)

    const supabase = await createClient()

    // No user existence check needed -- Supabase's resetPasswordForEmail
    // already handles non-existent emails silently (no error, no email sent),
    // which is the correct behavior to prevent email enumeration.

    // Generate password reset link using Supabase Auth
    // Route through /auth/callback for PKCE code exchange, then forward to /reset-password
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${getUrl('/auth/callback')}?next=/reset-password`,
      }
    )

    if (!isNil(resetError)) {
      return err(`Failed to send reset email: ${resetError.message}`)
    }

    logger.info(
      `Custom password reset email initiated successfully for ${email}`
    )
    return ok({ data: null })
  } catch (error) {
    return err(
      `Error while sending password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
