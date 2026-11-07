'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

/** Private gag: only this address sees it; everyone else renders nothing. */
const TARGET_EMAIL = 'amyandted93@verizon.net'
const RICKROLL_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

/**
 * A one-and-done rickroll for a single person (the owner's mom). The scary
 * "security alert" copy is only bait: every way out of the dialog — the X,
 * Esc, clicking the backdrop, or the button — sends her straight to the
 * rick-astley video, which makes the joke obvious within a second or two.
 * It asks for nothing (no info, no phone number, no payment) and does nothing
 * to her machine. Delete this component and its mount in
 * `app/(member)/layout.tsx` to remove it.
 */
export function RickrollPopup({ email }: { email: string }) {
  const [open, setOpen] = useState(true)
  if (email.toLowerCase() !== TARGET_EMAIL) return null

  const rickroll = () => {
    setOpen(false)
    window.location.href = RICKROLL_URL
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && rickroll()}>
      <DialogContent
        className="border-red-500 text-center"
        onInteractOutside={rickroll}
      >
        <div className="space-y-3 py-2">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="text-xl font-bold text-red-600">
            ⚠️ SECURITY ALERT ⚠️
          </h2>
          <p className="font-medium">
            Suspicious activity detected on this device. Your account may have
            been compromised.
          </p>
          <p className="text-sm text-muted-foreground">
            Click below to secure your account immediately.
          </p>
          <Button variant="destructive" onClick={rickroll}>
            Secure My Account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
