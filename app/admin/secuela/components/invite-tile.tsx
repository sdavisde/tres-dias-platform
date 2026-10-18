'use client'

import { Mail } from 'lucide-react'
import type { EmailMenuProps } from '@/components/community-email/email-menu'
import { useStartEmail } from '@/components/community-email/use-start-email'

/**
 * The third secuela tile, styled like Attended / Want to serve: one action
 * per audience the viewer may email.
 */
export function InviteTile({ choices }: EmailMenuProps) {
  const { pending, start } = useStartEmail()

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border bg-card px-4.5 py-4">
      {choices.map((choice) => (
        <button
          key={choice.label}
          type="button"
          disabled={pending}
          onClick={() => start(choice.audience)}
          className="flex items-center gap-2 text-left text-sm font-medium text-primary hover:underline disabled:opacity-50"
        >
          <Mail className="h-4 w-4" aria-hidden />
          Email {choice.label.toLowerCase()}
        </button>
      ))}
    </div>
  )
}
