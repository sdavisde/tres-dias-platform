import { Suspense } from 'react'
import {
  ArrowRight,
  File,
  UserPlus,
  Shield,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import type { User } from '@/lib/users/types'
import { isNil } from 'lodash'
import { Typography } from '@/components/ui/typography'
import { Separator } from '@/components/ui/separator'
import {
  UserAvatarWithPreview,
  avatarUserFromDto,
} from '@/components/user-avatar'
import { Button } from '@/components/ui/button'
import { UpcomingEvents } from '@/components/events/UpcomingEvents'
import { isUserOnActiveTeam, isUserRector } from '@/lib/users'
import { TeamMemberTodo, TeamMemberTodoLoading } from '@/components/team-todos'
import { CommunityEncouragement } from '@/components/community-encouragement/CommunityEncouragement'
import { CHARole, WeekendType } from '@/lib/weekend/types'
import { ProfilePhotoAlert } from './profile-photo-alert'
import { SecuelaBanner } from './secuela-banner'
import {
  CurrentWeekendHero,
  CurrentWeekendHeroSkeleton,
} from './current-weekend-hero'

interface DashboardProps {
  user: User
  prayerWheelUrl: string | null
}

export function Dashboard({ user, prayerWheelUrl }: DashboardProps) {
  return (
    <div className="space-y-6">
      <ProfilePhotoAlert needsPhoto={isNil(user.profilePhotoPath)} />

      <CommunityEncouragement user={user} />

      {/*
        Two-column layout on lg+: main column (2/3) + events sidebar (1/3).
        Grid auto-placement gives the mobile stacking order:
        greeting + weekend hero + team checklist -> events -> quick actions.
      */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {/* Main column, row 1: greeting, weekend hero, and team checklist */}
        <div className="space-y-6 lg:col-span-2">
          <div className="flex items-center gap-4">
            <UserAvatarWithPreview user={avatarUserFromDto(user)} size={56} />
            <div>
              <p className="mb-1 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Dusty Trails Tres Dias
              </p>
              <Typography variant="h1">
                Hi {user.firstName ?? 'there'}
              </Typography>
            </div>
          </div>

          {/* Renders nothing unless the active group's secuela is ahead */}
          <Suspense fallback={null}>
            <SecuelaBanner user={user} />
          </Suspense>

          <Suspense fallback={<CurrentWeekendHeroSkeleton />}>
            <CurrentWeekendHero user={user} />
          </Suspense>

          <RectorBanner user={user} />

          {isUserOnActiveTeam(user) && (
            <Suspense fallback={<TeamMemberTodoLoading />}>
              <TeamMemberTodo />
            </Suspense>
          )}
        </div>

        {/* Right sidebar: upcoming events */}
        <aside className="lg:row-span-2">
          <UpcomingEvents />
        </aside>

        {/* Main column, row 2: quick actions */}
        <div className="lg:col-span-2">
          <QuickActions prayerWheelUrl={prayerWheelUrl} />
        </div>
      </div>
    </div>
  )
}

function QuickActions({ prayerWheelUrl }: { prayerWheelUrl: string | null }) {
  return (
    <section>
      <div className="mb-3">
        <Typography variant="h3">Quick Actions</Typography>
        <Separator className="mt-2 w-12 bg-primary" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <QuickActionCard
          // todo: eventually this should link back to the /sponsor page. We put this here because the sponsorship flow is not ready yet.
          // more info in the README.
          href="/sponsor"
          icon={UserPlus}
          title="Sponsor a Candidate"
          description="Nominate someone you know for an upcoming weekend"
        />
        {/*
          todo: hidden while the secuela banner above covers signing up to serve; decide whether to bring it
          back (see the README TODOs). Restoring it needs `HandHeart` re-imported from lucide-react.
        <QuickActionCard
          href="/secuela-signin"
          icon={HandHeart}
          title="Volunteer to Serve"
          description="Sign in at secuela, or afterwards to volunteer for the next team"
        />
        */}
        {!isNil(prayerWheelUrl) && (
          <QuickActionCard
            href={prayerWheelUrl}
            icon={File}
            title="Prayer Wheel Signup"
            description="Commit to an hour of prayer during the weekend"
          />
        )}
      </div>
    </section>
  )
}

interface QuickActionCardProps {
  href: string
  icon: LucideIcon
  title: string
  description: string
}

function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
}: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="group flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors duration-200 hover:border-primary/40 hover:bg-accent"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
        <Icon className="h-5 w-5 text-secondary-foreground" />
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-sm font-semibold">
          {title}
          <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </Link>
  )
}

function RectorBanner({ user }: { user: User }) {
  const isRector = isUserRector(user)

  if (!isRector) return null

  const rectorAssignment = user.teamMemberInfo?.weekendAssignments.find(
    (a) => a.chaRole === CHARole.RECTOR
  )

  const groupNumber = user.teamMemberInfo?.groupNumber
  const weekendLabel =
    rectorAssignment?.weekendType === WeekendType.MENS ? "Men's" : "Women's"

  return (
    <div>
      <Button
        href="/roster-builder"
        variant="outline"
        className="w-full flex items-center gap-4 p-6 h-auto border-primary/30 bg-primary/5 hover:bg-primary/10"
      >
        <Shield className="w-8 h-8 text-primary shrink-0" />
        <div className="flex flex-col items-start gap-1 text-left">
          <span className="text-lg font-semibold">
            You&apos;re the Rector for DTTD #{groupNumber} {weekendLabel}{' '}
            Weekend
          </span>
          <span className="text-sm text-muted-foreground">
            Build Your Roster &rarr;
          </span>
        </div>
      </Button>
    </div>
  )
}
