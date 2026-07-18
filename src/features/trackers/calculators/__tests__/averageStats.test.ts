import {
  isoAddMonths,
  compareWindows,
  averageBucketStats,
  averageBarSeries
} from '../averageStats'
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
  reminderTimes: [],
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
      avg: 7, // (7+7)/2 logged days
      perLog: false
    })
    expect(r.previous).toEqual({
      startISO: '2026-06-22',
      endISO: '2026-06-28',
      avg: 14, // (14+14)/2 logged days
      perLog: false
    })
    expect(r.deltaPct).toBe(-50)
  })

  it('divides by logged days, not the window length (Strides-style)', () => {
    const r = compareWindows(avg, [e('2026-07-05', 14)], '2026-07-05', '14d')
    expect(r.current.avg).toBe(14) // 14/1 logged day, not 14/14
    expect(r.current.startISO).toBe('2026-06-22')
  })

  it('Strides reference case: 8, 8, 8+5 over 3 logged days → 9.67', () => {
    const entries = [
      e('2026-07-08', 8),
      e('2026-07-09', 8),
      e('2026-07-10', 8),
      e('2026-07-10', 5, '2026-07-10T19:04:00Z')
    ]
    const r = compareWindows(avg, entries, '2026-07-10', '7d')
    expect(r.current.avg).toBeCloseTo(29 / 3)
    expect(r.previous.avg).toBe(0) // 27 Jun – 3 Jul: no logs
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
    expect(r.deltaPct).toBe(200) // 21 vs 7 avg/day (one logged day each)
  })

  it('deltaPct is null even when the previous window has real zero-value logs (no % from a 0 baseline)', () => {
    const entries = [
      e('2026-06-25', 0), // real log, value 0, in previous window
      e('2026-07-01', 14)
    ]
    const r = compareWindows(avg, entries, '2026-07-05', '7d')
    expect(r.previous.avg).toBe(0)
    expect(r.deltaPct).toBeNull()
  })
})

describe('compareWindows — month windows', () => {
  it('3m: calendar-month spans, averaged over logged days', () => {
    // today 2026-07-05 → current window 2026-04-06 .. 2026-07-05,
    // previous 2026-01-06 .. 2026-04-05 — one logged day in each
    const entries = [e('2026-05-10', 91), e('2026-02-10', 182)]
    const r = compareWindows(avg, entries, '2026-07-05', '3m')
    expect(r.current.startISO).toBe('2026-04-06')
    expect(r.current.endISO).toBe('2026-07-05')
    expect(r.current.avg).toBeCloseTo(91) // 91/1 logged day
    expect(r.previous.startISO).toBe('2026-01-06')
    expect(r.previous.endISO).toBe('2026-04-05')
    expect(r.previous.avg).toBeCloseTo(182)
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
    expect(r0.current).toEqual({
      startISO: null,
      endISO: null,
      avg: 0,
      perLog: true
    })
    expect(r0.deltaPct).toBeNull()
    const r1 = compareWindows(avg, [e('2026-07-01', 5)], '2026-07-05', '7logs')
    expect(r1.previous.startISO).toBeNull()
    expect(r1.deltaPct).toBeNull()
  })
})

