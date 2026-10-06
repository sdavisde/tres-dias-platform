'use client'

import { isNil } from 'lodash'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MonthPickerPopover } from '@/components/ui/month-picker'
import { RECOGNIZED_COMMUNITIES } from '@/lib/communities/whitelist'
import type { FieldErrors, SectionChange } from '../hooks/use-user-edit-form'
import type { CommunityFields } from '../types'
import { EditorFieldError, editorFieldLabelClass } from './editor-section-card'

interface CommunityInfoSectionProps {
  community: CommunityFields
  onChange: SectionChange<CommunityFields>
  errors?: FieldErrors<CommunityFields>
  disabled: boolean
}

export function CommunityInfoSection({
  community,
  onChange,
  errors = {},
  disabled,
}: CommunityInfoSectionProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className={editorFieldLabelClass}>Church affiliation</Label>
        <Input
          value={community.churchAffiliation}
          onChange={(e) =>
            onChange({ ...community, churchAffiliation: e.target.value })
          }
          placeholder="My Church"
          disabled={disabled}
        />
      </div>
      <div className="space-y-1">
        <Label className={editorFieldLabelClass}>Weekend attended</Label>
        <div className="grid grid-cols-2 gap-3">
          <Select
            value={community.weekendCommunity}
            onValueChange={(v) =>
              onChange(
                { ...community, weekendCommunity: v },
                { immediate: true }
              )
            }
            disabled={disabled}
          >
            <SelectTrigger
              className="w-full"
              aria-invalid={!isNil(errors.weekendCommunity)}
            >
              <SelectValue placeholder="Community" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RECOGNIZED_COMMUNITIES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            className="tabular-nums"
            value={community.weekendNumber}
            onChange={(e) =>
              onChange({ ...community, weekendNumber: e.target.value })
            }
            placeholder="Weekend #"
            aria-invalid={!isNil(errors.weekendNumber)}
            disabled={disabled}
          />
        </div>
        <EditorFieldError
          message={errors.weekendCommunity ?? errors.weekendNumber}
        />
      </div>
      <div className="space-y-1">
        <Label className={editorFieldLabelClass}>
          Essentials training date
        </Label>
        <MonthPickerPopover
          value={community.essentialsDate}
          onChange={(date) =>
            onChange(
              { ...community, essentialsDate: date },
              { immediate: true }
            )
          }
          placeholder="Pick a date"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="community-is-clergy" className={editorFieldLabelClass}>
          Ordained clergy
        </Label>
        <Switch
          id="community-is-clergy"
          checked={community.isClergy}
          onCheckedChange={(checked) =>
            onChange({ ...community, isClergy: checked }, { immediate: true })
          }
          disabled={disabled}
        />
      </div>
    </div>
  )
}
