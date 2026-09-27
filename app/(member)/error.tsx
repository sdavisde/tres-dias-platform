'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { logger } from '@/lib/logger'

type MemberErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function MemberError({ error, reset }: MemberErrorProps) {
  useEffect(() => {
    logger.error(error, 'Member page error boundary')
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center">
        <Typography variant="h2">Something went wrong</Typography>
        <Typography variant="muted" className="mt-2">
          This page hit a problem while loading. Nothing was lost — you can try
          again, or head back home.
        </Typography>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/home">Back home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
