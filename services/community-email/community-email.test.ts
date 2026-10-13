import {
  chunk,
  finalStatus,
  isDeliverable,
  resolveDeliveryMode,
  summarizeAudience,
} from './recipients'
import {
  isBodyEmpty,
  personalize,
  personalizeSubject,
  sanitizeBody,
} from './content'
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from './unsubscribe-token'
import type { AudienceMember } from './types'

const member = (
  email: string | null,
  name: string | null = null
): AudienceMember => ({
  email,
  name,
  firstName: name?.split(' ')[0] ?? null,
  userId: null,
})

describe('summarizeAudience', () => {
  it('drops missing addresses, de-duplicates case-insensitively, and removes unsubscribes', () => {
    const summary = summarizeAudience(
      [
        member('Ann@Example.com', 'Ann One'),
        member('ann@example.com', 'Ann Again'),
        member(null, 'No Email'),
        member('not an email', 'Typo'),
        member('bob@example.com', 'Bob'),
        member('cat@example.com', 'Cat'),
      ],
      new Set(['bob@example.com'])
    )

    expect(summary.recipients.map((r) => [r.email, r.name])).toEqual([
      ['ann@example.com', 'Ann One'],
      ['cat@example.com', 'Cat'],
    ])
    expect(summary.missingEmailCount).toBe(2)
    expect(summary.unsubscribedCount).toBe(1)
  })
})

describe('resolveDeliveryMode', () => {
  it('sends to everyone on production', () => {
    expect(resolveDeliveryMode({ VERCEL_ENV: 'production' }, 'a@b.co')).toEqual(
      { kind: 'live' }
    )
  })

  it('only emails the sender and the allowlist elsewhere', () => {
    const mode = resolveDeliveryMode(
      {
        VERCEL_ENV: 'preview',
        COMMUNITY_EMAIL_SANDBOX_ALLOWLIST: ' Tester@Example.com, ,x@y.co',
      },
      'Admin@Example.com'
    )
    expect(mode).toEqual({
      kind: 'sandbox',
      allowed: ['admin@example.com', 'tester@example.com', 'x@y.co'],
    })
    expect(isDeliverable(mode, 'ADMIN@example.com')).toBe(true)
    expect(isDeliverable(mode, 'member@example.com')).toBe(false)
  })

  it('can be switched live on purpose', () => {
    expect(
      resolveDeliveryMode(
        { VERCEL_ENV: 'preview', COMMUNITY_EMAIL_LIVE_SENDS: 'true' },
        null
      )
    ).toEqual({ kind: 'live' })
  })
})

describe('finalStatus and chunk', () => {
  it('is failed only when nothing was sent and something failed', () => {
    expect(finalStatus({ sentCount: 0, failedCount: 3 })).toBe('failed')
    expect(finalStatus({ sentCount: 1, failedCount: 3 })).toBe('sent')
    expect(finalStatus({ sentCount: 0, failedCount: 0 })).toBe('sent')
  })

  it('splits into batches', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })
})

describe('content', () => {
  it('strips anything the editor cannot produce', () => {
    const html = sanitizeBody(
      '<p onclick="x()">Hi <script>alert(1)</script><a href="javascript:x()">bad</a> <a href="https://dttd.org">ok</a></p><img src="x">'
    )
    expect(html).toBe(
      '<p>Hi <a target="_blank" rel="noopener noreferrer">bad</a> <a href="https://dttd.org" target="_blank" rel="noopener noreferrer">ok</a></p>'
    )
  })

  it('knows an empty editor', () => {
    expect(isBodyEmpty('<p></p>')).toBe(true)
    expect(isBodyEmpty('<p> </p><p><br></p>')).toBe(true)
    expect(isBodyEmpty('<p>Hello</p>')).toBe(false)
  })

  it('fills first names (escaped) and each unsubscribe link', () => {
    const html = personalize(
      '<p>Hi {{first_name}}, {{ first_name }}</p><a href="https://unsubscribe.invalid/__TOKEN__">x</a>',
      { firstName: '<Ann>', unsubscribeUrl: 'https://site/unsubscribe?t=abc' }
    )
    expect(html).toBe(
      '<p>Hi &lt;Ann&gt;, &lt;Ann&gt;</p><a href="https://site/unsubscribe?t=abc">x</a>'
    )
    expect(personalizeSubject('For {{first_name}}', null)).toBe('For friend')
  })
})

describe('unsubscribe tokens', () => {
  const previous = process.env.EMAIL_UNSUBSCRIBE_SECRET

  beforeAll(() => {
    process.env.EMAIL_UNSUBSCRIBE_SECRET = 'test-secret'
  })

  afterAll(() => {
    process.env.EMAIL_UNSUBSCRIBE_SECRET = previous
  })

  it('round-trips the normalized address', () => {
    const token = createUnsubscribeToken(' Ann@Example.com ')
    expect(verifyUnsubscribeToken(token)).toBe('ann@example.com')
  })

  it('rejects forged and malformed tokens', () => {
    const token = createUnsubscribeToken('ann@example.com')
    const [, signature] = token.split('.')
    const forged = `${Buffer.from('bob@example.com').toString('base64url')}.${signature}`

    expect(verifyUnsubscribeToken(forged)).toBeNull()
    expect(verifyUnsubscribeToken('nope')).toBeNull()
    expect(verifyUnsubscribeToken(`${token}.extra`)).toBeNull()
    expect(verifyUnsubscribeToken(null)).toBeNull()
  })
})
