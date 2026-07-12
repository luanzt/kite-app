import { detectLanguage, showLanguageSetting } from '../languageRules'

describe('detectLanguage', () => {
  it('returns persisted language when present, ignoring device locale', () => {
    expect(detectLanguage('en', 'vi')).toBe('en')
    expect(detectLanguage('vi', 'en')).toBe('vi')
  })

  it('detects vi from a Vietnamese device when nothing persisted', () => {
    expect(detectLanguage(null, 'vi')).toBe('vi')
  })

  it('falls back to en for non-Vietnamese or unknown device locales', () => {
    expect(detectLanguage(null, 'en')).toBe('en')
    expect(detectLanguage(null, 'fr')).toBe('en')
    expect(detectLanguage(null, undefined)).toBe('en')
  })
})

describe('showLanguageSetting', () => {
  it('always shows in dev builds', () => {
    expect(showLanguageSetting(true, 'en', null)).toBe(true)
    expect(showLanguageSetting(true, 'en', 'en')).toBe(true)
  })

  it('shows on Vietnamese devices in production', () => {
    expect(showLanguageSetting(false, 'vi', 'vi')).toBe(true)
    expect(showLanguageSetting(false, 'vi', 'en')).toBe(true)
  })

  it('shows when persisted language is vi even on a non-vi device', () => {
    expect(showLanguageSetting(false, 'en', 'vi')).toBe(true)
  })

  it('hides in production on non-Vietnamese devices with en/null persisted', () => {
    expect(showLanguageSetting(false, 'en', 'en')).toBe(false)
    expect(showLanguageSetting(false, 'en', null)).toBe(false)
    expect(showLanguageSetting(false, undefined, null)).toBe(false)
  })
})
