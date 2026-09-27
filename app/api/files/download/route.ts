import { createClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { isErr } from '@/lib/results'
import { getLoggedInUser } from '@/services/identity/user/session'
import { normalizeStoragePath } from '@/lib/storage-path'
import { isNil } from 'lodash'

/** Buckets the app serves through this route. Anything else is a 400. */
const ALLOWED_BUCKETS = ['files', 'avatars'] as const

/**
 * Streams a storage object to a signed-in member. `/api/*` is skipped by the
 * proxy, so this route gates itself: no session → 401. The session client is
 * kept so storage RLS still decides what the member may read.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getLoggedInUser()
    if (isErr(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const bucket = searchParams.get('bucket') ?? 'files'
    if (!(ALLOWED_BUCKETS as readonly string[]).includes(bucket)) {
      return NextResponse.json({ error: 'Unknown bucket' }, { status: 400 })
    }

    const path = normalizeStoragePath(searchParams.get('path'))
    if (isNil(path)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get file data
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(path)

    if (!isNil(downloadError) || isNil(fileData)) {
      logger.error(`Error downloading file: ${downloadError?.message}`)
      return new NextResponse('File not found', { status: 404 })
    }

    // Get file metadata for proper filename and content type
    const { data: fileInfo } = await supabase.storage
      .from(bucket)
      .list(path.split('/').slice(0, -1).join('/'), {
        search: path.split('/').pop(),
      })

    const fileName = path.split('/').pop() ?? 'download'
    // Header-safe filename: ASCII fallback with quotes/CR/LF/semicolons removed,
    // plus the RFC 5987 encoded form so unicode names still round-trip.
    const strippedName = fileName
      .replace(/[^\x20-\x7e]/g, '')
      .replace(/["\\;\r\n]/g, '_')
    const asciiName = strippedName === '' ? 'download' : strippedName
    const encodedName = encodeURIComponent(fileName)
    const fileMetadata = fileInfo?.[0]
    const contentType =
      fileMetadata?.metadata?.mimetype ?? 'application/octet-stream'

    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
        'Content-Type': contentType,
        'Content-Length': arrayBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    logger.error(`Error in file download route: ${error}`)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
