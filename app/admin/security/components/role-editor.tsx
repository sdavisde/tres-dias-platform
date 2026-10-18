'use client'

import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { isNil } from 'lodash'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { isErr } from '@/lib/results'
import { toastError } from '@/lib/toast-error'
import { useAutoSave } from '@/hooks/use-auto-save'
import { AutoSaveStatusIndicator } from '@/components/auto-save/auto-save-status'
import { isDevMode } from '@/lib/dev-mode'
import { cn } from '@/lib/utils'
import type { Permission } from '@/lib/security'
import {
  ADMIN_ACCESS_PERMISSION,
  FULL_ACCESS_PERMISSION,
  PERMISSION_LADDERS,
  SENSITIVE_PERMISSIONS,
} from '@/lib/security/permission-areas'
import {
  applyRung,
  applySwitch,
  resolveLadder,
  resolveSwitch,
  togglePermission,
  type Rung,
} from '@/lib/security/role-rungs'
import type {
  FullAccessImpact,
  Role,
  RoleInput,
  RoleUsageById,
} from '@/services/identity/roles'
import { createRole, updateRole } from '@/services/identity/roles'
import {
  roleInputSchema,
  type RoleInputValues,
} from '@/services/identity/roles/validation'
import {
  effectivePermissionCount,
  inheritedPermissions,
  parentOptions,
  roleLabelById,
  toRoleInput,
} from '../lib/editor-model'
import {
  EditorPanel,
  EditorSection,
  LockedBy,
  SettingRow,
} from './editor-layout'
import { PermissionLadder } from './permission-ladder'
import { RoleSummaryCard } from './role-summary-card'
import { SensitivePanel } from './sensitive-panel'
import { FullAccessCard } from './full-access-card'

const NO_PARENT = '__none__'

const fieldLabelClass =
  'text-[12px] font-semibold uppercase tracking-wider text-muted-foreground'

interface RoleEditorProps {
  /** The saved role being edited, or null for an unsaved draft. */
  role: Role | null
  /** Draft values when creating (a copy of `copiedFrom`). */
  initial: RoleInput | null
  copiedFrom: Role | null
  roles: Role[]
  usage: RoleUsageById
  fullAccessImpact: FullAccessImpact
  canEdit: boolean
  onSaved: (role: Role) => void
  onCancel: () => void
  onDelete: (role: Role) => void
  /** Jump to another role (the parent link in the header). Plain text when absent. */
  onSelectRole?: (roleId: string) => void
}

/**
 * The detail pane, read as a settings page: a header with one summary line,
 * then the name fields, Permissions, Sensitive data and the danger zone, each
 * its own bordered panel. A saved role auto-saves each change once the form is
 * valid; a new draft waits for "Create role". Loading a role never normalises
 * its permissions — nothing is written until something is edited.
 */
