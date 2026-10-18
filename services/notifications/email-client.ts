import 'server-only'

import { isNil } from 'lodash'
import type {
  CreateBatchEmailOptions,
  CreateEmailOptions,
  CreateEmailResponseSuccess,
} from 'resend'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import type { Result } from '@/lib/results'
import { err, isErr, ok } from '@/lib/results'
import { logger } from '@/lib/logger'
import * as NotificationRepository from './repository'

export const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Short identifier for which email a log row belongs to. Kept as a union so a
 * typo can't quietly create a new "template" in the usage metrics.
 */
export type EmailTemplate =
  | 'candidate-forms'
  | 'candidate-forms-completed'
  | 'candidate-payment-completed'
  | 'community-email'
  | 'community-email-test'
  | 'email-change-notification'
  | 'payment-request'
  | 'sponsorship-notification'
  | 'team-payment-notification'

/**
 * Sends an email through Resend and records the attempt in `email_log`.
 *
 * Returns the Resend success payload, or the Resend error message. Logging is
 * strictly best-effort: a failure to write the log row is pino-logged and
 * swallowed so it can never block or fail an email.
 *
 * Exceptions thrown by Resend itself are logged and then rethrown, so callers'
 * existing try/catch handling is unchanged.
 */
export async function sendEmail(
  template: EmailTemplate,
  options: CreateEmailOptions
): Promise<Result<string, CreateEmailResponseSuccess | null>> {
  let response

  try {
    response = await resend.emails.send(options)
  } catch (error) {
    await recordSendAttempt(template, options, {
      status: 'failed',
      resendMessageId: null,
      errorSummary: error instanceof Error ? error.message : String(error),
    })
    throw error
  }

  const { data, error } = response

  if (!isNil(error)) {
    await recordSendAttempt(template, options, {
      status: 'failed',
      resendMessageId: null,
      errorSummary: error.message,
    })
    return err(error.message)
  }

  await recordSendAttempt(template, options, {
    status: 'sent',
    resendMessageId: data?.id ?? null,
    errorSummary: null,
  })

  return ok(data)
}

/** Resend's batch endpoint accepts at most this many emails per call. */
export const BATCH_SEND_LIMIT = 100

/**
 * Sends up to {@link BATCH_SEND_LIMIT} emails in one Resend batch call and
 * records the batch as one `email_log` row (one row per batch keeps the usage
 * metric honest without a row per recipient; `recipient_count` carries the
 * size).
 *
 * The batch is all-or-nothing (Resend's strict validation): on error no email
 * in it was sent. Returns the Resend ids in the same order as `emails`.
 * `idempotencyKey` makes a retried batch a no-op on Resend's side.
 */
export async function sendBatchEmails(
  template: EmailTemplate,
  emails: CreateBatchEmailOptions[],
  idempotencyKey: string
): Promise<Result<string, string[]>> {
  if (emails.length === 0) return ok([])
  if (emails.length > BATCH_SEND_LIMIT) {
    return err(`A batch holds at most ${BATCH_SEND_LIMIT} emails`)
  }

  const logFields = {
    subject: emails[0].subject ?? '',
    recipients: emails.flatMap((email) => toRecipientList(email.to)),
  }

  let response
  try {
    response = await resend.batch.send(emails, { idempotencyKey })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await recordLogRow(template, logFields, {
      status: 'failed',
      resendMessageId: null,
      errorSummary: message,
    })
    return err(message)
  }

  const { data, error } = response
  if (!isNil(error) || isNil(data)) {
    const message = error?.message ?? 'Resend returned no batch result'
    await recordLogRow(template, logFields, {
      status: 'failed',
      resendMessageId: null,
      errorSummary: message,
    })
    return err(message)
  }

  const ids = data.data.map((entry) => entry.id)
  await recordLogRow(template, logFields, {
    status: 'sent',
    resendMessageId: ids[0] ?? null,
    errorSummary: null,
  })
  return ok(ids)
}

/**
 * Writes an `email_log` row. Never throws -- every failure path is pino-logged
 * and swallowed, because the email has already been handed to Resend by the
 * time this runs and losing the audit row must not surface to the user.
 */
async function recordLogRow(
  template: EmailTemplate,
  fields: { subject: string; recipients: string[] },
  outcome: SendOutcome
): Promise<void> {
  try {
    const result = await NotificationRepository.insertEmailLog({
      template,
      subject: fields.subject,
      recipients: fields.recipients,
      status: outcome.status,
      resendMessageId: outcome.resendMessageId,
      errorSummary: outcome.errorSummary,
      sentByUserId: await resolveTriggeringUserId(),
    })

    if (isErr(result)) {
      logger.error(`Failed to record email log entry: ${result.error}`)
    }
  } catch (error) {
    logger.error(error, `Failed to record email log entry for ${template}`)
  }
}

type SendOutcome = {
  status: 'sent' | 'failed'
  resendMessageId: string | null
  errorSummary: string | null
}

/** {@link recordLogRow} for a single `sendEmail` call. */
async function recordSendAttempt(
  template: EmailTemplate,
  options: CreateEmailOptions,
  outcome: SendOutcome
): Promise<void> {
  await recordLogRow(
    template,
    { subject: options.subject ?? '', recipients: toRecipientList(options.to) },
    outcome
  )
}

function toRecipientList(to: CreateEmailOptions['to']): string[] {
  if (isNil(to)) {
    return []
  }

  return Array.isArray(to) ? to : [to]
}

/**
 * Best-effort lookup of the session that triggered the send. Webhook and
 * anonymous public-form sends legitimately have no user, and `cookies()` is
 * unavailable in some server contexts, so any problem here resolves to null.
 */
async function resolveTriggeringUserId(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    return user?.id ?? null
  } catch {
    return null
  }
}
