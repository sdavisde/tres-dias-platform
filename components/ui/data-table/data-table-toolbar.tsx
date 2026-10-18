'use client'

import type { ReactNode } from 'react'
import type { Table } from '@tanstack/react-table'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTableSearch } from './data-table-search'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  placeholder?: string
  children?: ReactNode
}

export function DataTableToolbar<TData>({
  table,
  placeholder,
  children,
}: DataTableToolbarProps<TData>) {
  const columnFilterCount = table.getState().columnFilters.length
  const globalFilter = (table.getState().globalFilter as string) ?? ''
  const hasActiveFilters = columnFilterCount > 0 || globalFilter !== ''

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <DataTableSearch table={table} placeholder={placeholder} />
      </div>
      {children}
      {hasActiveFilters && (
        <div className="flex items-center gap-1">
          {columnFilterCount > 0 && (
            <Badge variant="secondary">
              {columnFilterCount}{' '}
              {columnFilterCount === 1 ? 'filter' : 'filters'}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              table.resetColumnFilters()
              table.setGlobalFilter('')
            }}
          >
            Clear all
            <X className="ml-1 size-3" />
          </Button>
        </div>
      )}
    </div>
  )
}
