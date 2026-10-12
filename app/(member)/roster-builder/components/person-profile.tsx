'use client'

import type { ReactNode } from 'react'
import { format, isValid, parseISO } from 'date-fns'
import { capitalize, isNil } from 'lodash'
import { Check, Mail, MessageSquare, Minus, Phone } from 'lucide-react'
import { SheetTitle } from '@/components/ui/sheet'
import { UserAvatar } from '@/components/user-avatar'
import { cn } from '@/lib/utils'
import { parseCommunityWeekendRef } from '@/lib/weekend'
import type { RosterBuilderCommunityMember } from '@/services/roster-builder'
import { countRollosGiven, orderServiceHistory } from '../lib/person-profile'
import { MemberIndicatorChips } from './member-indicators'
import type { MemberAssignment } from './roster-builder-types'
import { ExperienceBadge, fullName } from './roster-builder-types'

const SECTION_HEADING_CLASS = 'mb-2.5 text-[13px] font-bold text-foreground'

function formatDate(value: string | null): string | null {
  if (isNil(value)) return null
  const date = parseISO(value)
  return isValid(date) ? format(date, 'MMM d, yyyy') : value
}

/** A stat tile's number for a weekend: "#11", community in the caption. */
function weekendStat(
  label: string,
  ref: { community: string; number: number } | null
) {
  if (isNil(ref)) return { value: '—', label }
  return { value: `#${ref.number}`, label: `${label} · ${ref.community}` }
}

/**
 * The read-only profile the roster builder shows for one community member:
 * who they are, how to reach them, and their service history. `action` sits
 * under the contact buttons (Assign to..., or where they already serve).
 */
