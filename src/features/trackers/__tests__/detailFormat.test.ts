import { fmtCompact } from '../detailFormat'

describe('fmtCompact', () => {
  test('small numbers pass through', () => {
    expect(fmtCompact(0)).toBe('0')
    expect(fmtCompact(7.5)).toBe('7.5')
    expect(fmtCompact(850)).toBe('850')
  })
  test('thousands use K', () => {
    expect(fmtCompact(1000)).toBe('1K')
    expect(fmtCompact(30000)).toBe('30K')
    expect(fmtCompact(999000)).toBe('999K')
    expect(fmtCompact(1500)).toBe('1.5K')
  })
  test('millions use M', () => {
    expect(fmtCompact(1000000)).toBe('1M')
    expect(fmtCompact(3000000)).toBe('3M')
    expect(fmtCompact(1500000)).toBe('1.5M')
  })
  test('K rounds to 1000 promotes to M', () => {
    expect(fmtCompact(999999)).toBe('1M')
    expect(fmtCompact(999950)).toBe('1M')
    expect(fmtCompact(999499)).toBe('999.5K') // just below: stays K
    expect(fmtCompact(950000)).toBe('950K') // sanity: stays K
  })
  test('nullish → 0', () => {
    expect(fmtCompact(null)).toBe('0')
    expect(fmtCompact(undefined)).toBe('0')
  })
})
