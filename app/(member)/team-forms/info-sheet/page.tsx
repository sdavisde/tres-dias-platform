import { redirect } from 'next/navigation'
import { getLoggedInUser } from '@/services/identity/user'
import { TeamInfoForm } from '@/components/team-forms/team-info-form'
import { isErr, unwrap } from '@/lib/results'
import { isNil } from 'lodash'
import { getUserServiceHistory } from '@/services/user-experience/user-experience-service'
import { parseCommunityWeekendRef } from '@/lib/weekend/weekend-reference'
import { experienceToFormValues } from '@/lib/users/experience'
import { getUserMedicalProfile } from '@/services/weekend-group-member/weekend-group-member-service'

export default async function TeamInfoPage() {
  const userResult = await getLoggedInUser()

  if (isErr(userResult)) {
    redirect('/login')
  }

  const user = userResult.data

  // Verify user is on an active weekend roster
  if (isNil(user.teamMemberInfo)) {
    redirect('/?error=UserNotOnRoster')
  }

  // Fetch medical info from user_medical_profiles
  const medicalProfileResult = await getUserMedicalProfile(user.id)
  const medicalProfile = isErr(medicalProfileResult)
    ? null
    : medicalProfileResult.data

  const initialMedicalInfo = {
    emergency_contact_name: medicalProfile?.emergency_contact_name ?? '',
    emergency_contact_phone: medicalProfile?.emergency_contact_phone ?? '',
    medical_conditions: medicalProfile?.medical_conditions ?? '',
  }

  const serviceHistoryResult = await getUserServiceHistory(user.id)
  const experience = experienceToFormValues(
    unwrap(serviceHistoryResult).experience
  )
  const attendedWeekendRef = parseCommunityWeekendRef(
    user.communityInformation.weekendAttended
  )

  const basicInfo = {
    church_affiliation: user.communityInformation.churchAffiliation ?? '',
    weekend_attended: {
      community: attendedWeekendRef?.community ?? '',
      weekend_number: attendedWeekendRef?.number.toString() ?? '',
    },
    essentials_training_date: !isNil(
      user.communityInformation.essentialsTrainingDate
    )
      ? new Date(user.communityInformation.essentialsTrainingDate)
      : undefined,
    special_gifts_and_skills:
      user.communityInformation.specialGiftsAndSkills ?? [],
    is_clergy: user.communityInformation.isClergy,
  }

  return (
    <TeamInfoForm
      userId={user.id}
      groupMemberId={user.teamMemberInfo.groupMemberId}
      savedAddress={user.address}
      initialBasicInfo={basicInfo}
      initialServiceHistory={experience}
      initialMedicalInfo={initialMedicalInfo}
    />
  )
}
