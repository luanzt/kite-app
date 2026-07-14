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

/**
 * Target for one whole period. Daily = the per-day goal (targetValue or 1);
 * weekly/monthly/yearly = `targetValue` (the "N times per period" figure the
 * form and `weeklyGoalOf` already use), floored at 1. For a bad habit this is
 * the LIMIT for the period (use `targetValue ?? 0` directly at the call site so
 * a limit of 0 = "never" is preserved).
 */
export function periodGoalOf(tracker: Tracker): number {
  if (tracker.period == null || tracker.period === 'daily') {
    return perDayGoal(tracker)
  }
  return Math.max(1, tracker.targetValue ?? 1)
}

/**
 * Has a period (weekly/monthly/yearly) GOOD habit already filled its quota for
 * the window with the given running total? Such a habit drops off "Due today"
 * once met (Strides-style). Daily habits recur every day and bad habits are a
 * limit rather than a quota, so neither is ever "met" this way.
 */
export function periodQuotaMet(tracker: Tracker, windowTotal: number): boolean {
  if (tracker.type !== 'habit') return false
  if (tracker.direction === 'bad') return false
  if (tracker.period == null || tracker.period === 'daily') return false
  return windowTotal >= periodGoalOf(tracker)
}

export type PeriodWindow = { startISO: string; endISO: string }

/**
 * Inclusive ISO bounds of the period window that contains `iso`, per the
 * tracker's cadence: daily = that day; weekly = its Monday..Sunday; monthly =
 * the calendar month; yearly = the calendar year. This is the window a habit's
 * goal/limit applies over on the Today card.
 */
export function periodWindow(tracker: Tracker, iso: string): PeriodWindow {
  const day = iso.slice(0, 10)
  const period = tracker.period ?? 'daily'
  if (period === 'weekly') {
    const start = mondayOf(day)
    return { startISO: start, endISO: isoAddDays(start, 6) }
  }
  if (period === 'monthly') {
    const [y, m] = day.split('-').map(Number)
    // day 0 of the next month is the last day of this one
    const end = toISODate(new Date(Date.UTC(y, m, 0)))
    return { startISO: `${y}-${pad2(m)}-01`, endISO: end }
  }
  if (period === 'yearly') {
    const y = day.slice(0, 4)
    return { startISO: `${y}-01-01`, endISO: `${y}-12-31` }
  }
  return { startISO: day, endISO: day }
}

/**
 * Ordered period buckets from the tracker's start window through the window
 * containing `todayISO`, each flagged `true` when the bucket "succeeded": for a
 * good habit that means the total met the goal (`>= goal`); for a bad habit it
 * means the total stayed at or under the limit (`<= limit`, so an empty bucket
 * is clean). The single source of truth for bucket-based streak/success.
 */
export function periodBucketDone(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string
): boolean[] {
  const isBad = tracker.direction === 'bad'
  const limit = tracker.targetValue ?? 0
  const goal = periodGoalOf(tracker)
  const succeeded = (total: number) => (isBad ? total <= limit : total >= goal)
  const totalByBucket = new Map<string, number>()
  for (const e of entries) {
    const w = periodWindow(tracker, e.date)
    totalByBucket.set(
      w.startISO,
      (totalByBucket.get(w.startISO) ?? 0) + e.value
    )
  }
  const flags: boolean[] = []
  let ws = periodWindow(tracker, tracker.startDate).startISO
  const currentStart = periodWindow(tracker, todayISO).startISO
  // Guard against a start date after today (empty range).
  while (ws <= currentStart) {
    flags.push(succeeded(totalByBucket.get(ws) ?? 0))
    ws = isoAddDays(periodWindow(tracker, ws).endISO, 1)
  }
  return flags
}

/** Summed logged value within the current period window containing `iso`. */
export function periodTotal(
  tracker: Tracker,
  entries: Entry[],
  iso: string
): number {
  const { startISO, endISO } = periodWindow(tracker, iso)
  let sum = 0
  for (const e of entries) {
    const d = e.date.slice(0, 10)
    if (d >= startISO && d <= endISO) sum += e.value
  }
  return sum
}

