'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { isErr } from '@/lib/results'
import { toastError } from '@/lib/toast-error'
import { isDevMode } from '@/lib/dev-mode'
import { createRole } from '@/services/identity/roles'
import {
  roleInputSchema,
  type RoleInputValues,
} from '@/services/identity/roles/validation'

type AddCommitteeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const defaultValues: RoleInputValues = {
  label: '',
  description: '',
  type: 'COMMITTEE',
  based_on_role_id: null,
  permissions: [],
}

/**
 * A focused create flow for a new committee or team, reached from the
 * dashed row at the bottom of the Committees & teams card. Unlike the
 * Security page's role editor, this never touches permissions or a "based
 * on" parent — new committees start blank, and access is set later on the
 * Security page.
 */
export function AddCommitteeDialog({
  open,
  onOpenChange,
}: AddCommitteeDialogProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<RoleInputValues>({
    resolver: zodResolver(roleInputSchema),
    defaultValues,
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset(defaultValues)
    }
    onOpenChange(next)
  }

  const onSubmit = async (values: RoleInputValues) => {
    setIsSaving(true)
    try {
      const result = await createRole(values)
      if (isErr(result)) {
        toastError('Unable to create this committee. Please try again.', {
          error: result.error,
        })
        return
      }
      toast.success('Committee created')
      router.refresh()
      handleOpenChange(false)
    } catch (error) {
      toastError('Unable to create this committee. Please try again.', {
        error,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const fillWithTestData = () => {
    form.setValue('label', 'Hospitality Committee', { shouldDirty: true })
    form.setValue(
      'description',
      'Coordinates meals and lodging for the weekend and welcomes new members.',
      { shouldDirty: true }
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle className="font-serif text-xl font-semibold tracking-tight">
                Add a committee or team
              </DialogTitle>
              <DialogDescription>
                Kitchen, music, palanca — any group with a lead worth naming.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              {isDevMode() && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={fillWithTestData}
                >
                  Fill with test data
                </Button>
              )}

              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Kitchen Committee"
                        disabled={isSaving}
                        className="h-11 md:h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder="What does this group do?"
                        disabled={isSaving}
                        className="min-h-20 text-sm leading-relaxed"
                      />
                    </FormControl>
                    <FormDescription>
                      One plain-language sentence members will see.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Permissions for this committee can be set on the{' '}
                <Link
                  href="/admin/security"
                  className="font-medium text-primary hover:text-primary-hover"
                >
                  Security page
                </Link>
                .
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSaving}
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Creating…' : 'Create committee'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
