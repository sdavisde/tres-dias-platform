import { Card, CardContent } from '@/components/ui/card'
import { Results } from '@/lib/results'
import { getFeeDefaults } from '@/services/fees/fees-service'
import { FeeDefaultsEditor } from './fee-defaults-editor'

/**
 * What new weekend groups start at. Each group keeps its own price once it's
 * created, so changing these never moves anyone's balance.
 */
export async function FeesCard({ canManageFees }: { canManageFees: boolean }) {
  const defaultsResult = await getFeeDefaults()
  Results.logFailures(defaultsResult)
  const defaults = Results.toNullable(defaultsResult)

  return (
    <Card className="gap-0 py-0">
      <CardContent className="px-5 py-4">
        {defaults === null ? (
          <>
            <h2 className="pb-1 font-serif text-lg font-semibold tracking-tight">
              Fees for new weekend groups
            </h2>
            <p className="py-3 text-[13px] text-muted-foreground">
              The default fees couldn&apos;t be loaded right now.
            </p>
          </>
        ) : (
          <FeeDefaultsEditor defaults={defaults} canEdit={canManageFees} />
        )}
      </CardContent>
    </Card>
  )
}

/** Placeholder shown while the defaults load. */
export function FeesCardSkeleton() {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="px-5 py-4">
        <h2 className="pb-1 font-serif text-lg font-semibold tracking-tight">
          Fees for new weekend groups
        </h2>
        <p className="py-3 text-[13px] text-muted-foreground">Loading…</p>
      </CardContent>
    </Card>
  )
}
