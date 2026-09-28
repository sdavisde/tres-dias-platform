import { notFound, redirect } from 'next/navigation'
import { isNil } from 'lodash'
import { CircleCheck } from 'lucide-react'
import { getHydratedCandidate } from '@/services/candidates/hydrated-candidates'
import { Button } from '@/components/ui/button'
import { MemberBreadcrumbs } from '@/components/member/breadcrumbs'
import { PageContent } from '@/components/member/page-content'
import { getLoggedInUser } from '@/services/identity/user'
import { logger } from '@/lib/logger'
import { isErr } from '@/lib/results'

const NEXT_STEPS = [
  'The pre-weekend couple reviews your sponsorship.',
  'Once they approve it, your candidate gets an email with their forms.',
  'Whoever is paying gets the fee request by email.',
]

/** The thank-you after sending a sponsorship. Only the sponsor sees it. */
export default async function SponsorSubmittedPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const [{ id }, userResult] = await Promise.all([
    searchParams,
    getLoggedInUser(),
  ])
  if (isErr(userResult)) redirect('/login')
  if (isNil(id) || id === '') notFound()

  const candidateResult = await getHydratedCandidate(id)
  if (isErr(candidateResult)) {
    logger.error({ error: candidateResult.error }, 'Sponsored candidate lookup')
    notFound()
  }
  const sponsorship = candidateResult.data.candidate_sponsorship_info
  if (
    sponsorship?.sponsor_email?.toLowerCase() !==
    userResult.data.email.toLowerCase()
  ) {
    notFound()
  }
  const candidateName = sponsorship?.candidate_name ?? 'your candidate'

  return (
    <PageContent size="narrow">
      <MemberBreadcrumbs
        title="Sponsorship sent"
        breadcrumbs={[
          { label: 'Home', href: '/home' },
          { label: 'Sponsor a candidate', href: '/sponsor' },
        ]}
        shareable={false}
      />
      <section className="flex flex-col gap-5 rounded-lg border bg-card px-5 py-6 md:px-6">
        <div className="flex items-start gap-3">
          <CircleCheck
            className="mt-1 size-6 shrink-0 text-success"
            aria-hidden
          />
          <div className="space-y-1">
            <h1 className="font-serif text-2xl font-semibold tracking-tight lg:text-3xl">
              Thank you for sponsoring {candidateName}
            </h1>
            <p className="text-muted-foreground">
              Your sponsorship is with the pre-weekend couple.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-[12.5px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            What happens next
          </h2>
          <ol className="flex flex-col gap-2">
            {NEXT_STEPS.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground tabular-nums">
                  {index + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button href="/home" className="h-12 md:h-10">
            Back to Home
          </Button>
          <Button href="/sponsor" variant="outline" className="h-12 md:h-10">
            Sponsor another candidate
          </Button>
        </div>
      </section>
    </PageContent>
  )
}
