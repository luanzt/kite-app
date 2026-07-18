import type { TFunction } from 'i18next'
import type { Tracker, Entry } from './types'
import {
  calculateHabit,
  calculateTarget,
  calculateAverage
} from './calculators'
import {
  periodGoalOf,
  periodTotal,
  periodUnitOf,
  dayTotalsOf,
  type PeriodUnit
} from './calculators/habitStats'
import { fmtNum, fmtValCompact, fmtShortDate } from './detailFormat'

/**
 * Builds a reminder notification body reflecting the tracker's live progress at
 * schedule time — because notifee bakes a scheduled notification's text when it
 * is scheduled, callers re-run this (and reschedule) whenever the data changes
 * (on save, on each log/delete, and at app launch).
 *
 * Cadence-aware, mirroring `TrackerCard`: a weekly/monthly/yearly habit reports
 * its period total/goal and a period-worded streak ("this week", "2 weeks"),
 * and a non-daily average says "per week" rather than "per day". Projects are
 * never reminded, so there is no project branch.
 */

// The window word under the "Done X/Y …" figure, per cadence ("today"…"this year").
const WINDOW_KEY: Record<PeriodUnit, string> = {
  day: 'list.today',
  week: 'list.thisWeek',
  month: 'list.thisMonth',
  year: 'list.thisYear'
}
// Pluralizable streak noun per cadence ("1 day" / "2 weeks").
const UNIT_NOUN_KEY: Record<PeriodUnit, string> = {
  day: 'unit.day',
  week: 'unit.week',
  month: 'unit.month',
  year: 'unit.year'
}
// "per day" / "per week" … for average goals, per configured period.
const AVG_PER_KEY: Record<PeriodUnit, string> = {
  day: 'notification.perDay',
  week: 'notification.perWeek',
  month: 'notification.perMonth',
  year: 'notification.perYear'
}

/** Locale-formatted average, up to two decimals (e.g. 3.333 → "3.33"). */
function fmtAvg(n: number, lang: string): string {
  const locale = lang === 'vi' ? 'vi-VN' : 'en-US'
  return n.toLocaleString(locale, { maximumFractionDigits: 2 })
}

export function reminderBody(
  tracker: Tracker,
  entries: Entry[],
  t: TFunction,
  lang: string,
  todayISO: string
): string {
  if (tracker.type === 'target') {
    const p = calculateTarget(tracker, entries, todayISO)
    const start = tracker.startValue ?? 0
    const params = {
      goal: fmtValCompact(tracker, tracker.targetValue ?? 0),
      current: fmtValCompact(tracker, p.current),
      progress: fmtValCompact(tracker, p.current - start)
    }
    return tracker.deadline
      ? // refYear -1 forces the year to always render (deadlines carry a year).
        t('notification.targetBody', {
          ...params,
          date: fmtShortDate(tracker.deadline, lang, -1)
        })
      : t('notification.targetBodyNoDate', params)
  }

  if (tracker.type === 'average') {
    const p = calculateAverage(tracker, entries, todayISO)
    return t('notification.averageBody', {
      goal: fmtNum(tracker.targetValue ?? 0),
      per: t(AVG_PER_KEY[periodUnitOf(tracker)]),
      avg: fmtAvg(p.current, lang)
    })
  }

  // habit (good | bad)
  const unit = periodUnitOf(tracker)
  const streak = calculateHabit(tracker, entries, todayISO).streak ?? 0
  const unitWord = t(UNIT_NOUN_KEY[unit], { count: streak })
  if (tracker.direction === 'bad') {
    return t('notification.habitCleanBody', { count: streak, unit: unitWord })
  }
  const isDaily = tracker.period == null || tracker.period === 'daily'
  const done = Math.round(
    isDaily
      ? dayTotalsOf(tracker, entries).get(todayISO) ?? 0
      : periodTotal(tracker, entries, todayISO)
  )
  return t('notification.habitBody', {
    done,
    goal: periodGoalOf(tracker),
    count: streak,
    window: t(WINDOW_KEY[unit]),
    unit: unitWord
  })
}
