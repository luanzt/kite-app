import { calculateHabit } from '../habit'
import type { Tracker, Entry } from '@features/trackers/types'

const habit: Tracker = {
  id: 'h1',
  name: 'Meditate',
  type: 'habit',
  icon: 'lotus',
  color: 'blue',
  unit: null,
  direction: 'good',
  targetValue: null,
  startValue: null,
  accumulation: null,
  startDate: '2026-06-01',
  deadline: null,
  period: 'daily',
  repeatDays: [0, 1, 2, 3, 4, 5, 6],
  routine: 'any',
  reminderTimes: [],
  goalNote: null,
  averageWindow: null,
  rollingDays: null,
  doneRule: null,
  progressBasis: null,
  createdAt: '2026-06-01T00:00:00Z',
  archived: false
}
const done = (date: string): Entry => ({
  id: date,
  trackerId: 'h1',
  date,
  value: 1,
  note: null,
  createdAt: `${date}T00:00:00Z`
})
const log = (date: string, value: number): Entry => ({
  id: `${date}-${value}`,
  trackerId: 'h1',
  date,
  value,
  note: null,
  createdAt: `${date}T00:00:00Z`
})

describe('calculateHabit', () => {
  test('counts consecutive recent days as streak', () => {
    const p = calculateHabit(
      habit,
      [done('2026-06-12'), done('2026-06-13'), done('2026-06-14')],
      '2026-06-14'
    )
    expect(p.streak).toBe(3)
  })

  test('streak breaks on a missed due day', () => {
    const p = calculateHabit(
      habit,
      [done('2026-06-12'), done('2026-06-14')],
      '2026-06-14'
    )
    expect(p.streak).toBe(1)
  })

  test('success rate = done days / due days', () => {
    const p = calculateHabit(
      habit,
      [done('2026-06-12'), done('2026-06-14')],
      '2026-06-14'
    )
    expect(p.successRate).toBeCloseTo(2 / 14)
  })

  test('success rate: today unlogged is neutral, not a miss', () => {
    // done 06-12 + 06-13, today 06-14 not logged yet → 2/13 (today excluded),
    // not 2/14 — the in-progress day only counts once it's done.
    const p = calculateHabit(
      habit,
      [done('2026-06-12'), done('2026-06-13')],
      '2026-06-14'
    )
    expect(p.successRate).toBeCloseTo(2 / 13)
  })

  test('a fresh habit is not an instant failure, and completing day one is 100%', () => {
    const fresh = { ...habit, startDate: '2026-06-14' }
    const before = calculateHabit(fresh, [], '2026-06-14')
    expect(before.successRate).toBe(0)
    expect(before.goal).toBe(0) // no due days settled yet
    const after = calculateHabit(fresh, [done('2026-06-14')], '2026-06-14')
    expect(after.successRate).toBe(1)
  })

  test('pace status is none for habits', () => {
    const p = calculateHabit(habit, [done('2026-06-14')], '2026-06-14')
    expect(p.paceStatus).toBe('none')
  })

  test('today unlogged does not wipe the streak', () => {
    // done 06-12 and 06-13, today 06-14 unlogged → streak stays 2
    const p = calculateHabit(
      habit,
      [done('2026-06-12'), done('2026-06-13')],
      '2026-06-14'
    )
    expect(p.streak).toBe(2)
  })

  test('a missed PAST due day still breaks the streak', () => {
    // 06-14 done, 06-13 missed (past due day) → streak 1
    const p = calculateHabit(
      habit,
      [done('2026-06-12'), done('2026-06-14')],
      '2026-06-14'
    )
    expect(p.streak).toBe(1)
  })

  test('a daily Goal requires the per-day total to meet targetValue', () => {
    // Goal of 3 times/day: a day with only 1 log is NOT done; 3 logs IS done.
    const goal3 = { ...habit, targetValue: 3 }
    const oneLog = calculateHabit(goal3, [log('2026-06-14', 1)], '2026-06-14')
    expect(oneLog.streak).toBe(0)
    const threeLogs = calculateHabit(
      goal3,
      [log('2026-06-14', 1), log('2026-06-14', 1), log('2026-06-14', 1)],
      '2026-06-14'
    )
    expect(threeLogs.streak).toBe(1)
  })

  test('a single log of the full Goal value also counts the day as done', () => {
    const goal3 = { ...habit, targetValue: 3 }
    const p = calculateHabit(
      goal3,
      [log('2026-06-13', 3), log('2026-06-14', 3)],
      '2026-06-14'
    )
    expect(p.streak).toBe(2)
  })

  test('non-daily cadence scores the whole period, not a single day', () => {
    // Goal 3 / week: one log this week does NOT fill the quota, so the current
    // (in-progress) week stays neutral and the streak is still 0.
    const weekly = { ...habit, period: 'weekly' as const, targetValue: 3 }
    const one = calculateHabit(weekly, [log('2026-06-14', 1)], '2026-06-14')
    expect(one.streak).toBe(0)
    // Three logs in the week fills the quota → the week counts (streak 1).
    const met = calculateHabit(
      weekly,
      [log('2026-06-08', 1), log('2026-06-09', 1), log('2026-06-14', 1)],
      '2026-06-14'
    )
    expect(met.streak).toBe(1)
  })
})

