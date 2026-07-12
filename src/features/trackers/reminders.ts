/**
 * Pure helpers for the multi-reminder list ("HH:MM" 24h strings, insertion
 * order). `[]` means reminders are off. Cap chosen to stay well under iOS's
 * 64-pending-notification limit (6 times × 7 weekdays = 42 triggers worst
 * case for one tracker).
 */

export const MAX_REMINDERS = 6
export const DEFAULT_REMINDER = '18:00'

/** "HH:MM" → minutes since midnight, or null if malformed. */
function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

function toHHMM(totalMinutes: number): string {
  const m = ((totalMinutes % 1440) + 1440) % 1440
  const h = String(Math.floor(m / 60)).padStart(2, '0')
  const min = String(m % 60).padStart(2, '0')
  return `${h}:${min}`
}

/**
 * The time a tapped "Add reminder" creates: last entry + 1h, wrapping past
 * midnight, bumping a further +1h while that slot is already in the list.
 */
export function nextReminderTime(times: string[]): string {
  const last = times.length ? toMinutes(times[times.length - 1]) : null
  if (last == null) return DEFAULT_REMINDER
  const taken = new Set(times.map(toMinutes))
  let candidate = (last + 60) % 1440
  for (let i = 0; i < 24 && taken.has(candidate); i++) {
    candidate = (candidate + 60) % 1440
  }
  return toHHMM(candidate)
}

/** Trigger-row summary: '' | '18:00' | '18:00 +2'. Off-state text is the caller's job. */
export function reminderSummary(times: string[]): string {
  if (times.length === 0) return ''
  if (times.length === 1) return times[0]
  return `${times[0]} +${times.length - 1}`
}
