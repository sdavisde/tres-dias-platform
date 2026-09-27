import { validateRedirectUrl } from './redirect'

describe('validateRedirectUrl', () => {
  it('keeps a relative same-site path with its query string', () => {
    expect(validateRedirectUrl('/profile?emailChange=complete')).toBe(
      '/profile?emailChange=complete'
    )
  })

  it('falls back for absolute and protocol-relative URLs', () => {
    expect(validateRedirectUrl('https://evil.example/x')).toBe('/home')
    expect(validateRedirectUrl('//evil.example', '/profile')).toBe('/profile')
  })

  it('falls back when dot segments normalise to a protocol-relative URL', () => {
    expect(validateRedirectUrl('/.//evil.com')).toBe('/home')
    expect(validateRedirectUrl('/a/..//evil.com')).toBe('/home')
    expect(validateRedirectUrl('/%2e%2e//evil.com')).toBe('/home')
    expect(validateRedirectUrl('/%2F%2Fevil.com')).toBe('/home')
    expect(validateRedirectUrl('/\\evil.com')).toBe('/home')
    expect(validateRedirectUrl('/a/\\\\evil.com')).toBe('/home')
  })

  it('still allows nested same-site paths after normalisation', () => {
    expect(validateRedirectUrl('/weekends/abc/./team')).toBe(
      '/weekends/abc/team'
    )
    expect(validateRedirectUrl('/a/../profile')).toBe('/profile')
  })

  it('falls back for dangerous schemes and empty values', () => {
    expect(validateRedirectUrl('javascript:alert(1)')).toBe('/home')
    expect(validateRedirectUrl(null, '/profile')).toBe('/profile')
  })

  it('blocks auth pages unless the caller allows them', () => {
    expect(validateRedirectUrl('/reset-password')).toBe('/home')
    expect(
      validateRedirectUrl('/reset-password', '/home', {
        allowAuthPages: ['/reset-password'],
      })
    ).toBe('/reset-password')
    expect(
      validateRedirectUrl('/login', '/home', {
        allowAuthPages: ['/reset-password'],
      })
    ).toBe('/home')
  })
})
