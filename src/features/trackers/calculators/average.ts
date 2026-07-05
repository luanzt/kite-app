import type { Tracker, Entry, TrackerProgress } from '@features/trackers/types'
import { isoAddDays } from './habitStats'

/**
 * Average tracker progress. `averageWindow`/`rollingDays` choose which entries
 * feed the mean (all-time vs the last N calendar days); `progressBasis`
 * chooses what fills the progress bar (the mean itself vs today's summed
 * total). Null fields reproduce the pre-Strides behavior exactly.
 */
export function calculateAverage(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string
): TrackerProgress {
  const goal = tracker.targetValue ?? 0

  // Window: rolling = entries dated within the last N days, today inclusive.
  const windowed =
    tracker.averageWindow === 'rolling'
      ? entries.filter(
          (e) =>
            e.date.slice(0, 10) >
            isoAddDays(todayISO, -(tracker.rollingDays ?? 7))
        )
      : entries
  const current = windowed.length
    ? windowed.reduce((sum, e) => sum + e.value, 0) / windowed.length
    : 0

  // Progress-bar basis: the mean itself, or today's summed total.
  const basis =
    tracker.progressBasis === 'today_total'
      ? entries
          .filter((e) => e.date.slice(0, 10) === todayISO)
          .reduce((sum, e) => sum + e.value, 0)
      : current

  const percent = goal === 0 ? 0 : Math.max(0, Math.min(1, basis / goal))
  const paceStatus = basis >= goal && goal > 0 ? 'on_track' : 'behind'
  return { current, goal, percent, paceStatus }
}
