import { countPending } from '../snapshot'
import type { Tracker, Entry, Milestone } from '@features/trackers/types'

// Local copies of the Task 3 fixtures (test files must not import each other).
const baseTracker: Tracker = {
  id: 't1',
  name: 'Read',
  type: 'habit',
  icon: 'book',
  color: 'blue',
  unit: null,
  direction: 'good',
  targetValue: null,
  startValue: null,
  accumulation: null,
  startDate: '2026-01-01',
  deadline: null,
  period: 'daily',
  repeatDays: null,
  routine: null,
  reminderTime: null,
  goalNote: null,
  averageWindow: null,
  rollingDays: null,
  doneRule: null,
  progressBasis: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
  archived: false
}

const baseEntry: Entry = {
  id: 'e1',
  trackerId: 't1',
  date: '2026-07-01',
  value: 1,
  note: null,
  createdAt: '2026-07-01T08:00:00Z',
  updatedAt: null
}

const milestone: Milestone = {
  id: 'm1',
  trackerId: 't1',
  title: 'Step',
  dueDate: null,
  progress: 0,
  orderIndex: 0,
  updatedAt: null
}

describe('countPending', () => {
  test('never synced (null) → every row and tombstone is pending', () => {
    const n = countPending(
      {
        trackers: [baseTracker],
        entries: [baseEntry, { ...baseEntry, id: 'e2' }],
        milestones: [milestone],
        tombstones: [
          { id: 'x', tableName: 'entries', deletedAt: '2026-07-01T00:00:00Z' }
        ]
      },
      null
    )
    expect(n).toBe(5)
  })

  test('counts only rows stamped after lastSyncedAt', () => {
    const n = countPending(
      {
        trackers: [
          { ...baseTracker, updatedAt: '2026-07-10T00:00:00Z' }, // after → pending
          { ...baseTracker, id: 't2', updatedAt: '2026-07-01T00:00:00Z' } // before
        ],
        entries: [
          // no updatedAt → falls back to createdAt (after) → pending
          { ...baseEntry, createdAt: '2026-07-10T08:00:00Z', updatedAt: null }
        ],
        milestones: [milestone], // no stamps at all → NOT pending
        tombstones: []
      },
      '2026-07-05T00:00:00Z'
    )
    expect(n).toBe(2)
  })

  test('tombstones newer than lastSyncedAt are pending', () => {
    const n = countPending(
      {
        trackers: [],
        entries: [],
        milestones: [],
        tombstones: [
          { id: 'a', tableName: 'entries', deletedAt: '2026-07-10T00:00:00Z' },
          { id: 'b', tableName: 'trackers', deletedAt: '2026-07-01T00:00:00Z' }
        ]
      },
      '2026-07-05T00:00:00Z'
    )
    expect(n).toBe(1)
  })

  test('fully synced → zero', () => {
    const n = countPending(
      {
        trackers: [{ ...baseTracker, updatedAt: '2026-07-01T00:00:00Z' }],
        entries: [],
        milestones: [],
        tombstones: []
      },
      '2026-07-05T00:00:00Z'
    )
    expect(n).toBe(0)
  })
})
