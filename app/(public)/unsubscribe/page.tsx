import { isNil } from 'lodash'
import { MailX } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { COMMUNITY_DISPLAY_NAME } from '@/lib/weekend/constants'
import { verifyUnsubscribeToken } from '@/services/community-email/unsubscribe-token'
import { UnsubscribeButton } from './components/unsubscribe-button'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/**
 * Where the link at the bottom of every community email lands. Asks before
 * unsubscribing, because mail scanners follow links in emails and must not
 * unsubscribe anyone by visiting this page.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { t } = await searchParams
  const token = typeof t === 'string' ? t : null
  const email = verifyUnsubscribeToken(token)

  return (
    <div className="flex flex-1 items-start justify-center px-4 py-12 sm:py-20">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <MailX className="size-8 text-muted-foreground" />
          <CardTitle className="font-serif text-2xl">
            {isNil(email) ? 'This link has expired' : 'Unsubscribe'}
          </CardTitle>
          <CardDescription>
            {isNil(email)
              ? 'This unsubscribe link is not valid. Use the link at the bottom of the most recent email you received.'
              : `Stop community emails from ${COMMUNITY_DISPLAY_NAME} to ${email}? You'll still get emails about your own forms and payments.`}
          </CardDescription>
        </CardHeader>
        {!isNil(email) && !isNil(token) && (
          <CardContent>
            <UnsubscribeButton token={token} />
          </CardContent>
        )}
      </Card>
    </div>
  )
}
