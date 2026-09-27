import { Typography } from '@/components/ui/typography'
import type { LeadershipTeamMember } from '@/services/weekend'
import { getActiveWeekendLeadershipTeam } from '@/services/weekend/weekend-service'
import { isErr } from '@/lib/results'

export async function LeadershipTeamPreview() {
  const result = await getActiveWeekendLeadershipTeam()

  if (isErr(result)) {
    return null
  }

  const { menLeaders, womenLeaders } = result.data

  if (menLeaders.length === 0 && womenLeaders.length === 0) {
    return null
  }

  const renderLeaderRow = (member: LeadershipTeamMember) => (
    <div key={member.id} className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{member.chaRole} CHA</span>
      <span className="font-medium text-end">{member.fullName}</span>
    </div>
  )

  return (
    <div className="grid grid-cols-2 gap-x-8 md:gap-x-16 gap-y-1">
      {/* Men's Leadership */}
      {menLeaders.length > 0 && (
        <div className="space-y-1">
          <Typography
            variant="p"
            className="font-semibold text-xs text-blue-600 mb-2"
          >
            Men&apos;s Leadership
          </Typography>
          {menLeaders.map(renderLeaderRow)}
        </div>
      )}

      {/* Women's Leadership */}
      {womenLeaders.length > 0 && (
        <div className="space-y-1">
          <Typography
            variant="p"
            className="font-semibold text-xs text-pink-600 mb-2"
          >
            Women&apos;s Leadership
          </Typography>
          {womenLeaders.map(renderLeaderRow)}
        </div>
      )}
    </div>
  )
}
