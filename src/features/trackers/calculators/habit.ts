import type { Tracker, Entry, TrackerProgress } from '@features/trackers/types'
import { daysBetween } from '@utils/date'
import { isDueOn, isoAddDays, doneDatesOf } from './habitStats'

export function calculateHabit(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string
): TrackerProgress {
  // A date is "done" when its summed logged value meets the per-day goal.
  // (per-day goal + done-set logic live in habitStats — single source of truth.)
  const doneDates = doneDatesOf(tracker, entries)

  let streak = 0
  let cursor = todayISO
  while (true) {
    if (isDueOn(tracker, cursor)) {
      if (doneDates.has(cursor)) {
        streak += 1
      } else if (cursor === todayISO) {
        // today not logged yet is neutral — don't break the streak
      } else {
        break
      }
    }
    cursor = isoAddDays(cursor, -1)
    if (daysBetween(tracker.startDate, cursor) < 0) break
  }

  const totalDays = daysBetween(tracker.startDate, todayISO)
  let dueCount = 0
  let doneCount = 0
  for (let i = 0; i <= totalDays; i++) {
    const day = isoAddDays(todayISO, -i)
    if (isDueOn(tracker, day)) {
      dueCount += 1
      if (doneDates.has(day)) doneCount += 1
    }
  }
  const successRate = dueCount === 0 ? 0 : doneCount / dueCount

  return {
    current: doneCount,
    goal: dueCount,
    percent: successRate,
    paceStatus: 'none',
    streak,
    successRate
  }
}
