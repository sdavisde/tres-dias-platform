import { normalizeStoragePath } from './storage-path'

describe('normalizeStoragePath', () => {
  it('keeps a plain relative object path', () => {
    expect(normalizeStoragePath('minutes/2026/board.pdf')).toBe(
      'minutes/2026/board.pdf'
    )
  })

  it('rejects empty, absolute and traversal paths', () => {
    expect(normalizeStoragePath(null)).toBeNull()
    expect(normalizeStoragePath('   ')).toBeNull()
    expect(normalizeStoragePath('/etc/passwd')).toBeNull()
    expect(normalizeStoragePath('minutes/../../secret.pdf')).toBeNull()
    expect(normalizeStoragePath('minutes//board.pdf')).toBeNull()
    expect(normalizeStoragePath('minutes\\board.pdf')).toBeNull()
  })
})
