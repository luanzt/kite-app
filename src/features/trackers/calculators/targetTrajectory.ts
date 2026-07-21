import type { Tracker, Entry } from '@features/trackers/types'
import { daysBetween } from '@utils/date'

export type TrajectoryPoint = { date: string; value: number }

export type TargetTrajectory = {
  /** Cumulative actual value by entry date, ascending. */
  series: TrajectoryPoint[]
  /** startValue@startDate → targetValue@deadline; null when no deadline. */
  idealLine: { start: TrajectoryPoint; end: TrajectoryPoint } | null
  /**
   * Strides-style forecast: the value you'll reach BY the deadline at the
   * current pace (`date` is always the deadline, `value` is extrapolated, not
   * the goal). Null only when the tracker has no deadline.
   */
  projected: TrajectoryPoint | null
  /** (goal − current) / daysLeft; 0 when no deadline / done / past deadline. */
  dailyGoal: number
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

  // projected (Strides model) — extend the actual-progress line to the DEADLINE
  // and report the value reached there at the current pace. Date is always the
  // deadline; value is the forecast (may fall short of or overshoot the goal).
  // With no time elapsed yet the rate is unknown, so the current value holds.
  let projected: TargetTrajectory['projected'] = null
  if (tracker.deadline) {
    const elapsed = daysBetween(tracker.startDate, todayISO)
    const totalSpan = daysBetween(tracker.startDate, tracker.deadline)
    const ratePerDay = elapsed > 0 ? (current - start) / elapsed : 0
    projected = {
      value: start + ratePerDay * totalSpan,
      date: tracker.deadline
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
