import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { logger } from '@/lib/logger'
import { validateRedirectUrl } from '@/lib/redirect'
import { isNil } from 'lodash'

/**
 * Auth callback route that handles Supabase PKCE code exchange.
 *
 * Used by:
 * - Password reset flow: user clicks email link → Supabase verifies →
 *   redirects here with ?code=xxx → we exchange for session → redirect to /reset-password
 * - OAuth flow (e.g. Google): provider callback → Supabase → redirects here
 *   with ?code=xxx → we exchange for session → redirect to /home
 *
 * The `next` query param tells us where to redirect after code exchange.
 * Defaults to /home for general auth, but password reset sets it to /reset-password.
 * `next` comes from the URL, so it is validated to a same-site path before use:
 * an absolute or protocol-relative value falls back to /home.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const next = validateRedirectUrl(searchParams.get('next'), '/home', {
    allowAuthPages: ['/reset-password'],
  })

  if (!isNil(code)) {
    const response = NextResponse.redirect(new URL(next, request.url))

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!isNil(error)) {
      logger.error(`Auth callback code exchange failed: ${error.message}`)
      return NextResponse.redirect(
        new URL(
          '/login?message=Authentication failed. Please try again.',
          request.url
        )
      )
    }

    logger.info(
      `Auth callback code exchange successful, redirecting to ${next}`
    )
    return response
  }

  // No code provided — redirect to login
  logger.warn('Auth callback called without code parameter')
  return NextResponse.redirect(new URL('/login', request.url))
}
