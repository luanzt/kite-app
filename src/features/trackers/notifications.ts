import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  RepeatFrequency,
  TriggerType,
  type TimestampTrigger
} from '@notifee/react-native'
import type { Tracker } from '@features/trackers/types'

/**
 * On-device reminder scheduling via notifee. The app is fully offline, so
 * reminders are local weekly-repeating trigger notifications — one per selected
 * `repeatDay` at the tracker's `reminderTime`. All functions swallow errors so a
 * denied permission or unavailable native module never crashes a save/delete.
 */

const CHANNEL_ID = 'reminders'
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

/** Stable per-tracker, per-weekday notification id. */
function reminderId(trackerId: string, day: number): string {
  return `rem-${trackerId}-${day}`
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

/** Initialise notifications at app launch: request permission + create channel. */
export async function initNotifications(): Promise<void> {
  await requestNotificationPermission()
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

/** Cancel every reminder previously scheduled for this tracker. */
export async function cancelTrackerReminders(trackerId: string): Promise<void> {
  try {
    await Promise.all(
      ALL_DAYS.map((day) =>
        notifee.cancelTriggerNotification(reminderId(trackerId, day))
      )
    )
  } catch {
    // ignore
  }
}

/**
 * (Re)schedule reminders for a tracker. Cancels any existing reminders first,
 * then — if the tracker has a `reminderTime` — schedules one weekly-repeating
 * notification per due weekday. Habits only.
 */
export async function scheduleTrackerReminders(
  tracker: Tracker
): Promise<void> {
  await cancelTrackerReminders(tracker.id)

  if (tracker.type !== 'habit' || !tracker.reminderTime) return
  const parsed = parseTime(tracker.reminderTime)
  if (!parsed) return
  const [hours, minutes] = parsed

  const days =
    tracker.repeatDays && tracker.repeatDays.length > 0
      ? tracker.repeatDays
      : ALL_DAYS

  await ensureReminderChannel()
  try {
    await Promise.all(
      days.map((day) => {
        const trigger: TimestampTrigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: nextOccurrence(day, hours, minutes).getTime(),
          repeatFrequency: RepeatFrequency.WEEKLY
        }
        return notifee.createTriggerNotification(
          {
            id: reminderId(tracker.id, day),
            title: tracker.name,
            body: 'Time to keep your streak going',
            android: { channelId: CHANNEL_ID, pressAction: { id: 'default' } }
          },
          trigger
        )
      })
    )
  } catch {
    // ignore — scheduling is best-effort
  }
}
