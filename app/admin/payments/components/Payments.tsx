'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, Plus } from 'lucide-react'
import { isNil } from 'lodash'
import type { ColumnFiltersState } from '@tanstack/react-table'
import type { PaymentTransactionDTO } from '@/services/payment'
import type { User } from '@/lib/users/types'
import { Permission, userHasPermission } from '@/lib/security'
import { stringMarshaller } from '@/lib/marshallers'
import { useQueryParam } from '@/hooks/url-state'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable, useDataTableUrlState } from '@/components/ui/data-table'
import type { OutstandingFee } from '@/lib/payments/outstanding'
import type { FeeAccount } from '@/lib/payments/fee-balances'
import {
  buildLedgerRows,
  computeLedgerStats,
  filterLedgerRows,
  ledgerRowInView,
  ledgerYears,
  parseLedgerStatusFilter,
  type LedgerRow,
  type LedgerStatusFilter,
} from '@/lib/payments/ledger'
import {
  LEDGER_HIDDEN_COLUMNS,
  paymentsColumns,
  paymentsGlobalFilterFn,
} from '../config/columns'
import { downloadCsv } from '@/lib/csv'
import {
  generateLedgerCsv,
  generateLedgerCsvFilename,
} from '../utils/csv-export'
import { PaymentsSummary } from './PaymentsSummary'
import { LedgerFilters } from './LedgerFilters'
import { PaymentsLedgerProvider } from './ledger-context'
import {
  RecordPaymentDialog,
  type FeeDefaults,
  type RecordPaymentPrefill,
} from './RecordPaymentDialog'

type PaymentsProps = {
  /** Includes voided payments — hidden unless shown, never in a total. */
  payments: PaymentTransactionDTO[]
  /** Calculated unpaid fees, across every group with fees set. */
  outstandingFees: OutstandingFee[]
  /** People who paid more than they owe, across the same groups. */
  overpaidFees: FeeAccount[]
  /** True when fee balances couldn't be calculated, so both lists are empty. */
  balancesUnavailable: boolean
  feeDefaults: FeeDefaults
  user: User | null
}

/** Selected labels of one of the table's select-style column filters. */
function filterValuesFor(filters: ColumnFiltersState, id: string): string[] {
  const value = filters.find((filter) => filter.id === id)?.value
  return Array.isArray(value) ? (value as string[]) : []
}

const uniqueSorted = (values: string[]) =>
  [...new Set(values)].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  )

