import type { Tracker } from './types'
import { weeklyGoalOf } from './calculators/habitStats'

/** Minimal shape of the i18next `t` we rely on (key + count interpolation). */
type T = (key: string, opts?: Record<string, unknown>) => string

/**
 * Human cadence label for a habit, e.g. "Every day" or "5 times a week".
 * Mirrors the design's header subtitle and the Settings "Schedule" row.
 */
export function cadenceLabel(tracker: Tracker, t: T): string {
  const period = tracker.period ?? 'daily'
  const days = tracker.repeatDays?.length ?? 7

  if (period === 'daily') {
    return days >= 7
      ? t('detail.everyDay')
      : t('detail.perWeek', { count: days })
  }
  if (period === 'weekly') {
    return t('detail.perWeek', { count: weeklyGoalOf(tracker) })
  }
  if (period === 'monthly') {
    return t('detail.perMonth', { count: tracker.targetValue ?? 1 })
  }
  if (period === 'yearly') {
    return t('detail.perYear', { count: tracker.targetValue ?? 1 })
  }
  return t('detail.everyDay')
}
