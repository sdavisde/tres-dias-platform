import { ok } from '@/lib/results'
import type { User } from '@/lib/users/types'

// `server-only` is provided by Next's bundler, not an installed package.
jest.mock('server-only', () => ({}), { virtual: true })
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))
// Rendering is React Email's job; a marker per copy is enough here.
jest.mock('@react-email/render', () => ({
  render: jest.fn(async () => '<p>{{first_name}}</p>'),
}))
jest.mock('@/components/email/CommunityEmail', () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock('@/services/settings/settings-service', () => ({
  getSystemEmailFrom: jest.fn(async () => 'DTTD <hello@example.org>'),
}))
jest.mock('@/services/notifications/email-client', () => ({
  BATCH_SEND_LIMIT: 100,
  sendEmail: jest.fn(),
  sendBatchEmails: jest.fn(),
}))
jest.mock('./repository', () => ({
  claimDraftForSending: jest.fn(),
  releaseClaim: jest.fn(),
  findWeekendTeamMembers: jest.fn(),
  findUnsubscribedEmails: jest.fn(),
  insertRecipients: jest.fn(async () => ({ data: true })),
  finishSend: jest.fn(async () => ({ data: true })),
}))

import { sendBatchEmails } from '@/services/notifications/email-client'
import * as Repository from './repository'
import { sendBroadcast } from './community-email-service'

const mocked = <T extends (...args: never[]) => unknown>(fn: T) =>
  fn as unknown as jest.Mock

const sender = { email: 'head@example.org', firstName: 'Hal' } as User

/** A team of `size` people, plus one without an address. */
function team(size: number) {
  return [
    ...Array.from({ length: size }, (_, i) => ({
      email: `member${i}@example.org`,
      name: `Member ${i}`,
      firstName: `Member${i}`,
      userId: `user-${i}`,
    })),
    { email: null, name: 'No Email', firstName: 'No', userId: 'user-x' },
  ]
}

beforeEach(() => {
  process.env.EMAIL_UNSUBSCRIBE_SECRET = 'test-secret'
  jest.clearAllMocks()
  delete process.env.COMMUNITY_EMAIL_LIVE_SENDS
  mocked(Repository.claimDraftForSending).mockResolvedValue(
    ok({
      id: 'email-1',
      subject: 'Team meeting Saturday',
      body_html: '<p>See you there</p>',
      audience: { type: 'weekend_team', weekendId: 'mens' },
    })
  )
  mocked(Repository.findUnsubscribedEmails).mockResolvedValue(
    ok(['member3@example.org'])
  )
  mocked(sendBatchEmails).mockImplementation(async (_t, emails) =>
    ok(emails.map((_: unknown, i: number) => `resend-${i}`))
  )
})

describe('sendBroadcast', () => {
  it('sends every deliverable team member their own copy through Resend', async () => {
    process.env.COMMUNITY_EMAIL_LIVE_SENDS = 'true'
    mocked(Repository.findWeekendTeamMembers).mockResolvedValue(ok(team(150)))

    const result = await sendBroadcast(sender, 'email-1')

    // 150 members, one unsubscribed, the one without an address left out.
    expect(result).toEqual(
      ok({
        recipientCount: 149,
        sentCount: 149,
        failedCount: 0,
        skippedCount: 0,
      })
    )
    // Batches of at most 100, each with its own idempotency key.
    const calls = mocked(sendBatchEmails).mock.calls
    expect(calls.map(([, emails]) => emails.length)).toEqual([100, 49])
    expect(calls.map(([, , key]) => key)).toEqual([
      'community-email-email-1-0',
      'community-email-email-1-1',
    ])

    const sent = calls.flatMap(([, emails]) => emails)
    expect(sent.map((email) => email.to)).not.toContain('member3@example.org')
    expect(sent[0]).toMatchObject({
      to: 'member0@example.org',
      replyTo: 'head@example.org',
      subject: 'Team meeting Saturday',
      html: '<p>Member0</p>',
      headers: {
        'List-Unsubscribe': expect.stringContaining(
          '/api/email/unsubscribe?t='
        ),
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })
    expect(Repository.finishSend).toHaveBeenCalledWith(
      'email-1',
      'sent',
      expect.objectContaining({ sentCount: 149 })
    )
  })

  it('off production, only the sender is emailed and the rest are skipped', async () => {
    mocked(Repository.findWeekendTeamMembers).mockResolvedValue(
      ok([
        ...team(3),
        {
          email: 'head@example.org',
          name: 'Hal',
          firstName: 'Hal',
          userId: 'h',
        },
      ])
    )

    const result = await sendBroadcast(sender, 'email-1')

    expect(result).toEqual(
      ok({ recipientCount: 4, sentCount: 1, failedCount: 0, skippedCount: 3 })
    )
    const [[, emails]] = mocked(sendBatchEmails).mock.calls
    expect(emails.map((email: { to: string }) => email.to)).toEqual([
      'head@example.org',
    ])
  })
})
