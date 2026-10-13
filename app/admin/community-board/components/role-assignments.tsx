'use client'

import { useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { InlineAutoSaveField } from '@/components/auto-save/inline-auto-save-field'
import { usePreWeekendEmail } from '@/hooks/use-pre-weekend-email'
import { useRoleAssignment } from '@/hooks/use-role-assignment'
import { RoleAssignmentDialog } from './role-assignment-dialog'
import { AssignmentConfirmationDialog } from './assignment-confirmation-dialog'
import { AddCommitteeDialog } from './add-committee-dialog'
import type { BoardRole, BoardMember } from '@/services/community/board'
import type { ContactInfo } from '@/services/notifications'
import { UserAvatarWithPreview } from '@/components/user-avatar'

type RoleAssignmentsProps = {
  boardRoles: BoardRole[]
  committeeRoles: BoardRole[]
  members: BoardMember[]
  preWeekendCoupleContact: ContactInfo
  /** Whether the viewer may reassign positions and edit the notification email. */
  canEdit: boolean
  /** Rendered in the right column beneath the committees card (meeting minutes). */
  children?: React.ReactNode
}

function MemberAvatars({ assigned }: { assigned: BoardMember[] }) {
  return (
    <div className="flex items-center">
      {assigned.map((member, index) => (
        <div
          key={member.id}
          className={index > 0 ? '-ml-2 rounded-full ring-2 ring-card' : ''}
        >
          <UserAvatarWithPreview
            user={{
              id: member.id,
              first_name: member.firstName,
              last_name: member.lastName,
              email: member.email,
              phone_number: member.phoneNumber,
              profilePhoto: member.profilePhoto,
            }}
            size={32}
          />
        </div>
      ))}
    </div>
  )
}

function PositionRow({
  role,
  assigned,
  canEdit,
  onAssignClick,
  subtitle,
  detail,
}: {
  role: BoardRole
  assigned: BoardMember[]
  canEdit: boolean
  onAssignClick: () => void
  subtitle?: string
  detail?: React.ReactNode
}) {
  const hasAssignments = assigned.length > 0
  const names = assigned
    .map((member) => `${member.firstName} ${member.lastName}`)
    .join(', ')

  return (
    // Stacks below `sm` so the label, the holder and the button each get a full
    // line on a phone instead of fighting over one 360px row.
    <div className="flex flex-col gap-2 border-b border-divider py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-3.5">
      <div
        className="min-w-0 sm:w-52 sm:shrink-0"
        title={role.description ?? undefined}
      >
        <div className="text-sm font-semibold">{role.label}</div>
        {subtitle !== undefined && (
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        )}
      </div>
      {hasAssignments ? (
        <div className="flex min-w-0 items-center gap-2.5">
          <MemberAvatars assigned={assigned} />
          <div className="min-w-0">
            <div className="truncate text-sm">{names}</div>
            {detail}
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="rounded-full border border-secondary-border bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
            Open
          </span>
          <span className="truncate text-sm text-muted-foreground">
            No one holds this yet
          </span>
        </div>
      )}
      {canEdit && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAssignClick}
          className="h-11 w-full shrink-0 sm:ml-auto sm:h-8 sm:w-auto"
        >
          {hasAssignments ? 'Change' : 'Assign'}
        </Button>
      )}
    </div>
  )
}

function AddCommitteeRow({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 flex min-h-11 w-full flex-col gap-0.5 rounded-md border border-dashed border-border px-3.5 py-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/50"
    >
      <span className="text-[13.5px] font-semibold text-muted-foreground">
        + Add a committee or team
      </span>
      <span className="text-xs text-muted-foreground/80">
        Kitchen, music, palanca — any group with a lead worth naming
      </span>
    </button>
  )
}

