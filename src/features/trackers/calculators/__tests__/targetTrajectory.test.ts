import { buildTargetTrajectory } from '../targetTrajectory'
import type { Tracker, Entry } from '@features/trackers/types'

// A savings target: 0 → 200000 over 2026-06-01..2026-08-01 (61 days).
function baseTracker(overrides: Partial<Tracker> = {}): Tracker {
  return {
    id: 't1',
    name: 'Save Money',
    type: 'target',
    icon: 'wallet',
    color: 'blue',
    unit: '$',
    direction: 'good',
    targetValue: 200000,
    startValue: 0,
    accumulation: 'sum',
    startDate: '2026-06-01',
    deadline: '2026-08-01',
    period: 'daily',
    repeatDays: [],
    reminderTimes: [],
    goalNote: null,
    averageWindow: null,
    rollingDays: null,
    doneRule: null,
    progressBasis: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    archived: false,
    ...overrides
  }
}

function entry(date: string, value: number): Entry {
  return {
    id: `${date}-${value}`,
    trackerId: 't1',
    date,
    value,
    note: null,
    createdAt: `${date}T00:00:00.000Z`
  }
}

describe('buildTargetTrajectory', () => {
  it('sum accumulation: series is the running cumulative total by date', () => {
    const t = baseTracker()
    const entries = [
      entry('2026-06-02', 3000),
      entry('2026-06-10', 12000),
      entry('2026-06-20', 5000)
    ]
    const r = buildTargetTrajectory(t, entries, '2026-06-21')
    expect(r.series).toEqual([
      { date: '2026-06-02', value: 3000 },
      { date: '2026-06-10', value: 15000 },
      { date: '2026-06-20', value: 20000 }
    ])
  })

  it('sorts entries ascending before accumulating', () => {
    const t = baseTracker()
    const entries = [entry('2026-06-20', 5000), entry('2026-06-02', 3000)]
    const r = buildTargetTrajectory(t, entries, '2026-06-21')
    expect(r.series.map((p) => p.value)).toEqual([3000, 8000])
  })

  it('latest accumulation: series is each entry value as-is (no running sum)', () => {
    const t = baseTracker({ accumulation: 'latest', startValue: 0 })
    const entries = [entry('2026-06-02', 30), entry('2026-06-20', 70)]
    const r = buildTargetTrajectory(t, entries, '2026-06-21')
    expect(r.series).toEqual([
      { date: '2026-06-02', value: 30 },
      { date: '2026-06-20', value: 70 }
    ])
  })

  it('idealLine spans startValue@startDate → targetValue@deadline', () => {
    const t = baseTracker()
    const r = buildTargetTrajectory(t, [], '2026-06-15')
    expect(r.idealLine).toEqual({
      start: { date: '2026-06-01', value: 0 },
      end: { date: '2026-08-01', value: 200000 }
    })
  })

  it('idealLine is null with no deadline', () => {
    const t = baseTracker({ deadline: null })
    const r = buildTargetTrajectory(t, [], '2026-06-15')
    expect(r.idealLine).toBeNull()
  })

  it('projected: extrapolates current rate to the goal date', () => {
    // 20 days elapsed (06-01..06-21), current 100000 → rate 5000/day.
    // remaining 100000 → 20 more days → 2026-07-11.
    const t = baseTracker()
    const entries = [entry('2026-06-21', 100000)]
    const r = buildTargetTrajectory(t, entries, '2026-06-21')
    expect(r.projected).toEqual({ value: 200000, date: '2026-07-11' })
  })

  it('projected is null with no deadline', () => {
    const t = baseTracker({ deadline: null })
    const r = buildTargetTrajectory(
      t,
      [entry('2026-06-21', 100000)],
      '2026-06-21'
    )
    expect(r.projected).toBeNull()
  })

  it('projected is null when no progress yet (rate 0)', () => {
    const t = baseTracker()
    const r = buildTargetTrajectory(t, [], '2026-06-21')
    expect(r.projected).toBeNull()
  })

  it('projected is null when already at/over goal', () => {
    const t = baseTracker()
    const r = buildTargetTrajectory(
      t,
      [entry('2026-06-21', 200000)],
      '2026-06-21'
    )
    expect(r.projected).toBeNull()
  })

  it('dailyGoal = remaining / daysLeft', () => {
    // current 100000, remaining 100000; today 2026-07-02 → deadline 08-01 = 30 days.
    const t = baseTracker()
    const r = buildTargetTrajectory(
      t,
      [entry('2026-07-01', 100000)],
      '2026-07-02'
    )
    expect(r.dailyGoal).toBeCloseTo(100000 / 30, 5)
  })

  it('dailyGoal is 0 with no deadline', () => {
    const t = baseTracker({ deadline: null })
    const r = buildTargetTrajectory(
      t,
      [entry('2026-07-01', 100000)],
      '2026-07-02'
    )
    expect(r.dailyGoal).toBe(0)
  })

  it('dailyGoal is 0 when already complete', () => {
    const t = baseTracker()
    const r = buildTargetTrajectory(
      t,
      [entry('2026-07-01', 200000)],
      '2026-07-02'
    )
    expect(r.dailyGoal).toBe(0)
  })

  it('dailyGoal is 0 past the deadline', () => {
    const t = baseTracker()
    const r = buildTargetTrajectory(
      t,
      [entry('2026-07-01', 100000)],
      '2026-08-05'
    )
    expect(r.dailyGoal).toBe(0)
  })

  it('no entries → empty series, current equals startValue', () => {
    const t = baseTracker({ startValue: 500 })
    const r = buildTargetTrajectory(t, [], '2026-06-15')
    expect(r.series).toEqual([])
  })

  it('decreasing goal (weight loss) still projects toward the lower goal', () => {
    // start 90, goal 80, over 100 days. Lost 5 in 20 days → rate 0.25/day.
    // remaining 5 → 20 more days.
    const t = baseTracker({
      accumulation: 'latest',
      startValue: 90,
      targetValue: 80,
      unit: 'kg',
      startDate: '2026-06-01',
      deadline: '2026-09-09'
    })
    const r = buildTargetTrajectory(t, [entry('2026-06-21', 85)], '2026-06-21')
    expect(r.projected?.date).toBe('2026-07-11')
    expect(r.projected?.value).toBe(80)
  })
})
