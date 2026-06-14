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
  const doneDates = new Set(entries.filter(e => e.value > 0).map(e => e.date.slice(0, 10)));

  let streak = 0;
  let cursor = todayISO;
  while (true) {
    if (isDueOn(tracker, cursor)) {
      if (doneDates.has(cursor)) streak += 1;
      else break;
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
