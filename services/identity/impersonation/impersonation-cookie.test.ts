import {
  IMPERSONATION_COOKIE_MAX_AGE_SECONDS,
  signImpersonationCookie,
  verifyImpersonationCookie,
} from './impersonation-cookie'

const SECRET = 'test-secret-that-is-long-enough-for-hmac'
const NOW = 1_790_000_000_000
const payload = {
  targetUserId: '11111111-1111-4111-8111-111111111111',
  adminUserId: '22222222-2222-4222-8222-222222222222',
  iat: NOW,
}

describe('impersonation cookie signing', () => {
  it('round-trips a valid cookie', () => {
    const cookie = signImpersonationCookie(payload, SECRET)
    expect(verifyImpersonationCookie(cookie, SECRET, NOW + 1000)).toEqual(
      payload
    )
  })

  it('rejects a raw user id (the pre-Unit-2 cookie format)', () => {
    expect(
      verifyImpersonationCookie(payload.targetUserId, SECRET, NOW)
    ).toBeNull()
  })

  it('rejects a tampered payload', () => {
    const cookie = signImpersonationCookie(payload, SECRET)
    const [, sig] = cookie.split('.')
    const forgedBody = Buffer.from(
      JSON.stringify({ ...payload, targetUserId: payload.adminUserId }),
      'utf8'
    ).toString('base64url')
    expect(
      verifyImpersonationCookie(`${forgedBody}.${sig}`, SECRET, NOW)
    ).toBeNull()
  })

  it('rejects a tampered signature', () => {
    const cookie = signImpersonationCookie(payload, SECRET)
    const flipped = cookie.slice(0, -1) + (cookie.endsWith('A') ? 'B' : 'A')
    expect(verifyImpersonationCookie(flipped, SECRET, NOW)).toBeNull()
  })

  it('rejects a cookie signed with a different secret', () => {
    const cookie = signImpersonationCookie(payload, 'another-secret')
    expect(verifyImpersonationCookie(cookie, SECRET, NOW)).toBeNull()
  })

  it('rejects an expired cookie and one issued in the future', () => {
    const cookie = signImpersonationCookie(payload, SECRET)
    const tooLate = NOW + (IMPERSONATION_COOKIE_MAX_AGE_SECONDS + 1) * 1000
    expect(verifyImpersonationCookie(cookie, SECRET, tooLate)).toBeNull()
    expect(verifyImpersonationCookie(cookie, SECRET, NOW - 1)).toBeNull()
  })

  it('rejects empty, missing and malformed values', () => {
    expect(verifyImpersonationCookie(undefined, SECRET, NOW)).toBeNull()
    expect(verifyImpersonationCookie('', SECRET, NOW)).toBeNull()
    expect(verifyImpersonationCookie('no-dot-here', SECRET, NOW)).toBeNull()
    expect(verifyImpersonationCookie('.sig', SECRET, NOW)).toBeNull()
    expect(verifyImpersonationCookie('body.', SECRET, NOW)).toBeNull()
  })
})
