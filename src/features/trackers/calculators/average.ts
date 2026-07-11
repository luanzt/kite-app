import type { Tracker, Entry, TrackerProgress } from '@features/trackers/types'
import { isoAddDays } from './habitStats'
import { periodBuckets } from './averageStats'

/**
 * Average tracker progress. `current` is the mean of per-period totals (days /
 * Monday-weeks / calendar months, per tracker.period) over LOGGED periods only
 * — Strides semantics: periods without a log are ignored, not counted as zero.
 * Same buckets as averageBucketStats, so the hero number and detail stats
 * agree. `averageWindow`/`rollingDays` choose the window (since startDate vs
 * the last N calendar days); `progressBasis` chooses what fills the progress
 * bar (the mean itself vs today's summed total).
 */
export function calculateAverage(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string
): TrackerProgress {
  const goal = tracker.targetValue ?? 0

  const fromISO =
    tracker.averageWindow === 'rolling'
      ? isoAddDays(todayISO, -((tracker.rollingDays ?? 7) - 1))
      : tracker.startDate
  const buckets = periodBuckets(tracker, entries, todayISO, fromISO)
  const current = buckets.length
    ? buckets.reduce((sum, b) => sum + b.total, 0) / buckets.length
    : 0

  // Progress-bar basis: the mean itself, or today's summed total.
  const basis =
    tracker.progressBasis === 'today_total'
      ? entries
          .filter((e) => e.date.slice(0, 10) === todayISO)
          .reduce((sum, e) => sum + e.value, 0)
      : current

  // direction 'bad' = "goal or less" (e.g. ≤2 coffees/day): met at or below
  // goal, and the bar drains as the value overshoots instead of filling.
  const lessIsBetter = tracker.direction === 'bad'
  const percent =
    goal === 0
      ? 0
      : lessIsBetter
      ? basis <= goal
        ? 1
        : Math.max(0, Math.min(1, goal / basis))
      : Math.max(0, Math.min(1, basis / goal))
  const met = lessIsBetter ? basis <= goal : basis >= goal
  const paceStatus = met && goal > 0 ? 'on_track' : 'behind'
  return { current, goal, percent, paceStatus }
}
