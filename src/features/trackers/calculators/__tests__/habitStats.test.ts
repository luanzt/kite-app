import {
  doneDatesOf,
  dayTotalsOf,
  dayCountsOf,
  bestStreak,
  buildCalendarMonth,
  weeklyGoalOf,
  periodSessions,
  buildHistoryRows,
  isoAddDays,
  habitStreakStatus,
  classifyTodayRow,
  todaySummary
} from '../habitStats'
import type { Tracker, Entry } from '@features/trackers/types'
import type { TodayRowStatus } from '../habitStats'

const base: Tracker = {
  id: 'h1',
  name: 'Running',
  type: 'habit',
  icon: 'walk',
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
  goalNote: null,
  averageWindow: null,
  rollingDays: null,
  doneRule: null,
  progressBasis: null,
  createdAt: '2026-06-01T00:00:00Z',
  archived: false
}

const log = (date: string, value = 1): Entry => ({
  id: `${date}-${value}`,
  trackerId: 'h1',
  date,
  value,
  note: null,
  createdAt: `${date}T00:00:00Z`
})

describe('bad habit — calendar, streak status, sessions', () => {
  // "≤ 1 slip a day"; each log(value 1) is a slip
  const bad: Tracker = {
    ...base,
    direction: 'bad',
    targetValue: 1,
    startDate: '2026-07-01'
  }
  const slip = (date: string, hour: number): Entry => ({
    id: `${date}-${hour}`,
    trackerId: 'h1',
    date,
    value: 1,
    note: null,
    createdAt: `${date}T${hour < 10 ? `0${hour}` : hour}:00:00Z`
  })

  it('buildCalendarMonth: clean days (logged or not) are done, over-limit days are failed', () => {
    const entries = [
      slip('2026-07-02', 8), // 1 slip = at the limit → clean
      slip('2026-07-03', 8),
      slip('2026-07-03', 20) // 2 slips > limit → failed
    ]
    const m = buildCalendarMonth(bad, entries, 2026, 6, '2026-07-05')
    const st = (d: number) => m.cells[d - 1].status
    expect(st(1)).toBe('done') // unlogged past day = clean
    expect(st(2)).toBe('done')
    expect(st(3)).toBe('failed')
    expect(st(5)).toBe('done') // today, clean so far
    expect(st(6)).toBe('future')
  })

  it('bestStreak: longest CLEAN run — an over-limit day breaks it and never counts', () => {
    // limit 1; two slips on 07-03 break the run. Today 07-11.
    const entries = [slip('2026-07-03', 8), slip('2026-07-03', 20)]
    // clean runs: 07-01..02 (2 days) and 07-04..11 (8 days)
    expect(bestStreak(bad, entries, '2026-07-11')).toBe(8)
  })

  it('bestStreak: a binge-day on a fresh tracker is NOT a streak', () => {
    const fresh = { ...bad, startDate: '2026-07-11' }
    const entries = [slip('2026-07-11', 8), slip('2026-07-11', 20)] // over
    expect(bestStreak(fresh, entries, '2026-07-11')).toBe(0)
  })

  it('buildCalendarMonth: days before startDate stay plain, not clean', () => {
    const late = { ...bad, startDate: '2026-07-08' }
    const m = buildCalendarMonth(late, [], 2026, 6, '2026-07-11')
    const st = (d: number) => m.cells[d - 1].status
    expect(st(5)).toBe('none') // before the tracker existed
    expect(st(8)).toBe('done') // from startDate on, unlogged = clean
    expect(st(11)).toBe('done')
  })

  it('habitStreakStatus: a clean run reads as an ongoing streak', () => {
    expect(habitStreakStatus(bad, [], '2026-07-05')).toEqual({
      kind: 'streakOngoing',
      n: 5 // 07-01..07-05 all clean without logging
    })
  })

  it('habitStreakStatus: first clean day → greatStart', () => {
    const fresh = { ...bad, startDate: '2026-07-05' }
    expect(habitStreakStatus(fresh, [], '2026-07-05')).toEqual({
      kind: 'greatStart',
      n: 0
    })
  })

  it('habitStreakStatus: going over today ends the streak at the prior clean run', () => {
    const entries = [slip('2026-07-05', 8), slip('2026-07-05', 20)]
    expect(habitStreakStatus(bad, entries, '2026-07-05')).toEqual({
      kind: 'streakEnded',
      n: 4 // 07-01..07-04
    })
  })

  it('periodSessions daily: bars count slips, target is the limit, lessIsBetter set', () => {
    const s = periodSessions(
      bad,
      [slip('2026-07-03', 8), slip('2026-07-03', 20)],
      '2026-07-05'
    )
    expect(s.perDayTarget).toBe(1)
    expect(s.lessIsBetter).toBe(true)
    const bar = s.bars.find((b) => b.startISO === '2026-07-03')
    expect(bar?.count).toBe(2)
  })
})

