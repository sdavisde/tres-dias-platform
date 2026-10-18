import { Skeleton } from '@/components/ui/skeleton'
import { PageContent } from '@/components/member/page-content'

/** Skeleton of the review page: breadcrumb, title row, then the two panes. */
export default function ReviewCandidatesLoading() {
  return (
    <PageContent className="md:flex md:h-[calc(100dvh-3.5rem)] md:flex-col md:pb-5">
      <div className="mb-4 flex h-7 items-center gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3.5">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="flex min-h-[60vh] flex-1 overflow-hidden rounded-lg border bg-card md:grid md:grid-cols-[350px_minmax(0,1fr)]">
        <div className="flex flex-col gap-3 p-4 md:border-r md:border-border">
          <Skeleton className="h-9 w-full" />
          <div className="flex gap-1.5">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
        <div className="hidden flex-col gap-4 p-6 md:flex">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
          <div className="grid grid-cols-2 gap-3.5">
            <Skeleton className="h-36 w-full rounded-lg" />
            <Skeleton className="h-36 w-full rounded-lg" />
          </div>
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    </PageContent>
  )
}
