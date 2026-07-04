import type { Tracker, Entry } from '@features/trackers/types'
import { daysBetween, toISODate, weekdayOf } from '@utils/date'

/**
 * Habit detail derivations — pure helpers feeding the redesigned Habit Detail
 * screen (achievement ring, monthly calendar, "sessions per week" chart).
 *
 * These are the single source of truth for two notions the calculator also
 * needs (`isDueOn`, `doneDatesOf`), so `calculateHabit` imports them rather
 * than re-deriving. Everything here is pure (no DB) and unit-tested.
 */

/** Shift an ISO date (YYYY-MM-DD) by `n` whole days, in UTC. */
export function isoAddDays(iso: string, n: number): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return toISODate(d)
}

/**
 * How many times the habit must be logged on a single day to count as done.
 * Only a per-day cadence maps to a daily threshold; weekly/monthly cadences
 * treat a single log as "done" (threshold 1).
 */
export function perDayGoal(tracker: Tracker): number {
  return tracker.period == null || tracker.period === 'daily'
    ? Math.max(1, tracker.targetValue ?? 1)
    : 1
}

/** Is the habit scheduled on this date? (no repeatDays = every day). */
export function isDueOn(tracker: Tracker, iso: string): boolean {
  if (!tracker.repeatDays || tracker.repeatDays.length === 0) return true
  return tracker.repeatDays.includes(weekdayOf(iso))
}

/** Summed logged value per ISO day (YYYY-MM-DD). Single source of daily totals. */
export function dayTotalsOf(
  tracker: Tracker,
  entries: Entry[]
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const e of entries) {
    const day = e.date.slice(0, 10)
    totals.set(day, (totals.get(day) ?? 0) + e.value)
  }
  return totals
}

/** The set of ISO dates whose summed logged value met the per-day goal. */
export function doneDatesOf(tracker: Tracker, entries: Entry[]): Set<string> {
  const goal = perDayGoal(tracker)
  const totals = dayTotalsOf(tracker, entries)
  return new Set(
    [...totals].filter(([, total]) => total >= goal).map(([day]) => day)
  )
}

/**
 * Longest run of consecutive *due* days that were completed, scanning from the
 * tracker's start date to today. Today, if due but not yet logged, is neutral
 * (it neither extends nor breaks the run) — mirroring the current-streak rule.
 */
export function bestStreak(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string
): number {
  const done = doneDatesOf(tracker, entries)
  const total = daysBetween(tracker.startDate, todayISO)
  if (total < 0) return 0
  let best = 0
  let run = 0
  for (let i = 0; i <= total; i++) {
    const day = isoAddDays(tracker.startDate, i)
    if (!isDueOn(tracker, day)) continue
    if (done.has(day)) {
      run += 1
      if (run > best) best = run
    } else if (day === todayISO) {
      // today not logged yet is neutral — leave the run intact
    } else {
      run = 0
    }
  }
  return best
}

