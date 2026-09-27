'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import { isNil } from 'lodash'

/**
 * Global error boundary for catching errors in the root layout.
 * This component must define its own <html> and <body> tags since
 * it replaces the root layout when an error occurs.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error - the digest can be used to correlate with server-side logs
    console.error('Global error caught:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
    Sentry.captureException(error, { extra: { digest: error.digest } })
  }, [error])

  return (
    <html lang="en">
      <body className="font-sans antialiased bg-background text-foreground">
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Something went wrong</CardTitle>
              <CardDescription className="text-base">
                We&apos;ve been notified and are looking into the issue.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                <span>
                  If this problem persists, please try refreshing the page or
                  contact
                </span>
                <a
                  href="mailto:admin@dustytrailstresdias.org"
                  className="text-blue-400 mx-1 hover:underline"
                >
                  admin@dustytrailstresdias.org
                </a>
                <br />
                <span>with the following error code:</span>
              </p>
              {!isNil(error.digest) && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Error ID: {error.digest}
                </p>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button onClick={reset} className="w-full">
                Try again
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => (window.location.href = '/')}
              >
                Go to homepage
              </Button>
            </CardFooter>
          </Card>
        </div>
      </body>
    </html>
  )
}
