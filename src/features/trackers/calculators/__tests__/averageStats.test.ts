import { isoAddMonths, compareWindows } from '../averageStats'
import type { Tracker, Entry } from '@features/trackers/types'

const avg: Tracker = {
  id: 'a1',
  name: 'Water',
  type: 'average',
  icon: 'drop',
  color: 'cyan',
  unit: null,
  direction: null,
  targetValue: 8,
  startValue: null,
  accumulation: null,
  startDate: '2026-06-01',
  deadline: null,
  period: 'daily',
  repeatDays: null,
  routine: null,
  reminderTime: null,
  goalNote: null,
  averageWindow: null,
  rollingDays: null,
  doneRule: null,
  progressBasis: null,
  createdAt: '2026-06-01T00:00:00Z',
  archived: false
}

const e = (date: string, value: number, createdAt?: string): Entry => ({
  id: `${date}-${createdAt ?? 'a'}`,
  trackerId: 'a1',
  date,
  value,
  note: null,
  createdAt: createdAt ?? `${date}T08:00:00Z`
})

describe('isoAddMonths', () => {
  it('shifts whole months', () => {
    expect(isoAddMonths('2026-07-05', -3)).toBe('2026-04-05')
    expect(isoAddMonths('2026-07-05', 1)).toBe('2026-08-05')
  })
  it('clamps the day to the target month length', () => {
    expect(isoAddMonths('2026-03-31', -1)).toBe('2026-02-28')
    expect(isoAddMonths('2024-03-31', -1)).toBe('2024-02-29') // leap year
    expect(isoAddMonths('2026-01-31', 1)).toBe('2026-02-28')
  })
  it('crosses year boundaries', () => {
    expect(isoAddMonths('2026-01-15', -2)).toBe('2025-11-15')
    expect(isoAddMonths('2025-11-15', 3)).toBe('2026-02-15')
  })
})

describe('compareWindows — day windows', () => {
  it('7d: current = last 7 days incl. today, previous = the 7 before', () => {
    const entries = [
      e('2026-06-29', 7), // first day of current window
      e('2026-07-05', 7), // today
      e('2026-06-28', 14), // last day of previous window
      e('2026-06-22', 14), // first day of previous window
      e('2026-06-21', 99) // outside both
    ]
    const r = compareWindows(avg, entries, '2026-07-05', '7d')
    expect(r.current).toEqual({
      startISO: '2026-06-29',
      endISO: '2026-07-05',
      avg: 2, // (7+7)/7 days
      perLog: false
    })
    expect(r.previous).toEqual({
      startISO: '2026-06-22',
      endISO: '2026-06-28',
      avg: 4, // (14+14)/7
      perLog: false
    })
    expect(r.deltaPct).toBe(-50)
  })

  it('divides by the fixed window length even with sparse data', () => {
    const r = compareWindows(avg, [e('2026-07-05', 14)], '2026-07-05', '14d')
    expect(r.current.avg).toBe(1) // 14/14, not 14/1
    expect(r.current.startISO).toBe('2026-06-22')
  })

  it('4w is a 28-day window', () => {
    const r = compareWindows(avg, [], '2026-07-05', '4w')
    expect(r.current.startISO).toBe('2026-06-08')
    expect(r.previous.startISO).toBe('2026-05-11')
    expect(r.previous.endISO).toBe('2026-06-07')
  })

  it('deltaPct is null when the previous window is empty', () => {
    const r = compareWindows(avg, [e('2026-07-05', 5)], '2026-07-05', '7d')
    expect(r.deltaPct).toBeNull()
  })

  it('deltaPct is positive when improving', () => {
    const r = compareWindows(
      avg,
      [e('2026-07-01', 21), e('2026-06-25', 7)],
      '2026-07-05',
      '7d'
    )
    expect(r.deltaPct).toBe(200) // 3 vs 1 avg/day
  })
})

describe('compareWindows — month windows', () => {
  it('3m: windows are calendar-month spans divided by their true day count', () => {
    // today 2026-07-05 → current (2026-04-06 .. 2026-07-05) = 91 days,
    // previous (2026-01-06 .. 2026-04-05) = 90 days
    const entries = [e('2026-05-10', 91), e('2026-02-10', 180)]
    const r = compareWindows(avg, entries, '2026-07-05', '3m')
    expect(r.current.startISO).toBe('2026-04-06')
    expect(r.current.endISO).toBe('2026-07-05')
    expect(r.current.avg).toBeCloseTo(1) // 91/91
    expect(r.previous.startISO).toBe('2026-01-06')
    expect(r.previous.endISO).toBe('2026-04-05')
    expect(r.previous.avg).toBeCloseTo(2) // 180/90
    expect(r.deltaPct).toBeCloseTo(-50)
  })
})

describe('compareWindows — log windows', () => {
  it('7logs: newest 7 entries vs the 7 before, mean per log', () => {
    // 10 entries, one per day 2026-06-20..06-29, value = day index 1..10
    const entries = Array.from({ length: 10 }, (_, i) =>
      e(`2026-06-${20 + i}`, i + 1)
    )
    const r = compareWindows(avg, entries, '2026-07-05', '7logs')
    // newest 7 = values 4..10 (dates 06-23..06-29), mean 7
    expect(r.current).toEqual({
      startISO: '2026-06-23',
      endISO: '2026-06-29',
      avg: 7,
      perLog: true
    })
    // previous group = remaining 3 (values 1..3), mean 2
    expect(r.previous).toEqual({
      startISO: '2026-06-20',
      endISO: '2026-06-22',
      avg: 2,
      perLog: true
    })
    expect(r.deltaPct).toBe(250)
  })

  it('orders same-day logs by createdAt', () => {
    const entries = [
      e('2026-07-01', 1, '2026-07-01T08:00:00Z'),
      e('2026-07-01', 100, '2026-07-01T20:00:00Z'),
      ...Array.from({ length: 7 }, (_, i) => e(`2026-07-0${2 + i}`, 10)) // 07-02..07-08
    ]
    // 9 entries total; newest 7 exclude the two 07-01 logs... assert group sizes
    const r = compareWindows(avg, entries, '2026-07-09', '7logs')
    expect(r.current.perLog).toBe(true)
    expect(r.previous.startISO).toBe('2026-07-01')
    expect(r.previous.endISO).toBe('2026-07-01')
    expect(r.previous.avg).toBe(50.5) // mean of the two same-day logs
  })

  it('empty groups get null ranges and avg 0', () => {
    const r0 = compareWindows(avg, [], '2026-07-05', '7logs')
    expect(r0.current).toEqual({ startISO: null, endISO: null, avg: 0, perLog: true })
    expect(r0.deltaPct).toBeNull()
    const r1 = compareWindows(avg, [e('2026-07-01', 5)], '2026-07-05', '7logs')
    expect(r1.previous.startISO).toBeNull()
    expect(r1.deltaPct).toBeNull()
  })
})
