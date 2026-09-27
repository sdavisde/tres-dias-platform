import { notFound } from 'next/navigation'
import { logger } from '@/lib/logger'
import * as Results from '@/lib/results'
import {
  canFillCandidateForms,
  getCandidateFormsContext,
} from '@/services/candidates/candidate-forms'
import { CandidateForms } from './candidate-forms'
import { Typography } from '@/components/ui/typography'
import { Card, CardContent } from '@/components/ui/card'

export default async function CandidateFormsPage({
  params,
}: {
  params: Promise<{ candidateId: string }>
}) {
  const { candidateId } = await params
  const contextResult = await getCandidateFormsContext(candidateId)

  if (Results.isErr(contextResult)) {
    logger.warn(
      `Candidate forms page unavailable for ${candidateId}: ${contextResult.error}`
    )
    notFound()
  }

  const context = contextResult.data

  if (!canFillCandidateForms(context)) {
    return (
      <div className="container mx-auto p-8 max-w-2xl">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Typography variant="h1" className="w-full text-center">
              Forms already submitted
            </Typography>
            <Typography variant="muted">
              {context.formsSubmitted
                ? 'Your candidate forms have already been received. If anything needs to change, please reach out to your sponsor.'
                : 'This registration link is no longer accepting forms. Please reach out to your sponsor if you have questions.'}
            </Typography>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <Typography variant="h1" className="mb-4">
        Hello {context.candidateName}!
      </Typography>

      <Typography variant="muted" className="mb-4">
        You have been sponsored by {context.sponsorName} to attend Dusty Trails
        Tres Dias.
        <br />
        Please fill out the this form to complete your registration.
      </Typography>

      <CandidateForms candidateId={candidateId} />
    </div>
  )
}
