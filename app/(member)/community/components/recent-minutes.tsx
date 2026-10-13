'use client'

import Link from 'next/link'
import { ArrowRight, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { filesHref } from '@/lib/files/browser'
import { MEETING_MINUTES_FOLDER } from '@/lib/files/constants'
import { formatMinutesMeta } from '@/lib/files/meeting-minutes'
import type { MeetingMinuteFile } from '@/lib/files/types'
import { isErr } from '@/lib/results'
import { toastError } from '@/lib/toast-error'
import { slugify } from '@/lib/url'
import {
  getFileDownloadUrlAction,
  getFilePublicUrlAction,
} from '@/services/files/actions'

const MINUTES_DOCUMENTS_HREF = filesHref('member', [
  slugify(MEETING_MINUTES_FOLDER),
])

type RecentMinutesProps = {
  /** Newest first, already trimmed to the handful the card shows. */
  files: MeetingMinuteFile[]
  loadFailed: boolean
}

/**
 * The latest board minutes, read-only. The full listing lives in Documents,
 * one click away.
 */
export function RecentMinutes({ files, loadFailed }: RecentMinutesProps) {
  const handleOpen = async (file: MeetingMinuteFile) => {
    const result = await getFilePublicUrlAction(
      MEETING_MINUTES_FOLDER,
      file.name
    )
    if (isErr(result)) {
      toastError('Unable to open this file. Please try again.', {
        error: result.error,
      })
      return
    }
    window.open(result.data.publicUrl, '_blank', 'noopener,noreferrer')
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

  return (
    <section>
      <h2 className="border-b border-border pb-2 font-serif text-lg font-semibold tracking-tight">
        Recent meeting minutes
      </h2>

      {loadFailed ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Minutes couldn&apos;t be loaded right now. Try again shortly.
        </p>
      ) : files.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No minutes have been shared yet.
        </p>
      ) : (
        <ul className="flex flex-col">
          {files.map((file) => {
            const meta = formatMinutesMeta(file)
            return (
              <li
                key={file.name}
                className="flex items-center gap-2.5 border-b border-divider py-1.5 last:border-b-0"
              >
                <FileText className="size-4 shrink-0 text-primary" />
                <button
                  type="button"
                  onClick={() => handleOpen(file)}
                  className="flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-px text-left"
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(file)}
                  className="size-11 shrink-0 text-muted-foreground md:size-8"
                >
                  <Download className="size-4" />
                  <span className="sr-only">Download {file.name}</span>
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-3 flex justify-end border-t border-divider pt-3 pb-1">
        <Link
          href={MINUTES_DOCUMENTS_HREF}
          className="flex min-h-11 items-center gap-1 text-[13px] font-semibold text-primary hover:text-primary-hover md:min-h-0"
        >
          All minutes in Documents
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </section>
  )
}
