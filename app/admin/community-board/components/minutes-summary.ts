import { adminFilesHref } from '@/lib/files/browser'
import { MEETING_MINUTES_FOLDER } from '@/lib/files/constants'
import { slugify } from '@/lib/url'

/**
 * The Files browser route for the folder minutes are uploaded to, so
 * "View all in Files" lands on the real folder rather than the Files root.
 */
export const MEETING_MINUTES_FILES_HREF = adminFilesHref([
  slugify(MEETING_MINUTES_FOLDER),
])

export {
  formatMinutesDate,
  formatMinutesMeta,
} from '@/lib/files/meeting-minutes'
