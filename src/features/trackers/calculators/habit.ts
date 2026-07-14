import type { Tracker, Entry, TrackerProgress } from '@features/trackers/types'
import { daysBetween } from '@utils/date'
import {
  isDueOn,
  isoAddDays,
  doneDatesOf,
  dayTotalsOf,
  periodBucketDone
} from './habitStats'

/**
 * Bad habit ("≤ limit slips a day", limit 0 = never): each Yes log is a slip.
 * An UNLOGGED day is clean — avoiding the habit needs no logging — so streak
 * ("days clean") and success rate run automatically and today counts as clean
 * until it actually goes over the limit.
 */
function calculateBadHabit(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string
): TrackerProgress {
  const limit = tracker.targetValue ?? 0

  // Period (non-daily) bad habit: cleanliness is scored per PERIOD bucket — a
  // week/month/year is clean when its total stays at/under the limit. Streak =
  // consecutive clean buckets ending at the current one (an over bucket, the
  // current one included, breaks it); success = clean buckets / all buckets.
  if (tracker.period != null && tracker.period !== 'daily') {
    const flags = periodBucketDone(tracker, entries, todayISO)
    const last = flags.length - 1
    let streak = 0
    for (let i = last; i >= 0; i--) {
      if (flags[i]) streak += 1
      else break
    }
    let dueCount = 0
    let cleanCount = 0
    for (let i = 0; i <= last; i++) {
      dueCount += 1
      if (flags[i]) cleanCount += 1
    }
    const successRate = dueCount === 0 ? 0 : cleanCount / dueCount
    return {
      current: cleanCount,
      goal: dueCount,
      percent: successRate,
      paceStatus: 'none',
      streak,
      successRate
    }
  }

  const totals = dayTotalsOf(tracker, entries)
  const overOn = (day: string) => (totals.get(day) ?? 0) > limit

  // Days clean: due days back from today until the last over-limit day.
  let streak = 0
  let cursor = todayISO
  while (daysBetween(tracker.startDate, cursor) >= 0) {
    if (isDueOn(tracker, cursor)) {
      if (overOn(cursor)) break
      streak += 1
    }
    cursor = isoAddDays(cursor, -1)
  }

  const totalDays = daysBetween(tracker.startDate, todayISO)
  let dueCount = 0
  let cleanCount = 0
  for (let i = 0; i <= totalDays; i++) {
    const day = isoAddDays(todayISO, -i)
    if (!isDueOn(tracker, day)) continue
    dueCount += 1
    if (!overOn(day)) cleanCount += 1
  }
  const successRate = dueCount === 0 ? 0 : cleanCount / dueCount

  return {
    current: cleanCount,
    goal: dueCount,
    percent: successRate,
    paceStatus: 'none',
    streak,
    successRate
  }
}

export function calculateHabit(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string
): TrackerProgress {
  if (tracker.direction === 'bad') {
    return calculateBadHabit(tracker, entries, todayISO)
  }
  // Period (non-daily) good habit: streak and success rate count whole PERIOD
  // buckets (weeks/months/years) that met their quota, not individual days. The
  // current bucket stays neutral until met (mirrors the daily "today" rule).
  if (tracker.period != null && tracker.period !== 'daily') {
    const flags = periodBucketDone(tracker, entries, todayISO)
    const last = flags.length - 1
    let streak = 0
    for (let i = last; i >= 0; i--) {
      // the current (in-progress) bucket is neutral: it neither extends nor
      // breaks the run until its quota is met
      if (flags[i]) streak += 1
      else if (i === last) continue
      else break
    }
    let dueCount = 0
    let doneCount = 0
    for (let i = 0; i <= last; i++) {
      // the in-progress current bucket joins the denominator only once met
      if (i === last && !flags[i]) continue
      dueCount += 1
      if (flags[i]) doneCount += 1
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
    if (!isDueOn(tracker, day)) continue
    // today is neutral until done (same rule as the streak): the in-progress
    // day joins the denominator only once completed, so a fresh habit isn't
    // an instant 0% and the rate doesn't dip every morning.
    if (day === todayISO && !doneDates.has(day)) continue
    dueCount += 1
    if (doneDates.has(day)) doneCount += 1
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
