import type { Tracker, Entry } from '@features/trackers/types'
import { daysBetween, weekdayOf } from '@utils/date'
import { dayTotalsOf, isDueOn, isoAddDays } from './habitStats'
import type { PeriodSessions, WeekBar } from './habitStats'

/**
 * Average detail derivations — pure helpers feeding the Average Detail screen
 * (period-comparison card, streak/success stats, value bar chart). DB-free and
 * unit-tested, mirroring habitStats.
 */

export type CompareWindow =
  | '7d'
  | '14d'
  | '30d'
  | '4w'
  | '3m'
  | '6m'
  | '12m'
  | '7logs'
  | '30logs'

export type ComparePeriod = {
  startISO: string | null // null for an empty log-window group
  endISO: string | null
  avg: number
  perLog: boolean // true → "avg/log" label, false → "avg/day"
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

/** Shift an ISO date by `n` whole months, clamping the day (Mar 31 −1m → Feb 28). */
export function isoAddMonths(iso: string, n: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = ((total % 12) + 12) % 12 // 0-based month, safe for negatives
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate()
  return `${ny}-${pad2(nm + 1)}-${pad2(Math.min(d, lastDay))}`
}

/** Sum of entry values dated within [startISO, endISO] inclusive. */
function sumRange(entries: Entry[], startISO: string, endISO: string): number {
  let sum = 0
  for (const e of entries) {
    const d = e.date.slice(0, 10)
    if (d >= startISO && d <= endISO) sum += e.value
  }
  return sum
}

/**
 * prev 0 → null: % change from a zero baseline is undefined, regardless of
 * whether zero came from no logs or real zero-value logs.
 */
function deltaOf(cur: number, prev: number): number | null {
  return prev === 0 ? null : ((cur - prev) / prev) * 100
}

const DAY_WINDOWS: Partial<Record<CompareWindow, number>> = {
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '4w': 28
}
const MONTH_WINDOWS: Partial<Record<CompareWindow, number>> = {
  '3m': 3,
  '6m': 6,
  '12m': 12
}
const LOG_WINDOWS: Partial<Record<CompareWindow, number>> = {
  '7logs': 7,
  '30logs': 30
}

function logGroup(group: Entry[]): ComparePeriod {
  if (group.length === 0)
    return { startISO: null, endISO: null, avg: 0, perLog: true }
  const dates = group.map((e) => e.date.slice(0, 10)).sort()
  const avg = group.reduce((s, e) => s + e.value, 0) / group.length
  return {
    startISO: dates[0],
    endISO: dates[dates.length - 1],
    avg,
    perLog: true
  }
}

/**
 * The comparison card's two periods. Day windows (7d/14d/30d/4w=28d) divide by
 * the FIXED window length ("avg/day"); month windows divide by the true day
 * count of their calendar span; log windows are the mean of the N newest logs
 * vs the N before them ("avg/log"). deltaPct is null when the previous period
 * has no value to compare against.
 */
export function compareWindows(
  _tracker: Tracker,
  entries: Entry[],
  todayISO: string,
  win: CompareWindow
): {
  current: ComparePeriod
  previous: ComparePeriod
  deltaPct: number | null
} {
  const dayN = DAY_WINDOWS[win]
  if (dayN != null) {
    const curStart = isoAddDays(todayISO, -(dayN - 1))
    const prevEnd = isoAddDays(todayISO, -dayN)
    const prevStart = isoAddDays(todayISO, -(2 * dayN - 1))
    const current: ComparePeriod = {
      startISO: curStart,
      endISO: todayISO,
      avg: sumRange(entries, curStart, todayISO) / dayN,
      perLog: false
    }
    const previous: ComparePeriod = {
      startISO: prevStart,
      endISO: prevEnd,
      avg: sumRange(entries, prevStart, prevEnd) / dayN,
      perLog: false
    }
    return { current, previous, deltaPct: deltaOf(current.avg, previous.avg) }
  }

  const monthN = MONTH_WINDOWS[win]
  if (monthN != null) {
    const curStart = isoAddDays(isoAddMonths(todayISO, -monthN), 1)
    const prevEnd = isoAddMonths(todayISO, -monthN)
    const prevStart = isoAddDays(isoAddMonths(todayISO, -2 * monthN), 1)
    const curDays = daysBetween(curStart, todayISO) + 1
    const prevDays = daysBetween(prevStart, prevEnd) + 1
    const current: ComparePeriod = {
      startISO: curStart,
      endISO: todayISO,
      avg: sumRange(entries, curStart, todayISO) / curDays,
      perLog: false
    }
    const previous: ComparePeriod = {
      startISO: prevStart,
      endISO: prevEnd,
      avg: sumRange(entries, prevStart, prevEnd) / prevDays,
      perLog: false
    }
    return { current, previous, deltaPct: deltaOf(current.avg, previous.avg) }
  }

  const logN = LOG_WINDOWS[win] ?? 7
  const sorted = [...entries].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
  )
  const current = logGroup(sorted.slice(0, logN))
  const previous = logGroup(sorted.slice(logN, 2 * logN))
  return {
    current,
    previous,
    deltaPct:
      previous.startISO === null ? null : deltaOf(current.avg, previous.avg)
  }
}

