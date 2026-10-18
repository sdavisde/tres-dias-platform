'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { isNil } from 'lodash'
import {
  Download,
  ExternalLink,
  FileText,
  MoreVertical,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/components/auth/session-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { MEETING_MINUTES_FOLDER } from '@/lib/files/constants'
import type { MeetingMinuteFile } from '@/lib/files/types'
import { isErr, isOk } from '@/lib/results'
import { Permission, userHasPermission } from '@/lib/security'
import { toastError } from '@/lib/toast-error'
import {
  deleteFileAction,
  getFileDownloadUrlAction,
  getFilePublicUrlAction,
} from '@/services/files/actions'
import { formatMinutesMeta } from './minutes-summary'

type MeetingMinutesListProps = {
  /** Most recent first; already trimmed to the handful the card shows. */
  files: MeetingMinuteFile[]
}

/**
 * The compact minutes list: file name, date and size, and a row action menu.
 * The full, sortable listing lives in Files — this card is a recent-first
 * shortcut, so it deliberately has no sorting or pagination of its own.
 */
export function MeetingMinutesList({ files }: MeetingMinutesListProps) {
  const router = useRouter()
  const { user } = useSession()
  const [pendingDelete, setPendingDelete] = useState<MeetingMinuteFile | null>(
    null
  )
  const [isDeleting, setIsDeleting] = useState(false)

  const canDelete =
    !isNil(user) && userHasPermission(user, [Permission.FILES_DELETE])

  const handleOpen = async (file: MeetingMinuteFile) => {
    const result = await getFilePublicUrlAction(
      MEETING_MINUTES_FOLDER,
      file.name
    )
    if (isOk(result)) {
      window.open(result.data.publicUrl, '_blank', 'noopener,noreferrer')
      return
    }
    toastError('Unable to open this file. Please try again.', {
      error: result.error,
    })
  }

  const handleDownload = async (file: MeetingMinuteFile) => {
    const result = await getFileDownloadUrlAction(
      MEETING_MINUTES_FOLDER,
      file.name
    )
    if (isErr(result)) {
      toastError('Unable to download this file. Please try again.', {
        error: result.error,
      })
      return
    }

    const anchor = document.createElement('a')
    anchor.href = result.data.downloadUrl
    anchor.download = file.name
    anchor.click()
  }

  const handleConfirmDelete = async () => {
    if (isNil(pendingDelete)) return

    setIsDeleting(true)
    const result = await deleteFileAction({
      storagePath: `${MEETING_MINUTES_FOLDER}/${pendingDelete.name}`,
    })
    setIsDeleting(false)

    if (isErr(result)) {
      toastError(
        `Unable to delete "${pendingDelete.name}". Please try again.`,
        {
          error: result.error,
        }
      )
      return
    }

    toast.success(`"${pendingDelete.name}" deleted`)
    setPendingDelete(null)
    router.refresh()
  }

  if (files.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No minutes yet. Upload the first set to get started.
      </p>
    )
  }

  return (
    <>
      <ul className="flex flex-col">
        {files.map((file) => {
          const meta = formatMinutesMeta(file)

          return (
            <li
              key={file.name}
              className="flex items-center gap-2.5 border-b border-divider py-1.5 last:border-b-0 md:py-1"
            >
              {/* Actions lead the row on desktop (site convention) and sit
                  top-right of the stacked row on a phone. */}
              <div className="order-3 shrink-0 md:order-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                    >
                      <MoreVertical className="size-4.5" />
                      <span className="sr-only">Actions for {file.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => handleOpen(file)}>
                      <ExternalLink className="size-4" />
                      Open
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleDownload(file)}>
                      <Download className="size-4" />
                      Download
                    </DropdownMenuItem>
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setPendingDelete(file)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <FileText className="order-1 size-4 shrink-0 text-primary md:order-2" />

              <button
                type="button"
                onClick={() => handleOpen(file)}
                className="order-2 flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-px text-left md:order-3 md:min-h-0"
              >
                <span
                  className="truncate text-[13.5px] font-semibold"
                  title={file.name}
                >
                  {file.name}
                </span>
                {meta !== '' && (
                  <span className="truncate text-xs tabular-nums text-muted-foreground">
                    {meta}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <DeleteConfirmationDialog
        isOpen={!isNil(pendingDelete)}
        title="Delete file"
        itemName={pendingDelete?.name}
        isDeleting={isDeleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        confirmText="Delete file"
      />
    </>
  )
}
