'use client'

import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import type { MasterRosterMember } from '@/services/master-roster/types'
import { DataTableColumnHeader } from '@/components/ui/data-table'
import { Check, Star } from 'lucide-react'
import { cn, formatPhoneNumber } from '@/lib/utils'
import { isEmpty } from 'lodash'
import {
  memberDisplayName,
  memberMatchesSearch,
  memberRolesLabel,
} from '../lib/people-csv'
import '@/components/ui/data-table/types'
import { UserAvatarWithPreview } from '@/components/user-avatar'
import { SelectedRowMarker } from '../components/selected-member-context'

// ---------------------------------------------------------------------------
// Board chip system (design canvas, People board): Admin renders solid brown,
// the Pre-Weekend Couple renders cream, everything else renders muted.
// ---------------------------------------------------------------------------

export function roleChipClasses(label: string): string {
  if (label === 'Admin') {
    return 'bg-primary text-primary-foreground'
  }
  if (label === 'Pre-Weekend Couple') {
    return 'bg-secondary text-secondary-foreground'
  }
  return 'bg-muted text-nav-foreground'
}

function RoleChip({ label }: { label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        roleChipClasses(label)
      )}
    >
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

export const masterRosterColumns: ColumnDef<MasterRosterMember>[] = [
  {
    id: 'name',
    accessorFn: memberDisplayName,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ getValue, row }) => {
      const member = row.original
      return (
        <div className="flex items-center gap-2.5">
          {/* Styling hook for the open-editor row tint (see people-table). */}
          <SelectedRowMarker memberId={member.id} />
          <UserAvatarWithPreview
            user={{
              id: member.id,
              first_name: member.firstName,
              last_name: member.lastName,
              email: member.email,
              phone_number: member.phoneNumber,
              profilePhoto: member.profilePhoto,
            }}
            size={30}
          />
          <span className="font-semibold">{getValue<string>()}</span>
        </div>
      )
    },
    meta: {
      showOnMobile: true,
      mobileLabel: 'Name',
      mobilePriority: 'primary',
    },
  },
  {
    id: 'phone',
    accessorFn: (member) => member.phoneNumber,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Phone" />
    ),
    cell: ({ getValue }) => (
      <span className="text-muted-foreground tabular-nums">
        {formatPhoneNumber(getValue<string | null>())}
      </span>
    ),
    meta: {
      showOnMobile: true,
      mobileLabel: 'Phone',
      mobilePriority: 'detail',
    },
  },
  {
    id: 'role',
    accessorFn: memberRolesLabel,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Roles" />
    ),
    cell: ({ row }) => {
      const roles = row.original.roles
      if (isEmpty(roles)) {
        return <span className="text-muted-foreground">-</span>
      }
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {roles.map((role) => (
            <RoleChip key={role.id} label={role.label} />
          ))}
        </div>
      )
    },
    meta: {
      filterType: 'select',
      showOnMobile: true,
      mobileLabel: 'Roles',
      mobilePriority: 'secondary',
    },
  },
  {
    id: 'level',
    accessorFn: (member) => member.level,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Level"
        className="justify-center"
      />
    ),
    cell: ({ getValue }) => {
      const level = getValue<number>()
      return (
        <div className="text-center">
          <span
            className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-xs font-semibold tabular-nums"
            style={{
              backgroundColor: `var(--experience-level-${level})`,
              color: `var(--experience-level-${level}-fg)`,
            }}
          >
            {level}
          </span>
        </div>
      )
    },
    meta: {
      filterType: 'select',
      showOnMobile: true,
      mobileLabel: 'Level',
      mobilePriority: 'detail',
    },
  },
  {
    id: 'rectorReady',
    accessorFn: (member) => member.rectorReady.statusLabel,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Rector ready" />
    ),
    cell: ({ row }) => {
      const rectorReady = row.original.rectorReady
      if (rectorReady.criteria.hasServedAsRector) {
        return (
          <span className="inline-flex items-center gap-1.5 font-semibold text-success">
            <span className="relative inline-flex">
              <Check className="h-4 w-4" />
              {/* amber-500 kept deliberately: --warning is too pale at icon
                  size (open design-system question) */}
              <Star className="absolute -right-1.5 -top-1 h-2.5 w-2.5 fill-amber-500 text-amber-500" />
            </span>
            Ready
          </span>
        )
      }
      if (rectorReady.isReady) {
        return (
          <span className="inline-flex items-center gap-1.5 font-semibold text-success">
            <Check className="h-4 w-4" />
            Ready
          </span>
        )
      }
      return <span className="text-muted-foreground">Not yet</span>
    },
    enableSorting: false,
    meta: {
      filterType: 'select',
      showOnMobile: true,
      mobileLabel: 'Rector Ready',
      mobilePriority: 'detail',
    },
  },
]

// ---------------------------------------------------------------------------
// Global filter function (email stays searchable even though the board drops
// the email column — it lives in the person editor instead)
// ---------------------------------------------------------------------------

export const masterRosterGlobalFilterFn: FilterFn<MasterRosterMember> = (
  row,
  _columnId,
  filterValue
) => memberMatchesSearch(row.original, filterValue as string)
