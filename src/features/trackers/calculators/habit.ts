import type { Tracker, Entry, TrackerProgress } from '@features/trackers/types';
import { daysBetween, toISODate, weekdayOf } from '@utils/date';

function isDueOn(tracker: Tracker, iso: string): boolean {
  if (!tracker.repeatDays || tracker.repeatDays.length === 0) return true;
  return tracker.repeatDays.includes(weekdayOf(iso));
}

function isoMinusDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return toISODate(d);
}

export function calculateHabit(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string,
): TrackerProgress {
  // A day's Goal: how many times the habit must be logged that day to count as
  // done. Only the per-day cadence maps cleanly to a daily threshold; for
  // weekly/monthly cadences a single log marks the day done (threshold 1).
  const perDayGoal =
    tracker.period == null || tracker.period === 'daily'
      ? Math.max(1, tracker.targetValue ?? 1)
      : 1;

  // Sum each date's logged value, then a date is "done" when it meets the goal.
  const dayTotals = new Map<string, number>();
  for (const e of entries) {
    const day = e.date.slice(0, 10);
    dayTotals.set(day, (dayTotals.get(day) ?? 0) + e.value);
  }
  const doneDates = new Set(
    [...dayTotals].filter(([, total]) => total >= perDayGoal).map(([day]) => day),
  );

  let streak = 0;
  let cursor = todayISO;
  while (true) {
    if (isDueOn(tracker, cursor)) {
      if (doneDates.has(cursor)) {
        streak += 1;
      } else if (cursor === todayISO) {
        // today not logged yet is neutral — don't break the streak
      } else {
        break;
      }
    }
    cursor = isoMinusDays(cursor, 1);
    if (daysBetween(tracker.startDate, cursor) < 0) break;
  }

  const totalDays = daysBetween(tracker.startDate, todayISO);
  let dueCount = 0;
  let doneCount = 0;
  for (let i = 0; i <= totalDays; i++) {
    const day = isoMinusDays(todayISO, i);
    if (isDueOn(tracker, day)) {
      dueCount += 1;
      if (doneDates.has(day)) doneCount += 1;
    }
  }
  const successRate = dueCount === 0 ? 0 : doneCount / dueCount;

  return { current: doneCount, goal: dueCount, percent: successRate, paceStatus: 'none', streak, successRate };
}
