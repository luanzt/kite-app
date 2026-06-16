import { rowToTracker, trackerToRow } from '../repository'
import type { Tracker } from '@features/trackers/types'

const tracker: Tracker = {
  id: 't1',
  name: 'Save',
  type: 'target',
  icon: 'piggy',
  color: 'green',
  unit: '$',
  direction: null,
  targetValue: 2000,
  startValue: 0,
  accumulation: 'sum',
  startDate: '2026-01-01',
  deadline: '2026-12-31',
  period: null,
  repeatDays: [1, 3, 5],
  routine: null,
  reminderTime: null,
  createdAt: '2026-01-01T00:00:00Z',
  archived: false
}

describe('tracker row mapping', () => {
  test('trackerToRow serializes repeatDays as JSON and archived as 0/1', () => {
    const row = trackerToRow(tracker)
    expect(row.repeat_days).toBe('[1,3,5]')
    expect(row.archived).toBe(0)
    expect(row.target_value).toBe(2000)
  })

  test('rowToTracker round-trips', () => {
    const row = trackerToRow(tracker)
    const back = rowToTracker(row)
    expect(back).toEqual(tracker)
  })

  test('rowToTracker handles null repeat_days', () => {
    const row = { ...trackerToRow(tracker), repeat_days: null }
    expect(rowToTracker(row).repeatDays).toBeNull()
  })

  test('round-trips a tracker with all nullable fields null (e.g. a habit)', () => {
    const habit: Tracker = {
      id: 'h1',
      name: 'Meditate',
      type: 'habit',
      icon: 'lotus',
      color: 'blue',
      unit: null,
      direction: 'good',
      targetValue: null,
      startValue: null,
      accumulation: null,
      startDate: '2026-06-01',
      deadline: null,
      period: 'daily',
      repeatDays: null,
      routine: null,
      reminderTime: null,
      createdAt: '2026-06-01T00:00:00Z',
      archived: false
    }
    const back = rowToTracker(trackerToRow(habit))
    expect(back).toEqual(habit)
  })
})
