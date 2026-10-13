'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Plus } from 'lucide-react'
import { isNil } from 'lodash'
import { Button, type ButtonProps } from '@/components/ui/button'
import { isErr, type Result } from '@/lib/results'
import { toastError } from '@/lib/toast-error'
import {
  createCommunityEmail,
  duplicateCommunityEmail,
} from '@/services/community-email/actions'
import { cn } from '@/lib/utils'

/** Runs an action that returns a new draft's id, then opens that draft. */
function useOpenNewDraft(
  action: () => Promise<Result<string, string> | undefined>
) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const run = async () => {
    setPending(true)
    const result = await action()
    if (isNil(result) || isErr(result)) {
      toastError('Unable to start a new email. Please try again.', {
        error: result?.error ?? 'Action returned nothing',
      })
      setPending(false)
      return
    }
    router.push(`/admin/email/${result.data}`)
  }

  return { pending, run }
}

/** "New email" is an explicit Create: drafts auto-save once they exist. */
export function NewEmailButton({ className }: { className?: string }) {
  const { pending, run } = useOpenNewDraft(createCommunityEmail)
  return (
    <Button
      type="button"
      className={cn('h-11 w-full sm:w-auto', className)}
      disabled={pending}
      onClick={run}
    >
      <Plus className="size-4" />
      {pending ? 'Starting…' : 'New email'}
    </Button>
  )
}

export function DuplicateEmailButton({
  emailId,
  variant = 'outline',
}: {
  emailId: string
  variant?: ButtonProps['variant']
}) {
  const { pending, run } = useOpenNewDraft(() =>
    duplicateCommunityEmail(emailId)
  )
  return (
    <Button
      type="button"
      variant={variant}
      className="h-11 w-full sm:w-auto"
      disabled={pending}
      onClick={run}
    >
      <Copy className="size-4" />
      {pending ? 'Copying…' : 'Duplicate'}
    </Button>
  )
}