export type CalendarStatus = 'done' | 'today' | 'rest' | 'future' | 'none'
export type CalendarCell = {
  day: number
  status: CalendarStatus
  iso: string // full YYYY-MM-DD, for tap-to-log
  value: number // summed logged value that day
  goal: number // perDayGoal(tracker)
}
export type CalendarMonth = {
  year: number
  month: number // 0-based
  daysInMonth: number
  /** Weekday of the 1st, Monday-based (0 = Mon … 6 = Sun) for grid offset. */
  firstWeekdayMon: number
  cells: CalendarCell[]
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

/**
 * Build a month's calendar with each day's habit status. Status priority:
 * done > today > rest (not scheduled) > future > none (a plain past day).
 */
export function buildCalendarMonth(
  tracker: Tracker,
  entries: Entry[],
  year: number,
  month: number,
  todayISO: string
): CalendarMonth {
  const done = doneDatesOf(tracker, entries)
  const totals = dayTotalsOf(tracker, entries)
  const goal = perDayGoal(tracker)
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const firstISO = `${year}-${pad2(month + 1)}-01`
  const firstWeekdayMon = (weekdayOf(firstISO) + 6) % 7

  const cells: CalendarCell[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${pad2(month + 1)}-${pad2(d)}`
    let status: CalendarStatus
    if (done.has(iso)) status = 'done'
    else if (iso === todayISO) status = 'today'
    else if (!isDueOn(tracker, iso)) status = 'rest'
    else if (iso > todayISO) status = 'future'
    else status = 'none'
    cells.push({ day: d, status, iso, value: totals.get(iso) ?? 0, goal })
  }
  return { year, month, daysInMonth, firstWeekdayMon, cells }
}

export type WeekBar = {
  startISO: string // Monday of the week
  count: number // completed days in the week (capped at today)
  partial: boolean // the in-progress current week
}

/** Sessions targeted per week — from repeatDays, a weekly target, else 7. */
export function weeklyGoalOf(tracker: Tracker): number {
  if (tracker.repeatDays && tracker.repeatDays.length > 0) {
    return tracker.repeatDays.length
  }
  if (tracker.period === 'weekly' && tracker.targetValue) {
    return Math.max(1, tracker.targetValue)
  }
  return 7
}

/** Monday (UTC) of the week containing `iso`. */
function mondayOf(iso: string): string {
  return isoAddDays(iso, -((weekdayOf(iso) + 6) % 7))
}

/**
 * One row in the History list: either a real logged record, or an "empty" due
 * day with no record yet (so the user can back-fill a past day).
 */
export type HistoryRowItem =
  | { kind: 'record'; entry: Entry }
  | { kind: 'empty'; iso: string }

/**
 * The History list: every *due* day from today back to the tracker's start
 * date, newest day first. A day with records emits one `record` row per entry
 * (newest record first within the day); a day with no record emits a single
 * `empty` row. Days that aren't scheduled (rest days) are skipped.
 */
export function buildHistoryRows(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string
): HistoryRowItem[] {
  // group entries by their day, each day's records sorted newest-first
  const byDay = new Map<string, Entry[]>()
  for (const e of entries) {
    const day = e.date.slice(0, 10)
    const list = byDay.get(day) ?? []
    list.push(e)
    byDay.set(day, list)
  }
  for (const list of byDay.values()) {
    list.sort((a, b) =>
      (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
    )
  }

  const span = daysBetween(tracker.startDate.slice(0, 10), todayISO)
  const rows: HistoryRowItem[] = []
  for (let i = span; i >= 0; i--) {
    const iso = isoAddDays(tracker.startDate, i)
    if (!isDueOn(tracker, iso)) continue
    const dayEntries = byDay.get(iso)
    if (dayEntries && dayEntries.length > 0) {
      for (const entry of dayEntries) rows.push({ kind: 'record', entry })
    } else {
      rows.push({ kind: 'empty', iso })
    }
  }
  return rows
}

export type StreakStatusKind =
  | 'none'
  | 'greatStart'
  | 'streakOngoing'
  | 'streakEnded'
  | 'missedYesterday'
  | 'missedLastTime'
  | 'missedDays'

export type StreakStatus = { kind: StreakStatusKind; n: number }

/**
 * Motivational streak status for the Today card (today is always a due day
 * there). Scans backward from today: a *done* day (due or rest) extends the
 * run; a rest day not done is skipped; a due day not done (other than today)
 * breaks it. "Missed" counts only consecutive *due* days not done strictly
 * before today.
 */
export function habitStreakStatus(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string
): StreakStatus {
  const done = doneDatesOf(tracker, entries)
  const span = daysBetween(tracker.startDate, todayISO)
  if (span < 0) return { kind: 'none', n: 0 }

  const todayDone = done.has(todayISO)

  // Does any due day exist strictly before today?
  let hasPriorDue = false
  for (let i = 1; i <= span; i++) {
    if (isDueOn(tracker, isoAddDays(todayISO, -i))) {
      hasPriorDue = true
      break
    }
  }

  // Run of consecutive done days (due or rest) ending at the cursor, scanning
  // back; rest-not-done skipped; due-not-done stops. startOffset 0 includes today.
  const runFrom = (startOffset: number): number => {
    let run = 0
    for (let i = startOffset; i <= span; i++) {
      const day = isoAddDays(todayISO, -i)
      if (done.has(day)) {
        run += 1
      } else if (isDueOn(tracker, day)) {
        break // a missed due day breaks the run
      }
      // else: rest day not done → skip (neutral)
    }
    return run
  }

  const runEndingToday = todayDone ? runFrom(0) : 0
  const runEndingYesterday = runFrom(1)

  // Consecutive due days not done, strictly before today (today excluded).
  let missedRun = 0
  for (let i = 1; i <= span; i++) {
    const day = isoAddDays(todayISO, -i)
    if (!isDueOn(tracker, day)) continue // skip rest days
    if (done.has(day)) break // a done due day ends the missed run
    missedRun += 1
  }

  // Was the most recent missed due day literally yesterday (today - 1)?
  const yest = isoAddDays(todayISO, -1)
  const lastMissedWasYesterday =
    span >= 1 && isDueOn(tracker, yest) && !done.has(yest)

  if (!hasPriorDue && !todayDone) return { kind: 'none', n: 0 }
  if (todayDone) {
    return runEndingToday >= 2
      ? { kind: 'streakOngoing', n: runEndingToday }
      : { kind: 'greatStart', n: 0 }
  }
  // !todayDone
  if (runEndingYesterday >= 1)
    return { kind: 'streakEnded', n: runEndingYesterday }
  if (missedRun >= 2) return { kind: 'missedDays', n: missedRun }
  return lastMissedWasYesterday
    ? { kind: 'missedYesterday', n: 0 }
    : { kind: 'missedLastTime', n: 0 }
}

export type TodayRowStatus = 'due' | 'missed' | 'completed'

/**
 * Which Today-screen section a tracker belongs to. `yes` is today's Yes total
 * (sum of logged values), `no` is today's No count (entries with value 0).
 * Habit: completed once Yes meets the per-day goal; missed once the attempts
 * (yes + no) fill the goal but Yes fell short; otherwise still due. Non-habit
 * (target/average) is completed when anything was logged today (`yes > 0`),
 * else due — it is never "missed". Project is always due.
 */
export function classifyTodayRow(
  tracker: Tracker,
  yes: number,
  no: number
): TodayRowStatus {
  if (tracker.type === 'project') return 'due'
  if (tracker.type !== 'habit') return yes > 0 ? 'completed' : 'due'
  const goal = perDayGoal(tracker)
  if (yes >= goal) return 'completed'
  if (yes + no >= goal) return 'missed'
  return 'due'
}

export type PeriodUnit = 'day' | 'week' | 'month' | 'year'
export type PeriodSessions = {
  bars: WeekBar[] // oldest first; for daily, count = number of logs that day
  goal: number
  scaleMax: number
  unit: PeriodUnit
  /** Daily only: logs-per-day target — a bar at/above it counts as "done". */
  perDayTarget?: number
}

/** Bars to show for non-daily units (daily spans start→today, capped below). */
const BARS_PER_UNIT: Record<PeriodUnit, number> = {
  day: 21, // unused for daily (handled by DAILY_MAX_BARS)
  week: 4,
  month: 3,
  year: 2
}

/** Cap on daily bars so a very old start date doesn't build a huge list. */
const DAILY_MAX_BARS = 180

function pad2p(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

/** Count done days in the inclusive [startISO, endISO] range (endISO capped at today). */
function countDoneInRange(
  done: Set<string>,
  startISO: string,
  endISO: string,
  todayISO: string
): number {
  const stop = endISO > todayISO ? todayISO : endISO
  let count = 0
  for (const day of done) {
    if (day >= startISO && day <= stop) count += 1
  }
  return count
}

/**
 * The "sessions" chart adapted to the tracker's cadence: a daily habit shows the
 * last 21 days (each bar one day, count 0/1), weekly the last 4 weeks, monthly
 * the last 3 months, yearly the last 2 years. The most recent bucket is `partial`.
 */
export function periodSessions(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string
): PeriodSessions {
  const done = doneDatesOf(tracker, entries)
  const PERIOD_TO_UNIT: Record<string, PeriodUnit> = {
    daily: 'day',
    weekly: 'week',
    monthly: 'month',
    yearly: 'year'
  }
  const unit: PeriodUnit = PERIOD_TO_UNIT[tracker.period ?? 'daily'] ?? 'day'
  const n = BARS_PER_UNIT[unit]
  const [y, m] = todayISO.split('-').map(Number)
  const bars: WeekBar[] = []

  if (unit === 'day') {
    // count the number of logs (records) per day, capped span start→today
    const logsByDay = new Map<string, number>()
    for (const e of entries) {
      const day = e.date.slice(0, 10)
      logsByDay.set(day, (logsByDay.get(day) ?? 0) + 1)
    }
    const span = Math.min(
      DAILY_MAX_BARS - 1,
      Math.max(0, daysBetween(tracker.startDate.slice(0, 10), todayISO))
    )
    for (let i = span; i >= 0; i--) {
      const iso = isoAddDays(todayISO, -i)
      bars.push({
        startISO: iso,
        count: logsByDay.get(iso) ?? 0,
        partial: i === 0
      })
    }
    const perDayTarget = perDayGoal(tracker)
    // scaleMax spans both the data and the target so the goal line is to scale
    // (goal 2 + 1 log → half-height bar). The target is capped so a garbage
    // tracker with an absurd target can't blow up the Y axis.
    const maxCount = Math.max(0, ...bars.map((b) => b.count))
    const scaleMax = Math.max(maxCount, Math.min(perDayTarget, 100), 1)
    return { bars, goal: 0, scaleMax, unit, perDayTarget }
  } else if (unit === 'week') {
    const currentMonday = mondayOf(todayISO)
    for (let i = n - 1; i >= 0; i--) {
      const startISO = isoAddDays(currentMonday, -7 * i)
      const endISO = isoAddDays(startISO, 6)
      bars.push({
        startISO,
        count: countDoneInRange(done, startISO, endISO, todayISO),
        partial: i === 0
      })
    }
  } else if (unit === 'month') {
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(y, m - 1 - i, 1))
      const startISO = `${d.getUTCFullYear()}-${pad2p(d.getUTCMonth() + 1)}-01`
      const endD = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
      )
      const endISO = toISODate(endD)
      bars.push({
        startISO,
        count: countDoneInRange(done, startISO, endISO, todayISO),
        partial: i === 0
      })
    }
  } else {
    for (let i = n - 1; i >= 0; i--) {
      const yr = y - i
      const startISO = `${yr}-01-01`
      const endISO = `${yr}-12-31`
      bars.push({
        startISO,
        count: countDoneInRange(done, startISO, endISO, todayISO),
        partial: i === 0
      })
    }
  }

  // Non-daily units (week/month/year) keep a goal line.
  const goal = weeklyGoalOf(tracker)
  const maxVal = Math.max(goal, ...bars.map((b) => b.count))
  const scaleMax = Math.max(maxVal + 1, 4)
  return { bars, goal, scaleMax, unit }
}
