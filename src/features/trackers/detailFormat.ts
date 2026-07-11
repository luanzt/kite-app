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

/** Compact number: 1000→1K, 30000→30K, 3_000_000→3M, 1_500_000→1.5M, 999_999→1M. */
export function fmtCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '0'
  const abs = Math.abs(n)
  if (abs < 1000) return fmtNum(n)
  if (abs < 1_000_000) {
    const rounded = Math.round((n / 1000) * 10) / 10
    // If rounding pushes the K value to 1000 or more, promote to M.
    if (Math.abs(rounded) >= 1000) {
      const mRounded = Math.round((rounded / 1000) * 10) / 10
      return `${String(mRounded)}M`
    }
    // strip a trailing .0 (2.0 → "2"), keep one decimal otherwise (1.5 → "1.5")
    return `${String(rounded)}K`
  }
  const rounded = Math.round((n / 1_000_000) * 10) / 10
  return `${String(rounded)}M`
}

/** fmtVal but compact (1K/30K/3M) — $ prefixes, other units suffix. */
export function fmtValCompact(
  tracker: Tracker,
  n: number | null | undefined
): string {
  if (tracker.unit === '$') return `$${fmtCompact(n)}`
  return `${fmtCompact(n)}${tracker.unit ? ` ${tracker.unit}` : ''}`
}

/**
 * Compact list-card date: "1 Aug" within `refYear`, "12 Feb 2027" otherwise.
 * en-GB gives day-first order ("1 Aug"); vi-VN gives "1 thg 8".
 */
export function fmtShortDate(
  iso: string,
  lang: string,
  refYear: number = new Date().getFullYear()
): string {
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso
  const locale = lang === 'vi' ? 'vi-VN' : 'en-GB'
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    ...(d.getUTCFullYear() === refYear ? {} : { year: 'numeric' })
  })
}
