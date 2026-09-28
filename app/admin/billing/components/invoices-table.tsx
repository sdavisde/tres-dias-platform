'use client'

import { DataTable } from '@/components/ui/data-table'
import type { InvoiceSummary } from '@/services/platform-billing/types'
import { invoiceColumns } from '../config/columns'

/**
 * Invoice history from Stripe, newest first. Goes through the shared
 * DataTable so mobile gets the card layout for free. No permission-gated
 * columns, so the table needs no user.
 */
export function InvoicesTable({ invoices }: { invoices: InvoiceSummary[] }) {
  return (
    <DataTable
      columns={invoiceColumns}
      data={invoices}
      user={null}
      initialSort={[{ id: 'date', desc: true }]}
      searchPlaceholder="Find an invoice…"
      emptyState={{
        noData: 'No invoices yet.',
        noResults: 'No invoices match.',
      }}
      appearance={{ zebra: false }}
    />
  )
}
