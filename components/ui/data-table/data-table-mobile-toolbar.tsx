'use client'

import { useMemo, useState } from 'react'
import type { Column, Table } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, ListFilter, X } from 'lucide-react'
import z from 'zod'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { DataTableSearch } from './data-table-search'
import { Results } from '@/lib/results'
import { isEmpty, isNil } from 'lodash'
import '@/components/ui/data-table/types'

const SelectedValuesSchema = z.array(z.string())

interface DataTableMobileToolbarProps<TData> {
  table: Table<TData>
  placeholder?: string
}

export function DataTableMobileToolbar<TData>({
  table,
  placeholder,
}: DataTableMobileToolbarProps<TData>) {
  const [filtersOpen, setFiltersOpen] = useState(false)

  const sorting = table.getState().sorting
  const sortColumnId = sorting[0]?.id ?? ''
  const sortDesc = sorting[0]?.desc ?? false

  const sortableColumns = useMemo(
    () => table.getAllLeafColumns().filter((c) => c.getCanSort()),
    [table]
  )

  const filterableColumns = useMemo(
    () =>
      table.getAllLeafColumns().filter(
        (c) =>
          !isNil(c.columnDef.meta?.filterType) &&
          (c.getIsVisible() ||
            // Children of visible expandable groups stay filterable on
            // mobile while the group is collapsed on desktop
            (!isNil(c.parent?.columnDef.meta?.expandableGroup) &&
              c.parent.getIsVisible()))
      ),
    [table]
  )

  const columnFilterCount = table.getState().columnFilters.length
  const globalFilter = (table.getState().globalFilter as string) ?? ''
  const hasActiveFilters = columnFilterCount > 0 || globalFilter !== ''

  const handleSortChange = (columnId: string) => {
    if (columnId === '') {
      table.resetSorting()
    } else {
      table.setSorting([{ id: columnId, desc: false }])
    }
  }

  const handleDirectionToggle = () => {
    if (sortColumnId === '') return
    table.setSorting([{ id: sortColumnId, desc: !sortDesc }])
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <DataTableSearch table={table} placeholder={placeholder} />

      {/* Sort + Filter toggle row */}
      <div className="flex items-center gap-2">
        {/* Sort dropdown */}
        <Select value={sortColumnId} onValueChange={handleSortChange}>
          <SelectTrigger size="sm" className="flex-1">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            {sortableColumns.map((col) => (
              <SelectItem key={col.id} value={col.id}>
                {getColumnTitle(col)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort direction toggle */}
        {sortColumnId !== '' && (
          <Button
            variant="outline"
            size="icon-sm"
            className="shrink-0"
            onClick={handleDirectionToggle}
          >
            {sortDesc ? (
              <ArrowDown className="size-4" />
            ) : (
              <ArrowUp className="size-4" />
            )}
            <span className="sr-only">
              {sortDesc ? 'Sorted descending' : 'Sorted ascending'}
            </span>
          </Button>
        )}

        {/* Filter toggle */}
        {filterableColumns.length > 0 && (
          <Button
            variant="outline"
            size="icon-sm"
            className={cn('shrink-0 relative', filtersOpen && 'bg-accent')}
            onClick={() => setFiltersOpen((prev) => !prev)}
          >
            <ListFilter className="size-4" />
            {columnFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="absolute -right-1.5 -top-1.5 size-4 items-center justify-center p-0 text-[10px]"
              >
                {columnFilterCount}
              </Badge>
            )}
            <span className="sr-only">Toggle filters</span>
          </Button>
        )}
      </div>

      {/* Expandable filter section */}
      {filterableColumns.length > 0 && (
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleContent>
            <div className="bg-muted/50 rounded-lg border p-3 space-y-4">
              {filterableColumns.map((col) => (
                <MobileColumnFilter key={col.id} column={col} />
              ))}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    table.resetColumnFilters()
                    table.setGlobalFilter('')
                  }}
                >
                  Clear all
                  <X className="ml-1 size-3" />
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mobile column filter (inline, not popover)
// ---------------------------------------------------------------------------

function MobileColumnFilter<TData, TValue>({
  column,
}: {
  column: Column<TData, TValue>
}) {
  const filterType = column.columnDef.meta?.filterType
  const title = getColumnTitle(column)

  if (filterType === 'text') {
    return <MobileTextFilter column={column} title={title} />
  }
  if (filterType === 'select') {
    return <MobileSelectFilter column={column} title={title} />
  }
  return null
}

function MobileTextFilter<TData, TValue>({
  column,
  title,
}: {
  column: Column<TData, TValue>
  title: string
}) {
  const filterValue = (column.getFilterValue() as string) ?? ''

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{title}</label>
      <Input
        placeholder={`Filter ${title.toLowerCase()}...`}
        value={filterValue}
        onChange={(e) =>
          column.setFilterValue(
            e.target.value !== '' ? e.target.value : undefined
          )
        }
        className="h-8"
      />
    </div>
  )
}

function MobileSelectFilter<TData, TValue>({
  column,
  title,
}: {
  column: Column<TData, TValue>
  title: string
}) {
  const selectedValues = Results.unwrapOr(
    Results.safeParse(column.getFilterValue(), SelectedValuesSchema),
    []
  )
  const facetedValues = column.getFacetedUniqueValues()

  const sortedOptions = useMemo(() => {
    return Array.from(facetedValues.entries())
      .map(([value, count]) => ({ value: String(value ?? ''), count }))
      .filter((opt) => opt.value !== '')
      .sort((a, b) => a.value.localeCompare(b.value))
  }, [facetedValues])

  const toggleValue = (value: string) => {
    const next = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value]
    column.setFilterValue(next.length > 0 ? next : undefined)
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{title}</label>
      <div className="space-y-1">
        {sortedOptions.map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent"
          >
            <Checkbox
              checked={selectedValues.includes(opt.value)}
              onCheckedChange={() => toggleValue(opt.value)}
            />
            <span className="flex-1 truncate">{opt.value}</span>
            <span className="text-muted-foreground text-xs">{opt.count}</span>
          </label>
        ))}
        {isEmpty(sortedOptions) && (
          <p className="text-muted-foreground py-2 text-center text-xs">
            No options found.
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getColumnTitle<TData, TValue>(column: Column<TData, TValue>): string {
  return (
    column.columnDef.meta?.mobileLabel ??
    (typeof column.columnDef.header === 'string'
      ? column.columnDef.header
      : column.id)
  )
}