export function PersonProfile({
  member,
  action,
  nameAsSheetTitle = false,
}: {
  member: RosterBuilderCommunityMember
  action?: ReactNode
  /** Render the name as the sheet's accessible title. */
  nameAsSheetTitle?: boolean
}) {
  const name = fullName(member)
  const timeline = orderServiceHistory(member.experience)
  const joinedRef = parseCommunityWeekendRef(member.weekendAttended)
  const lastServedRef = parseCommunityWeekendRef(
    timeline[0]?.record.weekend_reference
  )

  const stats = [
    { value: String(member.weekendsServed), label: 'weekends served' },
    {
      value: String(countRollosGiven(member.experience)),
      label: 'rollos given',
    },
    weekendStat('joined', joinedRef),
    weekendStat('last served', lastServedRef),
  ]

  const contactActions = [
    !isNil(member.phoneNumber) && {
      href: `tel:${member.phoneNumber}`,
      label: 'Call',
      icon: Phone,
    },
    !isNil(member.phoneNumber) && {
      href: `sms:${member.phoneNumber}`,
      label: 'Text',
      icon: MessageSquare,
    },
    !isNil(member.email) && {
      href: `mailto:${member.email}`,
      label: 'Email',
      icon: Mail,
    },
  ].filter((a) => a !== false)

  const subtitle = [member.church, capitalize(member.gender ?? '')]
    .filter((part) => !isNil(part) && part !== '')
    .join(' · ')

  const criteria = [
    {
      label: 'Served as Head or Assistant Head',
      met: member.rectorReadyStatus.criteria.hasServedHeadOrAssistantHead,
    },
    {
      label: 'Served as a Team Head',
      met: member.rectorReadyStatus.criteria.hasServedTeamHead,
    },
    {
      label: 'Given 2+ Rollos',
      met: member.rectorReadyStatus.criteria.hasGivenTwoOrMoreTalks,
    },
    {
      label: 'Worked Dining Room',
      met: member.rectorReadyStatus.criteria.hasWorkedDining,
    },
    {
      label: 'Served as Rector',
      met: member.rectorReadyStatus.criteria.hasServedAsRector,
    },
  ]

  const details = [
    { label: 'Phone', value: member.phoneNumber },
    { label: 'Email', value: member.email },
    { label: 'Essentials', value: formatDate(member.essentialsTrainingDate) },
    { label: 'Clergy', value: member.isClergy ? 'Yes' : 'No' },
  ]

  const nameClass =
    'font-serif text-2xl font-semibold tracking-tight text-foreground'

  return (
    <div className="space-y-6 px-5 pt-6 pb-8">
      {/* Identity */}
      <div className="flex flex-col items-center gap-2 text-center">
        <UserAvatar
          user={{
            id: member.id,
            first_name: member.firstName,
            last_name: member.lastName,
            email: member.email,
            profilePhoto: member.profilePhoto,
          }}
          size={72}
          className="ring-2 ring-border ring-offset-2 ring-offset-background"
        />
        {nameAsSheetTitle ? (
          <SheetTitle className={cn('mt-1.5', nameClass)}>{name}</SheetTitle>
        ) : (
          <h2 className={cn('mt-1.5', nameClass)}>{name}</h2>
        )}
        {subtitle !== '' && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
          <ExperienceBadge
            level={member.experienceLevel}
            weekendsServed={member.weekendsServed}
          />
          <MemberIndicatorChips member={member} className="justify-center" />
        </div>
      </div>

      {/* Reach out + act */}
      {(contactActions.length > 0 || !isNil(action)) && (
        <div className="space-y-3">
          {contactActions.length > 0 && (
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${contactActions.length}, minmax(0, 1fr))`,
              }}
            >
              {contactActions.map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  className="flex h-14 flex-col items-center justify-center gap-1 rounded-md border bg-card text-[13px] font-semibold text-foreground transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <Icon aria-hidden className="h-4 w-4" />
                  {label}
                </a>
              ))}
            </div>
          )}
          {action}
        </div>
      )}

      {/* At a glance */}
      <dl className="grid grid-cols-4 divide-x divide-divider rounded-md border bg-background">
        {stats.map((stat) => (
          <div key={stat.label} className="px-1.5 py-3 text-center">
            <dd className="font-serif text-[22px] leading-tight font-semibold text-foreground">
              {stat.value}
            </dd>
            <dt className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
              {stat.label}
            </dt>
          </div>
        ))}
      </dl>

      {/* Service timeline */}
      <section>
        <h3 className={SECTION_HEADING_CLASS}>Service timeline</h3>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Hasn&apos;t served on a team yet.
          </p>
        ) : (
          <ol>
            {timeline.map((entry, i) => (
              <li key={entry.record.id} className="flex gap-3">
                <div className="flex w-3 flex-col items-center">
                  <span
                    aria-hidden
                    className={cn(
                      'mt-1.5 size-2.5 shrink-0 rounded-full',
                      entry.isLayLeadership ? 'bg-primary' : 'bg-border'
                    )}
                  />
                  {i < timeline.length - 1 && (
                    <span aria-hidden className="w-0.5 flex-1 bg-divider" />
                  )}
                </div>
                <div className="min-w-0 flex-1 pb-3.5">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{entry.weekendLabel}</span>
                    {' · '}
                    {entry.record.cha_role}
                  </p>
                  {!isNil(entry.record.rollo) && (
                    <p className="text-xs text-secondary-foreground">
                      Rollo: {entry.record.rollo}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Skills */}
      <section>
        <h3 className={SECTION_HEADING_CLASS}>Gifts &amp; skills</h3>
        {member.skills.length === 0 ? (
          <p className="text-sm text-muted-foreground">None listed.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {member.skills.map((skill) => (
              <li
                key={skill}
                className="rounded-full bg-muted px-2.5 py-0.5 text-[13px] text-foreground"
              >
                {skill}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Community details */}
      <section>
        <h3 className={SECTION_HEADING_CLASS}>Community details</h3>
        <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-y-2 text-sm">
          {details.map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="break-words text-foreground">
                {value ?? <span className="text-muted-foreground">—</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Rector ready */}
      <section>
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <h3 className="text-[13px] font-bold text-foreground">
            Rector ready
          </h3>
          <span className="text-xs font-medium text-muted-foreground">
            {member.rectorReadyStatus.statusLabel}
          </span>
        </div>
        <ul className="space-y-1.5">
          {criteria.map(({ label, met }) => (
            <li
              key={label}
              className={cn(
                'flex items-center gap-2 text-sm',
                met ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'flex size-[18px] shrink-0 items-center justify-center rounded-full',
                  met
                    ? 'bg-[var(--experience-level-3)] text-[var(--experience-level-3-fg)]'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {met ? (
                  <Check aria-hidden className="size-3" strokeWidth={3} />
                ) : (
                  <Minus aria-hidden className="size-3" strokeWidth={3} />
                )}
              </span>
              <span>
                {label}
                <span className="sr-only">{met ? ' (met)' : ' (not met)'}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

/** Stands in for "Assign to..." once the person already has a slot. */
export function RosterAssignmentNotice({
  assignment,
}: {
  assignment: MemberAssignment
}) {
  const isDraft = assignment.type === 'draft'
  return (
    <p
      className={cn(
        'rounded-md border px-3 py-2.5 text-sm',
        isDraft
          ? 'border-secondary-border bg-secondary text-secondary-foreground'
          : 'border-transparent bg-success/15 text-foreground'
      )}
    >
      <span className="font-semibold">{isDraft ? 'Draft' : 'Assigned'}</span>
      {' · '}
      {assignment.slotLabel} on this roster
    </p>
  )
}
