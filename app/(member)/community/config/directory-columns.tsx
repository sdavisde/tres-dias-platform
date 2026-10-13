'use client'

import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import { isNil } from 'lodash'
import { DataTableColumnHeader } from '@/components/ui/data-table'
import '@/components/ui/data-table/types'
import { UserAvatar } from '@/components/user-avatar'
import { formatPhoneNumber } from '@/lib/utils'
import type { DirectoryMember } from '@/services/community/directory'

export function directoryMemberName(member: DirectoryMember): string {
  const name = [member.firstName, member.lastName].filter(Boolean).join(' ')
  return name !== '' ? name : (member.email ?? 'Unnamed member')
}

function Muted({ value }: { value: string | null }) {
  return isNil(value) ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    <span>{value}</span>
  )
}

export const directoryColumns: ColumnDef<DirectoryMember>[] = [
  {
    id: 'name',
    // Sorts by last name, the way people look each other up.
    accessorFn: (member) =>
      `${member.lastName ?? ''} ${member.firstName ?? ''}`.trim(),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => {
      const member = row.original
      return (
        <div className="flex items-center gap-2.5">
          <UserAvatar
            user={{
              id: member.id,
              first_name: member.firstName,
              last_name: member.lastName,
              email: member.email,
              profilePhoto: member.profilePhoto,
            }}
            size={30}
          />
          <span className="font-semibold">{directoryMemberName(member)}</span>
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
    cell: ({ row }) => {
      const phone = row.original.phoneNumber
      if (isNil(phone)) return <Muted value={null} />
      return (
        <a
          href={`tel:${phone.replace(/\D/g, '')}`}
          onClick={(event) => event.stopPropagation()}
          className="whitespace-nowrap tabular-nums hover:text-primary"
        >
          {formatPhoneNumber(phone)}
        </a>
      )
    },
    enableSorting: false,
    meta: {
      showOnMobile: true,
      mobileLabel: 'Phone',
      mobilePriority: 'detail',
    },
  },
  {
    id: 'email',
    accessorFn: (member) => member.email,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => {
      const email = row.original.email
      if (isNil(email)) return <Muted value={null} />
      return (
        <a
          href={`mailto:${email}`}
          onClick={(event) => event.stopPropagation()}
          className="break-all font-medium text-primary hover:text-primary-hover"
        >
          {email}
        </a>
      )
    },
    enableSorting: false,
    meta: {
      showOnMobile: true,
      mobileLabel: 'Email',
      mobilePriority: 'detail',
    },
  },
  {
    id: 'church',
    accessorFn: (member) => member.church,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Church" />
    ),
    cell: ({ getValue }) => <Muted value={getValue<string | null>()} />,
    meta: {
      filterType: 'select',
      showOnMobile: true,
      mobileLabel: 'Church',
      mobilePriority: 'secondary',
    },
  },
  {
    id: 'weekend',
    accessorFn: (member) => member.weekendAttended,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Weekend" />
    ),
    cell: ({ getValue }) => {
      const weekend = getValue<string | null>()
      if (isNil(weekend)) return <Muted value={null} />
      return (
        <span className="inline-flex items-center whitespace-nowrap rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-nav-foreground">
          {weekend}
        </span>
      )
    },
    meta: {
      filterType: 'select',
      showOnMobile: true,
      mobileLabel: 'Weekend',
      mobilePriority: 'detail',
    },
  },
  {
    id: 'city',
    accessorFn: (member) => member.city,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="City" />
    ),
    cell: ({ getValue }) => <Muted value={getValue<string | null>()} />,
    meta: {
      filterType: 'select',
      showOnMobile: true,
      mobileLabel: 'City',
      mobilePriority: 'secondary',
    },
  },
]

/** Search matches name, email, church, weekend or city. */
export const directoryGlobalFilterFn: FilterFn<DirectoryMember> = (
  row,
  _columnId,
  filterValue
) => {
  const query = String(filterValue ?? '')
    .trim()
    .toLowerCase()
  if (query === '') return true

  const member = row.original
  return [
    directoryMemberName(member),
    member.email,
    member.church,
    member.weekendAttended,
    member.city,
  ].some((value) => value?.toLowerCase().includes(query) === true)
}