/** The tracker's cadence as a bucket unit (drives period-worded streak copy). */
export function periodUnitOf(tracker: Tracker): PeriodUnit {
  switch (tracker.period) {
    case 'weekly':
      return 'week'
    case 'monthly':
      return 'month'
    case 'yearly':
      return 'year'
    default:
      return 'day'
  }
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

/**
 * Number of log records per ISO day (YYYY-MM-DD), regardless of value — so a
 * "No" entry (value 0) still counts. Lets the calendar tell "logged only No"
 * (value 0 with count > 0) apart from "not logged at all" (count 0).
 */
export function dayCountsOf(
  tracker: Tracker,
  entries: Entry[]
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const e of entries) {
    const day = e.date.slice(0, 10)
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  return counts
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
  const total = daysBetween(tracker.startDate, todayISO)
  if (total < 0) return 0

  // Period (non-daily) habit: longest run of consecutive successful buckets
  // (good = quota met, bad = at/under limit). For a GOOD habit the current
  // bucket, if not yet met, is neutral (leaves the run intact) — mirroring the
  // daily "today not done" rule; for a BAD habit going over is a real failure,
  // so an over bucket (current included) resets the run.
  if (tracker.period != null && tracker.period !== 'daily') {
    const isBad = tracker.direction === 'bad'
    const flags = periodBucketDone(tracker, entries, todayISO)
    const last = flags.length - 1
    let best = 0
    let run = 0
    for (let i = 0; i <= last; i++) {
      if (flags[i]) {
        run += 1
        if (run > best) best = run
      } else if (!isBad && i === last) {
        // good habit's current bucket in progress — neutral, leave run intact
      } else {
        run = 0
      }
    }
    return best
  }

  // Bad habit: longest run of CLEAN due days (unlogged = clean, today
  // included); a day over the limit breaks the run and never counts.
  if (tracker.direction === 'bad') {
    const limit = tracker.targetValue ?? 0
    const totals = dayTotalsOf(tracker, entries)
    let best = 0
    let run = 0
    for (let i = 0; i <= total; i++) {
      const day = isoAddDays(tracker.startDate, i)
      if (!isDueOn(tracker, day)) continue
      if ((totals.get(day) ?? 0) > limit) {
        run = 0
      } else {
        run += 1
        if (run > best) best = run
      }
    }
    return best
  }

  const done = doneDatesOf(tracker, entries)
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

export type CalendarStatus =
  | 'done'
  | 'failed' // bad habit only: the day went over the limit
  | 'today'
  | 'rest'
  | 'future'
  | 'none'
export type CalendarCell = {
  day: number
  status: CalendarStatus
  iso: string // full YYYY-MM-DD, for tap-to-log
  value: number // summed logged value that day (Yes = 1, No = 0)
  goal: number // perDayGoal(tracker)
  hasEntry: boolean // at least one log record that day (value 0 "No" counts)
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
 * done > future > rest (unscheduled & unlogged) > today > none (a plain past
 * day). `future` beats `rest` so an unactionable future rest day isn't marked;
 * `rest` requires `!hasEntry` so a logged rest day renders like a normal day.
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
  const counts = dayCountsOf(tracker, entries)
  const goal = perDayGoal(tracker)
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const firstISO = `${year}-${pad2(month + 1)}-01`
  const firstWeekdayMon = (weekdayOf(firstISO) + 6) % 7

  // Bad habit: every settled day is either clean (done) or over the limit
  // (failed) — an unlogged day IS clean, so there is no "none"/"today" state.
  const isBad = tracker.direction === 'bad'
  const limit = tracker.targetValue ?? 0

  const cells: CalendarCell[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${pad2(month + 1)}-${pad2(d)}`
    const hasEntry = (counts.get(iso) ?? 0) > 0
    let status: CalendarStatus
    if (isBad) {
      if (iso > todayISO) status = 'future'
      else if (iso < tracker.startDate.slice(0, 10) && !hasEntry)
        status = 'none' // before the tracker existed — not "clean"
      else if (!isDueOn(tracker, iso) && !hasEntry) status = 'rest'
      else status = (totals.get(iso) ?? 0) > limit ? 'failed' : 'done'
    } else if (done.has(iso)) status = 'done'
    else if (iso > todayISO) status = 'future'
    else if (!isDueOn(tracker, iso) && !hasEntry) status = 'rest'
    else if (iso === todayISO) status = 'today'
    else status = 'none'
    cells.push({
      day: d,
      status,
      iso,
      value: totals.get(iso) ?? 0,
      goal: isBad ? limit : goal,
      hasEntry
    })
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

  // Period (non-daily) bad habit: the streak is "periods clean". A bucket at or
  // under the limit is clean (empty = clean); the current bucket counts while
  // still clean, and going over ends the run at the prior clean bucket.
  if (
    tracker.direction === 'bad' &&
    tracker.period != null &&
    tracker.period !== 'daily'
  ) {
    const flags = periodBucketDone(tracker, entries, todayISO)
    const last = flags.length - 1
    const cleanRunFrom = (idx: number): number => {
      let run = 0
      for (let i = idx; i >= 0; i--) {
        if (flags[i]) run += 1
        else break
      }
      return run
    }
    if (last < 0 || !flags[last]) {
      const prior = cleanRunFrom(last - 1)
      return prior >= 1
        ? { kind: 'streakEnded', n: prior }
        : { kind: 'none', n: 0 }
    }
    const run = cleanRunFrom(last)
    return run >= 2
      ? { kind: 'streakOngoing', n: run }
      : { kind: 'greatStart', n: 0 }
  }

  // Bad habit: the streak is "days clean" (unlogged = clean, today included).
  // Going over the limit today ends it at the prior clean run.
  if (tracker.direction === 'bad') {
    const limit = tracker.targetValue ?? 0
    const totals = dayTotalsOf(tracker, entries)
    const overOn = (d: string) => (totals.get(d) ?? 0) > limit
    const cleanRun = (startOffset: number): number => {
      let run = 0
      for (let i = startOffset; i <= span; i++) {
        const day = isoAddDays(todayISO, -i)
        if (!isDueOn(tracker, day)) continue
        if (overOn(day)) break
        run += 1
      }
      return run
    }
    if (overOn(todayISO)) {
      const prior = cleanRun(1)
      return prior >= 1
        ? { kind: 'streakEnded', n: prior }
        : { kind: 'none', n: 0 }
    }
    const run = cleanRun(0)
    return run >= 2
      ? { kind: 'streakOngoing', n: run }
      : { kind: 'greatStart', n: 0 }
  }

  // Period (weekly/monthly/yearly) good habit: the streak counts whole PERIOD
  // buckets that filled their quota, not individual days. The current bucket is
  // neutral until met (like today in the daily case). Kinds mirror the daily
  // logic; the Today screen maps them to period-worded copy ("2 month streak").
  if (tracker.period != null && tracker.period !== 'daily') {
    const doneFlags = periodBucketDone(tracker, entries, todayISO)
    const n = doneFlags.length
    const last = n - 1
    const runBack = (idx: number): number => {
      let r = 0
      for (let i = idx; i >= 0; i--) {
        if (doneFlags[i]) r += 1
        else break
      }
      return r
    }
    const currentDone = doneFlags[last]
    const hasPrior = n >= 2
    if (!hasPrior && !currentDone) return { kind: 'none', n: 0 }
    if (currentDone) {
      const run = runBack(last)
      return run >= 2
        ? { kind: 'streakOngoing', n: run }
        : { kind: 'greatStart', n: 0 }
    }
    // current bucket not yet met
    const priorRun = runBack(last - 1)
    if (priorRun >= 1) return { kind: 'streakEnded', n: priorRun }
    let missedRun = 0
    for (let i = last - 1; i >= 0; i--) {
      if (!doneFlags[i]) missedRun += 1
      else break
    }
    if (missedRun >= 2) return { kind: 'missedDays', n: missedRun }
    return { kind: 'missedYesterday', n: 0 }
  }

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
  if (tracker.type === 'average' && tracker.doneRule === 'when_goal_met') {
    const goal = tracker.targetValue ?? 0
    // No positive goal to meet → fall through to the any-log rule below.
    if (goal > 0) {
      // 'bad' = "goal or less": done once something is logged and the total
      // is still at/under goal (an unlogged day stays due, per Strides).
      const met =
        tracker.direction === 'bad' ? yes > 0 && yes <= goal : yes >= goal
      return met ? 'completed' : 'due'
    }
  }
  if (tracker.type !== 'habit') return yes > 0 ? 'completed' : 'due'
  // Bad habit: clean (at/under the limit) stays DUE all day so the slip
  // control remains reachable; exceeding the limit is missed. An explicit
  // "stayed clean" record (a No) with zero slips completes the day — the
  // user has confirmed it. The summary ring credits a clean day as done
  // either way — see todaySummary().
  if (tracker.direction === 'bad') {
    if (yes > (tracker.targetValue ?? 0)) return 'missed'
    return yes === 0 && no > 0 ? 'completed' : 'due'
  }
  const goal = perDayGoal(tracker)
  if (yes >= goal) return 'completed'
  if (yes + no >= goal) return 'missed'
  return 'due'
}

/**
 * Today-screen summary counts, decoupled from section placement: a clean bad
 * habit sits in Due Today (still actionable) yet counts as done — being at or
 * under the limit IS today's success. `allDone` is true when every row is
 * either completed or a clean bad habit (an empty day is trivially all done).
 */
export function todaySummary(
  rows: { tracker: Tracker; status: TodayRowStatus }[]
): { done: number; total: number; allDone: boolean } {
  const done = rows.filter(
    (r) =>
      r.status === 'completed' ||
      (r.tracker.type === 'habit' &&
        r.tracker.direction === 'bad' &&
        r.status === 'due')
  ).length
  return { done, total: rows.length, allDone: done === rows.length }
}

export type StripDay = { iso: string; isToday: boolean; isFuture: boolean }

/**
 * The Today-screen date strip: `pastDays` days of history, then today, then
 * 2 future days (Today v2 layout). Future days are flagged so the UI can dim
 * and disable them; the strip scrolls so today sits at the right edge.
 */
export function todayStripDays(todayISO: string, pastDays = 4): StripDay[] {
  return Array.from({ length: pastDays + 3 }, (_, i) => {
    const offset = i - pastDays
    return {
      iso: isoAddDays(todayISO, offset),
      isToday: offset === 0,
      isFuture: offset > 0
    }
  })
}

export type PeriodUnit = 'day' | 'week' | 'month' | 'year'
export type PeriodSessions = {
  bars: WeekBar[] // oldest first; for daily, count = number of logs that day
  goal: number
  scaleMax: number
  unit: PeriodUnit
  /** Daily only: logs-per-day target — a bar at/above it counts as "done". */
  perDayTarget?: number
  /** Average "or less" goals: a bar at/BELOW perDayTarget counts as "done". */
  lessIsBetter?: boolean
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
    // Summed Yes value per day (same source as the done rule) — an explicit
    // "No" record (value 0) must not inflate the bar.
    const logsByDay = dayTotalsOf(tracker, entries)
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
    // Bad habit: bars are slips per day against the LIMIT (met = at/below).
    const isBad = tracker.direction === 'bad'
    const perDayTarget = isBad ? tracker.targetValue ?? 0 : perDayGoal(tracker)
    // scaleMax spans both the data and the target so the goal line is to scale
    // (goal 2 + 1 log → half-height bar). The target is capped so a garbage
    // tracker with an absurd target can't blow up the Y axis.
    const maxCount = Math.max(0, ...bars.map((b) => b.count))
    const scaleMax = Math.max(maxCount, Math.min(perDayTarget, 100), 1)
    const base: PeriodSessions = { bars, goal: 0, scaleMax, unit, perDayTarget }
    return isBad ? { ...base, lessIsBetter: true } : base
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