describe('averageBucketStats — daily (logged days only)', () => {
  const t0: Tracker = { ...avg, startDate: '2026-07-01' } // goal 8/day
  it('met day = summed total >= goal; streak counts back from today', () => {
    const entries = [
      e('2026-07-01', 8),
      e('2026-07-02', 3),
      e('2026-07-02', 5, '2026-07-02T20:00:00Z'), // same-day logs sum: 8
      e('2026-07-03', 2), // unmet
      e('2026-07-04', 9),
      e('2026-07-05', 10)
    ]
    const s = averageBucketStats(t0, entries, '2026-07-05')
    expect(s.unit).toBe('day')
    expect(s.loggedBuckets).toBe(5) // 07-01..07-05, all logged
    expect(s.metBuckets).toBe(4)
    expect(s.streak).toBe(2) // 04 + 05; broken by the unmet log on 03
  })

  it('today not logged → neutral (extends nothing, breaks nothing)', () => {
    const entries = [e('2026-07-03', 8), e('2026-07-04', 8)]
    const s = averageBucketStats(t0, entries, '2026-07-05')
    expect(s.streak).toBe(2)
    expect(s.loggedBuckets).toBe(2) // unlogged days don't count at all
  })

  it('a skipped day does NOT break the streak (Strides-style)', () => {
    const entries = [e('2026-07-03', 8), e('2026-07-05', 8)] // 04 unlogged
    const s = averageBucketStats(t0, entries, '2026-07-05')
    expect(s.streak).toBe(2)
    expect(s.loggedBuckets).toBe(2)
  })

  it('a logged-but-unmet day DOES break the streak', () => {
    const entries = [e('2026-07-03', 8), e('2026-07-04', 2), e('2026-07-05', 8)]
    const s = averageBucketStats(t0, entries, '2026-07-05')
    expect(s.streak).toBe(1)
  })

  it('logged non-repeat days still count', () => {
    // due Mon/Wed/Fri; logs on Wed 07-01, Fri 07-03 and Sat 07-04
    const t1: Tracker = { ...t0, repeatDays: [1, 3, 5] }
    const entries = [e('2026-07-01', 8), e('2026-07-03', 8), e('2026-07-04', 9)]
    const s = averageBucketStats(t1, entries, '2026-07-05') // Sunday
    expect(s.loggedBuckets).toBe(3)
    expect(s.metBuckets).toBe(3)
    expect(s.streak).toBe(3)
  })

  it('direction "or less": met = total <= goal; going over breaks the streak', () => {
    const t1: Tracker = { ...t0, direction: 'bad', targetValue: 2 }
    const entries = [
      e('2026-07-02', 1),
      e('2026-07-03', 5), // over → unmet
      e('2026-07-04', 2),
      e('2026-07-05', 0) // logged zero counts and is met
    ]
    const s = averageBucketStats(t1, entries, '2026-07-05')
    expect(s.loggedBuckets).toBe(4)
    expect(s.metBuckets).toBe(3)
    expect(s.streak).toBe(2) // 04 + 05; broken by the over-goal log on 03
  })

  it('goal null/0 → nothing is met', () => {
    const t1: Tracker = { ...t0, targetValue: null }
    const s = averageBucketStats(t1, [e('2026-07-05', 99)], '2026-07-05')
    expect(s.metBuckets).toBe(0)
    expect(s.streak).toBe(0)
    expect(s.loggedBuckets).toBe(1)
  })

  it('startDate in the future → all zeros', () => {
    const t1: Tracker = { ...t0, startDate: '2026-08-01' }
    const s = averageBucketStats(t1, [e('2026-07-05', 9)], '2026-07-05')
    expect(s).toEqual({
      streak: 0,
      metBuckets: 0,
      loggedBuckets: 0,
      unit: 'day'
    })
  })
})

describe('averageBucketStats — weekly & monthly', () => {
  it('weekly: Monday buckets, current week neutral', () => {
    const t1: Tracker = {
      ...avg,
      period: 'weekly',
      targetValue: 10,
      startDate: '2026-06-22' // a Monday
    }
    const entries = [
      e('2026-06-24', 10), // week of 06-22: met
      e('2026-07-01', 4) // week of 06-29: unmet; current week (07-05 is Sun of 06-29 week)
    ]
    // today 2026-07-05 (Sunday) is still inside the 06-29 week → that week is
    // the current bucket → neutral even though unmet
    const s = averageBucketStats(t1, entries, '2026-07-05')
    expect(s.unit).toBe('week')
    expect(s.loggedBuckets).toBe(2)
    expect(s.metBuckets).toBe(1)
    expect(s.streak).toBe(1)
  })

  it('monthly: calendar-month buckets', () => {
    const t1: Tracker = {
      ...avg,
      period: 'monthly',
      targetValue: 100,
      startDate: '2026-05-15'
    }
    const entries = [
      e('2026-05-20', 120),
      e('2026-06-10', 90),
      e('2026-07-01', 40)
    ]
    const s = averageBucketStats(t1, entries, '2026-07-05')
    expect(s.unit).toBe('month')
    expect(s.loggedBuckets).toBe(3) // May, Jun, Jul all logged
    expect(s.metBuckets).toBe(1) // only May
    expect(s.streak).toBe(0) // Jun logged-unmet breaks; Jul (current) neutral
  })
})

