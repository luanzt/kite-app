import type { TFunction } from 'i18next'
import type { Tracker } from './types'
import * as repo from './db/repository'
import { toISODate } from '@utils/date'
import { reminderBody } from './reminderBody'

/**
 * Bridge from `reminderBody` to the `(tracker) => body` shape that
 * `scheduleTrackerReminders` / `rescheduleAllReminders` expect. Reads the
 * tracker's current entries so the body reflects live progress at schedule
 * time. Kept out of `reminderBody.ts` so that module stays repo-free.
 */
export function makeReminderBodyFor(
  t: TFunction,
  lang: string
): (tracker: Tracker) => string {
  return (tracker) =>
    reminderBody(
      tracker,
      repo.listEntries(tracker.id),
      t,
      lang,
      toISODate(new Date())
    )
}
