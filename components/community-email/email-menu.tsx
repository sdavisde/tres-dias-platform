'use client'

import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Audience } from '@/services/community-email/types'
import { useStartEmail } from './use-start-email'

/** One "Write an email to…" choice: who it reaches, as the menu shows it. */
export type EmailChoice = { label: string; audience: Audience }

/** A sent email, already described for display. */
export type SentEmail = {
  id: string
  subject: string
  /** "DTTD #11 Men's team · 38 sent · Oct 12 · Jane Doe" */
  detail: string
}

export type EmailMenuProps = {
  /** Only the audiences the viewer may email; render nothing when empty. */
  choices: EmailChoice[]
  /** What already went out, so a co-leader doesn't send it twice. */
  sent?: SentEmail[]
}

/**
 * A small "Email" dropdown that sits with other page actions (beside Export
 * on the Team tab, in the secuela card). Each choice starts an email already
 * addressed to that audience.
 */
export function EmailMenu({ choices, sent = [] }: EmailMenuProps) {
  const { pending, start } = useStartEmail()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={pending}
          aria-label="Email"
        >
          <Mail className="h-4 w-4" />
          <span className="hidden sm:inline">Email</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-muted-foreground font-normal">
          Write an email to…
        </DropdownMenuLabel>
        {choices.map((choice) => (
          <DropdownMenuItem
            key={choice.label}
            onClick={() => start(choice.audience)}
          >
            {choice.label}
          </DropdownMenuItem>
        ))}
        {sent.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground font-normal">
              Already sent
            </DropdownMenuLabel>
            <ul className="max-h-60 divide-y overflow-y-auto px-2 text-sm">
              {sent.map((email) => (
                <li key={email.id} className="space-y-0.5 py-2">
                  <p className="font-medium">{email.subject}</p>
                  <p className="text-muted-foreground">{email.detail}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
