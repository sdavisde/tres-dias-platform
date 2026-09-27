// Database types
export type {
  ServiceOptions,
  DepositRow,
  DepositInsert,
  DepositUpdate,
  DepositPaymentRow,
  DepositPaymentInsert,
  DepositPaymentUpdate,
} from './types'

// Input types (inferred from Zod schemas)
export type {
  CreateDepositInput,
  UpdateDepositInput,
  LinkPaymentInput,
  RecordStripePayoutInput,
} from './types'

// Enum types
export type { DepositType, DepositStatus } from './types'

// DTOs
export type { DepositDTO, DepositPaymentDTO } from './types'

// Zod schemas for validation
export {
  DepositTypeSchema,
  DepositStatusSchema,
  CreateDepositSchema,
  UpdateDepositSchema,
  LinkPaymentSchema,
  RecordStripePayoutSchema,
} from './types'

// Service functions for webhook usage (with dangerouslyBypassRLS option)
export {
  recordDeposit,
  recordStripePayoutDeposit,
  updateDeposit,
  updateDepositByPayoutId,
  linkPaymentToDeposit,
  getPaymentsForDeposit,
} from './deposit-service'
