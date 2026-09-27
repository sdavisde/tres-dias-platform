/**
 * Validates a redirect URL to prevent open redirect attacks.
 *
 * Security checks:
 * - Must be a relative path (starts with `/`)
 * - Blocks absolute URLs and protocol-relative URLs (`//evil.com`)
 * - Blocks `javascript:`, `data:`, and other dangerous protocols
 * - Blocks auth pages to prevent redirect loops
 * - Normalizes paths to prevent traversal attacks
 *
 * @param url - The URL to validate
 * @param defaultPath - The fallback path if validation fails (default: '/home')
 * @param options - `allowAuthPages` lists auth pages this caller may target
 * @returns A safe redirect URL
 */
import { isNil } from 'lodash'

export type RedirectOptions = {
  /**
   * Auth pages that this caller may legitimately redirect to. The auth routes
   * use it for `/reset-password`, which is otherwise blocked to avoid loops.
   */
  allowAuthPages?: string[]
}

export function validateRedirectUrl(
  url: string | null | undefined,
  defaultPath: string = '/home',
  options: RedirectOptions = {}
): string {
  if (isNil(url) || url === '') {
    return defaultPath
  }

  // Must start with exactly one forward slash (relative path)
  // Reject protocol-relative URLs like //evil.com
  if (!url.startsWith('/') || url.startsWith('//')) {
    return defaultPath
  }

  // Block dangerous protocols that might be encoded
  const lowerUrl = url.toLowerCase()
  if (
    lowerUrl.includes('javascript:') ||
    lowerUrl.includes('data:') ||
    lowerUrl.includes('vbscript:')
  ) {
    return defaultPath
  }

  // Block potential XSS characters
  if (/[<>"']/.test(url)) {
    return defaultPath
  }

  // Normalize the path to resolve any .. or . segments, then validate the
  // NORMALISED result. Checking only the raw input misses dot-segment tricks
  // like `/.//evil.com` or `/%2e%2e//evil.com`, which normalise to a
  // protocol-relative `//evil.com`.
  try {
    const base = 'http://localhost'
    const parsed = new URL(url, base)
    const normalized = parsed.pathname
    if (
      parsed.origin !== base ||
      normalized.startsWith('//') ||
      normalized.includes('\\') ||
      url.includes('\\')
    ) {
      return defaultPath
    }
    // Decode once and re-check: an encoded `//` or `..` that survived
    // normalisation must not be handed to the browser.
    let decoded: string
    try {
      decoded = decodeURIComponent(normalized)
    } catch {
      return defaultPath
    }
    if (
      decoded.startsWith('//') ||
      decoded.includes('\\') ||
      decoded.split('/').some((segment) => segment === '..')
    ) {
      return defaultPath
    }
    // Also preserve query string if present
    const queryIndex = url.indexOf('?')
    const queryString = queryIndex !== -1 ? url.slice(queryIndex) : ''
    const fullPath = normalized + queryString

    // Block redirects to auth pages to prevent loops
    const allowed = options.allowAuthPages ?? []
    const authPages = [
      '/login',
      '/join',
      '/forgot-password',
      '/reset-password',
    ].filter((page) => !allowed.includes(page))
    if (
      authPages.some(
        (page) => normalized === page || normalized.startsWith(page + '/')
      )
    ) {
      return defaultPath
    }

    // Block root path redirect (user should go to home instead)
    if (normalized === '/') {
      return defaultPath
    }

    return fullPath
  } catch {
    return defaultPath
  }
}
