import {
  rowToTracker,
  trackerToRow,
  entryToRow,
  rowToEntry
} from '../repository'
import type { Tracker, Entry } from '@features/trackers/types'

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
  goalNote: 'Build an emergency fund',
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

  test('trackerToRow maps goalNote to goal_note column', () => {
    expect(trackerToRow(tracker).goal_note).toBe('Build an emergency fund')
  })

  test('rowToTracker handles null goal_note', () => {
    const row = { ...trackerToRow(tracker), goal_note: null }
    expect(rowToTracker(row).goalNote).toBeNull()
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
      goalNote: null,
      archived: false
    }
    const back = rowToTracker(trackerToRow(habit))
    expect(back).toEqual(habit)
  })
})

describe('entry row mapping', () => {
  const entry: Entry = {
    id: 'e1',
    trackerId: 'h1',
    date: '2026-06-18',
    value: 1,
    note: 'felt great',
    createdAt: '2026-06-18T09:59:00Z'
  }

  test('entryToRow maps createdAt to created_at column', () => {
    const row = entryToRow(entry)
    expect(row.created_at).toBe('2026-06-18T09:59:00Z')
    expect(row.tracker_id).toBe('h1')
    expect(row.value).toBe(1)
  })

  test('rowToEntry round-trips', () => {
    expect(rowToEntry(entryToRow(entry))).toEqual(entry)
  })

  test('rowToEntry handles null note and missing created_at', () => {
    const row = { ...entryToRow(entry), note: null, created_at: null }
    const back = rowToEntry(row)
    expect(back.note).toBeNull()
    expect(back.createdAt).toBe('') // missing timestamp → empty string, not null
  })
})
