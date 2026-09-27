import { Card } from '@/components/ui/card'
import { TeamFormsStepper } from '@/components/team-forms/stepper'
import { teamFormSteps } from '@/components/team-forms/steps.config'
import { getLoggedInUser } from '@/services/identity/user'
import { getTeamFormsProgress } from '@/services/weekend-group-member/weekend-group-member-service'
import { isErr } from '@/lib/results'
import { redirect } from 'next/navigation'
import { isNil } from 'lodash'
import { PageContent } from '@/components/member/page-content'
import { MemberBreadcrumbs } from '@/components/member/breadcrumbs'

export default async function TeamFormsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userResult = await getLoggedInUser()

  if (isErr(userResult)) {
    redirect('/login')
  }

  const user = userResult.data

  if (isNil(user.teamMemberInfo)) {
    // Ideally redirect to a "not on roster" page or show an error
    // For now, redirecting to home
    redirect('/')
  }

  const progressResult = await getTeamFormsProgress(
    user.teamMemberInfo.groupMemberId
  )

  let maxReachableStepIndex = 0

  if (!isErr(progressResult)) {
    const { completedCount } = progressResult.data
    // Users can access all completed steps + the next immediate step
    // So if 2 steps are completed (index 0 and 1), they can access index 2 (step 3)
    maxReachableStepIndex = completedCount
  }

  return (
    <PageContent size="narrow" className="flex flex-col gap-6">
      <MemberBreadcrumbs
        title="My forms"
        breadcrumbs={[{ label: 'Home', href: '/home' }]}
      />
      <TeamFormsStepper
        steps={teamFormSteps}
        maxReachableStepIndex={maxReachableStepIndex}
      />
      <Card className="shadow-none">{children}</Card>
    </PageContent>
  )
}
