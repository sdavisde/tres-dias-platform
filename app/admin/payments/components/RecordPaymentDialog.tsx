'use client'

import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, ChevronsUpDown, DollarSign, Loader2 } from 'lucide-react'
import { isNil } from 'lodash'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { isDevMode } from '@/lib/dev-mode'
import { isOk } from '@/lib/results'
import { toastError } from '@/lib/toast-error'
import {
  getPaymentTargetOptions,
  recordAdminPayment,
} from '@/services/payment/actions'
import type { PaymentTargetOption } from '@/services/payment'
import { formatCurrency } from '@/lib/payments/formatters'
import { WAIVED_PAID_BY } from '@/lib/payments/waived'

/** Who the dialog opens for when launched from an outstanding fee's row. */
export type RecordPaymentPrefill = {
  targetType: PaymentTargetOption['targetType']
  targetId: string
  name: string | null
  paidBy: string | null
  amount: number
}

/** Cash prices, used to suggest an amount. Null when Stripe couldn't be read. */
export type FeeDefaults = {
  candidate: number | null
  team: number | null
}

type RecordPaymentDialogProps = {
  open: boolean
  onClose: () => void
  prefill: RecordPaymentPrefill | null
  feeDefaults: FeeDefaults
}

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'waived', label: 'Waived' },
] as const

const recordPaymentFormSchema = z.object({
  targetKey: z.string().min(1, 'Choose who this payment is for'),
  method: z.enum(['cash', 'check', 'waived']),
  amount: z
    .string()
    .refine(
      (value) => Number.parseFloat(value) > 0,
      'Enter an amount greater than zero'
    ),
  paidBy: z.string(),
  notes: z.string(),
})

type RecordPaymentFormValues = z.infer<typeof recordPaymentFormSchema>

/** Stable key for an option, since target IDs are only unique within a type. */
const optionKey = (option: { targetType: string; targetId: string }) =>
  `${option.targetType}:${option.targetId}`

const amountToInput = (amount: number | null | undefined) =>
  isNil(amount) ? '' : String(amount)