describe('averageBarSeries', () => {
  it('daily: one bar per day from startDate, summed values rounded to 1dp', () => {
    const t1: Tracker = { ...avg, startDate: '2026-07-01' }
    const entries = [
      e('2026-07-01', 2.25),
      e('2026-07-01', 1, '2026-07-01T20:00:00Z'),
      e('2026-07-03', 12)
    ]
    const s = averageBarSeries(t1, entries, '2026-07-05')
    expect(s.unit).toBe('day')
    expect(s.bars.map((b) => b.startISO)).toEqual([
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
      '2026-07-04',
      '2026-07-05'
    ])
    expect(s.bars[0].count).toBe(3.3) // 3.25 → 3.3
    expect(s.bars[1].count).toBe(0)
    expect(s.bars[4].partial).toBe(true)
    expect(s.goal).toBe(8)
    expect(s.perDayTarget).toBe(8)
    expect(s.scaleMax).toBe(12) // ceil(max(8, 12))
  })

  it('daily: capped at 180 bars for an old start date', () => {
    const t1: Tracker = { ...avg, startDate: '2020-01-01' }
    const s = averageBarSeries(t1, [], '2026-07-05')
    expect(s.bars).toHaveLength(180)
    expect(s.bars[179].startISO).toBe('2026-07-05')
  })

  it('weekly: 4 Monday-start bars, goal line = targetValue, no perDayTarget', () => {
    const t1: Tracker = { ...avg, period: 'weekly', targetValue: 10 }
    const entries = [e('2026-06-30', 7)] // week of 2026-06-29
    const s = averageBarSeries(t1, entries, '2026-07-05')
    expect(s.unit).toBe('week')
    expect(s.bars).toHaveLength(4)
    expect(s.bars[3].startISO).toBe('2026-06-29')
    expect(s.bars[3].count).toBe(7)
    expect(s.bars[3].partial).toBe(true)
    expect(s.perDayTarget).toBeUndefined()
    expect(s.scaleMax).toBe(10)
  })

  it('monthly: 3 calendar-month bars', () => {
    const t1: Tracker = { ...avg, period: 'monthly', targetValue: 100 }
    const entries = [e('2026-05-10', 50), e('2026-07-02', 20)]
    const s = averageBarSeries(t1, entries, '2026-07-05')
    expect(s.unit).toBe('month')
    expect(s.bars.map((b) => b.startISO)).toEqual([
      '2026-05-01',
      '2026-06-01',
      '2026-07-01'
    ])
    expect(s.bars[0].count).toBe(50)
    expect(s.bars[2].partial).toBe(true)
  })

  it('daily "or less": series carries lessIsBetter for the met-coloring', () => {
    const t1: Tracker = { ...avg, direction: 'bad', startDate: '2026-07-01' }
    const s = averageBarSeries(t1, [], '2026-07-05')
    expect(s.lessIsBetter).toBe(true)
    const s2 = averageBarSeries(
      { ...avg, startDate: '2026-07-01' },
      [],
      '2026-07-05'
    )
    expect(s2.lessIsBetter).toBeUndefined()
  })

  it('scaleMax is at least 1 with no data and no goal', () => {
    const t1: Tracker = { ...avg, targetValue: null, startDate: '2026-07-05' }
    const s = averageBarSeries(t1, [], '2026-07-05')
    expect(s.scaleMax).toBe(1)
    expect(s.goal).toBe(0)
    expect(s.perDayTarget).toBeUndefined()
  })
})
