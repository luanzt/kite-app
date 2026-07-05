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
  id: date,
  trackerId: 'a1',
  date,
  value,
  note: null,
  createdAt: `${date}T00:00:00Z`
})

describe('calculateAverage', () => {
  test('current is the mean of entry values', () => {
    const p = calculateAverage(
      avg,
      [e('2026-06-12', 6), e('2026-06-13', 10)],
      '2026-06-13'
    )
    expect(p.current).toBe(8)
    expect(p.goal).toBe(8)
  })

  test('on_track when average meets target', () => {
    const p = calculateAverage(
      avg,
      [e('2026-06-12', 8), e('2026-06-13', 9)],
      '2026-06-13'
    )
    expect(p.paceStatus).toBe('on_track')
  })

  test('behind when average below target', () => {
    const p = calculateAverage(avg, [e('2026-06-12', 3)], '2026-06-13')
    expect(p.paceStatus).toBe('behind')
  })

  test('no entries → current 0, behind', () => {
    const p = calculateAverage(avg, [], '2026-06-13')
    expect(p.current).toBe(0)
    expect(p.paceStatus).toBe('behind')
  })
})

describe('calculateAverage — rolling window', () => {
  const rolling: Tracker = { ...avg, averageWindow: 'rolling', rollingDays: 7 }

  test('only entries within the last N days count toward the mean', () => {
    const p = calculateAverage(
      rolling,
      [e('2026-06-01', 100), e('2026-06-10', 4), e('2026-06-13', 8)],
      '2026-06-13'
    )
    expect(p.current).toBe(6) // (4+8)/2 — 06-01 is outside the 7-day window
  })

  test('boundary: 6 days ago is inside, 7 days ago is outside', () => {
    // today 06-13, N=7 → window covers 06-07..06-13
    const inside = calculateAverage(rolling, [e('2026-06-07', 5)], '2026-06-13')
    expect(inside.current).toBe(5)
    const outside = calculateAverage(
      rolling,
      [e('2026-06-06', 5)],
      '2026-06-13'
    )
    expect(outside.current).toBe(0)
  })

  test('empty window → current 0, behind', () => {
    const p = calculateAverage(rolling, [e('2026-05-01', 9)], '2026-06-13')
    expect(p.current).toBe(0)
    expect(p.paceStatus).toBe('behind')
  })

  test('null rollingDays falls back to a 7-day window', () => {
    const p = calculateAverage(
      { ...rolling, rollingDays: null },
      [e('2026-06-06', 5), e('2026-06-13', 9)],
      '2026-06-13'
    )
    expect(p.current).toBe(9)
  })
})

describe('calculateAverage — today_total progress basis', () => {
  const todayBasis: Tracker = { ...avg, progressBasis: 'today_total' }

  test("percent & pace use today's summed total; current stays the mean", () => {
    const p = calculateAverage(
      todayBasis,
      [
        e('2026-06-12', 2),
        e('2026-06-13', 3),
        { ...e('2026-06-13', 5), id: 'second-log' }
      ],
      '2026-06-13'
    )
    expect(p.current).toBeCloseTo(10 / 3) // mean over all entries, unchanged
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
