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
import { AlertTriangle, Heart } from 'lucide-react'
import Link from 'next/link'
import { logger } from '@/lib/logger'
import { isNil } from 'lodash'

function ErrorNavbar() {
  return (
    <nav className="bg-primary text-white px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-start ms-2">
          <Link href="/" className="font-bold text-xl md:text-2xl">
            <span className="hidden md:inline">Dusty Trails Tres Dias</span>
            <span className="md:hidden">DTTD</span>
          </Link>
        </div>
        <Button variant="outline" href="/">
          Home
        </Button>
      </div>
    </nav>
  )
}

function ErrorFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto p-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-muted-foreground text-sm text-center">
            © {currentYear} Dusty Trails Tres Dias. All rights reserved.
          </p>
          <p className="text-muted-foreground text-sm flex items-center gap-1">
            Made with <Heart size={14} color="#ef4444" /> for our community
          </p>
        </div>
      </div>
    </footer>
  )
}

/**
 * Error boundary for catching errors in nested routes.
 * This component renders within the root layout.
 * Uses simplified navbar/footer to avoid server component dependencies.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // The error digest can be used to correlate with server-side logs
    Sentry.captureException(error, { extra: { digest: error.digest } })
  }, [error])

  return (
    <div className="flex min-h-screen flex-col">
      <ErrorNavbar />
      <main className="flex flex-1 items-center justify-center p-4">
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
            <Button variant="outline" className="w-full" href="/">
              Go to homepage
            </Button>
          </CardFooter>
        </Card>
      </main>
      <ErrorFooter />
    </div>
  )
}
