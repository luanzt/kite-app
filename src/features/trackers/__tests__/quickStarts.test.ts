import { QUICK_STARTS, findQuickStart } from '../quickStarts'

describe('findQuickStart', () => {
  it('returns the quick-start for a known key', () => {
    const qs = findQuickStart('water')
    expect(qs).toBeDefined()
    expect(qs?.key).toBe('water')
    expect(qs?.type).toBe('average')
  })

  it('returns undefined for an unknown key', () => {
    expect(findQuickStart('nope')).toBeUndefined()
  })

  it('finds every key listed in QUICK_STARTS', () => {
    for (const qs of QUICK_STARTS) {
      expect(findQuickStart(qs.key)).toBe(qs)
    }
  })
})
