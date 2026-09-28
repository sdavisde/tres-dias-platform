import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { validateRedirectUrl } from '@/lib/redirect'
import { isNil } from 'lodash'
import { appendQueryParams } from '@/lib/url'

/**
 * Auth confirmation route that verifies token-hash email links (OTP flow).
 *
 * Used by the email change flow: with secure email change enabled, Supabase
 * sends a confirmation link to BOTH the current and the new address. Each link
 * lands here with ?token_hash=xxx&type=email_change. Unlike the PKCE
 * /auth/callback route, verifyOtp with a token hash works in any browser — no
 * code verifier cookie required — which matters because the old-address link
 * is often opened on a different device or in a session-less browser.
 *
 * After verifying we re-read the user: if `new_email` is still set, only one
 * of the two confirmations has landed, and the redirect carries
 * ?emailChange=pending so the UI can say "check your other inbox".
 *
 * `next` comes from the URL and is validated to a same-site path before any
 * redirect, including the invalid-token branch, so a forged link cannot send
 * the user off-site.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = validateRedirectUrl(searchParams.get('next'), '/profile')

  if (isNil(tokenHash) || isNil(type)) {
    logger.warn('Auth confirm called without token_hash or type parameter')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // verifyOtp may establish a session — collect its cookies here and apply
  // them to whichever redirect response we end up returning.
  const pendingCookies: {
    name: string
    value: string
    options?: CookieOptions
  }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          pendingCookies.push(...cookiesToSet)
        },
      },
    }
  )

  const redirectTo = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url))
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options)
    })
    return response
  }

  const { data, error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  })

  if (!isNil(error)) {
    logger.error(`Auth confirm token verification failed: ${error.message}`)
    if (type === 'email_change') {
      return redirectTo(appendQueryParams(next, { emailChange: 'error' }))
    }
    return redirectTo(
      '/login?message=Confirmation link is invalid or has expired. Please try again.'
    )
  }

  if (type === 'email_change') {
    // new_email still set means the change hasn't fully landed — with single
    // confirmation that shouldn't happen, but if double confirmation is ever
    // re-enabled the first click lands here as "pending".
    const pending = !isNil(data.user?.new_email)
    const status = pending ? 'pending' : 'complete'
    logger.info(`Email change confirmation verified (status: ${status})`)
    return redirectTo(appendQueryParams(next, { emailChange: status }))
  }

  logger.info(`Auth confirm verified ${type} token, redirecting to ${next}`)
  return redirectTo(next)
}
