'use client'

import { useState } from 'react'
import { isNil } from 'lodash'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isErr } from '@/lib/results'
import { toastError } from '@/lib/toast-error'
import { unsubscribeFromCommunityEmail } from '@/services/community-email/actions'

export function UnsubscribeButton({ token }: { token: string }) {
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)

  if (done) {
    return (
      <p className="flex items-center gap-2 text-sm" role="status">
        <CheckCircle2 className="size-4 text-primary" />
        You&apos;re unsubscribed. You won&apos;t get community emails anymore.
      </p>
    )
  }

  return (
    <Button
      className="h-11 w-full"
      disabled={pending}
      onClick={async () => {
        setPending(true)
        const result = await unsubscribeFromCommunityEmail(token)
        setPending(false)
        if (isNil(result) || isErr(result)) {
          toastError('Unable to unsubscribe. Please try again.', {
            error: result?.error,
          })
          return
        }
        setDone(true)
      }}
    >
      {pending ? 'Unsubscribing…' : 'Unsubscribe'}
    </Button>
  )
}
