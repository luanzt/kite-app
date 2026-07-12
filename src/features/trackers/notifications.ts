import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  RepeatFrequency,
  TriggerType,
  type TimestampTrigger
} from '@notifee/react-native'
import type { Tracker } from '@features/trackers/types'
import * as repo from '@features/trackers/db/repository'

/**
 * On-device reminder scheduling via notifee. The app is fully offline, so
 * reminders are local weekly-repeating trigger notifications — one per
 * selected `repeatDay` at each of the tracker's `reminderTimes`. All functions
 * swallow errors so a denied permission or unavailable native module never
 * crashes a save/delete.
 */

const CHANNEL_ID = 'reminders'
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

/** Stable per-tracker, per-weekday, per-time notification id. */
function reminderId(trackerId: string, day: number, index: number): string {
  return `rem-${trackerId}-${day}-${index}`
}

/** Ask for notification permission. Returns true if granted/provisional. */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const settings = await notifee.requestPermission()
    return (
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
    )
  } catch {
    return false
  }
}

/** Create the Android notification channel (no-op on iOS). Safe to call repeatedly. */
export async function ensureReminderChannel(): Promise<void> {
  try {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Reminders',
      importance: AndroidImportance.HIGH
    })
  } catch {
    // ignore — channel creation is best-effort
  }
}

/** Initialise notifications at app launch: create the Android channel only.
 *  First-launch permission is requested by the launch orchestrator (App.tsx),
 *  not here, so the request happens exactly once and can set the preference. */
export async function initNotifications(): Promise<void> {
  await ensureReminderChannel()
}

/** Next local Date for `weekday` (0=Sun..6=Sat) at HH:MM, strictly in the future. */
function nextOccurrence(weekday: number, hours: number, minutes: number): Date {
  const now = new Date()
  const d = new Date(now)
  d.setHours(hours, minutes, 0, 0)
  let delta = (weekday - now.getDay() + 7) % 7
  if (delta === 0 && d.getTime() <= now.getTime()) delta = 7
  d.setDate(d.getDate() + delta)
  return d
}

/** Parse "HH:MM" into [hours, minutes], or null if malformed. */
function parseTime(time: string): [number, number] | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return [h, min]
}

/** Cancel every reminder previously scheduled for this tracker. Looks up the
 *  live trigger ids so it never depends on how many times/days the previous
 *  version of the tracker had. */
export async function cancelTrackerReminders(trackerId: string): Promise<void> {
  try {
    const ids = await notifee.getTriggerNotificationIds()
    const mine = ids.filter((id) => id.startsWith(`rem-${trackerId}-`))
    await Promise.all(mine.map((id) => notifee.cancelTriggerNotification(id)))
  } catch {
    // ignore
  }
}

/**
 * (Re)schedule reminders for a tracker. Cancels any existing reminders first,
 * then schedules one weekly-repeating notification per (reminder time × due
 * weekday).
 *
 * Habits, targets and averages are reminded on their `repeatDays` (or every
 * day if none — their forms let the user pick weekdays). Projects are not
 * reminded.
 *
 * `body` is the (already-translated) notification body; callers pass the i18n
 * string so this module stays free of the i18n runtime. Falls back to a plain
 * English default if omitted.
 */
export async function scheduleTrackerReminders(
  tracker: Tracker,
  body = 'Time to keep going'
): Promise<void> {
  await cancelTrackerReminders(tracker.id)

  const reminds =
    tracker.type === 'habit' ||
    tracker.type === 'target' ||
    tracker.type === 'average'
  if (!reminds || tracker.reminderTimes.length === 0) return

  const days =
    tracker.repeatDays && tracker.repeatDays.length > 0
      ? tracker.repeatDays
      : ALL_DAYS

  await ensureReminderChannel()
  try {
    await Promise.all(
      tracker.reminderTimes.flatMap((time, index) => {
        const parsed = parseTime(time)
        if (!parsed) return [] // skip malformed times individually
        const [hours, minutes] = parsed
        return days.map((day) => {
          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: nextOccurrence(day, hours, minutes).getTime(),
            repeatFrequency: RepeatFrequency.WEEKLY
          }
          return notifee.createTriggerNotification(
            {
              id: reminderId(tracker.id, day, index),
              title: tracker.name,
              body,
              android: {
                channelId: CHANNEL_ID,
                pressAction: { id: 'default' }
              },
              // Show the reminder even when the app is open (foreground) on iOS.
              ios: {
                foregroundPresentationOptions: {
                  banner: true,
                  list: true,
                  sound: true
                }
              }
            },
            trigger
          )
        })
      })
    )
  } catch {
    // ignore — scheduling is best-effort
  }
}

/** Current OS notification permission — true if granted (or provisional). */
export async function getPermissionStatus(): Promise<boolean> {
  try {
    const settings = await notifee.getNotificationSettings()
    return (
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
    )
  } catch {
    return false
  }
}

/** Open the OS notification-settings page for this app. */
export async function openSystemNotificationSettings(): Promise<void> {
  try {
    await notifee.openNotificationSettings()
  } catch {
    // ignore — best-effort
  }
}

/**
 * Cancel EVERY scheduled trigger notification, including orphans whose tracker
 * no longer exists locally — after a sync applies a deletion from another
 * device, per-tracker cancellation can't reach those ids anymore.
 */
export async function cancelAllScheduledReminders(): Promise<void> {
  try {
    await notifee.cancelTriggerNotifications()
  } catch {
    // ignore — best-effort
  }
}

/** Cancel reminders for every tracker (used when the preference is turned off). */
export async function cancelAllReminders(): Promise<void> {
  try {
    const trackers = repo.listTrackers()
    await Promise.all(trackers.map((t) => cancelTrackerReminders(t.id)))
  } catch {
    // ignore — best-effort
  }
}

/** (Re)schedule reminders for every habit/target/average that has reminderTimes.
 *  `bodyFor` supplies the already-translated body per tracker, so this module
 *  stays free of the i18n runtime. */
export async function rescheduleAllReminders(
  bodyFor: (t: Tracker) => string
): Promise<void> {
  try {
    const trackers = repo.listTrackers()
    await Promise.all(
      trackers.map((t) => scheduleTrackerReminders(t, bodyFor(t)))
    )
  } catch {
    // ignore — best-effort
  }
}
