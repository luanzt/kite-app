import { resolveTheme } from '../resolveTheme'

describe('resolveTheme', () => {
  it('returns the mode directly when explicit', () => {
    expect(resolveTheme('light', 'dark')).toBe('light')
    expect(resolveTheme('dark', 'light')).toBe('dark')
  })

  it('follows the system scheme when mode is system', () => {
    expect(resolveTheme('system', 'dark')).toBe('dark')
    expect(resolveTheme('system', 'light')).toBe('light')
  })

  it('falls back to light when system scheme is unknown', () => {
    expect(resolveTheme('system', null)).toBe('light')
  })
})
