'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { isNil } from 'lodash'
import { ExternalLink, FileDown } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/ui/data-table'
import {
  describeInvoiceStatus,
  formatBillingAmount,
  formatBillingDate,
} from '@/lib/billing/format'
import type { InvoiceSummary } from '@/services/platform-billing/types'
import { StatusBadge } from '../components/status-badge'
import '@/components/ui/data-table/types'

const LINK_CLASSES =
  'inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline md:min-h-0'

export const invoiceColumns: ColumnDef<InvoiceSummary>[] = [
  {
    id: 'date',
    accessorFn: (row) => row.created,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatBillingDate(row.original.created) ?? '—'}
      </span>
    ),
    meta: {
      showOnMobile: true,
      mobileLabel: 'Date',
      mobilePriority: 'primary',
    },
  },
  {
    id: 'amount',
    accessorFn: (row) => row.amountCents,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Amount" />
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatBillingAmount(row.original.amountCents, row.original.currency)}
      </span>
    ),
    meta: {
      showOnMobile: true,
      mobileLabel: 'Amount',
      mobilePriority: 'secondary',
    },
  },
  {
    id: 'status',
    accessorFn: (row) => row.status ?? 'unknown',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <StatusBadge badge={describeInvoiceStatus(row.original.status)} />
    ),
    meta: {
      showOnMobile: true,
      mobileLabel: 'Status',
      mobilePriority: 'secondary',
    },
  },
  {
    id: 'invoice',
    header: 'Invoice',
    enableSorting: false,
    cell: ({ row }) => {
      const { hostedInvoiceUrl, number } = row.original
      if (isNil(hostedInvoiceUrl)) {
        return <span className="text-muted-foreground">—</span>
      }
      return (
        <a
          href={hostedInvoiceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASSES}
        >
          {number ?? 'View'}
          <ExternalLink className="size-3.5" />
        </a>
      )
    },
    meta: {
      showOnMobile: true,
      mobileLabel: 'Invoice',
      mobilePriority: 'detail',
    },
  },
  {
    id: 'pdf',
    header: 'PDF',
    enableSorting: false,
    cell: ({ row }) => {
      const { invoicePdf } = row.original
      if (isNil(invoicePdf)) {
        return <span className="text-muted-foreground">—</span>
      }
      return (
        <a
          href={invoicePdf}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASSES}
        >
          Download
          <FileDown className="size-3.5" />
        </a>
      )
    },
    meta: {
      showOnMobile: true,
      mobileLabel: 'PDF',
      mobilePriority: 'detail',
    },
  },
]
