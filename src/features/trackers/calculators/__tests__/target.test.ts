import { calculateTarget } from '../target'
import type { Tracker, Entry } from '@features/trackers/types'

const base: Tracker = {
  id: 't1',
  name: 'Save',
  type: 'target',
  icon: 'piggy',
  color: 'green',
  unit: '$',
  direction: null,
  targetValue: 2000,
  startValue: 0,
  accumulation: 'sum',
  startDate: '2026-01-01',
  deadline: '2026-12-31',
  period: null,
  repeatDays: null,
  reminderTimes: [],
  goalNote: null,
  averageWindow: null,
  rollingDays: null,
  doneRule: null,
  progressBasis: null,
  createdAt: '2026-01-01T00:00:00Z',
  archived: false
}
const entry = (date: string, value: number): Entry => ({
  id: date,
  trackerId: 't1',
  date,
  value,
  note: null,
  createdAt: `${date}T00:00:00Z`
})

describe('calculateTarget', () => {
  test('sum mode adds entries to start', () => {
    const p = calculateTarget(
      base,
      [entry('2026-01-02', 100), entry('2026-01-03', 50)],
      '2026-01-03'
    )
    expect(p.current).toBe(150)
    expect(p.goal).toBe(2000)
    expect(p.percent).toBeCloseTo(150 / 2000)
  })

  test('latest mode uses last entry value', () => {
    const t = {
      ...base,
      accumulation: 'latest' as const,
      startValue: 80,
      targetValue: 65
    }
    const p = calculateTarget(
      t,
      [entry('2026-01-02', 78), entry('2026-01-05', 74)],
      '2026-01-05'
    )
    expect(p.current).toBe(74)
  })

  test('behind when current below expected pace', () => {
    const p = calculateTarget(base, [entry('2026-07-01', 100)], '2026-07-02')
    expect(p.paceStatus).toBe('behind')
  })

  test('ahead when well above expected pace', () => {
    const p = calculateTarget(base, [entry('2026-07-01', 1100)], '2026-07-02')
    expect(p.paceStatus).toBe('ahead')
  })

  test('decreasing-goal: gaining is behind', () => {
    // weight loss 80 -> 65, latest mode; at mid-period current 90 means behind
    const t = {
      ...base,
      accumulation: 'latest' as const,
      startValue: 80,
      targetValue: 65
    }
    const p = calculateTarget(t, [entry('2026-07-01', 90)], '2026-07-02')
    expect(p.paceStatus).toBe('behind')
  })

  test('decreasing-goal: on a good trajectory is on track or ahead', () => {
    const t = {
      ...base,
      accumulation: 'latest' as const,
      startValue: 80,
      targetValue: 65
    }
    // ~half year elapsed, expected ~72.5; current 70 is ahead of pace
    const p = calculateTarget(t, [entry('2026-07-01', 70)], '2026-07-02')
    expect(['on_track', 'ahead']).toContain(p.paceStatus)
  })

  test('deadline equal to start date yields none', () => {
    const t = { ...base, deadline: '2026-01-01' }
    const p = calculateTarget(t, [entry('2026-01-01', 10)], '2026-01-01')
    expect(p.paceStatus).toBe('none')
  })

  test('expected = linear timeline interpolation (start 0, goal 2000, midpoint)', () => {
    // 2026-01-01 → 2026-12-31 is 364 days; 2026-07-02 ≈ day 182 (~half)
    const p = calculateTarget(base, [entry('2026-01-02', 100)], '2026-07-02')
    // expected ≈ 0 + 2000 * (182/364) = 1000 (allow ±20 for day rounding)
    expect(p.expected).not.toBeNull()
    expect(p.expected!).toBeGreaterThan(960)
    expect(p.expected!).toBeLessThan(1040)
  })

  test('expected respects startValue (non-zero start)', () => {
    const t = { ...base, startValue: 1000, targetValue: 2000 }
    const p = calculateTarget(t, [], '2026-07-02')
    // start 1000, span 1000, ~half → ~1500
    expect(p.expected!).toBeGreaterThan(1460)
    expect(p.expected!).toBeLessThan(1540)
  })

  test('expected is null with no deadline', () => {
    const t = { ...base, deadline: null }
    const p = calculateTarget(t, [entry('2026-01-02', 100)], '2026-01-03')
    expect(p.expected).toBeNull()
  })
})
