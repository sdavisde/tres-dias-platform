import Link from 'next/link'
import { format } from 'date-fns'
import { Mail } from 'lucide-react'
import { AdminBreadcrumbs } from '@/components/admin/breadcrumbs'
import { PageHeader } from '@/components/ui/page-header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { guardAdminPage } from '@/lib/admin/page-guard'
import { Permission } from '@/lib/security'
import { isErr } from '@/lib/results'
import {
  getAudienceOptions,
  isMissingTableError,
  listBroadcasts,
} from '@/services/community-email/community-email-service'
import type {
  AudienceOptions,
  Broadcast,
} from '@/services/community-email/types'
import { describeAudience } from './components/audience-label'
import { EmailStatusBadge } from './components/email-status-badge'
import { MigrationNotice } from './components/migration-notice'
import { NewEmailButton } from './components/new-email-button'

function when(email: Broadcast): string {
  const date = email.sentAt ?? email.updatedAt
  return format(new Date(date), 'MMM d, yyyy · h:mm a')
}

function countLine(email: Broadcast): string {
  if (email.status === 'draft' || email.status === 'sending') return '—'
  const parts = [`${email.sentCount} sent`]
  if (email.failedCount > 0) parts.push(`${email.failedCount} failed`)
  if (email.skippedCount > 0) parts.push(`${email.skippedCount} skipped`)
  return parts.join(' · ')
}

function EmailList({
  emails,
  options,
  emptyText,
}: {
  emails: Broadcast[]
  options: AudienceOptions
  emptyText: string
}) {
  if (emails.length === 0) {
    return (
      <p className="rounded-lg border border-dashed bg-card px-5 py-8 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    )
  }

  return (
    <>
      <div className="relative hidden rounded-lg border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emails.map((email) => (
              <TableRow key={email.id}>
                <TableCell className="max-w-[320px] font-medium">
                  <Link
                    href={`/admin/email/${email.id}`}
                    className="block truncate hover:underline"
                  >
                    {email.subject === '' ? '(No subject)' : email.subject}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {describeAudience(email.audience, options)}
                </TableCell>
                <TableCell>
                  <EmailStatusBadge status={email.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {countLine(email)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                  {when(email)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {emails.map((email) => (
          <Link
            key={email.id}
            href={`/admin/email/${email.id}`}
            className="block space-y-2 rounded-lg border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-lg font-medium leading-snug">
                {email.subject === '' ? '(No subject)' : email.subject}
              </p>
              <EmailStatusBadge status={email.status} />
            </div>
            <div className="flex gap-2 text-sm">
              <span className="w-16 shrink-0 text-muted-foreground">To</span>
              <span>{describeAudience(email.audience, options)}</span>
            </div>
            {email.status !== 'draft' && (
              <div className="flex gap-2 text-sm">
                <span className="w-16 shrink-0 text-muted-foreground">
                  Delivery
                </span>
                <span>{countLine(email)}</span>
              </div>
            )}
            <div className="flex gap-2 text-sm">
              <span className="w-16 shrink-0 text-muted-foreground">Date</span>
              <span>{when(email)}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}

export default async function EmailPage() {
  const { canEdit } = await guardAdminPage({
    required: [
      Permission.READ_COMMUNITY_EMAIL,
      Permission.SEND_COMMUNITY_EMAIL,
    ],
    edit: [Permission.SEND_COMMUNITY_EMAIL],
  })

  const [emailsResult, optionsResult] = await Promise.all([
    listBroadcasts(),
    getAudienceOptions(),
  ])

  const missingTables =
    isErr(emailsResult) && isMissingTableError(emailsResult.error)
  if (isErr(emailsResult) && !missingTables) {
    throw new Error(emailsResult.error)
  }
  if (isErr(optionsResult)) throw new Error(optionsResult.error)

  const emails = isErr(emailsResult) ? [] : emailsResult.data
  const drafts = emails.filter((email) => email.status === 'draft')
  const sent = emails.filter((email) => email.status !== 'draft')

  return (
    <>
      <AdminBreadcrumbs
        title="Email"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }]}
      />
      <div className="container mx-auto px-4 pb-10 sm:px-8 py-6">
        <PageHeader
          title="Email"
          description="Write to the whole community, a weekend team, candidates or sponsors. Replies go to whoever sends it."
        >
          {canEdit && !missingTables && <NewEmailButton />}
        </PageHeader>

        {missingTables ? (
          <MigrationNotice />
        ) : (
          <div className="space-y-10">
            {canEdit && (
              <section className="space-y-3">
                <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
                  Drafts
                </h2>
                <EmailList
                  emails={drafts}
                  options={optionsResult.data}
                  emptyText="No drafts. Start one with New email."
                />
              </section>
            )}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
                <Mail className="size-4 text-muted-foreground" />
                Sent
              </h2>
              <EmailList
                emails={sent}
                options={optionsResult.data}
                emptyText="Nothing has been sent yet."
              />
            </section>
          </div>
        )}
      </div>
    </>
  )
}
