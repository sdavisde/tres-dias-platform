'use client'

import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const SKILLS_OPTIONS: string[] = [
  'Audio/video',
  'Carpenter',
  'Crafts',
  'Music (vocal)',
  'Music (instrument)',
  'Sewing',
  'Computer (spreadsheets)',
  'Computer (powerpoint / creative design)',
  'Nurse / medical',
  'Plumber',
  'Electrician',
  'Photography',
]

interface SkillsEditSectionProps {
  skills: string[]
  onToggle: (skill: string) => void
  customSkill: string
  onCustomSkillChange: (val: string) => void
  onAddCustomSkill: () => void
  canEdit: boolean
}

export function SkillsEditSection({
  skills,
  onToggle,
  customSkill,
  onCustomSkillChange,
  onAddCustomSkill,
  canEdit,
}: SkillsEditSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {SKILLS_OPTIONS.map((skill) => (
          <Badge
            key={skill}
            variant={skills.includes(skill) ? 'default' : 'outline'}
            className={canEdit ? 'cursor-pointer select-none' : 'select-none'}
            onClick={canEdit ? () => onToggle(skill) : undefined}
          >
            {skill}
          </Badge>
        ))}
        {/* Custom (non-standard) skills the person added themselves */}
        {skills
          .filter((skill) => !SKILLS_OPTIONS.includes(skill))
          .map((skill) => (
            <Badge
              key={skill}
              variant="default"
              className={canEdit ? 'cursor-pointer select-none' : 'select-none'}
              onClick={canEdit ? () => onToggle(skill) : undefined}
            >
              {skill}
              {canEdit && ' ×'}
            </Badge>
          ))}
      </div>
      {canEdit && (
        <Input
          placeholder="Add custom skill…"
          value={customSkill}
          onChange={(e) => onCustomSkillChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onAddCustomSkill()
            }
          }}
          className="text-sm"
        />
      )}
    </div>
  )
}
