import { Info } from 'lucide-react'

/**
 * Shown instead of an error page while the community email tables don't exist
 * yet, e.g. on a preview deployment reading a database the migration hasn't
 * reached.
 */
export function MigrationNotice() {
  return (
    <div className="flex items-start gap-3 rounded-md border border-dashed border-input bg-card px-5 py-4">
      <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        Community email isn&apos;t set up on this database yet. Apply the
        migration <code>20261013000000_community_email.sql</code> and reload.
      </p>
    </div>
  )
}
