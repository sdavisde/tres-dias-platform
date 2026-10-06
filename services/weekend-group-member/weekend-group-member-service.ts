import 'server-only'

import type { Result } from '@/lib/results'
import { err, ok, isErr } from '@/lib/results'
import { REQUIRED_FORMS } from '@/lib/weekend/team/required-forms.config'
import { isNil } from 'lodash'
import { decideSecuelaSignIn } from '@/lib/secuela/attendance-window'
import * as EventsRepository from '@/services/events/repository'
import * as Repository from './repository'

export type TeamFormsProgress = {
  steps: {
    statementOfBelief: boolean
    commitmentForm: boolean
    releaseOfClaim: boolean
    campWaiver: boolean
    infoSheet: boolean
  }
  completedSteps: string[]
  totalSteps: number
  completedCount: number
  isComplete: boolean
}

/**
 * Builds team forms progress for a group member using team_form_completions.
 */
export async function getTeamFormsProgress(
  groupMemberId: string
): Promise<Result<string, TeamFormsProgress>> {
  const completionsResult = await Repository.getFormCompletions(groupMemberId)

  if (isErr(completionsResult)) {
    return completionsResult
  }

  const completions = completionsResult.data
  const completedKeys = new Set(completions.map((c) => c.form_type))

  const steps = {
    statementOfBelief: completedKeys.has('statement_of_belief'),
    commitmentForm: completedKeys.has('commitment_form'),
    releaseOfClaim: completedKeys.has('release_of_claim'),
    campWaiver: completedKeys.has('camp_waiver'),
    infoSheet: completedKeys.has('info_sheet'),
  }

  const stepIdMap: Record<string, string> = {
    statement_of_belief: 'statement-of-belief',
    commitment_form: 'commitment-form',
    release_of_claim: 'release-of-claim',
    camp_waiver: 'camp-waiver',
    info_sheet: 'info-sheet',
  }

  const completedSteps = REQUIRED_FORMS.filter((f) =>
    completedKeys.has(f.key)
  ).map((f) => stepIdMap[f.key])

  const totalSteps = REQUIRED_FORMS.length
  const completedCount = completedSteps.length
  const isComplete = completedCount === totalSteps

  return ok({
    steps,
    completedSteps,
    totalSteps,
    completedCount,
    isComplete,
  })
}

/**
 * Returns true if a group member has completed all required team forms.
 */
export async function hasCompletedAllTeamForms(
  groupMemberId: string
): Promise<Result<string, boolean>> {
  const result = await getTeamFormsProgress(groupMemberId)
  if (isErr(result)) {
    return err(result.error)
  }
  return ok(result.data.isComplete)
}

/**
 * Fetches the medical profile for a user.
 */
export async function getUserMedicalProfile(userId: string) {
  return Repository.getUserMedicalProfile(userId)
}

export type SecuelaSignInOutcome =
  /** Registration opens at `opensAt` (30 minutes before the secuela). */
  | {
      status: 'not_open'
      opensAt: string
      startsAt: string
      groupNumber: number | null
    }
  | { status: 'signed_in'; groupNumber: number | null }

/**
 * Signs the user up through the secuela link for the active weekend group,
 * creating their weekend_group_members row if needed. Refuses sign-ins before
 * the secuela's attendance window opens, and never overwrites a sign-in made
 * during the secuela (see `decideSecuelaSignIn`).
 */
export async function markSecuelaAttendance(
  userId: string,
  now: Date = new Date()
): Promise<Result<string, SecuelaSignInOutcome>> {
  const groupResult = await Repository.findActiveGroup()
  if (isErr(groupResult)) return groupResult
  const { groupId, groupNumber } = groupResult.data

  const eventResult = await EventsRepository.findSecuelaEventByGroupId(groupId)
  if (isErr(eventResult)) return eventResult
  const secuelaEvent = isNil(eventResult.data?.datetime)
    ? null
    : {
        startDate: eventResult.data.datetime,
        endDate: eventResult.data.end_datetime ?? null,
      }

  // Check the window before creating a group member row for an early visitor
  const early = decideSecuelaSignIn(now, secuelaEvent, null)
  if (early.kind === 'not_open' && !isNil(secuelaEvent)) {
    return ok({
      status: 'not_open',
      opensAt: early.opensAt.toISOString(),
      startsAt: secuelaEvent.startDate,
      groupNumber,
    })
  }

  const memberResult = await Repository.upsertGroupMember(groupId, userId)
  if (isErr(memberResult)) return memberResult
  const groupMemberId = memberResult.data

  const existingResult = await Repository.findSecuelaSignIn(groupMemberId)
  if (isErr(existingResult)) return existingResult

  const decision = decideSecuelaSignIn(now, secuelaEvent, existingResult.data)
  if (decision.kind === 'record') {
    const setResult = await Repository.setSecuelaSignIn(
      groupMemberId,
      now.toISOString()
    )
    if (isErr(setResult)) return setResult
  }

  return ok({ status: 'signed_in', groupNumber })
}
