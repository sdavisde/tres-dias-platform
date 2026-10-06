/**
 * Secuela Service
 *
 * Server-only reads for the admin Secuela page. Sign-in recording lives with
 * the group member service (`markSecuelaAttendance`).
 */
export { getSecuelaOverview } from './secuela-service'
export type { SecuelaOverview, SecuelaSummary } from './types'
