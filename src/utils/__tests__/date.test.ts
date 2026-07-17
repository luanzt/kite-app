import {
  toISODate,
  daysBetween,
  isSameISODate,
  weekdayOf,
  isoAddMonths
} from '@utils/date'

describe('date utils', () => {
  test('toISODate strips time', () => {
    expect(toISODate(new Date('2026-06-14T09:30:00Z'))).toBe('2026-06-14')
  })

  test('daysBetween counts whole days', () => {
    expect(daysBetween('2026-06-01', '2026-06-14')).toBe(13)
  })

  test('daysBetween is zero for same day', () => {
    expect(daysBetween('2026-06-14', '2026-06-14')).toBe(0)
  })

  test('isSameISODate compares date portion', () => {
    expect(isSameISODate('2026-06-14', '2026-06-14')).toBe(true)
    expect(isSameISODate('2026-06-14', '2026-06-15')).toBe(false)
  })

  test('weekdayOf returns 0..6 (Sun..Sat)', () => {
    expect(weekdayOf('2026-06-14')).toBe(0) // Sunday
  })

  test('daysBetween tolerates full ISO datetime inputs', () => {
    expect(daysBetween('2026-06-01T23:00:00Z', '2026-06-14T05:00:00Z')).toBe(13)
  })

  test('daysBetween across a DST boundary stays correct (UTC anchored)', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
  })

  test('weekdayOf returns 6 for a Saturday', () => {
    expect(weekdayOf('2026-06-13')).toBe(6)
  })

  test('isoAddMonths adds whole months', () => {
    expect(isoAddMonths('2026-07-17', 1)).toBe('2026-08-17')
    expect(isoAddMonths('2026-07-17', 3)).toBe('2026-10-17')
    expect(isoAddMonths('2026-07-17', 12)).toBe('2027-07-17')
    expect(isoAddMonths('2026-07-17', 240)).toBe('2046-07-17')
  })

  test('isoAddMonths clamps to the target month end', () => {
    expect(isoAddMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(isoAddMonths('2028-01-31', 1)).toBe('2028-02-29') // leap year
    expect(isoAddMonths('2026-08-31', 1)).toBe('2026-09-30')
  })

  test('isoAddMonths crosses year boundaries', () => {
    expect(isoAddMonths('2026-11-15', 3)).toBe('2027-02-15')
  })
})
