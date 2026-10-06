'use client'

import { useFormContext } from 'react-hook-form'
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Sparkles } from 'lucide-react'
import * as React from 'react'
import type { TeamInfoFormValues } from './schemas'
import { isEmpty, partition } from 'lodash'

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
] as const

export function SkillsSection() {
  const { control, setValue, watch } = useFormContext<TeamInfoFormValues>()
  const formValue = new Set(watch('basicInfo.special_gifts_and_skills') ?? [])

  const [systemSkills, customSkills] = partition(
    Array.from(formValue),
    (skill) => SKILLS_OPTIONS.includes(skill)
  )

  const [customSkill, setCustomSkill] = React.useState<string>('')

  const toggleSkill = (skill: string) => {
    const updatedValue = new Set(formValue)
    if (formValue.has(skill)) {
      updatedValue.delete(skill)
    } else {
      updatedValue.add(skill)
    }
    setValue('basicInfo.special_gifts_and_skills', Array.from(updatedValue))
  }

  const addCustomSkill = () => {
    const trimmed = customSkill.trim()
    if (!isEmpty(trimmed)) {
      setValue('basicInfo.special_gifts_and_skills', [...formValue, trimmed])
      setCustomSkill('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCustomSkill()
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <Typography variant="h3">Gifts, Skills & Abilities</Typography>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="basicInfo.special_gifts_and_skills"
            render={() => (
              <FormItem>
                <FormLabel>
                  Select any special gifts, skills, or abilities you have:
                </FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {SKILLS_OPTIONS.map((skill) => (
                    <div
                      key={skill}
                      className="flex items-center space-x-2 rounded-md border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={skill}
                        checked={formValue.has(skill)}
                        onCheckedChange={() => toggleSkill(skill)}
                      />
                      <label
                        htmlFor={skill}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {skill}
                      </label>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  <FormLabel>Other (add your own):</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter a skill and press Enter"
                      value={customSkill}
                      onChange={(e) => setCustomSkill(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </div>

                  {/* Show custom skills that have been added */}
                  {customSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {customSkills.map((skill) => (
                        <div
                          key={skill}
                          className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className="hover:text-destructive"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}
