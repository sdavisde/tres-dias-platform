import { deriveSystemAlerts, type SystemAlertChecks } from './system-alerts'

/** Everything healthy — each test flips only the check it is about. */
function checks(overrides: Partial<SystemAlertChecks> = {}): SystemAlertChecks {
  return {
    activeWeekendGroup: true,
    stripeCheckoutConfigured: true,
    stripeWebhookConfigured: true,
    emailConfigured: true,
    siteUrlConfigured: true,
    degradedSources: [],
    ...overrides,
  }
}

function keys(input: SystemAlertChecks): string[] {
  return deriveSystemAlerts(input).map((a) => a.key)
}

describe('deriveSystemAlerts', () => {
  it('is empty when every check passes, so the banner renders nothing', () => {
    expect(deriveSystemAlerts(checks())).toEqual([])
  })

  it('warns when the active group has no fees set', () => {
    expect(keys(checks({ activeGroupFeesSet: false }))).toEqual([
      'active-group-fees',
    ])
    expect(keys(checks({ activeGroupFeesSet: null }))).toEqual([])
  })

  it('raises an error alert when email credentials are missing', () => {
    expect(keys(checks({ emailConfigured: false }))).toEqual(['email'])
  })

  it('raises an error alert when the public Stripe key is missing', () => {
    expect(keys(checks({ stripeCheckoutConfigured: false }))).toEqual([
      'stripe-checkout',
    ])
  })

  it('raises an error alert when the site address is missing', () => {
    expect(keys(checks({ siteUrlConfigured: false }))).toEqual(['site-url'])
  })

  it('raises an error alert when the Stripe webhook secret is missing', () => {
    expect(keys(checks({ stripeWebhookConfigured: false }))).toEqual([
      'stripe-webhook',
    ])
  })

  it('warns with a billing link when the platform payment failed', () => {
    for (const status of ['past_due', 'unpaid'] as const) {
      const [alert] = deriveSystemAlerts(checks({ billingStatus: status }))
      expect(alert.key).toBe('billing-past-due')
      expect(alert.severity).toBe('warning')
      expect(alert.href).toBe('/admin/billing')
      expect(alert.linkLabel).toBe('Go to billing')
      expect(alert.title).toBe('The platform subscription payment failed')
    }
  })

  it('stays quiet about billing when active, never subscribed, or canceled', () => {
    expect(keys(checks({ billingStatus: 'active' }))).toEqual([])
    expect(keys(checks({ billingStatus: null }))).toEqual([])
    expect(keys(checks())).toEqual([])
    expect(keys(checks({ billingStatus: 'canceled' }))).toEqual([])
    expect(keys(checks({ billingStatus: 'trialing' }))).toEqual([])
  })

  it('links to weekend management when no group is active', () => {
    const [alert] = deriveSystemAlerts(checks({ activeWeekendGroup: false }))
    expect(alert.key).toBe('no-active-weekend')
    expect(alert.severity).toBe('warning')
    expect(alert.href).toBe('/admin/weekends')
    expect(alert.linkLabel).toBe('Go to weekends')
  })

  it('stays quiet about the active group when the weekends source failed', () => {
    expect(keys(checks({ activeWeekendGroup: null }))).toEqual([])
  })

  it('names the degraded sources without leaking error text', () => {
    const [alert] = deriveSystemAlerts(
      checks({ degradedSources: ['Payments', 'Community roster'] })
    )
    expect(alert.key).toBe('degraded-data')
    expect(alert.severity).toBe('warning')
    expect(alert.impact).toBe(
      "Payments and Community roster couldn't be read just now, so parts of this page may be incomplete or missing."
    )
  })

  it('lists one, two, and three degraded sources readably', () => {
    const impactFor = (sources: string[]) =>
      deriveSystemAlerts(checks({ degradedSources: sources }))[0].impact
    expect(impactFor(['Payments'])).toMatch(/^Payments couldn't/)
    expect(impactFor(['Payments', 'Events'])).toMatch(/^Payments and Events/)
    expect(impactFor(['Payments', 'Events', 'Weekends'])).toMatch(
      /^Payments, Events, and Weekends/
    )
  })

  it('orders errors ahead of warnings when several checks fail at once', () => {
    expect(
      keys(
        checks({
          activeGroupFeesSet: false,
          activeWeekendGroup: false,
          stripeCheckoutConfigured: false,
          stripeWebhookConfigured: false,
          emailConfigured: false,
          siteUrlConfigured: false,
          billingStatus: 'past_due',
          degradedSources: ['Payments'],
        })
      )
    ).toEqual([
      'stripe-checkout',
      'stripe-webhook',
      'email',
      'site-url',
      'billing-past-due',
      'no-active-weekend',
      'active-group-fees',
      'degraded-data',
    ])
  })

  it('gives every alert a title, impact, and action', () => {
    const alerts = deriveSystemAlerts(
      checks({
        activeGroupFeesSet: false,
        activeWeekendGroup: false,
        stripeCheckoutConfigured: false,
        stripeWebhookConfigured: false,
        emailConfigured: false,
        siteUrlConfigured: false,
        degradedSources: ['Payments'],
      })
    )
    for (const alert of alerts) {
      expect(alert.title.length).toBeGreaterThan(0)
      expect(alert.impact.length).toBeGreaterThan(0)
      expect(alert.action.length).toBeGreaterThan(0)
    }
  })
})