describe('isoAddDays', () => {
  test('crosses month boundaries in UTC', () => {
    expect(isoAddDays('2026-06-30', 1)).toBe('2026-07-01')
    expect(isoAddDays('2026-06-01', -1)).toBe('2026-05-31')
  })
})

describe('doneDatesOf', () => {
  test('a day counts once its summed value meets the per-day goal', () => {
    const t = { ...base, period: 'daily' as const, targetValue: 3 }
    const done = doneDatesOf(t, [
      log('2026-06-02', 2),
      log('2026-06-02', 1), // 2 + 1 = 3 → met
      log('2026-06-03', 2) // below goal → not done
    ])
    expect(done.has('2026-06-02')).toBe(true)
    expect(done.has('2026-06-03')).toBe(false)
  })

  test('sums multiple records on the same day (a "No" log of 0 does not block)', () => {
    const t = { ...base, period: 'daily' as const, targetValue: 1 }
    const done = doneDatesOf(t, [
      log('2026-06-02', 0), // a "No" log
      log('2026-06-02', 1) // then a "Yes" log → day is done
    ])
    expect(done.has('2026-06-02')).toBe(true)
  })
})

describe('bestStreak', () => {
  test('finds the longest run, not the current one', () => {
    // 4-day run (2..5), broken on the 6th, then a shorter recent run.
    const entries = [
      log('2026-06-02'),
      log('2026-06-03'),
      log('2026-06-04'),
      log('2026-06-05'),
      // 6th missed
      log('2026-06-07'),
      log('2026-06-08')
    ]
    expect(bestStreak(base, entries, '2026-06-08')).toBe(4)
  })

  test('respects repeatDays — non-scheduled days never break the run', () => {
    // Mon/Wed/Fri only. 2026-06-01 is a Monday.
    const mwf = { ...base, repeatDays: [1, 3, 5] }
    const entries = [
      log('2026-06-01'), // Mon
      log('2026-06-03'), // Wed
      log('2026-06-05') // Fri
    ]
    expect(bestStreak(mwf, entries, '2026-06-05')).toBe(3)
  })
})

