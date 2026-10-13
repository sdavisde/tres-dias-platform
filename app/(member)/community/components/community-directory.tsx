'use client'

import Link from 'next/link'
import { DataTable, useDataTableUrlState } from '@/components/ui/data-table'
import type { DirectoryMember } from '@/services/community/directory'
import {
  directoryColumns,
  directoryGlobalFilterFn,
} from '../config/directory-columns'

type CommunityDirectoryProps = {
  members: DirectoryMember[]
}

/**
 * The member-facing slice of People: how to reach someone and where they
 * worship, nothing about service history or roles.
 */
export function CommunityDirectory({ members }: CommunityDirectoryProps) {
  const urlState = useDataTableUrlState({
    defaultSort: [{ id: 'name', desc: false }],
    defaultPageSize: 25,
  })

  return (
    <section aria-labelledby="master-roster-heading">
      <div className="flex flex-col gap-0.5 pb-3">
        <h2
          id="master-roster-heading"
          className="font-serif text-lg font-semibold tracking-tight"
        >
          Master Roster
        </h2>
        <p className="text-[13px] text-muted-foreground">
          {members.length} {members.length === 1 ? 'member' : 'members'} ·
          Something wrong or missing?{' '}
          <Link
            href="/profile"
            className="font-semibold text-primary hover:text-primary-hover"
          >
            Update your profile
          </Link>
        </p>
      </div>

      <DataTable
        columns={directoryColumns}
        data={members}
        user={null}
        initialSort={[{ id: 'name', desc: false }]}
        globalFilterFn={directoryGlobalFilterFn}
        urlState={urlState}
        searchPlaceholder="Search name, church or city…"
        emptyState={{
          noData: 'No one is in the directory yet.',
          noResults: 'No one matches your search.',
        }}
        appearance={{
          zebra: false,
          container: 'bg-card overflow-hidden [&_tbody_tr]:border-divider',
          header:
            'h-auto px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground [&_button]:h-7 [&_button]:text-xs [&_button]:font-semibold [&_button]:uppercase [&_button]:tracking-wider [&_button]:text-muted-foreground',
        }}
      />
    </section>
  )
}
