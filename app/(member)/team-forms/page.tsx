import { redirect } from 'next/navigation'
import { getLoggedInUser } from '@/services/identity/user'
import { getTeamFormsProgress } from '@/services/weekend-group-member/weekend-group-member-service'
import { isErr } from '@/lib/results'
import { isNil } from 'lodash'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Typography } from '@/components/ui/typography'
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default async function TeamFormsPage() {
  const userResult = await getLoggedInUser()

  if (isErr(userResult)) {
    redirect('/login')
  }

  const user = userResult.data

  if (isNil(user.teamMemberInfo)) {
    redirect('/?error=UserNotOnRoster')
  }

  const progressResult = await getTeamFormsProgress(
    user.teamMemberInfo.groupMemberId
  )

  if (isErr(progressResult)) {
    // Handle error gracefully
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-destructive">
        <Typography variant="h3">Error loading progress</Typography>
        <Typography variant="p">{progressResult.error}</Typography>
      </div>
    )
  }

  // if user has completed steps 1 and 2 (index 0 and 1), they should only be able to access steps 0-2
  const maxReachableStepIndex = progressResult.data.completedCount

  const progress = progressResult.data
  const { steps } = progress

  const formSteps = [
    {
      label: 'Statement of Belief',
      isComplete: steps.statementOfBelief,
      href: '/team-forms/statement-of-belief',
      isDisabled: maxReachableStepIndex < 0,
    },
    {
      label: 'Commitment Form',
      isComplete: steps.commitmentForm,
      href: '/team-forms/commitment-form',
      isDisabled: maxReachableStepIndex < 1,
    },
    {
      label: 'Release of Claim',
      isComplete: steps.releaseOfClaim,
      href: '/team-forms/release-of-claim',
      isDisabled: maxReachableStepIndex < 2,
    },
    {
      label: 'Camp Waiver',
      isComplete: steps.campWaiver,
      href: '/team-forms/camp-waiver',
      isDisabled: maxReachableStepIndex < 3,
    },
    {
      label: 'Team Info',
      isComplete: steps.infoSheet,
      href: '/team-forms/info-sheet',
      isDisabled: maxReachableStepIndex < 4,
    },
  ]

  const nextStep = formSteps.find((s) => !s.isComplete)

  return (
    <div className="space-y-8">
      <CardHeader>
        <CardTitle>
          <Typography variant="h2">Team Forms Progress</Typography>
        </CardTitle>
        <CardDescription>
          <Typography variant="muted">
            Complete all forms to participate in the weekend.
          </Typography>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>
              {Math.round(
                (progress.completedCount / progress.totalSteps) * 100
              )}
              %
            </span>
          </div>
          <Progress
            value={(progress.completedCount / progress.totalSteps) * 100}
          />
        </div>

        <div className="grid gap-4">
          {formSteps.map((step, index) => (
            <Link
              key={index}
              href={step.href}
              className={cn(
                'flex items-center justify-between p-4 rounded-lg border transition-colors hover:bg-muted/50',
                step.isComplete
                  ? 'bg-muted/20 border-border'
                  : 'bg-card border-border shadow-sm',
                step.isDisabled &&
                  'opacity-50 cursor-not-allowed pointer-events-none'
              )}
            >
              <div className="flex items-center gap-4">
                {step.isComplete ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <Circle className="h-6 w-6 text-muted-foreground" />
                )}
                <span className="font-medium">{step.label}</span>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          ))}
        </div>

        {!isNil(nextStep) && (
          <div className="flex justify-end pt-4">
            <Button asChild>
              <Link href={nextStep.href}>Continue to {nextStep.label}</Link>
            </Button>
          </div>
        )}
        {progress.isComplete && (
          <div className="rounded-lg bg-green-50 p-4 text-green-700 dark:bg-green-900/10 dark:text-green-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-medium">All forms completed!</p>
            </div>
            <p className="text-sm mt-1 ml-7">
              You can revisit and update any form above if needed.
            </p>
          </div>
        )}
      </CardContent>
    </div>
  )
}
