import * as Sentry from '@sentry/nextjs'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'

/**
 * Shows a user-friendly toast error, logs the raw error for debugging and
 * reports it to Sentry. Use this instead of `toast.error(result.error)` to
 * avoid exposing raw database/server errors to users.
 *
 * @param userMessage - Friendly message shown to the user via toast
 * @param context - Optional object logged alongside the message (pino style)
 */
export function toastError(
  userMessage: string,
  context?: Record<string, unknown>
) {
  logger.error(context ?? {}, userMessage)
  reportToSentry(userMessage, context)
  toast.error(userMessage)
}

/**
 * Reports a thrown `Error` as an exception (keeping its stack); anything
 * else, usually a Result's error string, as a message grouped by the
 * friendly text with the raw error attached.
 */
function reportToSentry(
  userMessage: string,
  context?: Record<string, unknown>
) {
  const error = context?.error
  if (error instanceof Error) {
    Sentry.captureException(error, { extra: { userMessage, ...context } })
  } else {
    Sentry.captureMessage(userMessage, { level: 'error', extra: context })
  }
}
