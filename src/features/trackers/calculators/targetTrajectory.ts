import type { Tracker, Entry } from '@features/trackers/types'
import { daysBetween } from '@utils/date'

export type TrajectoryPoint = { date: string; value: number }

export type TargetTrajectory = {
  /** Cumulative actual value by entry date, ascending. */
  series: TrajectoryPoint[]
  /** startValue@startDate → targetValue@deadline; null when no deadline. */
  idealLine: { start: TrajectoryPoint; end: TrajectoryPoint } | null
  /** Linear extrapolation of the current rate to the goal; null when N/A. */
  projected: TrajectoryPoint | null
  /** (goal − current) / daysLeft; 0 when no deadline / done / past deadline. */
  dailyGoal: number
}

/** ISO date `days` after `fromISO` (UTC-safe, matches daysBetween's epoch math). */
function isoAddDays(fromISO: string, days: number): string {
  const base = Date.parse(`${fromISO.slice(0, 10)}T00:00:00Z`)
  return new Date(base + days * 86_400_000).toISOString().slice(0, 10)
}

/**
 * buildTargetTrajectory — pure domain-level series for the Target Overview
 * charts. Mirrors calculateTarget's accumulation rule so the drawn "actual"
 * matches the reported current. Returns raw values (no SVG coords); the chart
 * component maps these to the drawing viewport.
 */
export function buildTargetTrajectory(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string
): TargetTrajectory {
  const start = tracker.startValue ?? 0
  const goal = tracker.targetValue ?? 0
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  // series — same accumulation semantics as calculateTarget.
  let series: TrajectoryPoint[]
  if (tracker.accumulation === 'latest') {
    series = sorted.map((e) => ({ date: e.date, value: e.value }))
  } else {
    let running = start
    series = sorted.map((e) => {
      running += e.value
      return { date: e.date, value: running }
    })
  }

  const current = series.length ? series[series.length - 1].value : start

  // idealLine
  const idealLine = tracker.deadline
    ? {
        start: { date: tracker.startDate, value: start },
        end: { date: tracker.deadline, value: goal }
      }
    : null

  // projected — extrapolate current rate to the goal.
  let projected: TargetTrajectory['projected'] = null
  if (tracker.deadline) {
    const elapsed = daysBetween(tracker.startDate, todayISO)
    const made = current - start
    const span = goal - start
    const alreadyDone = span === 0 ? true : made / span >= 1
    if (elapsed > 0 && made !== 0 && !alreadyDone) {
      const ratePerDay = made / elapsed // signed: negative for decreasing goals
      const remaining = goal - current
      const daysToGoal = remaining / ratePerDay // same sign → positive
      if (Number.isFinite(daysToGoal) && daysToGoal > 0) {
        projected = {
          value: goal,
          date: isoAddDays(todayISO, Math.round(daysToGoal))
        }
      }
    }
  }

  // dailyGoal
  let dailyGoal = 0
  if (tracker.deadline) {
    const left = Math.max(0, daysBetween(todayISO, tracker.deadline))
    const remaining = goal - current
    const span = goal - start
    const done = span === 0 ? true : (current - start) / span >= 1
    if (left > 0 && !done) dailyGoal = Math.abs(remaining) / left
  }

  return { series, idealLine, projected, dailyGoal }
}
