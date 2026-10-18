import { notFound, redirect } from 'next/navigation'
import { isNil } from 'lodash'
import { MemberBreadcrumbs } from '@/components/member/breadcrumbs'
import { PageContent } from '@/components/member/page-content'
import { isErr } from '@/lib/results'
import { validateRedirectUrl } from '@/lib/redirect'
import { getLoggedInUser } from '@/services/identity/user'
import { canSendToAudience } from '@/services/community-email/audience-access'
import {
  getAudienceOptions,
  getBroadcastForSender,
  getDeliveryMode,
} from '@/services/community-email/community-email-service'
import { getSystemEmailFrom } from '@/services/settings/settings-service'
import { EmailComposer } from '@/app/admin/email/components/email-composer'

// Sending runs inside this page's server action: give a large group's
// batches time to finish.
export const maxDuration = 300

/**
 * Writing an email that a page's "Email …" button addressed (the weekend
 * hub's team, Secuela's pescadores). Outside Admin so weekend leaders can
 * reach it; the audience is fixed, and `?back=` is where it returns to.
 */
export default async function MemberEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ back?: string }>
}) {
  const [{ id }, { back }, userResult] = await Promise.all([
    params,
    searchParams,
    getLoggedInUser(),
  ])
  if (isErr(userResult)) redirect('/login')
  const user = userResult.data
  const returnHref = validateRedirectUrl(back, '/home')

  const emailResult = await getBroadcastForSender(id)
  if (isErr(emailResult)) throw new Error(emailResult.error)
  const email = emailResult.data
  if (isNil(email) || !canSendToAudience(user, email.audience)) notFound()
  // Sent: the button's page lists it; nothing left to do here.
  if (email.status !== 'draft') redirect(returnHref)

  const [optionsResult, from] = await Promise.all([
    getAudienceOptions(),
    getSystemEmailFrom(),
  ])
  if (isErr(optionsResult)) throw new Error(optionsResult.error)

  return (
    <PageContent>
      <MemberBreadcrumbs
        title="Email"
        breadcrumbs={[{ label: 'Home', href: '/home' }]}
      />
      <EmailComposer
        key={email.id}
        email={email}
        options={optionsResult.data}
        senderEmail={user.email}
        fromName={from}
        deliveryMode={getDeliveryMode(user)}
        returnHref={returnHref}
        audienceLocked
      />
    </PageContent>
  )
}
