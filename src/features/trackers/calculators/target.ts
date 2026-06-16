import type { Tracker, Entry, TrackerProgress } from '@features/trackers/types'
import { daysBetween } from '@utils/date'

const AHEAD_MARGIN = 0.05 // 5% above expected counts as "ahead"

export function calculateTarget(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string
): TrackerProgress {
  const start = tracker.startValue ?? 0
  const goal = tracker.targetValue ?? 0

  const current =
    tracker.accumulation === 'latest'
      ? entries.length
        ? [...entries].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!
            .value
        : start
      : start + entries.reduce((sum, e) => sum + e.value, 0)

  const span = goal - start
  const percent =
    span === 0 ? 0 : Math.max(0, Math.min(1, (current - start) / span))

  let paceStatus: TrackerProgress['paceStatus'] = 'none'
  if (tracker.deadline) {
    const total = daysBetween(tracker.startDate, tracker.deadline)
    if (total <= 0) {
      paceStatus = 'none'
    } else {
      const elapsed = Math.max(
        0,
        Math.min(total, daysBetween(tracker.startDate, todayISO))
      )
      const timeFrac = elapsed / total
      const madeFrac = span === 0 ? 1 : (current - start) / span
      if (madeFrac >= timeFrac + AHEAD_MARGIN) paceStatus = 'ahead'
      else if (madeFrac >= timeFrac) paceStatus = 'on_track'
      else paceStatus = 'behind'
    }
  }

  return { current, goal, percent, paceStatus }
}
