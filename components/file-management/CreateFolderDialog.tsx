'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { isNil } from 'lodash'
import { FolderPlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isDevMode } from '@/lib/dev-mode'
import { validateFolderName } from '@/lib/files/browser'
import { isErr } from '@/lib/results'
import { logger } from '@/lib/logger'
import { createFolderAction } from '@/services/files/actions'

type CreateFolderDialogProps = {
  /** Real storage path of the folder being viewed; '' for the top level */
  parentPath: string
  /** Friendly name of where the folder will land, e.g. "Team Handbooks" */
  parentLabel: string
}

/** The one create-folder flow, reachable from every level of the Files page. */
export function CreateFolderDialog({
  parentPath,
  parentLabel,
}: CreateFolderDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setName('')
      setError(null)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const validName = validateFolderName(name)
    if (isErr(validName)) {
      setError(validName.error)
      return
    }

    setSaving(true)
    setError(null)
    const result = await createFolderAction({
      parentPath,
      name: validName.data,
    })
    setSaving(false)

    if (isErr(result)) {
      logger.error({ error: result.error, parentPath }, 'Create folder failed')
      setError(
        result.error.includes('already exists')
          ? 'A folder with this name already exists here.'
          : 'Unable to create the folder. Please try again.'
      )
      return
    }

    toast.success(`Folder "${validName.data}" created`)
    handleOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="default">
          <FolderPlus className="size-4" />
          New folder
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>
              This folder will be created in {parentLabel}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="new-folder-name">Folder name</Label>
            <Input
              id="new-folder-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={saving}
              placeholder="e.g. Team Handbooks"
              aria-invalid={!isNil(error)}
              className="h-11 md:h-9.5"
            />
            {!isNil(error) && <p className="text-sm text-error">{error}</p>}
          </div>

          <DialogFooter className="gap-2">
            {isDevMode() && (
              <Button
                type="button"
                variant="ghost"
                className="sm:mr-auto"
                onClick={() => setName(`Test Folder ${Date.now() % 10000}`)}
              >
                Fill with test data
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || name.trim() === ''}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Create folder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
