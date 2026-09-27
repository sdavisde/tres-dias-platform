import { notFound } from 'next/navigation'
import { logger } from '@/lib/logger'
import { getHydratedCandidate } from '@/services/candidates/hydrated-candidates'
import * as Results from '@/lib/results'
import { CandidateForms } from './candidate-forms'
import { Typography } from '@/components/ui/typography'

export default async function CandidateFormsPage({
  params,
}: {
  params: Promise<{ candidateId: string }>
}) {
  const { candidateId } = await params
  const candidateResult = await getHydratedCandidate(candidateId)

  if (Results.isErr(candidateResult)) {
    logger.error(
      `Failed to fetch candidate ${candidateId}: ${candidateResult.error}`
    )
    notFound()
  }

  const candidate = candidateResult.data

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <Typography variant="h1" className="mb-4">
        Hello {candidate.candidate_sponsorship_info?.candidate_name}!
      </Typography>

      <Typography variant="muted" className="mb-4">
        You have been sponsored by{' '}
        {candidate.candidate_sponsorship_info?.sponsor_name} to attend Dusty
        Trails Tres Dias.
        <br />
        Please fill out the this form to complete your registration.
      </Typography>

      <CandidateForms
        candidateId={candidateId}
        initialData={candidate.candidate_info}
      />
    </div>
  )
}
