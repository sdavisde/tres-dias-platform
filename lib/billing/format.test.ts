import {
  describeInvoiceStatus,
  describePlanStatus,
  formatBillingAmount,
  formatBillingDate,
  formatCardBrand,
  formatPlanPrice,
  isLiveStatus,
  needsPaymentAttention,
} from './format'

describe('billing formatters', () => {
  it('formats cents as US currency', () => {
    expect(formatBillingAmount(4500, 'usd')).toBe('$45.00')
    expect(formatBillingAmount(4550, null)).toBe('$45.50')
  })

  it('formats the plan price with whole dollars when there are no cents', () => {
    expect(formatPlanPrice(4500, 'month', 'usd')).toBe('$45 / month')
    expect(formatPlanPrice(4550, 'month', 'usd')).toBe('$45.50 / month')
    expect(formatPlanPrice(null, 'month', 'usd')).toBeNull()
    expect(formatPlanPrice(4500, null, 'usd')).toBeNull()
  })

  it('formats ISO dates as "MMMM d, yyyy" and tolerates junk', () => {
    expect(formatBillingDate('2026-10-27T12:00:00.000Z')).toBe(
      'October 27, 2026'
    )
    expect(formatBillingDate(null)).toBeNull()
    expect(formatBillingDate('not a date')).toBeNull()
  })

  it('describes each plan status in plain English', () => {
    expect(describePlanStatus(null, false, null)).toEqual({
      label: 'Not subscribed',
      tone: 'neutral',
    })
    expect(describePlanStatus('active', false, null)).toEqual({
      label: 'Active',
      tone: 'success',
    })
    expect(describePlanStatus('past_due', false, null).label).toBe('Past due')
    expect(describePlanStatus('unpaid', false, null).label).toBe('Past due')
    expect(describePlanStatus('canceled', false, null).label).toBe('Canceled')
    expect(describePlanStatus('trialing', false, null).label).toBe('Trialing')
  })

  it('reads a scheduled cancellation as Canceling with the end date', () => {
    expect(
      describePlanStatus('active', true, '2026-10-27T12:00:00.000Z')
    ).toEqual({
      label: 'Canceling · access ends October 27, 2026',
      tone: 'warning',
    })
    // A subscription that already ended is Canceled, whatever the flag says.
    expect(describePlanStatus('canceled', true, null).label).toBe('Canceled')
  })

  it('treats only the terminal statuses as not live', () => {
    expect(isLiveStatus(null)).toBe(false)
    expect(isLiveStatus('canceled')).toBe(false)
    expect(isLiveStatus('incomplete_expired')).toBe(false)
    expect(isLiveStatus('active')).toBe(true)
    expect(isLiveStatus('past_due')).toBe(true)
  })

  it('flags past due and unpaid as needing attention', () => {
    expect(needsPaymentAttention('past_due')).toBe(true)
    expect(needsPaymentAttention('unpaid')).toBe(true)
    expect(needsPaymentAttention('active')).toBe(false)
    expect(needsPaymentAttention(null)).toBe(false)
  })

  it('labels invoice statuses and card brands', () => {
    expect(describeInvoiceStatus('paid').label).toBe('Paid')
    expect(describeInvoiceStatus('open').label).toBe('Awaiting payment')
    expect(describeInvoiceStatus(null).label).toBe('Unknown')
    expect(formatCardBrand('visa')).toBe('Visa')
    expect(formatCardBrand('')).toBe('Card')
  })
})