describe('buildCalendarMonth', () => {
  test('classifies done / rest / today / future days', () => {
    // Mon/Wed/Fri schedule so weekends are "rest".
    const mwf = { ...base, repeatDays: [1, 3, 5] }
    const m = buildCalendarMonth(
      mwf,
      [log('2026-06-01'), log('2026-06-03')],
      2026,
      5, // June (0-based)
      '2026-06-10'
    )
    expect(m.daysInMonth).toBe(30)
    // June 1 2026 is a Monday → Monday-based offset 0.
    expect(m.firstWeekdayMon).toBe(0)
    const status = (day: number) => m.cells.find((c) => c.day === day)?.status
    expect(status(1)).toBe('done')
    expect(status(3)).toBe('done')
    expect(status(6)).toBe('rest') // Saturday, not scheduled
    expect(status(10)).toBe('today')
    expect(status(12)).toBe('future') // Friday after today
  })

  test('today on a non-scheduled day is rest, not today', () => {
    // Mon/Wed/Fri schedule; today = 2026-06-09 is a Tuesday (not scheduled).
    const mwf = { ...base, repeatDays: [1, 3, 5] }
    const m = buildCalendarMonth(mwf, [], 2026, 5, '2026-06-09')
    const cell = m.cells.find((c) => c.day === 9)!
    expect(cell.status).toBe('rest')
  })

  test('cells carry hasEntry: true only for days with at least one log', () => {
    // June 4 has a No entry (value 0), June 5 has a Yes, June 6 has nothing.
    const m = buildCalendarMonth(
      base,
      [log('2026-06-04', 0), log('2026-06-05', 1)],
      2026,
      5,
      '2026-06-10'
    )
    const cell = (day: number) => m.cells.find((c) => c.day === day)!
    expect(cell(4).hasEntry).toBe(true) // a No entry still counts as an entry
    expect(cell(4).value).toBe(0)
    expect(cell(5).hasEntry).toBe(true)
    expect(cell(6).hasEntry).toBe(false) // no entry at all
  })

  test('a non-scheduled day with an entry is not rest', () => {
    // Mon/Wed/Fri schedule; 2026-06-06 is a Saturday (rest), but it has a "No" log.
    const mwf = { ...base, repeatDays: [1, 3, 5] }
    const m = buildCalendarMonth(
      mwf,
      [log('2026-06-06', 0)],
      2026,
      5,
      '2026-06-10'
    )
    const cell = m.cells.find((c) => c.day === 6)!
    expect(cell.status).not.toBe('rest') // logged → rendered like a normal day
    expect(cell.hasEntry).toBe(true)
  })

  test('a non-scheduled day with no entry is still rest', () => {
    const mwf = { ...base, repeatDays: [1, 3, 5] }
    const m = buildCalendarMonth(mwf, [], 2026, 5, '2026-06-10')
    const cell = m.cells.find((c) => c.day === 6)! // Saturday, no log
    expect(cell.status).toBe('rest')
  })

  test('a FUTURE non-scheduled day is future, not rest', () => {
    // Mon/Wed/Fri; today = 2026-06-10 (Wed). 2026-06-13 is a future Saturday.
    const mwf = { ...base, repeatDays: [1, 3, 5] }
    const m = buildCalendarMonth(mwf, [], 2026, 5, '2026-06-10')
    const cell = m.cells.find((c) => c.day === 13)!
    expect(cell.status).toBe('future') // future rest day → not marked as rest
  })

  test('a non-scheduled day logged to goal is done', () => {
    // goal 1 (default habit); a Saturday with a Yes reaches goal → done beats rest.
    const mwf = { ...base, repeatDays: [1, 3, 5], targetValue: 1 }
    const m = buildCalendarMonth(
      mwf,
      [log('2026-06-06', 1)],
      2026,
      5,
      '2026-06-10'
    )
    const cell = m.cells.find((c) => c.day === 6)!
    expect(cell.status).toBe('done')
  })
})

describe('dayTotalsOf', () => {
  const tracker = { targetValue: 5, period: 'daily', repeatDays: [] } as any
  it('sums multiple entries on the same day', () => {
    const entries = [
      {
        id: 'a',
        trackerId: 't',
        date: '2026-07-01',
        value: 2,
        note: null,
        createdAt: '2026-07-01T01:00:00Z'
      },
      {
        id: 'b',
        trackerId: 't',
        date: '2026-07-01',
        value: 3,
        note: null,
        createdAt: '2026-07-01T02:00:00Z'
      },
      {
        id: 'c',
        trackerId: 't',
        date: '2026-07-02',
        value: 1,
        note: null,
        createdAt: '2026-07-02T01:00:00Z'
      }
    ] as any
    const totals = dayTotalsOf(tracker, entries)
    expect(totals.get('2026-07-01')).toBe(5)
    expect(totals.get('2026-07-02')).toBe(1)
    expect(totals.get('2026-07-03')).toBeUndefined()
  })
})

describe('dayCountsOf', () => {
  it('counts entries per day regardless of value (No entries count too)', () => {
    const entries = [
      {
        id: 'a',
        trackerId: 't',
        date: '2026-07-01',
        value: 0,
        note: null,
        createdAt: '2026-07-01T01:00:00Z'
      }, // No
      {
        id: 'b',
        trackerId: 't',
        date: '2026-07-01',
        value: 0,
        note: null,
        createdAt: '2026-07-01T02:00:00Z'
      }, // No
      {
        id: 'c',
        trackerId: 't',
        date: '2026-07-02',
        value: 1,
        note: null,
        createdAt: '2026-07-02T01:00:00Z'
      } // Yes
    ] as any
    const counts = dayCountsOf({} as any, entries)
    expect(counts.get('2026-07-01')).toBe(2) // two No entries still count
    expect(counts.get('2026-07-02')).toBe(1)
    expect(counts.get('2026-07-03')).toBeUndefined()
  })
})

