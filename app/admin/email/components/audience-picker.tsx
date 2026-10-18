'use client'

import { useEffect, useState } from 'react'
import { isNil } from 'lodash'
import { Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { isErr } from '@/lib/results'
import { logger } from '@/lib/logger'
import {
  previewCommunityEmailAudience,
  type AudiencePreview,
} from '@/services/community-email/actions'
import {
  AUDIENCE_TYPE_LABELS,
  type Audience,
  type AudienceOptions,
  type AudienceType,
} from '@/services/community-email/types'

const AUDIENCE_TYPES = Object.keys(AUDIENCE_TYPE_LABELS) as AudienceType[]

type CommunityGender = 'everyone' | 'male' | 'female'

/** A sensible starting weekend: the active one, else the newest. */
function defaultWeekendId(options: AudienceOptions): string {
  return (
    options.weekends.find((weekend) => weekend.status === 'ACTIVE')?.id ??
    options.weekends[0]?.id ??
    ''
  )
}

/** A sensible starting group: the active one, else the newest. */
function defaultGroupId(options: AudienceOptions): string {
  return (
    options.groups.find((group) => group.status === 'ACTIVE')?.id ??
    options.groups[0]?.id ??
    ''
  )
}

function switchType(
  type: AudienceType,
  current: Audience,
  options: AudienceOptions
): Audience {
  const weekendId =
    'weekendId' in current ? current.weekendId : defaultWeekendId(options)
  switch (type) {
    case 'community':
      return { type }
    case 'weekend_team':
    case 'weekend_candidates':
    case 'weekend_sponsors':
      return { type, weekendId }
    case 'role':
      return { type, roleId: options.roles[0]?.id ?? '' }
    case 'group_team':
    case 'group_pescadores':
      return {
        type,
        groupId:
          'groupId' in current ? current.groupId : defaultGroupId(options),
      }
  }
}

/**
 * Counts who an audience reaches, re-counting whenever it changes. The last
 * count stays on screen while the next one loads.
 */
export function useAudiencePreview(audience: Audience) {
  const [settled, setSettled] = useState<{
    key: string
    preview: AudiencePreview | null
  } | null>(null)
  const key = JSON.stringify(audience)

  useEffect(() => {
    let cancelled = false
    void previewCommunityEmailAudience(JSON.parse(key) as Audience).then(
      (result) => {
        // A newer choice may have been made while this one was loading.
        if (cancelled) return
        if (isNil(result) || isErr(result)) {
          logger.error({ error: result?.error }, 'Audience preview failed')
          setSettled({ key, preview: null })
          return
        }
        setSettled({ key, preview: result.data })
      }
    )
    return () => {
      cancelled = true
    }
  }, [key])

  return { preview: settled?.preview ?? null, loading: settled?.key !== key }
}

export function AudiencePicker({
  audience,
  options,
  onChange,
  preview,
  loading,
}: {
  audience: Audience
  options: AudienceOptions
  onChange: (audience: Audience) => void
  preview: AudiencePreview | null
  loading: boolean
}) {
  const gender: CommunityGender =
    audience.type === 'community' ? (audience.gender ?? 'everyone') : 'everyone'

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="audience-type">Send to</Label>
          <Select
            value={audience.type}
            onValueChange={(type) =>
              onChange(switchType(type as AudienceType, audience, options))
            }
          >
            <SelectTrigger id="audience-type" className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIENCE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {AUDIENCE_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {audience.type === 'community' && (
          <div className="space-y-2">
            <Label>Who in the community</Label>
            <SegmentedControl<CommunityGender>
              aria-label="Who in the community"
              value={gender}
              onValueChange={(value) =>
                onChange(
                  value === 'everyone'
                    ? { type: 'community' }
                    : { type: 'community', gender: value }
                )
              }
              options={[
                { value: 'everyone', label: 'Everyone' },
                { value: 'male', label: 'Men' },
                { value: 'female', label: 'Women' },
              ]}
            />
          </div>
        )}

        {'weekendId' in audience && (
          <div className="space-y-2">
            <Label htmlFor="audience-weekend">Weekend</Label>
            <Select
              value={audience.weekendId}
              onValueChange={(weekendId) =>
                onChange({ ...audience, weekendId })
              }
              disabled={options.weekends.length === 0}
            >
              <SelectTrigger id="audience-weekend" className="h-11 w-full">
                <SelectValue placeholder="No weekends yet" />
              </SelectTrigger>
              <SelectContent>
                {options.weekends.map((weekend) => (
                  <SelectItem key={weekend.id} value={weekend.id}>
                    {weekend.label}
                    {weekend.status === 'ACTIVE' && ' · Active'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {'groupId' in audience && (
          <div className="space-y-2">
            <Label htmlFor="audience-group">Weekend group</Label>
            <Select
              value={audience.groupId}
              onValueChange={(groupId) => onChange({ ...audience, groupId })}
              disabled={options.groups.length === 0}
            >
              <SelectTrigger id="audience-group" className="h-11 w-full">
                <SelectValue placeholder="No weekend groups yet" />
              </SelectTrigger>
              <SelectContent>
                {options.groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.label}
                    {group.status === 'ACTIVE' && ' · Active'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {audience.type === 'role' && (
          <div className="space-y-2">
            <Label htmlFor="audience-role">Role</Label>
            <Select
              value={audience.roleId}
              onValueChange={(roleId) => onChange({ type: 'role', roleId })}
              disabled={options.roles.length === 0}
            >
              <SelectTrigger id="audience-role" className="h-11 w-full">
                <SelectValue placeholder="No roles yet" />
              </SelectTrigger>
              <SelectContent>
                {options.roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <RecipientSummary preview={preview} loading={loading} />
    </div>
  )
}

export function RecipientSummary({
  preview,
  loading,
}: {
  preview: AudiencePreview | null
  loading: boolean
}) {
  if (loading && isNil(preview)) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Counting recipients…
      </p>
    )
  }
  if (isNil(preview)) {
    return (
      <p className="text-sm text-destructive">
        Couldn&apos;t count who this goes to. Try choosing again.
      </p>
    )
  }

  const notes: string[] = []
  if (preview.unsubscribedCount > 0) {
    notes.push(`${preview.unsubscribedCount} unsubscribed`)
  }
  if (preview.missingEmailCount > 0) {
    notes.push(`${preview.missingEmailCount} with no email address`)
  }

  return (
    <div className="flex flex-col gap-2 rounded-md bg-muted/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p
        className="flex items-center gap-2 text-sm"
        data-testid="recipient-count"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <Users className="size-4 text-muted-foreground" />
        )}
        <span>
          <strong>{preview.count}</strong>{' '}
          {preview.count === 1 ? 'person' : 'people'} will receive this
          {notes.length > 0 && (
            <span className="text-muted-foreground">
              {' '}
              · not sent to {notes.join(', ')}
            </span>
          )}
        </span>
      </p>
      <Dialog>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={preview.count === 0}
          >
            See who
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Recipients</DialogTitle>
            <DialogDescription>
              {preview.count} {preview.count === 1 ? 'person' : 'people'}, as of
              right now. The list is worked out again when you send.
            </DialogDescription>
          </DialogHeader>
          <ul className="-mx-2 max-h-[55vh] divide-y overflow-y-auto">
            {preview.people.map((person) => (
              <li key={person.email} className="px-2 py-2 text-sm">
                <p className="font-medium">{person.name ?? person.email}</p>
                {!isNil(person.name) && (
                  <p className="text-muted-foreground">{person.email}</p>
                )}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  )
}