export function RecordPaymentDialog({
  open,
  onClose,
  prefill,
  feeDefaults,
}: RecordPaymentDialogProps) {
  const [options, setOptions] = useState<PaymentTargetOption[]>([])
  // Starts true: the dialog is mounted only while open, so options are always
  // being fetched on the first render.
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const router = useRouter()

  const form = useForm<RecordPaymentFormValues>({
    resolver: zodResolver(recordPaymentFormSchema),
    defaultValues: {
      targetKey: isNil(prefill) ? '' : optionKey(prefill),
      method: 'cash',
      amount: amountToInput(prefill?.amount),
      paidBy: prefill?.paidBy ?? '',
      notes: '',
    },
  })

  useEffect(() => {
    let cancelled = false

    getPaymentTargetOptions()
      .then((result) => {
        if (cancelled) return
        if (isOk(result)) {
          setOptions(result.data)
        } else {
          toastError('Unable to load the list of people.', {
            error: result.error,
          })
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingOptions(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const method = useWatch({ control: form.control, name: 'method' })
  const targetKey = useWatch({ control: form.control, name: 'targetKey' })
  const isWaiver = method === 'waived'
  const selected = options.find((option) => optionKey(option) === targetKey)
  const selectedName = selected?.name ?? prefill?.name ?? null
  const isSubmitting = form.formState.isSubmitting

  const feeDefaultFor = (targetType: PaymentTargetOption['targetType']) =>
    targetType === 'candidate' ? feeDefaults.candidate : feeDefaults.team

  const handleSelectPerson = (option: PaymentTargetOption) => {
    form.setValue('targetKey', optionKey(option), { shouldValidate: true })
    // Suggest the fee, but never overwrite an amount someone already typed.
    if (form.getValues('amount') === '') {
      form.setValue('amount', amountToInput(feeDefaultFor(option.targetType)))
    }
    setPickerOpen(false)
  }

  const fillWithTestData = () => {
    const person = selected ?? options[0]
    form.reset({
      targetKey: isNil(person) ? targetKey : optionKey(person),
      method: 'check',
      amount: amountToInput(
        isNil(person) ? 185 : (feeDefaultFor(person.targetType) ?? 185)
      ),
      paidBy: 'Test Payer',
      notes: 'Check #1234 — test data',
    })
  }

  const onSubmit = async (values: RecordPaymentFormValues) => {
    const [targetType, targetId] = values.targetKey.split(':')
    const amount = Number.parseFloat(values.amount)

    const result = await recordAdminPayment({
      targetType: targetType as PaymentTargetOption['targetType'],
      targetId,
      amount,
      method: values.method,
      // The community is always the payer on a waiver; the server sets it.
      paidBy: isWaiver ? null : values.paidBy.trim(),
      notes: values.notes.trim(),
    })

    if (isOk(result)) {
      const who = selectedName ?? 'this person'
      toast.success(
        isWaiver
          ? `${formatCurrency(amount)} fee waived for ${who}`
          : `${formatCurrency(amount)} payment recorded for ${who}`
      )
      onClose()
      router.refresh()
      return
    }

    toastError(
      isWaiver
        ? 'Unable to waive this fee. Please try again.'
        : 'Unable to record this payment. Please try again.',
      { error: result.error, targetId }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>
            For cash, a check, or a fee the community is covering. Card payments
            arrive here on their own.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isDevMode() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoadingOptions}
                onClick={fillWithTestData}
              >
                Fill with test data
              </Button>
            )}

            <FormField
              control={form.control}
              name="targetKey"
              render={() => (
                <FormItem>
                  <FormLabel>Who is it for?</FormLabel>
                  <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={pickerOpen}
                          className="w-full justify-between font-normal"
                          disabled={isLoadingOptions && isNil(selectedName)}
                        >
                          {!isNil(selectedName) ? (
                            <span className="truncate">{selectedName}</span>
                          ) : isLoadingOptions ? (
                            <span className="text-muted-foreground flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading people…
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Choose a candidate or team member…
                            </span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                      <Command>
                        <CommandInput placeholder="Find a person…" />
                        <CommandList>
                          <CommandEmpty>No one found.</CommandEmpty>
                          <CommandGroup>
                            {options.map((option) => {
                              const key = optionKey(option)
                              return (
                                <CommandItem
                                  key={key}
                                  value={`${option.name} ${option.weekendLabel ?? ''} ${key}`}
                                  onSelect={() => handleSelectPerson(option)}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      key === targetKey
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    )}
                                  />
                                  <span className="flex-1 truncate">
                                    {option.name}
                                  </span>
                                  <span className="text-muted-foreground ml-2 text-xs">
                                    {option.targetType === 'candidate'
                                      ? 'Candidate'
                                      : 'Team'}
                                    {' · '}
                                    {option.weekendLabel ?? 'No weekend'}
                                  </span>
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Method</FormLabel>
                  <FormControl>
                    <div
                      role="radiogroup"
                      aria-label="Method"
                      className="grid grid-cols-3 overflow-hidden rounded-md border bg-card"
                    >
                      {METHODS.map((option) => {
                        const active = field.value === option.value
                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => field.onChange(option.value)}
                            className={cn(
                              'h-11 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:h-9',
                              active
                                ? 'bg-primary font-semibold text-primary-foreground'
                                : 'text-nav-foreground hover:bg-muted'
                            )}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isWaiver && (
              <p className="rounded-md border border-secondary-border bg-secondary px-3 py-2 text-[13px] text-secondary-foreground">
                Covered by the {WAIVED_PAID_BY}. The fee will read as settled,
                but no money is counted as collected.
              </p>
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isWaiver ? 'Amount waived' : 'Amount received'}
                  </FormLabel>
                  <div className="relative">
                    <DollarSign className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        className="h-11 pl-10 tabular-nums sm:h-9"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isWaiver && (
              <FormField
                control={form.control}
                name="paidBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid by</FormLabel>
                    <FormControl>
                      <Input
                        className="h-11 sm:h-9"
                        placeholder="Name of the person who paid"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder={
                        isWaiver
                          ? 'Why the fee is being covered, who approved it…'
                          : 'Check #1234, bank name, etc.'
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Saving…'
                  : isWaiver
                    ? 'Waive fee'
                    : 'Record payment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