describe('buildCalendarMonth cell progress fields', () => {
  const tracker = {
    startDate: '2026-07-01',
    targetValue: 5,
    period: 'daily',
    repeatDays: []
  } as any
  const entries = [
    {
      id: 'a',
      trackerId: 't',
      date: '2026-07-01',
      value: 2,
      note: null,
      createdAt: '2026-07-01T01:00:00Z'
    }, // partial 2/5
    {
      id: 'b',
      trackerId: 't',
      date: '2026-07-02',
      value: 5,
      note: null,
      createdAt: '2026-07-02T01:00:00Z'
    } // done 5/5
  ] as any
  const month = buildCalendarMonth(tracker, entries, 2026, 6, '2026-07-03') // month 6 = July

  it('carries iso, value and goal on each cell', () => {
    const d1 = month.cells.find((c) => c.day === 1)!
    expect(d1.iso).toBe('2026-07-01')
    expect(d1.value).toBe(2)
    expect(d1.goal).toBe(5)
  })
  it('a below-goal day is not "done"', () => {
    const d1 = month.cells.find((c) => c.day === 1)!
    expect(d1.status).not.toBe('done')
    expect(d1.value).toBeLessThan(d1.goal)
  })
  it('an at-or-above-goal day is "done"', () => {
    const d2 = month.cells.find((c) => c.day === 2)!
    expect(d2.status).toBe('done')
    expect(d2.value).toBeGreaterThanOrEqual(d2.goal)
  })
})

describe('weeklyGoalOf', () => {
  test('uses the number of scheduled weekdays', () => {
    expect(weeklyGoalOf({ ...base, repeatDays: [1, 2, 3, 4, 5] })).toBe(5)
  })
  test('falls back to a weekly target', () => {
    expect(
      weeklyGoalOf({
        ...base,
        repeatDays: null,
        period: 'weekly',
        targetValue: 4
      })
    ).toBe(4)
  })
})

describe('buildHistoryRows', () => {
  // every-day habit, started Jun 1, today Jun 5 → days 5,4,3,2,1 (newest first)
  const t = { ...base, startDate: '2026-06-01' }
  const logAt = (date: string, time: string, value = 1): Entry => ({
    id: `${date}-${time}`,
    trackerId: 'h1',
    date,
    value,
    note: null,
    createdAt: `${date}T${time}Z`
  })

  test('emits a row for every due day from today back to startDate, newest first', () => {
    const rows = buildHistoryRows(t, [], '2026-06-05')
    expect(rows).toHaveLength(5)
    expect(rows.every((r) => r.kind === 'empty')).toBe(true)
    expect(rows.map((r) => (r.kind === 'empty' ? r.iso : ''))).toEqual([
      '2026-06-05',
      '2026-06-04',
      '2026-06-03',
      '2026-06-02',
      '2026-06-01'
    ])
  })

  test('a day with no record is an "empty" row (Log), a logged day is a "record"', () => {
    const rows = buildHistoryRows(
      t,
      [logAt('2026-06-03', '08:00:00')],
      '2026-06-05'
    )
    const byDay = (iso: string) =>
      rows.filter((r) =>
        r.kind === 'record' ? r.entry.date === iso : r.iso === iso
      )
    expect(byDay('2026-06-05')[0].kind).toBe('empty')
    expect(byDay('2026-06-03')[0].kind).toBe('record')
  })

  test('a day with multiple records shows each, newest record first', () => {
    const rows = buildHistoryRows(
      t,
      [
        logAt('2026-06-02', '07:00:00'),
        logAt('2026-06-02', '20:00:00') // later same day
      ],
      '2026-06-02'
    )
    const recs = rows.filter((r) => r.kind === 'record')
    expect(recs).toHaveLength(2)
    expect(
      recs.map((r) => (r.kind === 'record' ? r.entry.createdAt : ''))
    ).toEqual(['2026-06-02T20:00:00Z', '2026-06-02T07:00:00Z'])
  })

  test('skips non-due (rest) days', () => {
    // Mon/Wed/Fri only. Jun 1 is Mon. today = Jun 5 (Fri).
    const mwf = { ...t, repeatDays: [1, 3, 5] }
    const rows = buildHistoryRows(mwf, [], '2026-06-05')
    // due days in range: Fri 5, Wed 3, Mon 1
    expect(rows.map((r) => (r.kind === 'empty' ? r.iso : ''))).toEqual([
      '2026-06-05',
      '2026-06-03',
      '2026-06-01'
    ])
  })
})