/** Monday (UTC) of the week containing `iso`. */
function mondayOf(iso: string): string {
  return isoAddDays(iso, -((weekdayOf(iso) + 6) % 7))
}

/** First day of the month containing `iso`. */
function monthStartOf(iso: string): string {
  return `${iso.slice(0, 7)}-01`
}

export type AverageBucketStats = {
  streak: number
  metBuckets: number
  dueBuckets: number
  unit: 'day' | 'week' | 'month'
}

function unitOf(tracker: Tracker): 'day' | 'week' | 'month' {
  if (tracker.period === 'monthly') return 'month'
  if (tracker.period === 'weekly') return 'week'
  return 'day'
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * Streak & success-rate over period buckets (days / Monday-weeks / calendar
 * months, per tracker.period). A bucket is met when its summed total ≥
 * targetValue. Daily buckets respect repeatDays (non-due days don't count and
 * don't break streaks). The current (in-progress) bucket is neutral: it
 * extends a streak when met but never breaks one — mirroring habit's
 * today-neutral rule.
 */
export function averageBucketStats(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string
): AverageBucketStats {
  const goal = tracker.targetValue ?? 0
  const unit = unitOf(tracker)
  if (daysBetween(tracker.startDate, todayISO) < 0) {
    return { streak: 0, metBuckets: 0, dueBuckets: 0, unit }
  }

  // Ordered due buckets (oldest first): key = bucket start, total = summed value.
  const buckets: { key: string; total: number }[] = []
  let currentKey: string
  if (unit === 'day') {
    const totals = dayTotalsOf(tracker, entries)
    currentKey = todayISO
    for (let d = tracker.startDate; d <= todayISO; d = isoAddDays(d, 1)) {
      if (!isDueOn(tracker, d)) continue
      buckets.push({ key: d, total: totals.get(d) ?? 0 })
    }
  } else if (unit === 'week') {
    currentKey = mondayOf(todayISO)
    for (
      let w = mondayOf(tracker.startDate);
      w <= todayISO;
      w = isoAddDays(w, 7)
    ) {
      buckets.push({ key: w, total: sumRange(entries, w, isoAddDays(w, 6)) })
    }
  } else {
    currentKey = monthStartOf(todayISO)
    for (
      let m = monthStartOf(tracker.startDate);
      m <= todayISO;
      m = isoAddMonths(m, 1)
    ) {
      const end = isoAddDays(isoAddMonths(m, 1), -1)
      buckets.push({ key: m, total: sumRange(entries, m, end) })
    }
  }

  const met = (b: { total: number }) => goal > 0 && b.total >= goal
  const metBuckets = buckets.filter(met).length
  let streak = 0
  for (let i = buckets.length - 1; i >= 0; i--) {
    const b = buckets[i]
    if (met(b)) streak += 1
    // in-progress bucket is neutral
    else if (b.key === currentKey) continue
    else break
  }
  return { streak, metBuckets, dueBuckets: buckets.length, unit }
}

/** Cap on daily bars so a very old start date doesn't build a huge list. */
const DAILY_MAX_BARS = 180

/**
 * Value bar series for the detail chart, shaped as PeriodSessions so the
 * existing WeeklyChart renders it unchanged. Bars are bucket SUMS (not
 * counts), rounded to 1 decimal; perDayTarget drives the daily met-coloring
 * and is set only for daily trackers with a positive goal.
 */
export function averageBarSeries(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string
): PeriodSessions {
  const goal = tracker.targetValue ?? 0
  const unit = unitOf(tracker)
  const bars: WeekBar[] = []

  if (unit === 'day') {
    const totals = dayTotalsOf(tracker, entries)
    let start = tracker.startDate > todayISO ? todayISO : tracker.startDate
    const capStart = isoAddDays(todayISO, -(DAILY_MAX_BARS - 1))
    if (start < capStart) start = capStart
    for (let d = start; d <= todayISO; d = isoAddDays(d, 1)) {
      bars.push({
        startISO: d,
        count: round1(totals.get(d) ?? 0),
        partial: d === todayISO
      })
    }
  } else if (unit === 'week') {
    for (let i = 3; i >= 0; i--) {
      const w = isoAddDays(mondayOf(todayISO), -7 * i)
      bars.push({
        startISO: w,
        count: round1(sumRange(entries, w, isoAddDays(w, 6))),
        partial: i === 0
      })
    }
  } else {
    for (let i = 2; i >= 0; i--) {
      const m = isoAddMonths(monthStartOf(todayISO), -i)
      const end = isoAddDays(isoAddMonths(m, 1), -1)
      bars.push({
        startISO: m,
        count: round1(sumRange(entries, m, end)),
        partial: i === 0
      })
    }
  }

  const maxCount = bars.reduce((mx, b) => Math.max(mx, b.count), 0)
  const scaleMax = Math.max(1, Math.ceil(Math.max(goal, maxCount)))
  const base: PeriodSessions = { bars, goal, scaleMax, unit }
  return unit === 'day' && goal > 0 ? { ...base, perDayTarget: goal } : base
}
