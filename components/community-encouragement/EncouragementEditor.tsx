'use client'

import { useState, useTransition } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { HeartHandshake, Loader2, Pencil, Save, Trash2, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { updateCommunityEncouragement } from '@/services/community'
import { isErr } from '@/lib/results'
import type { CommunityEncouragement } from '@/services/community'
import { useRouter } from 'next/navigation'
import { isEmpty, isNil } from 'lodash'

interface EncouragementEditorProps {
  initialEncouragement: CommunityEncouragement | null
  canEdit: boolean
}

export function EncouragementEditor({
  initialEncouragement,
  canEdit,
}: EncouragementEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState(initialEncouragement?.message ?? '')
  const [tempMessage, setTempMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleOpenDialog = () => {
    if (!canEdit) return

    setTempMessage(message)
    setError(null)
    setIsOpen(true)
  }

  const handleSave = () => {
    setError(null)
    if (!canEdit) return

    startTransition(async () => {
      const result = await updateCommunityEncouragement({
        messageId: initialEncouragement?.id ?? '',
        message: tempMessage,
      })
      if (isErr(result)) {
        setError(result.error)
        return
      }

      setMessage(tempMessage)
      setIsOpen(false)
      router.refresh()
    })
  }

  const handleCancel = () => {
    setIsOpen(false)
    setError(null)
  }

  const handleRemove = () => {
    if (!canEdit) return

    startTransition(async () => {
      const result = await updateCommunityEncouragement({
        messageId: initialEncouragement?.id ?? '',
        message: '',
      })
      if (isErr(result)) {
        setError(result.error)
        return
      }

      setMessage('')
      router.refresh()
    })
  }

  if (isEmpty(message) && !canEdit) {
    return null
  }

  return (
    <>
      {isEmpty(message) ? (
        <Button onClick={handleOpenDialog} variant="outline" className="gap-2">
          <Pencil className="h-4 w-4" />
          Create Community Encouragement
        </Button>
      ) : (
        <Alert
          variant="success"
          className="relative border-success/40 bg-success/5"
        >
          <HeartHandshake />
          <AlertTitle>Community Encouragement</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">
            {message}
          </AlertDescription>
          {canEdit && (
            <div className="mt-3 flex gap-2 sm:absolute sm:right-4 sm:top-4 sm:mt-0">
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenDialog}
                className="gap-2"
                disabled={isPending}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRemove}
                className="gap-2"
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          )}
        </Alert>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {isEmpty(message) ? 'Create' : 'Edit'} Community Encouragement
            </DialogTitle>
            <DialogDescription>
              Share an encouragement or prayer focus with the community. This
              message will be visible to everyone on the homepage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium">
                Message
              </label>
              <Textarea
                id="message"
                value={tempMessage}
                onChange={(e) => setTempMessage(e.target.value)}
                placeholder="Type your encouragement for the community here..."
                rows={6}
                className="resize-none"
              />
            </div>

            {!isNil(error) && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
