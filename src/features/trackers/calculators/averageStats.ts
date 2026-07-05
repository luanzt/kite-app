import type { Tracker, Entry } from '@features/trackers/types'
import { daysBetween } from '@utils/date'
import { isoAddDays } from './habitStats'

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
): { current: ComparePeriod; previous: ComparePeriod; deltaPct: number | null } {
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
      previous.startISO === null
        ? null
        : deltaOf(current.avg, previous.avg)
  }
}
