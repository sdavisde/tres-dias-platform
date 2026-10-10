import { isNil } from 'lodash'
import { CheckCircle, Clock } from 'lucide-react'
import { isErr, isOk, Results } from '@/lib/results'
import { formatDateTime } from '@/lib/utils'
import { getLoggedInUser } from '@/services/identity/user'
import { markSecuelaAttendance } from '@/services/weekend-group-member'
import { PageContent } from '@/components/member/page-content'

export default async function SecuelaSignInPage() {
  const userResult = await getLoggedInUser()

  if (isErr(userResult)) {
    return (
      <PageContent className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">
          Something went wrong. Please try again later.
        </p>
      </PageContent>
    )
  }

  const user = userResult.data
  const result = await markSecuelaAttendance(user.id)

  // Reached before sign-ins open (e.g. a saved link): nothing was recorded
  if (isOk(result) && result.data.status === 'not_open') {
    const startsAt = formatDateTime(result.data.startsAt)
    const startTime =
      typeof startsAt === 'string' ? 'its scheduled time' : startsAt.timeStr
    return (
      <PageContent className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-6 max-w-md text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <Clock className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Registration hasn&apos;t started yet
            </h1>
            <p className="text-muted-foreground">
              Secuela starts at {startTime}. Come back once it begins.
            </p>
          </div>
        </div>
      </PageContent>
    )
  }

  const groupNumber = Results.unwrapOr(
    Results.map(result, (r) => r.groupNumber),
    null
  )
  const weekendLabel = !isNil(groupNumber)
    ? `DTTD #${groupNumber}`
    : 'the upcoming weekend'

  return (
    <PageContent className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Thank you for volunteering to serve on {weekendLabel}!
          </h1>
          <p className="text-muted-foreground">
            We are so grateful for your willingness to serve. You will receive
            more information soon.
          </p>
        </div>
      </div>
    </PageContent>
  )
}
