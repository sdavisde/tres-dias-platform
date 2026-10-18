'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isNil } from 'lodash'
import {
  Download,
  ExternalLink,
  FileText,
  Folder,
  FolderOpen,
  MoreVertical,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { useSession } from '@/components/auth/session-provider'
import { createClient } from '@/lib/supabase/client'
import { COMMUNITY_FILES_BUCKET } from '@/lib/files/constants'
import {
  filesHref,
  type FileBrowserEntry,
  type FilesArea,
} from '@/lib/files/browser'
import { formatFileSize } from '@/lib/files/upload-errors'
import { isErr } from '@/lib/results'
import { Permission, userHasPermission } from '@/lib/security'
import { toastError } from '@/lib/toast-error'
import { cn, formatTimestampDate } from '@/lib/utils'
import { deleteFileAction, deleteFolderAction } from '@/services/files/actions'

type FileBrowserTableProps = {
  /** Member Documents is browse-only: no delete, whatever the viewer's permissions */
  area: FilesArea
  entries: FileBrowserEntry[]
  /** Line below the listing, e.g. "2 folders and 5 files in Team Handbooks" */
  caption: string
  /** Shown in place of the listing when there is nothing to show */
  emptyMessage: string
}

const HEAD_CLASS =
  'h-auto px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground'

function EntryIcon({
  entry,
  className,
}: {
  entry: FileBrowserEntry
  className?: string
}) {
  return entry.kind === 'folder' ? (
    <Folder className={cn('shrink-0 text-primary', className)} />
  ) : (
    <FileText className={cn('shrink-0 text-muted-foreground', className)} />
  )
}

const formatSize = (entry: FileBrowserEntry) =>
  isNil(entry.size) ? '—' : formatFileSize(entry.size)

const formatUpdated = (entry: FileBrowserEntry) =>
  isNil(entry.updatedAt) ? '—' : formatTimestampDate(entry.updatedAt)

/**
 * The single Files listing: folders and files interleaved (folders first).
 * Folder rows navigate into the folder; file rows open the file.
 */
export function FileBrowserTable({
  area,
  entries,
  caption,
  emptyMessage,
}: FileBrowserTableProps) {
  const router = useRouter()
  const { user } = useSession()
  const supabase = useMemo(() => createClient(), [])
  const [pendingDelete, setPendingDelete] = useState<FileBrowserEntry | null>(
    null
  )
  const [isDeleting, setIsDeleting] = useState(false)

  const canDelete =
    area === 'admin' &&
    !isNil(user) &&
    userHasPermission(user, [Permission.FILES_DELETE])

  const fileUrl = (entry: FileBrowserEntry) =>
    supabase.storage
      .from(COMMUNITY_FILES_BUCKET)
      .getPublicUrl(entry.storagePath).data.publicUrl

  const openEntry = (entry: FileBrowserEntry) => {
    if (entry.kind === 'folder') {
      router.push(filesHref(area, entry.slugs))
    } else {
      window.open(fileUrl(entry), '_blank', 'noopener,noreferrer')
    }
  }

  const handleDownload = async (entry: FileBrowserEntry) => {
    const { data, error } = await supabase.storage
      .from(COMMUNITY_FILES_BUCKET)
      .download(entry.storagePath)
    if (!isNil(error) || isNil(data)) {
      toastError('Unable to download this file. Please try again.', { error })
      return
    }
    const url = window.URL.createObjectURL(data)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = entry.name
    anchor.click()
    window.URL.revokeObjectURL(url)
  }

  const handleConfirmDelete = async () => {
    if (isNil(pendingDelete)) return
    setIsDeleting(true)
    const result =
      pendingDelete.kind === 'folder'
        ? await deleteFolderAction({ storagePath: pendingDelete.storagePath })
        : await deleteFileAction({ storagePath: pendingDelete.storagePath })
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

  const renderName = (entry: FileBrowserEntry, className?: string) =>
    entry.kind === 'folder' ? (
      <Link
        href={filesHref(area, entry.slugs)}
        onClick={(event) => event.stopPropagation()}
        className={cn('truncate font-semibold hover:underline', className)}
      >
        {entry.name}
      </Link>
    ) : (
      <a
        href={fileUrl(entry)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        className={cn('truncate hover:underline', className)}
        title={entry.name}
      >
        {entry.name}
      </a>
    )

  const renderActions = (entry: FileBrowserEntry) => (
    <div onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <MoreVertical className="size-4.5" />
            <span className="sr-only">Actions for {entry.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => openEntry(entry)}>
            {entry.kind === 'folder' ? (
              <FolderOpen className="size-4" />
            ) : (
              <ExternalLink className="size-4" />
            )}
            Open
          </DropdownMenuItem>
          {entry.kind === 'file' && (
            <DropdownMenuItem onSelect={() => handleDownload(entry)}>
              <Download className="size-4" />
              Download
            </DropdownMenuItem>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setPendingDelete(entry)}
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  const emptyState = (
    <p className="py-10 text-center text-muted-foreground">{emptyMessage}</p>
  )

  return (
    <div className="min-w-0 flex-1 space-y-3">
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-md border bg-card md:block">
        {entries.length === 0 ? (
          emptyState
        ) : (
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(HEAD_CLASS, 'w-14')}>
                  <span className="sr-only">Actions</span>
                </TableHead>
                <TableHead className={HEAD_CLASS}>Name</TableHead>
                <TableHead className={cn(HEAD_CLASS, 'w-32')}>
                  Updated
                </TableHead>
                <TableHead className={cn(HEAD_CLASS, 'w-28')}>Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow
                  key={`${entry.kind}:${entry.storagePath}`}
                  className="cursor-pointer border-divider"
                  onClick={() => openEntry(entry)}
                >
                  <TableCell className="py-1.5 pl-3 pr-1">
                    {renderActions(entry)}
                  </TableCell>
                  <TableCell className="px-4 py-2 text-[14.5px]">
                    <div className="flex min-w-0 items-center gap-3">
                      <EntryIcon entry={entry} className="size-4.5" />
                      {renderName(entry)}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-2 tabular-nums text-muted-foreground">
                    {formatUpdated(entry)}
                  </TableCell>
                  <TableCell className="px-4 py-2 tabular-nums text-muted-foreground">
                    {formatSize(entry)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {entries.length === 0 ? (
          <div className="rounded-lg border bg-card">{emptyState}</div>
        ) : (
          entries.map((entry) => (
            <div
              key={`${entry.kind}:${entry.storagePath}`}
              className="cursor-pointer space-y-2 rounded-lg border bg-card p-4"
              onClick={() => openEntry(entry)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-h-11 min-w-0 items-center gap-3">
                  <EntryIcon entry={entry} className="size-5" />
                  {renderName(
                    entry,
                    'text-lg font-medium break-words whitespace-normal'
                  )}
                </div>
                <div className="-mt-1 -mr-2 shrink-0">
                  {renderActions(entry)}
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex gap-2">
                  <span className="w-16 text-muted-foreground">Updated</span>
                  <span className="tabular-nums">{formatUpdated(entry)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-16 text-muted-foreground">Size</span>
                  <span className="tabular-nums">
                    {entry.kind === 'folder' ? 'Folder' : formatSize(entry)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-[13.5px] text-muted-foreground">{caption}</p>

      <DeleteConfirmationDialog
        isOpen={!isNil(pendingDelete)}
        title={
          pendingDelete?.kind === 'folder' ? 'Delete folder' : 'Delete file'
        }
        itemName={pendingDelete?.name}
        description={
          pendingDelete?.kind === 'folder'
            ? `Delete "${pendingDelete.name}" and everything inside it? This cannot be undone.`
            : undefined
        }
        isDeleting={isDeleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        confirmText={
          pendingDelete?.kind === 'folder' ? 'Delete folder' : 'Delete file'
        }
      />
    </div>
  )
}
