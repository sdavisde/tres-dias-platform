import { redirect } from 'next/navigation'
import { getLoggedInUser } from '@/services/identity/user'
import { getRosterSpecialNeeds } from '@/services/weekend/weekend-service'
import { ReleaseOfClaimForm } from '@/components/team-forms/release-of-claim-form'
import { isErr, unwrapOr } from '@/lib/results'
import { isNil } from 'lodash'

export default async function ReleaseOfClaimPage() {
  const userResult = await getLoggedInUser()

  if (isErr(userResult)) {
    redirect('/login')
  }

  const user = userResult.data

  // Verify user is on an active weekend roster
  if (isNil(user.teamMemberInfo)) {
    redirect('/')
  }

  // special_needs is shared across all roster rows in the group; any rosterId works
  const firstRosterId = user.teamMemberInfo.weekendAssignments[0]?.rosterId
  const specialNeedsResult = !isNil(firstRosterId)
    ? await getRosterSpecialNeeds(firstRosterId)
    : null

  return (
    <ReleaseOfClaimForm
      groupMemberId={user.teamMemberInfo.groupMemberId}
      initialSpecialNeeds={
        !isNil(specialNeedsResult)
          ? (unwrapOr(specialNeedsResult, null) ?? undefined)
          : undefined
      }
    />
  )
}
