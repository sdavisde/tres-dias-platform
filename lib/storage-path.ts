import { isNil } from 'lodash'

/**
 * Accepts a storage object path only when it is relative, non-empty and has no
 * `.` / `..` segments or backslashes, so a caller cannot escape the folder a
 * download link points at. Returns the normalized path or null.
 */
export function normalizeStoragePath(raw: string | null): string | null {
  if (isNil(raw)) return null
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed.startsWith('/') || trimmed.includes('\\')) {
    return null
  }
  const segments = trimmed.split('/')
  if (segments.some((s) => s === '' || s === '.' || s === '..')) {
    return null
  }
  return segments.join('/')
}
