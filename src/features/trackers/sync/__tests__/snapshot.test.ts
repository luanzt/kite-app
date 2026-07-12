import {
  SNAPSHOT_VERSION,
  buildSnapshot,
  emptySnapshot,
  parseSnapshot,
  SnapshotError,
  type Snapshot
} from '../snapshot'
import type { Tracker, Entry } from '@features/trackers/types'

// NOTE: fixtures are LOCAL to each test file (Tasks 4 and 5 repeat them).
// Don't export/share them across files in __tests__/ — Jest treats every file
// there as a test suite, so an importable fixtures module would either be
// re-run as a suite or fail with "must contain at least one test".
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
  reminderTimes: [],
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

describe('buildSnapshot / emptySnapshot', () => {
  test('buildSnapshot wraps the arrays with version + exportedAt', () => {
    const s = buildSnapshot(
      [baseTracker],
      [baseEntry],
      [],
      [],
      '2026-07-11T00:00:00Z'
    )
    expect(s.schemaVersion).toBe(SNAPSHOT_VERSION)
    expect(s.exportedAt).toBe('2026-07-11T00:00:00Z')
    expect(s.trackers).toEqual([baseTracker])
    expect(s.entries).toEqual([baseEntry])
    expect(s.milestones).toEqual([])
    expect(s.tombstones).toEqual([])
  })

  test('emptySnapshot has empty arrays and current version', () => {
    const s = emptySnapshot('2026-07-11T00:00:00Z')
    expect(s.schemaVersion).toBe(SNAPSHOT_VERSION)
    expect(s.trackers).toEqual([])
    expect(s.entries).toEqual([])
    expect(s.milestones).toEqual([])
    expect(s.tombstones).toEqual([])
  })
})

describe('parseSnapshot', () => {
  const valid: Snapshot = buildSnapshot(
    [baseTracker],
    [baseEntry],
    [],
    [{ id: 'x', tableName: 'entries', deletedAt: '2026-07-01T00:00:00Z' }],
    '2026-07-11T00:00:00Z'
  )

  test('round-trips a valid snapshot', () => {
    expect(parseSnapshot(JSON.stringify(valid))).toEqual(valid)
  })

  test('throws malformed on invalid JSON', () => {
    expect(() => parseSnapshot('not json {')).toThrow(SnapshotError)
    try {
      parseSnapshot('not json {')
    } catch (e) {
      expect((e as SnapshotError).code).toBe('malformed')
    }
  })

  test('throws malformed when arrays are missing', () => {
    const bad = JSON.stringify({ schemaVersion: 1, trackers: [] })
    try {
      parseSnapshot(bad)
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as SnapshotError).code).toBe('malformed')
    }
  })

  test('throws newer_version when the backup is from a newer app', () => {
    const future = JSON.stringify({
      ...valid,
      schemaVersion: SNAPSHOT_VERSION + 1
    })
    try {
      parseSnapshot(future)
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as SnapshotError).code).toBe('newer_version')
    }
  })
})
