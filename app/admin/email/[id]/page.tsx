import { notFound } from 'next/navigation'
import { isNil } from 'lodash'
import { AdminBreadcrumbs } from '@/components/admin/breadcrumbs'
import { guardAdminPage } from '@/lib/admin/page-guard'
import { Permission } from '@/lib/security'
import { isErr } from '@/lib/results'
import {
  getAudienceOptions,
  getBroadcast,
  getDeliveryMode,
  getRecipients,
  isMissingTableError,
  renderPreview,
} from '@/services/community-email/community-email-service'
import { getSystemEmailFrom } from '@/services/settings/settings-service'
import { EmailComposer } from '../components/email-composer'
import { EmailReport } from '../components/email-report'
import { MigrationNotice } from '../components/migration-notice'

// Sending runs inside this page's server action: give a large community's
// batches time to finish.
export const maxDuration = 300

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user, canEdit } = await guardAdminPage({
    required: [
      Permission.READ_COMMUNITY_EMAIL,
      Permission.SEND_COMMUNITY_EMAIL,
    ],
    edit: [Permission.SEND_COMMUNITY_EMAIL],
  })

  const [emailResult, optionsResult] = await Promise.all([
    getBroadcast(id),
    getAudienceOptions(),
  ])

  const breadcrumbTitle =
    isErr(emailResult) || isNil(emailResult.data)
      ? 'Email'
      : emailResult.data.status === 'draft'
        ? 'Draft'
        : 'Sent email'
  const breadcrumbs = (
    <AdminBreadcrumbs
      title={breadcrumbTitle}
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Email', href: '/admin/email' },
      ]}
    />
  )

  if (isErr(emailResult) && isMissingTableError(emailResult.error)) {
    return (
      <>
        {breadcrumbs}
        <div className="container mx-auto px-4 pb-10 sm:px-8 py-6">
          <MigrationNotice />
        </div>
      </>
    )
  }
  if (isErr(emailResult)) throw new Error(emailResult.error)
  if (isErr(optionsResult)) throw new Error(optionsResult.error)

  const email = emailResult.data
  // Drafts are only for senders; readers see sent emails.
  if (isNil(email) || (email.status === 'draft' && !canEdit)) notFound()

  if (email.status === 'draft') {
    const from = await getSystemEmailFrom()
    return (
      <>
        {breadcrumbs}
        <div className="container mx-auto px-4 pb-10 sm:px-8 py-6">
          <EmailComposer
            key={email.id}
            email={email}
            options={optionsResult.data}
            senderEmail={user.email}
            fromName={from}
            deliveryMode={getDeliveryMode(user)}
          />
        </div>
      </>
    )
  }

  const [recipientsResult, previewResult] = await Promise.all([
    getRecipients(email.id),
    renderPreview(email, user),
  ])
  if (isErr(recipientsResult)) throw new Error(recipientsResult.error)
  if (isErr(previewResult)) throw new Error(previewResult.error)

  return (
    <>
      {breadcrumbs}
      <div className="container mx-auto px-4 pb-10 sm:px-8 py-6">
        <EmailReport
          email={email}
          recipients={recipientsResult.data}
          options={optionsResult.data}
          previewHtml={previewResult.data}
          canSend={canEdit}
        />
      </div>
    </>
  )
}
