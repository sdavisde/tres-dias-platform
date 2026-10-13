import { PageContent } from '@/components/member/page-content'
import { Skeleton } from '@/components/ui/skeleton'

/** Mirrors the People tab, which opens by default. */
export default function CommunityLoading() {
  return (
    <PageContent>
      <Skeleton className="mb-3 h-4 w-32" />
      <Skeleton className="mb-4 h-9 w-48" />
      <Skeleton className="mb-4 h-11 w-full rounded-none" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-9 w-full max-w-sm" />
        <div className="hidden space-y-px overflow-hidden rounded-md border md:block">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-none" />
          ))}
        </div>
        <div className="space-y-3 md:hidden">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </PageContent>
  )
}