describe('periodSessions', () => {
  let n = 0
  const log = (date: string): Entry => ({
    id: `${date}-${n++}`,
    trackerId: 'h1',
    date,
    value: 1,
    note: null,
    createdAt: `${date}T10:00:00Z`
  })

  test('daily bars count Yes value, not records — a "No" log adds nothing', () => {
    const t = { ...base, period: 'daily' as const, startDate: '2026-06-18' }
    const no: Entry = {
      id: 'no-1',
      trackerId: 'h1',
      date: '2026-06-20',
      value: 0, // an explicit "No"
      note: null,
      createdAt: '2026-06-20T09:00:00Z'
    }
    const r = periodSessions(t, [log('2026-06-20'), no], '2026-06-20')
    const bar = r.bars.find((b) => b.startISO === '2026-06-20')
    expect(bar?.count).toBe(1) // one Yes; the No doesn't inflate the bar
  })

  test('daily habit → one bar per day from start to today, unit "day"', () => {
    // start Jun 1, today Jun 20 → 20 day bars (oldest first)
    const t = { ...base, period: 'daily' as const, startDate: '2026-06-01' }
    const r = periodSessions(t, [log('2026-06-20')], '2026-06-20')
    expect(r.unit).toBe('day')
    expect(r.bars).toHaveLength(20)
    expect(r.bars[0].startISO).toBe('2026-06-01')
    const last = r.bars[r.bars.length - 1]
    expect(last.startISO).toBe('2026-06-20')
    expect(last.partial).toBe(true)
  })

  test('daily bar count = number of records that day, 0 when none', () => {
    const t = {
      ...base,
      period: 'daily' as const,
      startDate: '2026-06-18',
      targetValue: 5 // 5 times a day
    }
    const entries = [
      log('2026-06-20'),
      log('2026-06-20'),
      log('2026-06-20') // 3 logs on the 20th
    ]
    const r = periodSessions(t, entries, '2026-06-20')
    expect(r.perDayTarget).toBe(5)
    expect(r.bars.find((b) => b.startISO === '2026-06-20')?.count).toBe(3)
    expect(r.bars.find((b) => b.startISO === '2026-06-19')?.count).toBe(0)
  })

  test('daily scaleMax is the larger of max count and the per-day target', () => {
    const t = {
      ...base,
      period: 'daily' as const,
      startDate: '2026-06-19',
      targetValue: 5
    }
    // a day with 8 logs (over target) → scaleMax follows the data
    const entries = Array.from({ length: 8 }, () => log('2026-06-20'))
    const r = periodSessions(t, entries, '2026-06-20')
    expect(r.scaleMax).toBe(8)
  })

  test('daily scaleMax includes the target so the goal line is to scale', () => {
    // goal 2, only 1 log → bar should be half height → scaleMax must be 2
    const t = {
      ...base,
      period: 'daily' as const,
      startDate: '2026-06-19',
      targetValue: 2
    }
    const r = periodSessions(t, [log('2026-06-20')], '2026-06-20')
    expect(r.scaleMax).toBe(2)
  })

  test('daily scaleMax caps an absurd target so the Y axis never breaks', () => {
    // a garbage tracker with a giant per-day target must not blow up the scale
    const t = {
      ...base,
      period: 'daily' as const,
      startDate: '2026-06-19',
      targetValue: 1000000
    }
    const r = periodSessions(
      t,
      [log('2026-06-20'), log('2026-06-20')],
      '2026-06-20'
    )
    expect(r.scaleMax).toBeLessThanOrEqual(100) // capped, not a billion
  })

  test('weekly habit → 4 week bars, unit "week"', () => {
    const t = { ...base, period: 'weekly' as const, startDate: '2026-01-01' }
    const r = periodSessions(t, [log('2026-06-20')], '2026-06-20')
    expect(r.unit).toBe('week')
    expect(r.bars).toHaveLength(4)
    expect(r.bars[r.bars.length - 1].startISO).toBe('2026-06-15') // current monday
    expect(r.bars[r.bars.length - 1].count).toBe(1)
  })

  test('monthly habit → 3 month bars, unit "month"', () => {
    const t = { ...base, period: 'monthly' as const, startDate: '2026-01-01' }
    const r = periodSessions(
      t,
      [log('2026-06-20'), log('2026-06-05')],
      '2026-06-20'
    )
    expect(r.unit).toBe('month')
    expect(r.bars).toHaveLength(3)
    // current month bar starts at the 1st
    const cur = r.bars[r.bars.length - 1]
    expect(cur.startISO).toBe('2026-06-01')
    expect(cur.count).toBe(2) // two done days this month
  })

  test('yearly habit → 2 year bars, unit "year"', () => {
    const t = { ...base, period: 'yearly' as const, startDate: '2025-01-01' }
    const r = periodSessions(t, [log('2026-03-10')], '2026-06-20')
    expect(r.unit).toBe('year')
    expect(r.bars).toHaveLength(2)
    expect(r.bars[r.bars.length - 1].startISO).toBe('2026-01-01')
    expect(r.bars[r.bars.length - 1].count).toBe(1)
  })

  test('null period defaults to daily', () => {
    const t = { ...base, period: null, startDate: '2026-01-01' }
    expect(periodSessions(t, [], '2026-06-20').unit).toBe('day')
  })
})

