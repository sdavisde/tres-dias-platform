'use client'

import type { Column } from '@tanstack/react-table'
import { ChevronsLeftRight, ChevronsRightLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from './data-table-column-header'
import '@/components/ui/data-table/types'

interface CollapsedGroupHeaderProps<TData, TValue> {
  label: string
  /** The summary child column — its sorting/filtering stay available while collapsed */
  summaryColumn: Column<TData, TValue>
  onExpand: () => void
}

/**
 * Header for a collapsed expandable group: the group label (sortable/filterable
 * via the summary column) plus a chevron button hinting the column can expand.
 */
export function CollapsedGroupHeader<TData, TValue>({
  label,
  summaryColumn,
  onExpand,
}: CollapsedGroupHeaderProps<TData, TValue>) {
  return (
    <div className="flex items-center gap-0.5">
      <DataTableColumnHeader column={summaryColumn} title={label} />
      <Button
        variant="ghost"
        size="sm"
        className="text-primary hover:text-primary"
        onClick={onExpand}
        aria-label={`Expand ${label} columns`}
        aria-expanded={false}
      >
        <ChevronsLeftRight className="size-4" />
      </Button>
    </div>
  )
}

interface ExpandedGroupHeaderProps {
  label: string
  onCollapse: () => void
}

/**
 * Spanning band header for an expanded group: centered label with collapse
 * fold-buttons at either end.
 */
export function ExpandedGroupHeader({
  label,
  onCollapse,
}: ExpandedGroupHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="text-primary hover:text-primary"
        onClick={onCollapse}
        aria-label={`Collapse ${label} columns`}
        aria-expanded={true}
      >
        <ChevronsRightLeft className="size-4" />
      </Button>
      <span className="text-primary flex-1 text-center font-semibold">
        {label}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="text-primary hover:text-primary"
        onClick={onCollapse}
        aria-label={`Collapse ${label} columns`}
        aria-expanded={true}
      >
        <ChevronsRightLeft className="size-4" />
      </Button>
    </div>
  )
}
