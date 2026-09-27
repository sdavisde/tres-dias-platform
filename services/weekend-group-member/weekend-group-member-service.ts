import 'server-only'

import type { Result } from '@/lib/results'
import { err, ok, isErr } from '@/lib/results'
import { REQUIRED_FORMS } from '@/lib/weekend/team/required-forms.config'
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

/**
 * Marks the current user as attending Secuela for the active weekend group.
 * Creates a weekend_group_members record if one doesn't exist yet.
 */
export async function markSecuelaAttendance(userId: string) {
  return Repository.markSecuelaAttendance(userId)
}
