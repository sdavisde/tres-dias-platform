'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { isNil } from 'lodash'
import { toast } from 'sonner'

/**
 * Reads the `?checkout=` flag Stripe sends the admin back with, shows one
 * toast, and strips the params from the address bar so a reload or a shared
 * link does not repeat it. Mount inside a Suspense boundary (useSearchParams).
 */
export function CheckoutReturnToast() {
  const searchParams = useSearchParams()
  const checkout = searchParams.get('checkout')

  useEffect(() => {
    if (isNil(checkout)) return

    if (checkout === 'success') {
      toast.success("You're subscribed. Stripe will email the receipt.")
    } else if (checkout === 'canceled') {
      toast('Nothing was charged.')
    }

    const next = new URLSearchParams(searchParams)
    next.delete('checkout')
    next.delete('session_id')
    const query = next.toString()
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${query !== '' ? `?${query}` : ''}`
    )
    // Only the flag itself matters; the params identity changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout])

  return null
}