describe('calculateHabit — bad habit (limit)', () => {
  // "≤ 2 beers a day" — each Yes log is one slip; targetValue is the LIMIT.
  const bad: Tracker = {
    ...habit,
    direction: 'bad',
    targetValue: 2,
    startDate: '2026-06-10'
  }

  test('unlogged days are clean — streak & success run without logging', () => {
    const p = calculateHabit(bad, [], '2026-06-14')
    expect(p.streak).toBe(5) // 06-10..06-14, nothing logged = nothing slipped
    expect(p.successRate).toBe(1)
  })

  test('slips within the limit keep the day clean', () => {
    // two slips on 06-12 = exactly the limit
    const p = calculateHabit(
      bad,
      [done('2026-06-12'), log('2026-06-12', 1)],
      '2026-06-14'
    )
    expect(p.streak).toBe(5)
    expect(p.successRate).toBe(1)
  })

  test('an over-limit past day breaks the streak and dents the success rate', () => {
    // three slips on 06-12 > limit 2
    const p = calculateHabit(
      bad,
      [done('2026-06-12'), log('2026-06-12', 1), log('2026-06-12', 2)],
      '2026-06-14'
    )
    expect(p.streak).toBe(2) // 06-13 + 06-14
    expect(p.successRate).toBeCloseTo(4 / 5)
  })

  test('going over the limit today zeroes the streak immediately', () => {
    const p = calculateHabit(
      bad,
      [done('2026-06-14'), log('2026-06-14', 1), log('2026-06-14', 2)],
      '2026-06-14'
    )
    expect(p.streak).toBe(0)
    expect(p.successRate).toBeCloseTo(4 / 5)
  })

  test('no targetValue means limit 0 — full abstinence', () => {
    const abstain: Tracker = { ...bad, targetValue: null }
    const p = calculateHabit(abstain, [done('2026-06-13')], '2026-06-14')
    expect(p.streak).toBe(1) // today only; yesterday's single slip broke it
    expect(p.successRate).toBeCloseTo(4 / 5)
  })
})

describe('calculateHabit — period (non-daily) good habits score by bucket', () => {
  const monthly: Tracker = {
    ...habit,
    period: 'monthly',
    targetValue: 3,
    startDate: '2026-04-01'
  }
  const met = (mm: string): Entry[] => [
    done(`2026-${mm}-05`),
    done(`2026-${mm}-06`),
    done(`2026-${mm}-07`)
  ]

  test('prior months met, current month in progress → streak/success in months', () => {
    const p = calculateHabit(
      monthly,
      [...met('04'), ...met('05'), ...met('06')],
      '2026-07-14'
    )
    // Apr/May/Jun met, July still open (neutral)
    expect(p.streak).toBe(3)
    expect(p.current).toBe(3)
    expect(p.goal).toBe(3) // July excluded from the denominator while in progress
    expect(p.successRate).toBeCloseTo(1)
  })

  test('current month also met counts toward the streak', () => {
    const p = calculateHabit(
      monthly,
      [...met('04'), ...met('05'), ...met('06'), ...met('07')],
      '2026-07-14'
    )
    expect(p.streak).toBe(4)
    expect(p.goal).toBe(4)
    expect(p.successRate).toBeCloseTo(1)
  })

  test('a missed month breaks the streak and lowers success', () => {
    // Only April met; May & June missed; July (current) empty.
    const p = calculateHabit(monthly, met('04'), '2026-07-14')
    expect(p.streak).toBe(0)
    expect(p.current).toBe(1)
    expect(p.goal).toBe(3) // Apr/May/Jun counted, July in progress excluded
    expect(p.successRate).toBeCloseTo(1 / 3)
  })

  test('weekly cadence buckets by ISO week', () => {
    // 2 sessions/week, weeks of Jun 29 (Mon) and Jul 6 both met, current week Jul 13.
    const weekly: Tracker = {
      ...habit,
      period: 'weekly',
      targetValue: 2,
      startDate: '2026-06-29'
    }
    const p = calculateHabit(
      weekly,
      [done('2026-06-30'), done('2026-07-01'), done('2026-07-07'), done('2026-07-08')],
      '2026-07-14'
    )
    expect(p.streak).toBe(2)
    expect(p.successRate).toBeCloseTo(1)
  })
})

describe('calculateHabit — bad habits score cleanliness by period bucket', () => {
  // Limit 2 slips/week, since Monday 2026-06-29; "today" is Tue 2026-07-14
  // (week of Jul 13). Weeks: Jun29–Jul5, Jul6–12, Jul13–19 (current).
  const badWeekly: Tracker = {
    ...habit,
    direction: 'bad',
    period: 'weekly',
    targetValue: 2,
    startDate: '2026-06-29'
  }

  test('no slips anywhere → every week clean', () => {
    const p = calculateHabit(badWeekly, [], '2026-07-14')
    expect(p.streak).toBe(3) // three clean weeks incl. the current one
    expect(p.successRate).toBe(1)
  })

  test('a week over the limit breaks the clean run and lowers success', () => {
    // 3 slips in the middle week (Jul 6–12) — over the limit of 2.
    const p = calculateHabit(
      badWeekly,
      [log('2026-07-07', 1), log('2026-07-08', 1), log('2026-07-09', 1)],
      '2026-07-14'
    )
    expect(p.streak).toBe(1) // only the current (clean) week
    expect(p.successRate).toBeCloseTo(2 / 3)
  })

  test('going over in the current week zeroes the streak', () => {
    const p = calculateHabit(
      badWeekly,
      [log('2026-07-13', 1), log('2026-07-14', 1), log('2026-07-14', 1)],
      '2026-07-14'
    )
    expect(p.streak).toBe(0)
    expect(p.successRate).toBeCloseTo(2 / 3)
  })
})
