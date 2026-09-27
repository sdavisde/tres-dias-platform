import type { CheckoutFeeType, CheckoutTarget } from './checkout-price'

// The metadata a checkout session carries to the webhook. One function decides
// it so the app (`actions/checkout.ts`) and the E2E webhook fixture send the
// same keys. The reader is `services/stripe/handlers/checkout-session-completed.ts`
// (`fee_type`, `candidateId`, `group_member_id`, `payment_owner`); change both
// sides together.
//
// Pure and free of server imports (type imports only) so a plain Node or
// Playwright process can import it.

/** The parts of a checkout quote the metadata needs; `CheckoutQuote` fits. */
export type CheckoutMetadataQuote = {
  payerName: string
  groupId: string | null
  /** The team member's user; null for a candidate. */
  userId: string | null
}

export type CheckoutMetadataOptions = {
  /** The signed-in team member's email; recorded as `user_email`. */
  userEmail?: string | null
}

/** The keys each fee type's session metadata carries, exactly. */
export const CHECKOUT_METADATA_KEYS: Record<
  CheckoutFeeType,
  readonly string[]
> = {
  candidate: ['fee_type', 'weekend_group_id', 'payment_owner', 'candidateId'],
  team: [
    'fee_type',
    'weekend_group_id',
    'payment_owner',
    'group_member_id',
    'user_id',
    'user_email',
  ],
}

/**
 * Builds the Stripe metadata for a fee's checkout session. Every value is a
 * string (Stripe rejects anything else): a missing group or email becomes ''.
 *
 * @param target Who the payment is for
 * @param quote The server's quote for that target
 * @param options The signed-in team member's email, for a team fee
 */
export function buildCheckoutMetadata(
  target: CheckoutTarget,
  quote: CheckoutMetadataQuote,
  options: CheckoutMetadataOptions = {}
): Record<string, string> {
  const base = {
    fee_type: target.kind,
    weekend_group_id: quote.groupId ?? '',
    payment_owner: quote.payerName,
  }

  if (target.kind === 'candidate') {
    return { ...base, candidateId: target.candidateId }
  }

  // beginCheckout refuses a team checkout unless the signed-in user is the
  // quote's user, so the quote's userId is the payer.
  return {
    ...base,
    group_member_id: target.groupMemberId,
    user_id: quote.userId ?? '',
    user_email: options.userEmail ?? '',
  }
}