export function RoleEditor({
  role,
  initial,
  copiedFrom,
  roles,
  usage,
  fullAccessImpact,
  canEdit,
  onSaved,
  onCancel,
  onDelete,
  onSelectRole,
}: RoleEditorProps) {
  const isNew = isNil(role)
  const defaults: RoleInputValues = useMemo(() => {
    if (!isNil(role)) return toRoleInput(role)
    if (!isNil(initial)) return initial
    return {
      label: '',
      description: '',
      type: 'INDIVIDUAL',
      based_on_role_id: null,
      permissions: [],
    }
  }, [role, initial])

  const form = useForm<RoleInputValues>({
    resolver: zodResolver(roleInputSchema),
    defaultValues: defaults,
    // Auto-save has no submit to trigger validation, so check on blur instead.
    mode: 'onTouched',
  })
  const [isCreating, setIsCreating] = useState(false)

  const values = useWatch({ control: form.control }) as RoleInputValues
  const parsed = roleInputSchema.safeParse(values)
  const autoSave = useAutoSave({
    value: values,
    isValid: parsed.success,
    enabled: canEdit && !isNew,
    errorMessage: 'Unable to save this role. Please try again.',
    save: async (next) => {
      if (isNil(role)) return { error: 'No role to update' }
      const result = await updateRole({
        roleId: role.id,
        input: roleInputSchema.parse(next),
      })
      if (!isErr(result)) onSaved(result.data)
      return result
    },
  })

  const basedOnRoleId = useWatch({
    control: form.control,
    name: 'based_on_role_id',
  })
  const ownPermissions = useWatch({
    control: form.control,
    name: 'permissions',
  })

  const readOnly = !canEdit || isCreating
  const own = useMemo(
    () => new Set<Permission>(ownPermissions ?? []),
    [ownPermissions]
  )
  const inherited = useMemo(
    () => inheritedPermissions(basedOnRoleId ?? null, roles),
    [basedOnRoleId, roles]
  )
  const effective = useMemo(
    () => new Set<Permission>([...own, ...inherited]),
    [own, inherited]
  )
  const parentLabel = roleLabelById(basedOnRoleId ?? null, roles)
  const parents = useMemo(
    () => parentOptions(role?.id ?? null, roles),
    [role?.id, roles]
  )

  const setPermissions = (next: Permission[]) => {
    autoSave.saveImmediately()
    form.setValue('permissions', next, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const ladders = PERMISSION_LADDERS.map((ladder) =>
    resolveLadder(ladder, own, inherited)
  )
  const sensitiveSwitches = new Map(
    SENSITIVE_PERMISSIONS.map((item) => [
      item.permission,
      resolveSwitch(item.permission, own, inherited),
    ])
  )
  const adminAccess = resolveSwitch(ADMIN_ACCESS_PERMISSION, own, inherited)
  const fullAccess = resolveSwitch(FULL_ACCESS_PERMISSION, own, inherited)

  const roleUsage = isNil(role) ? null : (usage[role.id] ?? null)
  const dependentLabels = (roleUsage?.dependentRoleIds ?? [])
    .map((id) => roleLabelById(id, roles))
    .filter((label): label is string => !isNil(label))
  const deleteBlockedReason = isNil(roleUsage)
    ? null
    : dependentLabels.length > 0
      ? `${dependentLabels.join(', ')} ${dependentLabels.length === 1 ? 'is' : 'are'} based on this role.`
      : roleUsage.userCount > 0
        ? `${roleUsage.userCount} ${roleUsage.userCount === 1 ? 'person holds' : 'people hold'} this role.`
        : null

  // "Based on Admin — everything Admin can do, plus what you set below. · 12 permissions · held by 3 people"
  const permissionCount = effectivePermissionCount(
    ownPermissions ?? [],
    inherited
  )
  const parentName =
    isNil(parentLabel) || isNil(basedOnRoleId) ? null : isNil(onSelectRole) ? (
      <span className="font-semibold text-foreground">{parentLabel}</span>
    ) : (
      <button
        type="button"
        onClick={() => onSelectRole(basedOnRoleId)}
        className="cursor-pointer font-semibold text-primary underline underline-offset-2 outline-none hover:text-primary-hover focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {parentLabel}
      </button>
    )
  const summaryParts: ReactNode[] = [
    isNil(parentName) ? (
      'Not based on another role'
    ) : (
      <>
        Based on {parentName} — everything {parentLabel} can do, plus what you
        set below.
      </>
    ),
    `${permissionCount} ${permissionCount === 1 ? 'permission' : 'permissions'}`,
  ]
  if (!isNil(roleUsage)) {
    summaryParts.push(
      `held by ${roleUsage.userCount} ${roleUsage.userCount === 1 ? 'person' : 'people'}`
    )
  }
  if (isNew && !isNil(copiedFrom)) {
    summaryParts.push(`copied from ${copiedFrom.label}`)
  }

  // Only drafts submit; saved roles auto-save above.
  const onSubmit = async (input: RoleInputValues) => {
    if (!isNew) return
    setIsCreating(true)
    try {
      const result = await createRole(input)
      if (isErr(result)) {
        toastError('Unable to create this role. Please try again.', {
          error: result.error,
        })
        return
      }
      toast.success('Role created')
      onSaved(result.data)
    } catch (error) {
      toastError('Unable to create this role. Please try again.', { error })
    } finally {
      setIsCreating(false)
    }
  }

  const fillWithTestData = () => {
    form.setValue('label', 'Hospitality Lead', { shouldDirty: true })
    form.setValue(
      'description',
      'Coordinates meals and lodging for the weekend and keeps an eye on candidate fees.',
      { shouldDirty: true }
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex max-w-[680px] flex-col gap-6">
          {/* Header: the name, one line saying where this role stands, and the plain-English summary. */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-serif text-2xl font-semibold tracking-tight">
                  {isNew ? 'New role' : role.label}
                </h2>
                <AutoSaveStatusIndicator
                  status={autoSave.status}
                  onRetry={autoSave.flush}
                  className="mt-2 ml-auto"
                />
                {canEdit && isDevMode() && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={fillWithTestData}
                  >
                    Fill with test data
                  </Button>
                )}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {summaryParts.map((part, index) => (
                  <Fragment key={index}>
                    {index > 0 && (
                      <span className="text-muted-foreground/60"> · </span>
                    )}
                    {part}
                  </Fragment>
                ))}
              </p>
            </div>

            <RoleSummaryCard effective={effective} parentLabel={parentLabel} />
          </div>

          <EditorPanel>
            <div className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={fieldLabelClass}>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Treasurer"
                        disabled={readOnly}
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
                    <FormLabel className={fieldLabelClass}>
                      Description · required
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder="Who is this role for, and what do they need to do?"
                        disabled={readOnly}
                        className="min-h-20 text-sm leading-relaxed"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="flex min-h-11 flex-row items-start gap-3 md:min-h-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value === 'INDIVIDUAL'}
                        disabled={readOnly}
                        onCheckedChange={(checked) => {
                          autoSave.saveImmediately()
                          field.onChange(
                            checked === true ? 'INDIVIDUAL' : 'COMMITTEE'
                          )
                        }}
                        className="mt-0.5 size-4 shrink-0"
                      />
                    </FormControl>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <FormLabel
                        className={cn(
                          'text-sm font-medium text-foreground',
                          readOnly ? 'cursor-not-allowed' : 'cursor-pointer'
                        )}
                      >
                        One person holds this role at a time
                      </FormLabel>
                      <FormDescription className="text-[13px] leading-snug">
                        Board positions like Treasurer. Leave off for committees
                        and teams.
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-2">
                <FormField
                  control={form.control}
                  name="based_on_role_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={fieldLabelClass}>
                        Based on
                      </FormLabel>
                      <Select
                        value={field.value ?? NO_PARENT}
                        onValueChange={(value) => {
                          autoSave.saveImmediately()
                          field.onChange(value === NO_PARENT ? null : value)
                        }}
                        disabled={readOnly}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 w-full md:h-9">
                            <SelectValue placeholder="Nothing" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_PARENT}>Nothing</SelectItem>
                          {parents.map((parent) => (
                            <SelectItem key={parent.id} value={parent.id}>
                              {parent.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Rendered outside the field so it never reads form context. */}
                <p className="text-[13px] leading-snug text-muted-foreground">
                  {isNil(parentLabel)
                    ? 'Pick a role to include everything it can do, locked below.'
                    : `Everything ${parentLabel} can do is included and locked below.`}
                </p>
              </div>
            </div>
          </EditorPanel>

          <EditorSection
            title="Permissions"
            description={
              isNil(parentLabel)
                ? 'One row per area.'
                : `One row per area. Rows with a lock come from ${parentLabel} — edit ${parentLabel} to change them.`
            }
          >
            <SettingRow
              htmlFor="admin-access"
              title="Can open the admin area"
              description="Without this, none of the areas below are reachable in Admin — the role only affects what people can see on the member site."
              control={
                <>
                  {adminAccess.locked && <LockedBy parentLabel={parentLabel} />}
                  <Switch
                    id="admin-access"
                    checked={adminAccess.on}
                    disabled={readOnly || adminAccess.locked}
                    onCheckedChange={(checked) =>
                      setPermissions(
                        applySwitch(
                          ownPermissions ?? [],
                          ADMIN_ACCESS_PERMISSION,
                          checked
                        )
                      )
                    }
                    aria-label={
                      adminAccess.locked
                        ? `Can open the admin area (granted by ${parentLabel ?? 'the role it is based on'})`
                        : 'Can open the admin area'
                    }
                  />
                </>
              }
            />

            {ladders.map((resolved) => (
              <PermissionLadder
                key={resolved.ladder.id}
                resolved={resolved}
                own={own}
                inherited={inherited}
                parentLabel={parentLabel}
                disabled={readOnly}
                onChange={(rung: Rung) =>
                  setPermissions(
                    applyRung(
                      resolved.ladder,
                      ownPermissions ?? [],
                      inherited,
                      rung
                    )
                  )
                }
                onToggle={(permission) =>
                  setPermissions(
                    togglePermission(ownPermissions ?? [], permission)
                  )
                }
              />
            ))}

            <p className="pt-3 text-[13px] leading-relaxed text-muted-foreground">
              Someone with several roles gets everything any of them grants —
              the most permissive wins. Weekend leadership roles (Rector, heads)
              grant temporary access on top — that’s set on each weekend’s
              roster, not here.
            </p>
          </EditorSection>

          <SensitivePanel
            switches={sensitiveSwitches}
            parentLabel={parentLabel}
            disabled={readOnly}
            onChange={(permission, on) =>
              setPermissions(applySwitch(ownPermissions ?? [], permission, on))
            }
          />

          <EditorSection
            tone="destructive"
            title="Danger zone"
            description="These change what everyone with this role can do, or remove the role for good."
          >
            <div className="pt-3">
              <FullAccessCard
                resolved={fullAccess}
                totalHolders={fullAccessImpact.totalHolders}
                holdersLostIfRemoved={
                  isNil(role)
                    ? 0
                    : (fullAccessImpact.holdersLostIfRemoved[role.id] ?? 0)
                }
                grantedWhenLoaded={
                  !isNil(role) &&
                  role.permissions.includes(FULL_ACCESS_PERMISSION)
                }
                parentLabel={parentLabel}
                disabled={readOnly}
                onChange={(on) =>
                  setPermissions(
                    applySwitch(
                      ownPermissions ?? [],
                      FULL_ACCESS_PERMISSION,
                      on
                    )
                  )
                }
              />

              {canEdit && !isNew && (
                <div className="flex flex-col gap-1.5 border-t border-destructive/25 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start border-destructive/50 bg-card text-destructive hover:bg-destructive hover:text-white"
                    disabled={!isNil(deleteBlockedReason)}
                    onClick={() => onDelete(role)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete role
                  </Button>
                  {!isNil(deleteBlockedReason) && (
                    <p className="text-xs leading-snug text-muted-foreground">
                      Can’t delete yet: {deleteBlockedReason}
                    </p>
                  )}
                </div>
              )}
            </div>
          </EditorSection>

          {/* Drafts only: a saved role auto-saves. */}
          {canEdit && isNew && (
            <div className="sticky bottom-0 flex items-center justify-end gap-2 rounded-md border border-border bg-card px-4 py-3">
              <p className="mr-auto text-[13px] text-muted-foreground">
                Not saved yet
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isCreating}
                onClick={() => {
                  form.reset(defaults)
                  onCancel()
                }}
              >
                Discard
              </Button>
              <Button type="submit" size="sm" disabled={isCreating}>
                {isCreating ? 'Creating…' : 'Create role'}
              </Button>
            </div>
          )}
        </div>
      </form>
    </Form>
  )
}
