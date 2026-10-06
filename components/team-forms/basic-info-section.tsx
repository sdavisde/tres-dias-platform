'use client'

import { useFormContext } from 'react-hook-form'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { User, Building } from 'lucide-react'
import { MonthPickerPopover } from '@/components/ui/month-picker'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import * as React from 'react'
import { isNil } from 'lodash'
import type { TeamInfoFormValues } from './schemas'
import { RECOGNIZED_COMMUNITIES } from '@/lib/communities/whitelist'

export function BasicInfoSection() {
  const { control, setValue, watch } = useFormContext<TeamInfoFormValues>()

  const [hasCompleted, setHasCompleted] = React.useState(
    !isNil(watch('basicInfo.essentials_training_date')) ? 'yes' : 'no'
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <Typography variant="h3">Basic Information</Typography>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="basicInfo.church_affiliation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Church Affiliation</FormLabel>
                <FormControl>
                  <div className="flex items-center relative">
                    <Building className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="My Church"
                      {...field}
                      className="pl-9"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <Label>Which weekend did you go through Tres Dias?</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={control}
                name="basicInfo.weekend_attended.community"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
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
                    </FormControl>
                    <FormDescription>Tres Dias Community</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="basicInfo.weekend_attended.weekend_number"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Weekend #" {...field} type="number" />
                    </FormControl>
                    <FormDescription>Weekend #</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label>Have you completed Essentials Training?</Label>
            <RadioGroup
              value={hasCompleted}
              onValueChange={(val) => {
                setHasCompleted(val)
                if (val === 'no') {
                  setValue('basicInfo.essentials_training_date', undefined)
                }
              }}
              className="flex items-center space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="training-yes" />
                <Label htmlFor="training-yes" className="font-normal">
                  Yes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="training-no" />
                <Label htmlFor="training-no" className="font-normal">
                  No
                </Label>
              </div>
            </RadioGroup>

            {hasCompleted === 'yes' && (
              <FormField
                control={control}
                name="basicInfo.essentials_training_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>
                      When did you complete Essentials Training?
                    </FormLabel>
                    <MonthPickerPopover
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Pick a date"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <FormField
            control={control}
            name="basicInfo.is_clergy"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <FormLabel>Are you ordained clergy?</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value ? 'yes' : 'no'}
                    onValueChange={(val) => field.onChange(val === 'yes')}
                    className="flex items-center space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="clergy-yes" />
                      <Label htmlFor="clergy-yes" className="font-normal">
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="clergy-no" />
                      <Label htmlFor="clergy-no" className="font-normal">
                        No
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}
