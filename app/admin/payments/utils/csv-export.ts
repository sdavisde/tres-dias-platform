import { isNil } from 'lodash'
import {
  formatLedgerFor,
  type LedgerRow,
  type LedgerStatus,
} from '@/lib/payments/ledger'
import { formatPaymentMethod } from '@/lib/payments/formatters'

const STATUS_LABELS: Record<LedgerStatus, string> = {
  paid: 'Paid',
  waived: 'Waived',
  outstanding: 'Outstanding',
  overpaid: 'Overpaid',
  voided: 'Voided',
}

/**
 * Escape a CSV field: quote it when it holds a comma, quote or line break.
 */
function escapeCsvField(value: string | number | null | undefined): string {
  if (isNil(value) || value === '') return ''
  const stringValue = String(value)
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

/** Amounts as plain numbers so a spreadsheet can sum the column. */
const money = (amount: number | null | undefined) =>
  isNil(amount) ? '' : amount.toFixed(2)

type CsvColumn = { header: string; value: (row: LedgerRow) => string }

/**
 * The ledger's columns, plus the detail the table tucks into "View details".
 * Outstanding rows leave the payment-only columns blank.
 */
export const LEDGER_CSV_COLUMNS: CsvColumn[] = [
  { header: 'Paid by', value: (row) => row.paidBy ?? '' },
  { header: 'For', value: (row) => formatLedgerFor(row) },
  { header: 'Person', value: (row) => row.personName ?? '' },
  { header: 'Fee type', value: (row) => row.feeLabel },
  { header: 'Role', value: (row) => row.roleLabel },
  { header: 'Weekend', value: (row) => row.weekendLabel },
  { header: 'Amount', value: (row) => money(row.amount) },
  {
    header: 'Method',
    value: (row) => (isNil(row.method) ? '' : formatPaymentMethod(row.method)),
  },
  { header: 'Status', value: (row) => STATUS_LABELS[row.status] },
  {
    header: 'Date',
    value: (row) => (isNil(row.date) ? '' : row.date.slice(0, 10)),
  },
  { header: 'Stripe fee', value: (row) => money(row.payment?.stripe_fee) },
  { header: 'Net', value: (row) => money(row.payment?.net_amount) },
  {
    header: 'Notes',
    value: (row) => row.payment?.notes ?? row.note ?? '',
  },
  {
    header: 'Void reason',
    value: (row) => row.payment?.void_reason ?? '',
  },
  {
    header: 'Payment reference',
    value: (row) => row.payment?.payment_intent_id ?? '',
  },
]

/** Convert ledger rows to a CSV string, in the order given. */
export function generateLedgerCsv(rows: LedgerRow[]): string {
  const headerRow = LEDGER_CSV_COLUMNS.map((col) =>
    escapeCsvField(col.header)
  ).join(',')
  const dataRows = rows.map((row) =>
    LEDGER_CSV_COLUMNS.map((col) => escapeCsvField(col.value(row))).join(',')
  )
  return [headerRow, ...dataRows].join('\n')
}

/** `payments-2026-09-21.csv`, with the view's status when one is selected. */
export function generateLedgerCsvFilename(
  status: string,
  now: Date = new Date()
): string {
  const dateString = now.toISOString().split('T')[0]
  const prefix = status === 'all' ? 'payments' : `payments-${status}`
  return `${prefix}-${dateString}.csv`
}
