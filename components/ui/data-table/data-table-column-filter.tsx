'use client'

import { useMemo, useState } from 'react'
import type { Column } from '@tanstack/react-table'
import { ListFilter, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import '@/components/ui/data-table/types'
import z from 'zod'
import { Results } from '@/lib/results'
import { isEmpty, isNil } from 'lodash'

interface DataTableColumnFilterProps<TData, TValue> {
  column: Column<TData, TValue>
}

export function DataTableColumnFilter<TData, TValue>({
  column,
}: DataTableColumnFilterProps<TData, TValue>) {
  const filterType = column.columnDef.meta?.filterType
  const isActive = column.getFilterValue() !== undefined

  if (isNil(filterType)) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(isActive && 'text-primary')}
        >
          <ListFilter className="size-4" />
          <span className="sr-only">Filter</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-3">
        {filterType === 'text' ? (
          <TextFilter column={column} />
        ) : (
          <SelectFilter column={column} />
        )}
      </PopoverContent>
    </Popover>
  )
}

function TextFilter<TData, TValue>({
  column,
}: {
  column: Column<TData, TValue>
}) {
  const filterValue = (column.getFilterValue() as string) ?? ''

  return (
    <div className="space-y-2">
      <Input
        placeholder={`Filter...`}
        value={filterValue}
        onChange={(e) => column.setFilterValue(e.target.value ?? undefined)}
        className="h-8"
      />
      {filterValue !== '' && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => column.setFilterValue(undefined)}
        >
          Clear
        </Button>
      )}
    </div>
  )
}

function SelectFilter<TData, TValue>({
  column,
}: {
  column: Column<TData, TValue>
}) {
  const [search, setSearch] = useState('')
  // Try to get the selected values from the filter, defaulting to []
  // if we can't successfully parse them.
  const selectedValues = Results.unwrapOr(
    Results.safeParse(column.getFilterValue(), SelectedValuesSchema),
    []
  )
  const facetedValues = column.getFacetedUniqueValues()

  const sortedOptions = useMemo(() => {
    const entries = Array.from(facetedValues.entries())
      .map(([value, count]) => ({
        value: String(value ?? ''),
        count,
      }))
      .filter((opt) => opt.value !== '')
      .sort((a, b) => a.value.localeCompare(b.value))
    return entries
  }, [facetedValues])

  const filteredOptions = useMemo(() => {
    if (isEmpty(search)) return sortedOptions
    const query = search.toLowerCase()
    return sortedOptions.filter((opt) =>
      opt.value.toLowerCase().includes(query)
    )
  }, [sortedOptions, search])

  const toggleValue = (value: string) => {
    const next = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value]
    column.setFilterValue(next.length > 0 ? next : undefined)
  }

  return (
    <div className="space-y-2">
      {sortedOptions.length > 5 && (
        <div className="relative">
          <Search className="text-muted-foreground absolute left-2 top-1/2 size-3 -translate-y-1/2" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
          {!isEmpty(search) && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      )}
      <div className="max-h-48 space-y-1 overflow-y-auto">
        {filteredOptions.map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-accent"
          >
            <Checkbox
              checked={selectedValues.includes(opt.value)}
              onCheckedChange={() => toggleValue(opt.value)}
            />
            <span className="flex-1 truncate">{opt.value}</span>
            <span className="text-muted-foreground text-xs">{opt.count}</span>
          </label>
        ))}
        {filteredOptions.length === 0 && (
          <p className="text-muted-foreground py-2 text-center text-xs">
            No options found.
          </p>
        )}
      </div>
      {selectedValues.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => column.setFilterValue(undefined)}
        >
          Clear
        </Button>
      )}
    </div>
  )
}

const SelectedValuesSchema = z.array(z.string())