export function Payments({
  payments,
  outstandingFees,
  overpaidFees,
  balancesUnavailable,
  feeDefaults,
  user,
}: PaymentsProps) {
  const [showVoided, setShowVoided] = useState(false)
  // `null` = closed; `{ prefill: null }` = opened from the header button.
  const [recordDialog, setRecordDialog] = useState<{
    prefill: RecordPaymentPrefill | null
  } | null>(null)

  const urlState = useDataTableUrlState({
    defaultSort: [{ id: 'date', desc: true }],
    defaultPageSize: 25,
  })
  // ?status=outstanding|overpaid|paid|waived and ?year=2026 — History API, like the
  // rest of the table's URL state, so the dashboard can deep-link here.
  const [statusParam, setStatusParam] = useQueryParam(
    'status',
    stringMarshaller('all')
  )
  const [yearParam, setYearParam] = useQueryParam('year', stringMarshaller(''))

  const status = parseLedgerStatusFilter(statusParam)
  const parsedYear = Number.parseInt(yearParam, 10)
  const year = Number.isFinite(parsedYear) ? parsedYear : null

  const canWrite =
    !isNil(user) && userHasPermission(user, [Permission.WRITE_PAYMENTS])
  const hasVoidedPayments = payments.some((p) => !isNil(p.voided_at))

  const allRows = useMemo(
    () => buildLedgerRows(payments, outstandingFees, overpaidFees),
    [payments, outstandingFees, overpaidFees]
  )
  const stats = useMemo(
    () =>
      computeLedgerStats(payments, outstandingFees, new Date(), overpaidFees),
    [payments, outstandingFees, overpaidFees]
  )

  const view = useMemo(
    () => ({ status, year, showVoided, currentYear: stats.year }),
    [status, year, showVoided, stats.year]
  )

  // The view filter runs before the table; search and the Weekend/Type/Method
  // filters are the table's own, so its headers and the chips stay in step.
  const viewRows = useMemo(
    () => allRows.filter((row) => ledgerRowInView(row, view)),
    [allRows, view]
  )

  const selectedWeekends = filterValuesFor(urlState.columnFilters, 'weekend')
  const selectedTypes = filterValuesFor(urlState.columnFilters, 'type')
  const selectedRoles = filterValuesFor(urlState.columnFilters, 'role')

  // Exactly the rows on screen (across all pages) — drives the footer count
  // and the CSV export.
  const { globalFilter, columnFilters } = urlState
  const filteredRows = useMemo(
    () =>
      filterLedgerRows(allRows, {
        ...view,
        search: globalFilter ?? '',
        weekends: filterValuesFor(columnFilters, 'weekend'),
        types: filterValuesFor(columnFilters, 'type'),
        roles: filterValuesFor(columnFilters, 'role'),
        methods: filterValuesFor(columnFilters, 'method'),
      }),
    [allRows, view, globalFilter, columnFilters]
  )

  const weekendOptions = useMemo(
    () => uniqueSorted(allRows.map((row) => row.weekendLabel)),
    [allRows]
  )
  const typeOptions = useMemo(
    () => uniqueSorted(allRows.map((row) => row.typeLabel)),
    [allRows]
  )
  const roleOptions = useMemo(
    () => uniqueSorted(allRows.map((row) => row.roleLabel)),
    [allRows]
  )
  const yearOptions = useMemo(() => ledgerYears(allRows), [allRows])

  const resetPage = () =>
    urlState.onPaginationChange((prev) => ({ ...prev, pageIndex: 0 }))

  const handleStatusChange = (next: LedgerStatusFilter) => {
    setStatusParam(next)
    resetPage()
  }

  const handleYearChange = (next: number | null) => {
    setYearParam(isNil(next) ? '' : String(next))
    resetPage()
  }

  const setColumnFilter = (id: string, values: string[]) => {
    urlState.onColumnFiltersChange((prev) => [
      ...prev.filter((filter) => filter.id !== id),
      ...(values.length > 0 ? [{ id, value: values }] : []),
    ])
  }

  const handleRecordForRow = (row: LedgerRow) => {
    const fee = row.outstanding
    if (isNil(fee)) return
    setRecordDialog({
      prefill: {
        targetType: fee.targetType,
        targetId: fee.targetId,
        name: fee.name,
        paidBy: fee.expectedPayer,
        amount: fee.amountDue,
      },
    })
  }

  const handleShowPayments = (row: LedgerRow) => {
    setStatusParam('all')
    urlState.onGlobalFilterChange(row.personName ?? '')
    resetPage()
  }

  const handleExportCsv = () => {
    downloadCsv(
      generateLedgerCsv(filteredRows),
      generateLedgerCsvFilename(status)
    )
  }

  const totalCount = allRows.filter(
    (row) => showVoided || row.status !== 'voided'
  ).length

  return (
    <PaymentsLedgerProvider
      value={{
        canWrite,
        onRecordPayment: handleRecordForRow,
        onShowPayments: handleShowPayments,
      }}
    >
      <PageHeader
        title="Payments"
        description="Every payment in one place — record, reassign, edit, or void, whichever weekend it belongs to."
      >
        <Button
          variant="outline"
          onClick={handleExportCsv}
          disabled={filteredRows.length === 0}
          className="h-11 flex-1 sm:h-9 sm:flex-none"
        >
          <Download className="mr-1 h-4 w-4" />
          Export CSV
        </Button>
        {canWrite && (
          <Button
            onClick={() => setRecordDialog({ prefill: null })}
            className="h-11 flex-1 sm:h-9 sm:flex-none"
          >
            <Plus className="mr-1 h-4 w-4" />
            Record a payment
          </Button>
        )}
      </PageHeader>

      <div className="space-y-4">
        <PaymentsSummary
          stats={stats}
          balancesUnavailable={balancesUnavailable}
          onViewOutstanding={() => handleStatusChange('outstanding')}
          onViewOverpaid={() => handleStatusChange('overpaid')}
        />

        <LedgerFilters
          status={status}
          onStatusChange={handleStatusChange}
          weekendOptions={weekendOptions}
          selectedWeekends={selectedWeekends}
          onWeekendsChange={(values) => setColumnFilter('weekend', values)}
          typeOptions={typeOptions}
          selectedTypes={selectedTypes}
          onTypesChange={(values) => setColumnFilter('type', values)}
          roleOptions={roleOptions}
          selectedRoles={selectedRoles}
          onRolesChange={(values) => setColumnFilter('role', values)}
          yearOptions={yearOptions}
          year={year}
          onYearChange={handleYearChange}
          showVoidedToggle={hasVoidedPayments}
          showVoided={showVoided}
          onShowVoidedChange={setShowVoided}
        />

        <DataTable
          columns={paymentsColumns}
          data={viewRows}
          user={user}
          initialSort={[{ id: 'date', desc: true }]}
          globalFilterFn={paymentsGlobalFilterFn}
          urlState={urlState}
          columnVisibility={LEDGER_HIDDEN_COLUMNS}
          searchPlaceholder="Find a person…"
          emptyState={{
            noData:
              status === 'outstanding'
                ? 'No open fees — every fee is settled.'
                : status === 'overpaid'
                  ? 'Nobody has paid more than they owe.'
                  : status === 'waived'
                    ? 'No fees have been waived.'
                    : 'No payments found.',
            noResults: 'No payments match your search.',
          }}
          appearance={{
            zebra: false,
            container: 'bg-card overflow-hidden [&_tbody_tr]:border-divider',
            header:
              'h-auto px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground [&_button]:h-7 [&_button]:text-xs [&_button]:font-semibold [&_button]:uppercase [&_button]:tracking-wider [&_button]:text-muted-foreground',
          }}
        />

        <p className="text-[13px] text-muted-foreground">
          Showing {filteredRows.length} of {totalCount}{' '}
          {totalCount === 1 ? 'payment' : 'payments'} · most recent first,
          unpaid fees at the end · weekend-by-weekend breakdowns live in the{' '}
          <Link
            href="/admin/payments/summary"
            className="font-semibold text-primary hover:text-primary-hover"
          >
            payment summary →
          </Link>
        </p>
      </div>

      {!isNil(recordDialog) && (
        <RecordPaymentDialog
          open
          onClose={() => setRecordDialog(null)}
          prefill={recordDialog.prefill}
          feeDefaults={feeDefaults}
        />
      )}
    </PaymentsLedgerProvider>
  )
}
