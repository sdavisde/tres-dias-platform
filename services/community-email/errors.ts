/**
 * The community email tables arrive with this feature's migration. Until it is
 * applied (e.g. a preview deployment reading the production database), the
 * pages show a notice instead of an error page.
 *
 * PostgREST words this differently by version: newer ones say "Could not find
 * the table" (PGRST205); older ones fail the join to `users` first with
 * "Could not find a relationship between 'email_broadcasts' and 'users'"
 * (PGRST200); Postgres itself says "relation … does not exist" (42P01).
 */
const TABLES = /email_broadcasts|email_broadcast_recipients|email_unsubscribes/
const MISSING = /could not find|does not exist|schema cache/i

export function isMissingTableError(error: string): boolean {
  return TABLES.test(error) && MISSING.test(error)
}
