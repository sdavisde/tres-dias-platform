import { NextResponse, type NextRequest } from 'next/server'
import { isNil } from 'lodash'
import { logger } from '@/lib/logger'
import { isErr } from '@/lib/results'
import { unsubscribe } from '@/services/community-email/community-email-service'
import { verifyUnsubscribeToken } from '@/services/community-email/unsubscribe-token'

/**
 * RFC 8058 one-click unsubscribe: the target of every community email's
 * `List-Unsubscribe` header. Gmail and Yahoo POST here when someone presses
 * their built-in "Unsubscribe" button, with no session and no page in
 * between, so the signed token is the only authorization.
 */
export async function POST(request: NextRequest) {
  const email = verifyUnsubscribeToken(request.nextUrl.searchParams.get('t'))
  if (isNil(email)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const result = await unsubscribe(email, 'one_click')
  if (isErr(result)) {
    logger.error({ error: result.error }, 'One-click unsubscribe failed')
    return NextResponse.json({ error: 'Unsubscribe failed' }, { status: 500 })
  }

  return NextResponse.json({ unsubscribed: true })
}

/** A person (not a mail client) following the header link: ask first. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = '/unsubscribe'
  return NextResponse.redirect(url)
}