export function RoleAssignments({
  boardRoles,
  committeeRoles,
  members,
  preWeekendCoupleContact,
  canEdit,
  children,
}: RoleAssignmentsProps) {
  const preWeekendEmail = usePreWeekendEmail({
    contact: preWeekendCoupleContact,
  })
  const roleAssignment = useRoleAssignment({ members })
  const [addCommitteeOpen, setAddCommitteeOpen] = useState(false)

  const openCount = useMemo(
    () =>
      boardRoles.filter(
        (role) => (roleAssignment.membersByRoleId[role.id] ?? []).length === 0
      ).length,
    [boardRoles, roleAssignment.membersByRoleId]
  )

  const preWeekendDetail = preWeekendEmail.isEditingEmail ? (
    <InlineAutoSaveField
      initialValue={preWeekendEmail.email}
      type="email"
      placeholder="email@example.com"
      ariaLabel="Pre Weekend Couple notification email"
      inputClassName="h-8 text-xs"
      className="mt-1"
      errorMessage="Unable to update email address. Please try again."
      validate={(value) =>
        value.trim() === '' ? 'Email address cannot be empty' : null
      }
      save={preWeekendEmail.saveEmail}
      onSaved={preWeekendEmail.onEmailSaved}
      onDone={preWeekendEmail.finishEditEmail}
    />
  ) : (
    <div className="flex items-center gap-1.5">
      <span className="truncate text-xs text-muted-foreground">
        {preWeekendEmail.email !== ''
          ? preWeekendEmail.email
          : 'No notification email set'}
      </span>
      {canEdit && (
        <Button
          size="sm"
          variant="ghost"
          className="size-11 shrink-0 p-0 sm:size-6"
          onClick={preWeekendEmail.startEditEmail}
        >
          <Pencil className="h-3 w-3" />
          <span className="sr-only">Edit notification email</span>
        </Button>
      )}
    </div>
  )

  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card className="gap-0 py-0">
          <CardContent className="px-5 py-4">
            <div className="flex items-baseline justify-between pb-1">
              <h2 className="font-serif text-lg font-semibold tracking-tight">
                Board positions
              </h2>
              <span className="text-[13px] text-muted-foreground">
                {boardRoles.length} positions
                {openCount > 0 && ` · ${openCount} open`}
              </span>
            </div>
            {boardRoles.map((role) => (
              <PositionRow
                key={role.id}
                role={role}
                assigned={roleAssignment.membersByRoleId[role.id] ?? []}
                canEdit={canEdit}
                onAssignClick={() => roleAssignment.openDialog(role)}
              />
            ))}
          </CardContent>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          {(committeeRoles.length > 0 || canEdit) && (
            <Card className="gap-0 py-0">
              <CardContent className="px-5 py-4">
                <h2 className="pb-1 font-serif text-lg font-semibold tracking-tight">
                  Committees &amp; teams
                </h2>
                {committeeRoles.map((role) => {
                  const assigned = roleAssignment.membersByRoleId[role.id] ?? []
                  const isPreWeekendCouple = role.label === 'Pre Weekend Couple'
                  // An empty committee already reads "Open · No one holds
                  // this yet", so "0 members" would only repeat it.
                  const memberCount =
                    assigned.length > 0
                      ? `${assigned.length} member${assigned.length === 1 ? '' : 's'}`
                      : undefined

                  return (
                    <PositionRow
                      key={role.id}
                      role={role}
                      assigned={assigned}
                      canEdit={canEdit}
                      onAssignClick={() => roleAssignment.openDialog(role)}
                      subtitle={
                        isPreWeekendCouple
                          ? 'Gets sponsorship notifications'
                          : memberCount
                      }
                      detail={isPreWeekendCouple ? preWeekendDetail : undefined}
                    />
                  )
                })}
                {canEdit && (
                  <AddCommitteeRow onClick={() => setAddCommitteeOpen(true)} />
                )}
              </CardContent>
            </Card>
          )}
          {children}
        </div>
      </div>

      <RoleAssignmentDialog {...roleAssignment.dialogProps} />
      <AssignmentConfirmationDialog {...roleAssignment.confirmationProps} />
      {canEdit && (
        <AddCommitteeDialog
          open={addCommitteeOpen}
          onOpenChange={setAddCommitteeOpen}
        />
      )}
    </>
  )
}
