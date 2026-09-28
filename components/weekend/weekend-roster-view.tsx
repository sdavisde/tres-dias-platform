import { WeekendRosterTable } from '@/components/weekend/roster-view/weekend-roster-table'
import { AddTeamMemberButton } from '@/components/weekend/roster-view/add-team-member-button'
import { ExportRosterButton } from '@/components/weekend/roster-view/export-roster-button'
import { ShareRosterButton } from '@/components/weekend/roster-view/share-roster-button'
import {
  DroppedRosterSection,
  ActiveRosterHeader,
  WeekendStatusBadge,
} from '@/components/weekend'
import { ExperienceDistributionChart } from '@/components/weekend/experience-distribution-chart'
import { Typography } from '@/components/ui/typography'
import { Datetime } from '@/components/ui/datetime'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { isNil } from 'lodash'
import { WeekendStatus, type Weekend } from '@/lib/weekend/types'
import { formatWeekendTitle } from '@/lib/weekend'
import { hubPath } from '@/lib/weekend/hub'
import { getWeekendRosterViewData } from '@/services/weekend/weekend-service'
import { Permission, userHasPermission } from '@/lib/security'
import type { User } from '@/lib/users/types'
import { formatDateOnly } from '@/lib/utils'
import { Results } from '@/lib/results'

export type WeekendRosterViewProps = {
  weekendId: string
  user: User
  /** The weekend, when the page already resolved it; saves the lookup by id. */
  weekend?: Weekend

  // Optional slot for header content (e.g., tabs for switching weekends, status badge)
  headerSlot?: React.ReactNode

  /**
   * Hides the internal weekend title / date range / Candidates block so a page
   * that already opens with a `PageHeader` owns that copy (the admin weekend
   * hub). The experience chart still renders. Off by default, so the public
   * roster route is unchanged.
   */
  hideWeekendHeader?: boolean
}

export async function WeekendRosterView({
  weekendId,
  user,
  weekend: knownWeekend,
  headerSlot,
  hideWeekendHeader = false,
}: WeekendRosterViewProps) {
  // Load all data using the service
  const result = await getWeekendRosterViewData(weekendId, knownWeekend)

  if (Results.isErr(result)) {
    throw new Error(result.error)
  }

  const { weekend, roster, experienceDistribution, availableUsers } =
    result.data

  // Permission checks for UI rendering
  const canViewPaymentInfo = userHasPermission(user, [
    Permission.READ_WRITE_TEAM_PAYMENTS,
  ])
  const canEditRoster = userHasPermission(user, [Permission.WRITE_TEAM_ROSTER])
  const canViewDroppedMembers = userHasPermission(user, [
    Permission.READ_DROPPED_ROSTER,
  ])
  const canViewExperienceDistribution = userHasPermission(user, [
    Permission.READ_USER_EXPERIENCE,
  ])
  const canViewEmergencyContact = userHasPermission(user, [
    Permission.READ_CANDIDATE_EMERGENCY_CONTACT,
  ])
  const canViewSpecialNeeds = userHasPermission(user, [
    Permission.READ_CANDIDATE_MEDICAL_INFO,
  ])
  const canViewTeamFormInfo = userHasPermission(user, [
    Permission.READ_TEAM_FORM_INFO,
  ])

  // Check if weekend is editable
  const isWeekendEditable =
    weekend.status === WeekendStatus.ACTIVE ||
    weekend.status === WeekendStatus.PLANNING

  const startDate = formatDateOnly(weekend.start_date)
  const endDate = formatDateOnly(weekend.end_date)
  const weekendTitle = formatWeekendTitle(weekend)

  return (
    <>
      {/* Weekend Information Header */}
      {(!hideWeekendHeader ||
        (canViewExperienceDistribution && !isNil(experienceDistribution))) && (
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Left side: Weekend info */}
            {!hideWeekendHeader && (
              <div className="flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <Typography variant="h5" className="text-2xl">
                    {weekendTitle}
                  </Typography>
                  {headerSlot}
                  {isNil(headerSlot) && !isNil(weekend.status) && (
                    <WeekendStatusBadge status={weekend.status} />
                  )}
                </div>
                <Typography
                  as="span"
                  variant="muted"
                  className="text-lg flex items-center gap-2"
                >
                  <Datetime dateTime={startDate} />
                  <span>-</span>
                  <Datetime dateTime={endDate} />
                </Typography>
                {!isNil(weekend.groupId) && (
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link
                      href={hubPath(
                        weekend.groupId,
                        'candidates',
                        weekend.type
                      )}
                    >
                      <Users className="h-4 w-4" />
                      Candidates
                    </Link>
                  </Button>
                )}
              </div>
            )}

            {/* Right side: Experience chart */}
            {canViewExperienceDistribution &&
              !isNil(experienceDistribution) && (
                <div className="lg:ml-auto lg:w-auto">
                  <ExperienceDistributionChart
                    distribution={experienceDistribution}
                  />
                </div>
              )}
          </div>
        </div>
      )}

      {/* Team Roster Section */}
      <div>
        <div className="mb-4">
          <ActiveRosterHeader roster={roster} title="Team Roster">
            <div className="flex gap-2">
              <ExportRosterButton
                roster={roster}
                options={{
                  includePaymentInformation: canViewPaymentInfo,
                  includeEmergencyContact: canViewEmergencyContact,
                  includeSpecialNeeds: canViewSpecialNeeds,
                  includeChurch: canViewTeamFormInfo,
                }}
                weekendName={weekendTitle}
              />
              <ShareRosterButton
                title={weekendTitle}
                text="View the team roster for this weekend"
              />
              {canEditRoster && isWeekendEditable && (
                <AddTeamMemberButton
                  weekendId={weekend.id}
                  weekendTitle={weekendTitle}
                  users={availableUsers}
                />
              )}
            </div>
          </ActiveRosterHeader>
        </div>

        <WeekendRosterTable
          roster={roster}
          isEditable={canEditRoster && isWeekendEditable}
          includePaymentInformation={canViewPaymentInfo}
          includeEmergencyContact={canViewEmergencyContact}
          includeSpecialNeeds={canViewSpecialNeeds}
          includeTeamFormInfo={canViewTeamFormInfo}
        />
      </div>

      {/* Dropped Team Members Section - Only shown to specific CHA roles */}
      {canViewDroppedMembers && <DroppedRosterSection roster={roster} />}
    </>
  )
}