describe('habitStreakStatus', () => {
  // A Mon/Tue/Sat habit for rest-day cases. 2026-06: 1st=Mon. weekdayOf: Sun=0..Sat=6.
  // repeatDays for Mon/Tue/Sat = [1, 2, 6].
  const mts: Tracker = { ...base, repeatDays: [1, 2, 6] }

  it('new tracker, start today, not done → none', () => {
    const t = { ...base, startDate: '2026-06-10' }
    expect(habitStreakStatus(t, [], '2026-06-10')).toEqual({
      kind: 'none',
      n: 0
    })
  })

  it('start today + done → greatStart', () => {
    const t = { ...base, startDate: '2026-06-10' }
    expect(habitStreakStatus(t, [log('2026-06-10')], '2026-06-10')).toEqual({
      kind: 'greatStart',
      n: 0
    })
  })

  it('past start, yesterday missed, today done → greatStart', () => {
    // startDate 06-01 daily; only today (06-10) done, 06-09 missed.
    expect(habitStreakStatus(base, [log('2026-06-10')], '2026-06-10')).toEqual({
      kind: 'greatStart',
      n: 0
    })
  })

  it('today done + yesterday done → streakOngoing n=2', () => {
    const entries = [log('2026-06-09'), log('2026-06-10')]
    expect(habitStreakStatus(base, entries, '2026-06-10')).toEqual({
      kind: 'streakOngoing',
      n: 2
    })
  })

  it('today + two prior done → streakOngoing n=3', () => {
    const entries = [log('2026-06-08'), log('2026-06-09'), log('2026-06-10')]
    expect(habitStreakStatus(base, entries, '2026-06-10')).toEqual({
      kind: 'streakOngoing',
      n: 3
    })
  })

  it('today not done, yesterday done → streakEnded n=1', () => {
    expect(habitStreakStatus(base, [log('2026-06-09')], '2026-06-10')).toEqual({
      kind: 'streakEnded',
      n: 1
    })
  })

  it('today not done, yesterday + prior done → streakEnded n=2', () => {
    const entries = [log('2026-06-08'), log('2026-06-09')]
    expect(habitStreakStatus(base, entries, '2026-06-10')).toEqual({
      kind: 'streakEnded',
      n: 2
    })
  })

  it('today not done, yesterday (due) missed → missedYesterday', () => {
    // daily: 06-09 is a due day and not done; 06-08 done so run stops there.
    expect(habitStreakStatus(base, [log('2026-06-08')], '2026-06-10')).toEqual({
      kind: 'missedYesterday',
      n: 0
    })
  })

  it('today not done, two prior due missed → missedDays n=2', () => {
    // 06-07 done; 06-08 and 06-09 missed; today 06-10 not done.
    expect(habitStreakStatus(base, [log('2026-06-07')], '2026-06-10')).toEqual({
      kind: 'missedDays',
      n: 2
    })
  })

  it('rest-day completion extends the streak', () => {
    // Mon/Tue/Sat due. Tue 06-02 done, Wed 06-03 (rest) not done,
    // Thu 06-04 (rest) done. Today = Sat 06-06 done.
    // back from 06-06(done,+1) → 06-05 rest skip → 06-04 rest done(+1)
    // → 06-03 rest skip → 06-02 due done(+1) → 06-01 Mon due NOT done → stop.
    // runEndingToday = 3.
    const entries = [log('2026-06-02'), log('2026-06-04'), log('2026-06-06')]
    expect(habitStreakStatus(mts, entries, '2026-06-06')).toEqual({
      kind: 'streakOngoing',
      n: 3
    })
  })

  it('missed last time when yesterday is a rest day', () => {
    // Mon/Tue/Sat. Today = Sat 06-06 not done. Yesterday 06-05 is Fri (rest).
    // Most recent prior DUE day = Tue 06-02, and it was missed (no logs at all).
    // missedRun counts consecutive prior due missed: Tue 06-02 missed,
    // Mon 06-01 missed → but only the run immediately before today; both due
    // days before today (Tue, Mon) missed and consecutive → missedRun = 2.
    // To isolate missedLastTime (n=1) we complete Mon so only Tue is missed:
    const entries = [log('2026-06-01')] // Mon done, Tue missed, today Sat not done
    expect(habitStreakStatus(mts, entries, '2026-06-06')).toEqual({
      kind: 'missedLastTime',
      n: 0
    })
  })

  it('missedRun excludes today and counts only the consecutive run', () => {
    // daily, today 06-10 not done. 06-09, 06-08 missed; 06-07 done.
    // missedRun = 2 (09 + 08), not counting today, not counting earlier.
    expect(habitStreakStatus(base, [log('2026-06-07')], '2026-06-10')).toEqual({
      kind: 'missedDays',
      n: 2
    })
  })
})

