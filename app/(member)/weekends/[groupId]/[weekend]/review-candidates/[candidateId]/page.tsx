import { notFound, redirect } from 'next/navigation'
import { getHydratedCandidate } from '@/services/candidates/hydrated-candidates'
import { MemberBreadcrumbs } from '@/components/member/breadcrumbs'
import { PageContent } from '@/components/member/page-content'
import { Errors } from '@/lib/error'
import { isErr } from '@/lib/results'
import { Permission, userHasPermission } from '@/lib/security'
import { reviewQueuePath } from '@/lib/candidates/review'
import { appendQueryParams } from '@/lib/url'
import { formatWeekendGroupTitle } from '@/lib/weekend'
import { hubPath } from '@/lib/weekend/hub'
import { loadHubContext, type HubParams } from '../../../hub-context'
import { ReviewStatusPill } from '../components/review-status-pill'
import { CandidateInformationSection } from './components/CandidateInformationSection'
import { CandidateAssessmentSection } from './components/CandidateAssessmentSection'
import { CandidateFormDetailsSection } from './components/CandidateFormDetailsSection'
import { SponsorInformationSection } from './components/SponsorInformationSection'
import { StatusSelect } from './components/StatusSelect'

type PageProps = {
  params: Promise<Awaited<HubParams> & { candidateId: string }>
}

/**
 * Full details: every field on the candidate, editable in place by people
 * with write access. The queue covers the decision; this page is where a
 * reviewer fixes a typo or reads the sponsor's whole write-up.
 */
export default async function CandidateDetailsPage({ params }: PageProps) {
  const { groupId, weekend: slug, candidateId } = await params
  const [context, candidateResult] = await Promise.all([
    loadHubContext(groupId, slug),
    getHydratedCandidate(candidateId),
  ])
  const { user, group, weekend, weekendType } = context

  if (!userHasPermission(user, [Permission.READ_CANDIDATES])) {
    redirect(
      appendQueryParams(hubPath(group.groupId, 'overview', weekendType), {
        error: Errors.INSUFFICIENT_PERMISSIONS,
      })
    )
  }
  if (
    isErr(candidateResult) ||
    candidateResult.data.weekend_id !== weekend.id
  ) {
    notFound()
  }
  const candidate = candidateResult.data

  const canEdit = userHasPermission(user, [Permission.WRITE_CANDIDATES])
  const canViewMedical = userHasPermission(user, [
    Permission.READ_CANDIDATE_MEDICAL_INFO,
  ])
  const canViewEmergencyContact = userHasPermission(user, [
    Permission.READ_CANDIDATE_EMERGENCY_CONTACT,
  ])

  const groupTitle = formatWeekendGroupTitle(weekend.number)
  const candidateName =
    candidate.candidate_sponsorship_info?.candidate_name ?? 'Unnamed candidate'

  return (
    <PageContent size="narrow" className="mx-0 max-w-4xl">
      <MemberBreadcrumbs
        title={candidateName}
        breadcrumbs={[
          { label: 'Home', href: '/home' },
          { label: 'The weekends', href: '/weekends' },
          {
            label: groupTitle,
            href: hubPath(group.groupId, 'overview', weekendType),
          },
          {
            label: 'Review candidates',
            href: reviewQueuePath(group.groupId, weekendType, candidate.id),
          },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-border pb-5">
        <h1 className="min-w-0 font-serif text-3xl font-semibold tracking-tight break-words lg:text-4xl">
          {candidateName}
        </h1>
        {canEdit ? (
          <StatusSelect
            candidateId={candidate.id}
            currentStatus={candidate.status}
          />
        ) : (
          <ReviewStatusPill status={candidate.status} size="md" />
        )}
      </div>

      <CandidateInformationSection candidate={candidate} canEdit={canEdit} />
      <CandidateAssessmentSection candidate={candidate} canEdit={canEdit} />
      <CandidateFormDetailsSection
        candidate={candidate}
        canEdit={canEdit}
        canViewMedical={canViewMedical}
        canViewEmergencyContact={canViewEmergencyContact}
      />
      <SponsorInformationSection candidate={candidate} canEdit={canEdit} />
    </PageContent>
  )
}
