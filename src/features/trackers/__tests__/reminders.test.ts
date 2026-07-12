import {
  nextReminderTime,
  reminderSummary,
  MAX_REMINDERS,
  DEFAULT_REMINDER
} from '../reminders'

describe('nextReminderTime', () => {
  it('returns the default time for an empty list', () => {
    expect(nextReminderTime([])).toBe('18:00')
  })

  it('adds one hour to the last reminder', () => {
    expect(nextReminderTime(['18:00'])).toBe('19:00')
  })

  it('preserves minutes', () => {
    expect(nextReminderTime(['08:30'])).toBe('09:30')
  })

  it('wraps past midnight', () => {
    expect(nextReminderTime(['23:30'])).toBe('00:30')
  })

  it('uses the LAST entry, not the latest time of day', () => {
    expect(nextReminderTime(['20:00', '08:00'])).toBe('09:00')
  })

  it('bumps a further hour while the slot is already taken', () => {
    // last = 18:00 → 19:00 is taken → 20:00
    expect(nextReminderTime(['19:00', '18:00'])).toBe('20:00')
  })

  it('falls back to the default when the last entry is malformed', () => {
    expect(nextReminderTime(['garbage'])).toBe('18:00')
  })
})

describe('reminderSummary', () => {
  it('is empty for no reminders', () => {
    expect(reminderSummary([])).toBe('')
  })

  it('shows a single time as-is', () => {
    expect(reminderSummary(['18:00'])).toBe('18:00')
  })

  it('shows "first +N" for multiple times', () => {
    expect(reminderSummary(['18:00', '19:00', '20:00'])).toBe('18:00 +2')
  })
})

describe('constants', () => {
  it('caps at 6 and defaults to 18:00', () => {
    expect(MAX_REMINDERS).toBe(6)
    expect(DEFAULT_REMINDER).toBe('18:00')
  })
})