describe('classifyTodayRow', () => {
  const g5: Tracker = { ...base, targetValue: 5 } // goal 5
  const g1: Tracker = { ...base, targetValue: 1 } // goal 1

  it('habit completed when yes >= goal', () => {
    expect(classifyTodayRow(g5, 5, 0)).toBe('completed')
    expect(classifyTodayRow(g5, 7, 0)).toBe('completed') // overflow still completed
  })

  it('habit missed when yes+no >= goal but yes < goal', () => {
    expect(classifyTodayRow(g5, 3, 2)).toBe('missed')
    expect(classifyTodayRow(g5, 0, 5)).toBe('missed')
  })

  it('habit due when yes < goal and yes+no < goal', () => {
    expect(classifyTodayRow(g5, 3, 1)).toBe('due') // room left
    expect(classifyTodayRow(g5, 0, 0)).toBe('due') // nothing logged
  })

  it('goal-1 habit: one yes completes, one no (no yes) is missed', () => {
    expect(classifyTodayRow(g1, 1, 0)).toBe('completed')
    expect(classifyTodayRow(g1, 0, 1)).toBe('missed')
    expect(classifyTodayRow(g1, 0, 0)).toBe('due')
  })

  it('completed takes priority over missed when yes >= goal even with extra logs', () => {
    // yes 5 (goal 5) plus a stray no → still completed (yes>=goal wins)
    expect(classifyTodayRow(g5, 5, 1)).toBe('completed')
  })

  it('project is always due', () => {
    const project: Tracker = { ...base, type: 'project' }
    expect(classifyTodayRow(project, 0, 0)).toBe('due')
  })

  it('target/average: completed when yes>0 (todayLog), else due; never missed', () => {
    const target: Tracker = { ...base, type: 'target', targetValue: 2000 }
    expect(classifyTodayRow(target, 0, 0)).toBe('due')
    expect(classifyTodayRow(target, 500, 0)).toBe('completed')
    const average: Tracker = { ...base, type: 'average', targetValue: 8 }
    expect(classifyTodayRow(average, 0, 3)).toBe('due') // no never makes non-habit missed
  })

  it("average when_goal_met: completed only when today's total reaches the goal", () => {
    const avgGoal: Tracker = {
      ...base,
      type: 'average',
      targetValue: 8,
      doneRule: 'when_goal_met'
    }
    expect(classifyTodayRow(avgGoal, 0, 0)).toBe('due')
    expect(classifyTodayRow(avgGoal, 5, 0)).toBe('due') // logged, but under goal
    expect(classifyTodayRow(avgGoal, 8, 0)).toBe('completed')
  })

  it('bad habit: clean stays due (actionable all day), over the limit is missed', () => {
    const badH: Tracker = {
      ...base,
      type: 'habit',
      direction: 'bad',
      targetValue: 2
    }
    expect(classifyTodayRow(badH, 0, 0)).toBe('due') // clean so far
    expect(classifyTodayRow(badH, 2, 0)).toBe('due') // at the limit, still clean
    expect(classifyTodayRow(badH, 3, 0)).toBe('missed')
    const abstain: Tracker = { ...badH, targetValue: null } // limit 0 = never
    expect(classifyTodayRow(abstain, 0, 0)).toBe('due')
    expect(classifyTodayRow(abstain, 1, 0)).toBe('missed')
  })

  it('average when_goal_met + "or less": completed once logged and still at/under goal', () => {
    const lessGoal: Tracker = {
      ...base,
      type: 'average',
      targetValue: 2,
      direction: 'bad',
      doneRule: 'when_goal_met'
    }
    expect(classifyTodayRow(lessGoal, 0, 0)).toBe('due') // nothing logged yet
    expect(classifyTodayRow(lessGoal, 2, 0)).toBe('completed') // at goal
    expect(classifyTodayRow(lessGoal, 5, 0)).toBe('due') // over goal
  })

  it('average when_goal_met with no positive goal falls back to any-log', () => {
    const noGoal: Tracker = {
      ...base,
      type: 'average',
      targetValue: null,
      doneRule: 'when_goal_met'
    }
    expect(classifyTodayRow(noGoal, 0, 0)).toBe('due')
    expect(classifyTodayRow(noGoal, 2, 0)).toBe('completed')
  })

  it('average when_logged (and null doneRule) keeps the any-log rule', () => {
    const logged: Tracker = {
      ...base,
      type: 'average',
      targetValue: 8,
      doneRule: 'when_logged'
    }
    expect(classifyTodayRow(logged, 1, 0)).toBe('completed')
    expect(classifyTodayRow({ ...logged, doneRule: null }, 1, 0)).toBe(
      'completed'
    )
  })
})

describe('todaySummary', () => {
  const good: Tracker = { ...base, targetValue: 1 }
  const bad: Tracker = {
    ...base,
    id: 'b1',
    direction: 'bad',
    targetValue: 2
  }
  const row = (tracker: Tracker, status: TodayRowStatus) => ({
    tracker,
    status
  })

  it('clean bad habit (due) counts as done; good due does not', () => {
    const s = todaySummary([row(good, 'due'), row(bad, 'due')])
    expect(s).toEqual({ done: 1, total: 2, allDone: false })
  })

  it('allDone when everything is completed or clean-bad', () => {
    const s = todaySummary([row(good, 'completed'), row(bad, 'due')])
    expect(s).toEqual({ done: 2, total: 2, allDone: true })
  })

  it('over-limit bad habit (missed) is not done and blocks allDone', () => {
    const s = todaySummary([row(good, 'completed'), row(bad, 'missed')])
    expect(s).toEqual({ done: 1, total: 2, allDone: false })
  })

  it('good missed is not done; empty list is trivially allDone', () => {
    expect(todaySummary([row(good, 'missed')])).toEqual({
      done: 0,
      total: 1,
      allDone: false
    })
    expect(todaySummary([])).toEqual({ done: 0, total: 0, allDone: true })
  })
})
