import type {
  Tracker,
  Milestone,
  TrackerProgress
} from '@features/trackers/types'
import { daysBetween } from '@utils/date'

const AHEAD_MARGIN = 0.05

export function calculateProject(
  tracker: Tracker,
  milestones: Milestone[],
  todayISO: string
): TrackerProgress {
  const percent = milestones.length
    ? milestones.reduce((sum, ms) => sum + ms.progress, 0) / milestones.length
    : 0

  let paceStatus: TrackerProgress['paceStatus'] = 'none'
  if (tracker.deadline) {
    const total = daysBetween(tracker.startDate, tracker.deadline)
    const elapsed = Math.max(
      0,
      Math.min(total, daysBetween(tracker.startDate, todayISO))
    )
    const expected = total === 0 ? 1 : elapsed / total
    if (percent >= expected + AHEAD_MARGIN) paceStatus = 'ahead'
    else if (percent >= expected) paceStatus = 'on_track'
    else paceStatus = 'behind'
  }

  return { current: percent, goal: 1, percent, paceStatus }
}
