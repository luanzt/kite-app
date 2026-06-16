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
  reminderTime: null,
  createdAt: '2026-06-01T00:00:00Z',
  archived: false
}
const done = (date: string): Entry => ({
  id: date,
  trackerId: 'h1',
  date,
  value: 1,
  note: null
})
const log = (date: string, value: number): Entry => ({
  id: `${date}-${value}`,
  trackerId: 'h1',
  date,
  value,
  note: null
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

  test('non-daily cadence treats one log as done regardless of targetValue', () => {
    // Goal 3 / week: a single weekly log marks the day done (threshold 1).
    const weekly = { ...habit, period: 'weekly' as const, targetValue: 3 }
    const p = calculateHabit(weekly, [log('2026-06-14', 1)], '2026-06-14')
    expect(p.streak).toBe(1)
  })
})
