import Link from 'next/link'
import { format } from 'date-fns'
import { isNil } from 'lodash'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatTile } from '@/components/ui/stat-tile'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  AudienceOptions,
  Broadcast,
  BroadcastRecipient,
  RecipientStatus,
} from '@/services/community-email/types'
import { describeAudience } from './audience-label'
import { EmailStatusBadge } from './email-status-badge'
import { DuplicateEmailButton } from './new-email-button'

const RECIPIENT_LABELS: Record<RecipientStatus, string> = {
  sent: 'Sent',
  failed: 'Failed',
  skipped: 'Skipped',
}

function RecipientBadge({ status }: { status: RecipientStatus }) {
  return (
    <Badge
      variant={
        status === 'failed'
          ? 'destructive'
          : status === 'sent'
            ? 'secondary'
            : 'outline'
      }
    >
      {RECIPIENT_LABELS[status]}
    </Badge>
  )
}

/** A sent (or sending) community email: who got it and what it said. */
export function EmailReport({
  email,
  recipients,
  options,
  previewHtml,
  canSend,
}: {
  email: Broadcast
  recipients: BroadcastRecipient[]
  options: AudienceOptions
  previewHtml: string
  canSend: boolean
}) {
  const sentLine = [
    isNil(email.sentAt)
      ? null
      : format(new Date(email.sentAt), "MMM d, yyyy 'at' h:mm a"),
    isNil(email.sentByName) ? null : `by ${email.sentByName}`,
  ]
    .filter((part) => !isNil(part))
    .join(' ')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="size-11">
            <Link href="/admin/email" aria-label="Back to all emails">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-semibold tracking-tight">
                {email.subject}
              </h1>
              <EmailStatusBadge status={email.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              To {describeAudience(email.audience, options)}
              {sentLine !== '' && ` · ${sentLine}`}
            </p>
          </div>
        </div>
        {canSend && <DuplicateEmailButton emailId={email.id} />}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile value={email.recipientCount} label="Recipients" />
        <StatTile value={email.sentCount} label="Sent" />
        <StatTile
          value={email.failedCount}
          label="Failed"
          variant={email.failedCount > 0 ? 'cream' : 'default'}
        />
        {email.skippedCount > 0 && (
          <StatTile value={email.skippedCount} label="Skipped (test deploy)" />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold">Recipients</h2>

          <div className="relative hidden max-h-[640px] overflow-y-auto rounded-lg border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell>{recipient.name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {recipient.email}
                    </TableCell>
                    <TableCell className="text-right">
                      <RecipientBadge status={recipient.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {recipients.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No recipients recorded.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {recipients.map((recipient) => (
              <div
                key={recipient.id}
                className="space-y-1 rounded-lg border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-lg font-medium leading-snug">
                    {recipient.name ?? recipient.email}
                  </p>
                  <RecipientBadge status={recipient.status} />
                </div>
                {!isNil(recipient.name) && (
                  <p className="break-all text-sm text-muted-foreground">
                    {recipient.email}
                  </p>
                )}
                {recipient.status === 'failed' && (
                  <p className="text-sm text-destructive">
                    Couldn&apos;t be delivered
                  </p>
                )}
              </div>
            ))}
            {recipients.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No recipients recorded.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold">What was sent</h2>
          <iframe
            title="Sent email"
            sandbox=""
            srcDoc={previewHtml}
            className="h-[640px] w-full rounded-md border bg-white"
          />
        </section>
      </div>
    </div>
  )
}
