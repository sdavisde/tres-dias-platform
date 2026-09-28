'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { isNil } from 'lodash'
import { Button, type ButtonProps } from '@/components/ui/button'
import { isErr, type Result } from '@/lib/results'
import { toastError } from '@/lib/toast-error'
import {
  openBillingPortal,
  refreshBillingStatus,
  startSubscriptionCheckout,
} from '@/services/platform-billing/actions'
import { cn } from '@/lib/utils'

/**
 * Buttons that hand the admin to Stripe. Each calls its action, then sends the
 * browser to the URL Stripe returned; the pending state stays on through the
 * navigation so the button cannot be clicked twice. Touch targets are 44px.
 */

const TOUCH_TARGET = 'h-11 w-full sm:w-auto'

function useStripeRedirect(
  action: () => Promise<Result<string, string> | undefined>
) {
  const [pending, setPending] = useState(false)

  const run = async () => {
    setPending(true)
    const result = await action()
    if (isNil(result) || isErr(result)) {
      toastError('Unable to open Stripe billing. Please try again.', {
        error: result?.error ?? 'Action returned nothing',
      })
      setPending(false)
      return
    }
    window.location.assign(result.data)
  }

  return { pending, run }
}

export function SubscribeButton({
  className,
  variant,
}: {
  className?: string
  variant?: ButtonProps['variant']
}) {
  const { pending, run } = useStripeRedirect(startSubscriptionCheckout)
  return (
    <Button
      type="button"
      variant={variant}
      className={cn(TOUCH_TARGET, className)}
      disabled={pending}
      onClick={run}
    >
      {pending ? 'Opening Stripe…' : 'Subscribe'}
      {!pending && <ExternalLink className="size-4" />}
    </Button>
  )
}

export function PortalButton({
  children,
  className,
  variant = 'outline',
}: {
  children: ReactNode
  className?: string
  variant?: ButtonProps['variant']
}) {
  const { pending, run } = useStripeRedirect(openBillingPortal)
  return (
    <Button
      type="button"
      variant={variant}
      className={cn(TOUCH_TARGET, className)}
      disabled={pending}
      onClick={run}
    >
      {pending ? 'Opening Stripe…' : children}
      {!pending && <ExternalLink className="size-4" />}
    </Button>
  )
}

/** Re-reads the subscription from Stripe; for when the webhook is late. */
export function RefreshBillingButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)

  const run = async () => {
    setSaving(true)
    const result = await refreshBillingStatus()
    setSaving(false)
    if (isNil(result) || isErr(result)) {
      toastError('Unable to refresh billing from Stripe. Please try again.', {
        error: result?.error ?? 'Action returned nothing',
      })
      return
    }
    toast.success('Billing status refreshed from Stripe')
    startTransition(() => router.refresh())
  }

  const busy = saving || pending
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-11 sm:h-9"
      disabled={busy}
      onClick={run}
    >
      <RefreshCw className={cn('size-4', busy && 'animate-spin')} />
      Refresh
    </Button>
  )
}
