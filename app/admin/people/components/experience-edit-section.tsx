'use client'

import { isNil } from 'lodash'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CHARole } from '@/lib/weekend/types'
import { RECOGNIZED_COMMUNITIES } from '@/lib/communities/whitelist'
import type { UserExperience } from '@/lib/users/experience'
import type { MasterRosterMember } from '@/services/master-roster/types'
import type { NewExperienceEntry } from '../types'
import { ExperienceLevelSection } from './experience-level-section'
import { RectorReadySection } from './rector-ready-section'

interface ExperienceEditSectionProps {
  member: MasterRosterMember
  totalDTTDWeekends: number
  visibleExperience: UserExperience[]
  newExperience: NewExperienceEntry[]
  onDeleteExisting: (id: string) => void
  onAddNew: () => void
  onUpdateNew: (
    key: string,
    entry: NewExperienceEntry,
    options?: { immediate?: boolean }
  ) => void
  onRemoveNew: (key: string) => void
  canEdit: boolean
}

export function ExperienceEditSection({
  member,
  totalDTTDWeekends,
  visibleExperience,
  newExperience,
  onDeleteExisting,
  onAddNew,
  onUpdateNew,
  onRemoveNew,
  canEdit,
}: ExperienceEditSectionProps) {
  return (
    <div className="space-y-4">
      <ExperienceLevelSection
        level={member.level}
        numDTTDWeekends={totalDTTDWeekends}
      />

      <Separator />

      <RectorReadySection status={member.rectorReady} />

      <Separator />

      {/* Service History */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Service History</h3>
        {visibleExperience.length === 0 && newExperience.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            No service history recorded.
          </p>
        )}
        {visibleExperience.map((record) => (
          <div
            key={record.id}
            className="flex items-center justify-between p-2 border rounded-md"
          >
            <div>
              <span className="font-medium text-sm">{record.cha_role}</span>
              <span className="text-sm text-muted-foreground ml-2">
                {record.weekend_reference}
              </span>
              {!isNil(record.rollo) && (
                <Badge variant="secondary" className="ml-2 text-xs font-normal">
                  {record.rollo}
                </Badge>
              )}
            </div>
            {canEdit && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive/90"
                onClick={() => onDeleteExisting(record.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}

        {/* Just-saved rows, read-only until the refreshed roster includes them */}
        {newExperience
          .filter((entry) => entry.saved)
          .map((entry) => (
            <div
              key={entry.key}
              className="flex min-h-12 items-center p-2 border rounded-md"
            >
              <span className="font-medium text-sm">{entry.cha_role}</span>
              <span className="text-sm text-muted-foreground ml-2">
                {entry.community}#{entry.weekend_number}
              </span>
            </div>
          ))}

        {/* New experience entries (only when editing) */}
        {canEdit &&
          newExperience
            .filter((entry) => !entry.saved)
            .map((entry) => (
              <div key={entry.key} className="space-y-2 p-2 border rounded-md">
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={entry.cha_role}
                    onValueChange={(v) =>
                      onUpdateNew(
                        entry.key,
                        { ...entry, cha_role: v },
                        { immediate: true }
                      )
                    }
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(CHARole).map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={entry.community}
                    onValueChange={(v) =>
                      onUpdateNew(
                        entry.key,
                        { ...entry, community: v },
                        { immediate: true }
                      )
                    }
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="Community" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RECOGNIZED_COMMUNITIES).map(
                        ([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    placeholder="Weekend #"
                    value={entry.weekend_number}
                    onChange={(e) =>
                      onUpdateNew(entry.key, {
                        ...entry,
                        weekend_number: e.target.value,
                      })
                    }
                    className="text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive"
                    onClick={() => onRemoveNew(entry.key)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}

        {canEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onAddNew}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Experience
          </Button>
        )}
      </div>
    </div>
  )
}
