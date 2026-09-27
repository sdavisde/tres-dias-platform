export * from './actions'
export type { PaymentRecord, PaymentType } from '@/lib/payments/types'

// New types for payment_transaction table
export type {
  ServiceOptions,
  PaymentTargetOption,
  PaymentTransactionDTO,
  PaymentTransactionRow,
  PaymentTransactionInsert,
  PaymentTransactionUpdate,
  CreatePaymentInput,
  BackfillStripeDataInput,
  PaymentMethod,
  TargetType,
} from './types'

export type {
  ReassignPaymentInput,
  RecordAdminPaymentInput,
  UpdatePaymentDetailsInput,
  VoidPaymentInput,
} from './types'

export {
  PaymentTypeSchema,
  TargetTypeSchema,
  PaymentMethodSchema,
  CreatePaymentSchema,
  BackfillStripeDataSchema,
  ReassignPaymentSchema,
  RecordAdminPaymentSchema,
  UpdatePaymentDetailsSchema,
  VoidPaymentSchema,
} from './types'

// Server-only service functions (recordPayment, getPaymentForTarget, ...) are
// deliberately NOT re-exported here: client components import this barrel, and
// pulling `payment-service` into a client graph fails the build. Server callers
// import '@/services/payment/payment-service' directly.

export type { ActiveWeekendFinancials } from '@/lib/payments/compute-totals'
