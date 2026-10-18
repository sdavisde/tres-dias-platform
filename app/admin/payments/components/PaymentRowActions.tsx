'use client'

import { useState } from 'react'
import {
  ArrowLeftRight,
  Ban,
  FileText,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
} from 'lucide-react'
import { isNil } from 'lodash'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { LedgerRow } from '@/lib/payments/ledger'
import { ReassignPaymentDialog } from './ReassignPaymentDialog'
import { EditPaymentDialog } from './EditPaymentDialog'
import { VoidPaymentDialog } from './VoidPaymentDialog'
import { PaymentDetailsDialog } from './PaymentDetailsDialog'
import { usePaymentsLedger } from './ledger-context'

type PaymentRowActionsProps = {
  row: LedgerRow
}

type OpenDialog = 'details' | 'reassign' | 'edit' | 'void' | null

export function PaymentRowActions({ row }: PaymentRowActionsProps) {
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)
  const { canWrite, onRecordPayment, onShowPayments } = usePaymentsLedger()
  const payment = row.payment

  const closeDialog = () => setOpenDialog(null)

  // An overpaid person is calculated from their payments; the fix (void or
  // reassign) happens on those payments, so this opens them.
  if (row.status === 'overpaid') {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <span className="sr-only">Overpayment actions</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onShowPayments(row)}>
              <List className="mr-2 h-4 w-4" />
              Show their payments
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  // An unpaid fee is calculated, not stored: there is nothing to reassign or
  // void, only a payment to record.
  if (isNil(payment)) {
    if (!canWrite) return null
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <span className="sr-only">Fee actions</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onRecordPayment(row)}>
              <Plus className="mr-2 h-4 w-4" />
              Record a payment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  const isVoided = !isNil(payment.voided_at)
  // Donations have no target, so there is nobody to reassign them to.
  const canReassign = !isNil(payment.target_type)
  const canCorrect = canWrite && !isVoided

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <span className="sr-only">Payment actions</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setOpenDialog('details')}>
            <FileText className="mr-2 h-4 w-4" />
            View details
          </DropdownMenuItem>
          {canCorrect && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!canReassign}
                onSelect={() => setOpenDialog('reassign')}
              >
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Reassign
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setOpenDialog('edit')}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit details
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setOpenDialog('void')}
              >
                <Ban className="mr-2 h-4 w-4" />
                Void
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {openDialog === 'details' && (
        <PaymentDetailsDialog open onClose={closeDialog} row={row} />
      )}
      {openDialog === 'reassign' && (
        <ReassignPaymentDialog open onClose={closeDialog} payment={payment} />
      )}
      {openDialog === 'edit' && (
        <EditPaymentDialog open onClose={closeDialog} payment={payment} />
      )}
      {openDialog === 'void' && (
        <VoidPaymentDialog open onClose={closeDialog} payment={payment} />
      )}
    </div>
  )
}
