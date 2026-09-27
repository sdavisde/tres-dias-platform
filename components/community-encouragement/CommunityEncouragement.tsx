import { Suspense } from 'react'
import { getCommunityEncouragement } from '@/services/community/community-service'
import { EncouragementEditor } from './EncouragementEditor'
import type { User } from '@/lib/users/types'
import { Permission, userHasPermission } from '@/lib/security'

interface CommunityEncouragementProps {
  user: User
}

async function EncouragementContent({ user }: CommunityEncouragementProps) {
  const encouragementResult = await getCommunityEncouragement()
  const encouragement = encouragementResult.data ?? null

  const canEdit = userHasPermission(user, [
    Permission.WRITE_COMMUNITY_ENCOURAGEMENT,
  ])

  return (
    <EncouragementEditor
      initialEncouragement={encouragement}
      canEdit={canEdit}
    />
  )
}

export function CommunityEncouragement({ user }: CommunityEncouragementProps) {
  return (
    <Suspense fallback={null}>
      <EncouragementContent user={user} />
    </Suspense>
  )
}
