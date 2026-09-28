import { redirect } from 'next/navigation'
import { getLoggedInUser } from '@/services/identity/user'
import { CommitmentFormComponent } from '@/components/team-forms/commitment-form-component'
import { Results } from '@/lib/results'
import { isNil } from 'lodash'
import { getGroupFees } from '@/services/fees/fees-service'
import { formatTeamMemberTitle, formatTeamMemberRole } from '@/lib/weekend'

export default async function CommitmentFormPage() {
  const userResult = await getLoggedInUser()

  if (Results.isErr(userResult)) {
    redirect('/login')
  }

  const user = userResult.data

  if (isNil(user.teamMemberInfo)) {
    redirect('/')
  }

  const weekendTitle = formatTeamMemberTitle(user.teamMemberInfo)
  const userName = `${user.firstName} ${user.lastName}`.trim()
  const userRole = formatTeamMemberRole(user.teamMemberInfo)
  // The fee people commit to is the group's price (the cash amount); paying
  // online adds card processing on top.
  const feesResult = await getGroupFees(user.teamMemberInfo.groupId)
  const teamFeeDollars = Results.unwrapOr(feesResult, null)?.teamFee ?? null

  return (
    <CommitmentFormComponent
      userName={userName}
      weekendTitle={weekendTitle}
      userRole={userRole}
      groupMemberId={user.teamMemberInfo.groupMemberId}
      teamFeeAmount={teamFeeDollars}
    />
  )
}
