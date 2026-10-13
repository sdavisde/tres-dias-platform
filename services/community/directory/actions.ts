import 'server-only'

import { authorizedAction } from '@/lib/actions/authorized-action'
import * as DirectoryService from './directory-service'
import type { DirectoryMember } from './types'

/** The community directory, for any signed-in member. */
export const getCommunityDirectory = authorizedAction<[], DirectoryMember[]>(
  'authenticated',
  async () => DirectoryService.getCommunityDirectory()
)
