import { toISODate, daysBetween } from '@utils/date'
import type { Tracker } from '@features/trackers/types'

/** fmtNum mirroring the design: locale, max one decimal. */
export function fmtNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '0'
  const rounded = Number.isInteger(n) ? n : Math.round(n * 10) / 10
  return rounded.toLocaleString()
}

/** fmtVal — $ prefixes, other units suffix. */
export function fmtVal(tracker: Tracker, n: number | null | undefined): string {
  if (tracker.unit === '$') return `$${fmtNum(n)}`
  return `${fmtNum(n)}${tracker.unit ? ` ${tracker.unit}` : ''}`
}

/** Where the pace marker sits (0..100) given start/deadline vs today. */
export function pacePercent(tracker: Tracker): number | null {
  if (!tracker.deadline) return null
  const today = toISODate(new Date())
  const total = daysBetween(tracker.startDate, tracker.deadline)
  if (total <= 0) return null
  const elapsed = daysBetween(tracker.startDate, today)
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)))
}

/** Days remaining until deadline (null when no deadline). */
export function daysLeft(tracker: Tracker): number | null {
  if (!tracker.deadline) return null
  return Math.max(0, daysBetween(toISODate(new Date()), tracker.deadline))
}

/** Compact number: 1000→1K, 30000→30K, 3_000_000→3M, 1_500_000→1.5M. */
export function fmtCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '0'
  const abs = Math.abs(n)
  if (abs < 1000) return fmtNum(n)
  const [div, suffix] = abs < 1_000_000 ? [1000, 'K'] : [1_000_000, 'M']
  const scaled = n / div
  const rounded = Math.round(scaled * 10) / 10
  // strip a trailing .0 (2.0 → "2"), keep one decimal otherwise (1.5 → "1.5")
  const text = String(rounded)
  return `${text}${suffix}`
}
