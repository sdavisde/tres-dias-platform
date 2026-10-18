'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { isNil } from 'lodash'
import { isErr } from '@/lib/results'
import { toastError } from '@/lib/toast-error'
import { createCommunityEmailFor } from '@/services/community-email/actions'
import type { Audience } from '@/services/community-email/types'

/**
 * Starts an email already addressed to an audience and opens it; Back
 * returns to the current page.
 */
export function useStartEmail() {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, setPending] = useState(false)

  const start = async (audience: Audience) => {
    setPending(true)
    const result = await createCommunityEmailFor(audience)
    if (isNil(result) || isErr(result)) {
      toastError('Unable to start a new email. Please try again.', {
        error: result?.error ?? 'Action returned nothing',
      })
      setPending(false)
      return
    }
    router.push(`/email/${result.data}?back=${encodeURIComponent(pathname)}`)
  }

  return { pending, start }
}
