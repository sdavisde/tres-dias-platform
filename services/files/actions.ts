'use server'

import { authorizedAction } from '@/lib/actions/authorized-action'
import { err, type Result } from '@/lib/results'
import { Permission } from '@/lib/security'
import * as FileService from './file-service'

/** Any signed-in member may resolve a file's public URL (member files pages). */
export const getFilePublicUrlAction = authorizedAction<
  [string, string],
  { publicUrl: string }
>('authenticated', async (_user, folder, fileName) =>
  FileService.getFilePublicUrl(folder, fileName)
)

/** Any signed-in member may mint a download URL (member files pages). */
export const getFileDownloadUrlAction = authorizedAction<
  [string, string],
  { downloadUrl: string }
>('authenticated', async (_user, folder, fileName) =>
  FileService.getFileDownloadUrl(folder, fileName)
)

/**
 * Mints a one-time signed upload URL for a file. The bytes are uploaded directly
 * from the browser to Supabase Storage using the returned token (see
 * `uploadFileToStorage` in `lib/files/upload-client`), bypassing the Next.js
 * Server Action body-size limit. RBAC and extension validation happen here.
 */
export const createUploadUrlAction = authorizedAction<
  [{ folder: string; fileName: string }],
  { bucket: string; path: string; token: string }
>(Permission.FILES_UPLOAD, async (_user, { folder, fileName }) => {
  if (typeof folder !== 'string' || folder.trim() === '') {
    return err('Folder is required')
  }

  if (typeof fileName !== 'string' || fileName.trim() === '') {
    return err('A file is required')
  }

  return FileService.createUploadUrl(folder.trim(), fileName.trim())
})

/**
 * Persists the location for a meeting minutes file. Signed-URL uploads cannot
 * carry custom metadata, so location is stored separately and joined back in
 * when listing meeting minutes.
 */
export const saveMeetingMinutesLocationAction = authorizedAction<
  [{ fileName: string; location: string }],
  null
>(Permission.FILES_UPLOAD, async (_user, { fileName, location }) => {
  if (typeof fileName !== 'string' || fileName.trim() === '') {
    return err('A file is required')
  }

  const trimmedLocation = typeof location === 'string' ? location.trim() : ''
  if (trimmedLocation === '') {
    return err('Location is required')
  }

  return FileService.saveMeetingMinutesLocation(
    fileName.trim(),
    trimmedLocation
  )
})

/** Creates a folder inside `parentPath` ('' for the top level). */
export const createFolderAction = authorizedAction<
  [{ parentPath: string; name: string }],
  { storagePath: string }
>(Permission.FILES_UPLOAD, async (_user, { parentPath, name }) => {
  if (typeof parentPath !== 'string' || typeof name !== 'string') {
    return err('A folder name is required')
  }

  return FileService.createFolder(parentPath, name)
})

export const deleteFileAction = authorizedAction<
  [{ storagePath: string }],
  null
>(Permission.FILES_DELETE, async (_user, { storagePath }) => {
  if (typeof storagePath !== 'string') return err('A file is required')
  return FileService.deleteFile(storagePath)
})

/** Deletes a folder and everything inside it, sub-folders included. */
export const deleteFolderAction = authorizedAction<
  [{ storagePath: string }],
  { removed: number }
>(Permission.FILES_DELETE, async (_user, { storagePath }) => {
  if (typeof storagePath !== 'string') return err('A folder is required')
  return FileService.deleteFolderRecursive(storagePath)
})
