import type { Tracker, Entry, TrackerProgress } from '@features/trackers/types'

export function calculateAverage(
  tracker: Tracker,
  entries: Entry[],
  _todayISO: string
): TrackerProgress {
  const goal = tracker.targetValue ?? 0
  const current = entries.length
    ? entries.reduce((sum, e) => sum + e.value, 0) / entries.length
    : 0
  const percent = goal === 0 ? 0 : Math.max(0, Math.min(1, current / goal))
  const paceStatus = current >= goal && goal > 0 ? 'on_track' : 'behind'
  return { current, goal, percent, paceStatus }
}
