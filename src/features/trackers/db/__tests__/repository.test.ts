import {
  rowToTracker,
  trackerToRow,
  entryToRow,
  rowToEntry,
  milestoneToRow,
  rowToMilestone,
  tombstoneToRow,
  rowToTombstone
} from '../repository'
import type {
  Tracker,
  Entry,
  Milestone,
  Tombstone
} from '@features/trackers/types'

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
  reminderTimes: [],
  createdAt: '2026-01-01T00:00:00Z',
  goalNote: 'Build an emergency fund',
  averageWindow: null,
  rollingDays: null,
  doneRule: null,
  progressBasis: null,
  updatedAt: null,
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
      reminderTimes: [],
      createdAt: '2026-06-01T00:00:00Z',
      goalNote: null,
      averageWindow: null,
      rollingDays: null,
      doneRule: null,
      progressBasis: null,
      updatedAt: null,
      archived: false
    }
    const back = rowToTracker(trackerToRow(habit))
    expect(back).toEqual(habit)
  })

  const avgTracker: Tracker = {
    ...tracker,
    type: 'average',
    averageWindow: 'rolling',
    rollingDays: 14,
    doneRule: 'when_goal_met',
    progressBasis: 'today_total'
  }

  test('trackerToRow maps the average Strides fields to snake_case columns', () => {
    const row = trackerToRow(avgTracker)
    expect(row.average_window).toBe('rolling')
    expect(row.rolling_days).toBe(14)
    expect(row.done_rule).toBe('when_goal_met')
    expect(row.progress_basis).toBe('today_total')
  })

  test('rowToTracker round-trips the average Strides fields', () => {
    expect(rowToTracker(trackerToRow(avgTracker))).toEqual(avgTracker)
  })

  test('rowToTracker defaults missing average fields to null (old rows)', () => {
    const row = trackerToRow(tracker)
    delete row.average_window
    delete row.rolling_days
    delete row.done_rule
    delete row.progress_basis
    const back = rowToTracker(row)
    expect(back.averageWindow).toBeNull()
    expect(back.rollingDays).toBeNull()
    expect(back.doneRule).toBeNull()
    expect(back.progressBasis).toBeNull()
  })

  test('trackerToRow serializes reminderTimes as JSON, empty as NULL', () => {
    const row = trackerToRow({ ...tracker, reminderTimes: ['08:00', '18:00'] })
    expect(row.reminder_times).toBe('["08:00","18:00"]')
    expect(trackerToRow(tracker).reminder_times).toBeNull()
  })

  test('rowToTracker round-trips reminderTimes and defaults missing to []', () => {
    const withTimes = { ...tracker, reminderTimes: ['08:00'] }
    expect(rowToTracker(trackerToRow(withTimes))).toEqual(withTimes)
    const row = trackerToRow(tracker)
    delete row.reminder_times
    expect(rowToTracker(row).reminderTimes).toEqual([])
  })

  test('trackerToRow tolerates a legacy tracker missing reminderTimes (old v1 snapshot)', () => {
    const legacy = { ...tracker, reminderTimes: undefined } as unknown as Tracker
    expect(trackerToRow(legacy).reminder_times).toBeNull()
  })
})

describe('entry row mapping', () => {
  const entry: Entry = {
    id: 'e1',
    trackerId: 'h1',
    date: '2026-06-18',
    value: 1,
    note: 'felt great',
    createdAt: '2026-06-18T09:59:00Z',
    updatedAt: null
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

describe('updated_at mapping (sync LWW stamp)', () => {
  test('trackerToRow maps updatedAt to updated_at and back', () => {
    const t = { ...tracker, updatedAt: '2026-07-01T10:00:00Z' }
    const row = trackerToRow(t)
    expect(row.updated_at).toBe('2026-07-01T10:00:00Z')
    expect(rowToTracker(row)).toEqual(t)
  })

  test('rowToTracker defaults missing updated_at to null (old rows)', () => {
    const row = trackerToRow(tracker)
    delete row.updated_at
    expect(rowToTracker(row).updatedAt).toBeNull()
  })

  test('entry round-trips updatedAt', () => {
    const e: Entry = {
      id: 'e9',
      trackerId: 't1',
      date: '2026-07-01',
      value: 3,
      note: null,
      createdAt: '2026-07-01T08:00:00Z',
      updatedAt: '2026-07-02T08:00:00Z'
    }
    expect(rowToEntry(entryToRow(e))).toEqual(e)
  })
})

describe('milestone row mapping', () => {
  const milestone: Milestone = {
    id: 'm1',
    trackerId: 't1',
    title: 'Chapter 1',
    dueDate: '2026-08-01',
    progress: 0.5,
    orderIndex: 0,
    updatedAt: '2026-07-01T10:00:00Z'
  }

  test('milestoneToRow maps to snake_case columns', () => {
    const row = milestoneToRow(milestone)
    expect(row.tracker_id).toBe('t1')
    expect(row.due_date).toBe('2026-08-01')
    expect(row.order_index).toBe(0)
    expect(row.updated_at).toBe('2026-07-01T10:00:00Z')
  })

  test('rowToMilestone round-trips', () => {
    expect(rowToMilestone(milestoneToRow(milestone))).toEqual(milestone)
  })

  test('rowToMilestone defaults missing due_date/updated_at to null', () => {
    const row = milestoneToRow(milestone)
    delete row.due_date
    delete row.updated_at
    const back = rowToMilestone(row)
    expect(back.dueDate).toBeNull()
    expect(back.updatedAt).toBeNull()
  })
})

describe('tombstone row mapping', () => {
  const tb: Tombstone = {
    id: 't1',
    tableName: 'trackers',
    deletedAt: '2026-07-01T10:00:00Z'
  }

  test('tombstoneToRow maps to snake_case columns', () => {
    expect(tombstoneToRow(tb)).toEqual({
      id: 't1',
      table_name: 'trackers',
      deleted_at: '2026-07-01T10:00:00Z'
    })
  })

  test('rowToTombstone round-trips', () => {
    expect(rowToTombstone(tombstoneToRow(tb))).toEqual(tb)
  })
})
