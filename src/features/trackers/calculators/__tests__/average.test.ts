import { calculateAverage } from '../average'
import type { Tracker, Entry } from '@features/trackers/types'

const avg: Tracker = {
  id: 'a1',
  name: 'Water',
  type: 'average',
  icon: 'drop',
  color: 'cyan',
  unit: 'glasses',
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
const e = (date: string, value: number): Entry => ({
  id: `${date}-${value}-${Math.random()}`,
  trackerId: 'a1',
  date,
  value,
  note: null,
  createdAt: `${date}T00:00:00Z`
})

// Strides semantics: current = mean of per-period totals (day / Monday-week /
// calendar month) over LOGGED periods only — days/weeks/months without a log
// are ignored, they neither pull the mean down nor count as zero.
describe('calculateAverage — daily buckets', () => {
  test('multiple logs on the same day are summed into one day', () => {
    // startDate 06-12, today 06-13 → 2 logged days: 3+5=8 and 8
    const t = { ...avg, startDate: '2026-06-12' }
    const p = calculateAverage(
      t,
      [e('2026-06-12', 3), e('2026-06-12', 5), e('2026-06-13', 8)],
      '2026-06-13'
    )
    expect(p.current).toBe(8)
    expect(p.goal).toBe(8)
    expect(p.paceStatus).toBe('on_track')
  })

  test('days without logs are ignored, not counted as zero', () => {
    // startDate 06-10, today 06-13 → only 06-12 is logged → 8/1 = 8
    const t = { ...avg, startDate: '2026-06-10' }
    const p = calculateAverage(t, [e('2026-06-12', 8)], '2026-06-13')
    expect(p.current).toBe(8)
    expect(p.paceStatus).toBe('on_track')
  })

  test('Strides reference case: 8, 8, 8+5 over 3 logged days → 9.67', () => {
    // start 06-25, today 07-10, logs on 07-08 / 07-09 / 07-10 (twice)
    const t = { ...avg, startDate: '2026-06-25', targetValue: 5 }
    const p = calculateAverage(
      t,
      [
        e('2026-07-08', 8),
        e('2026-07-09', 8),
        e('2026-07-10', 8),
        e('2026-07-10', 5)
      ],
      '2026-07-10'
    )
    expect(p.current).toBeCloseTo(29 / 3) // 9.67 — not 29/16 calendar days
    expect(p.paceStatus).toBe('on_track')
  })

  test('every logged day counts, even on non-repeat days', () => {
    // repeat Mon/Wed/Fri, but a Saturday log is still real data
    const t = { ...avg, startDate: '2026-06-08', repeatDays: [1, 3, 5] }
    const p = calculateAverage(
      t,
      [
        e('2026-06-08', 6),
        e('2026-06-10', 6),
        e('2026-06-12', 6),
        e('2026-06-13', 10) // Saturday, not due, but logged
      ],
      '2026-06-13'
    )
    expect(p.current).toBe(7) // (6+6+6+10)/4 logged days
  })

  test('no entries → current 0, behind', () => {
    const p = calculateAverage(avg, [], '2026-06-13')
    expect(p.current).toBe(0)
    expect(p.paceStatus).toBe('behind')
  })

  test('startDate in the future → current 0, behind', () => {
    const t = { ...avg, startDate: '2026-07-01' }
    const p = calculateAverage(t, [e('2026-06-13', 9)], '2026-06-13')
    expect(p.current).toBe(0)
    expect(p.paceStatus).toBe('behind')
  })
})

describe('calculateAverage — weekly / monthly buckets', () => {
  test('weekly: mean of Monday-week totals over logged weeks', () => {
    // weeks 06-01 (4+6=10) and 06-08 (5) are logged → (10+5)/2
    const t: Tracker = { ...avg, period: 'weekly', targetValue: 10 }
    const p = calculateAverage(
      t,
      [e('2026-06-02', 4), e('2026-06-03', 6), e('2026-06-09', 5)],
      '2026-06-13'
    )
    expect(p.current).toBe(7.5)
  })

  test('monthly: months without logs are ignored', () => {
    // startDate 04-15, today 06-13 → Apr and May logged, Jun empty
    const t: Tracker = {
      ...avg,
      period: 'monthly',
      targetValue: 50,
      startDate: '2026-04-15'
    }
    const p = calculateAverage(
      t,
      [e('2026-04-20', 30), e('2026-05-10', 60)],
      '2026-06-13'
    )
    expect(p.current).toBe(45) // (30 + 60) / 2 logged months
  })
})

describe('calculateAverage — rolling window', () => {
  const rolling: Tracker = { ...avg, averageWindow: 'rolling', rollingDays: 7 }

  test('mean over logged days within the last N days, older entries excluded', () => {
    // today 06-13, N=7 → window 06-07..06-13, logged days: 06-10 and 06-13
    const p = calculateAverage(
      rolling,
      [e('2026-06-01', 100), e('2026-06-10', 7), e('2026-06-13', 7)],
      '2026-06-13'
    )
    expect(p.current).toBe(7) // (7 + 7) / 2 logged days
  })

  test('boundary: 6 days ago is inside, 7 days ago is outside', () => {
    const inside = calculateAverage(
      rolling,
      [e('2026-06-07', 14)],
      '2026-06-13'
    )
    expect(inside.current).toBe(14) // sole logged day in window
    const outside = calculateAverage(
      rolling,
      [e('2026-06-06', 14)],
      '2026-06-13'
    )
    expect(outside.current).toBe(0)
  })

  test('null rollingDays falls back to a 7-day window', () => {
    const p = calculateAverage(
      { ...rolling, rollingDays: null },
      [e('2026-06-06', 5), e('2026-06-13', 14)],
      '2026-06-13'
    )
    expect(p.current).toBe(14) // 06-06 outside → only 06-13 counts
  })
})

describe('calculateAverage — direction "or less"', () => {
  // e.g. "2 or less coffees per day"
  const less: Tracker = {
    ...avg,
    direction: 'bad',
    targetValue: 2,
    startDate: '2026-06-12'
  }

  test('on_track with full percent when the mean is at or below goal', () => {
    const p = calculateAverage(
      less,
      [e('2026-06-12', 1), e('2026-06-13', 2)],
      '2026-06-13'
    )
    expect(p.current).toBe(1.5)
    expect(p.paceStatus).toBe('on_track')
    expect(p.percent).toBe(1)
  })

  test('behind when the mean exceeds goal; percent shrinks as it grows', () => {
    const p = calculateAverage(less, [e('2026-06-12', 4)], '2026-06-13')
    expect(p.paceStatus).toBe('behind')
    expect(p.percent).toBe(0.5) // goal 2 / avg 4
  })

  test('no logs → 0 is within an "or less" goal → on_track', () => {
    const p = calculateAverage(less, [], '2026-06-13')
    expect(p.current).toBe(0)
    expect(p.paceStatus).toBe('on_track')
    expect(p.percent).toBe(1)
  })

  test("today_total basis: today's sum over goal → behind", () => {
    const t: Tracker = { ...less, progressBasis: 'today_total' }
    const p = calculateAverage(
      t,
      [e('2026-06-13', 1), e('2026-06-13', 2)],
      '2026-06-13'
    )
    expect(p.percent).toBe(2 / 3) // goal 2 / today's total 3
    expect(p.paceStatus).toBe('behind')
  })
})

describe('calculateAverage — today_total progress basis', () => {
  const todayBasis: Tracker = {
    ...avg,
    startDate: '2026-06-12',
    progressBasis: 'today_total'
  }

  test("percent & pace use today's summed total; current stays the day-mean", () => {
    const p = calculateAverage(
      todayBasis,
      [e('2026-06-12', 2), e('2026-06-13', 3), e('2026-06-13', 5)],
      '2026-06-13'
    )
    expect(p.current).toBe(5) // day totals 2 and 8 → mean 5
    expect(p.percent).toBe(1) // today 3+5 = 8 >= goal 8
    expect(p.paceStatus).toBe('on_track')
  })

  test("behind when today's total is below goal even if the mean meets it", () => {
    const p = calculateAverage(
      todayBasis,
      [e('2026-06-12', 20), e('2026-06-13', 2)],
      '2026-06-13'
    )
    expect(p.percent).toBe(2 / 8)
    expect(p.paceStatus).toBe('behind')
  })
})
