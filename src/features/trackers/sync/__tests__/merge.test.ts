import { buildSnapshot, mergeSnapshots } from '../snapshot'
import type {
  Tracker,
  Entry,
  Milestone,
  Tombstone
} from '@features/trackers/types'

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

const NOW = '2026-07-11T12:00:00Z'

const tr = (over: Partial<Tracker>): Tracker => ({ ...baseTracker, ...over })
const en = (over: Partial<Entry>): Entry => ({ ...baseEntry, ...over })
const ms = (over: Partial<Milestone>): Milestone => ({
  id: 'm1',
  trackerId: 't1',
  title: 'Step',
  dueDate: null,
  progress: 0,
  orderIndex: 0,
  updatedAt: null,
  ...over
})
const dead = (
  id: string,
  tableName: Tombstone['tableName'],
  deletedAt: string
): Tombstone => ({ id, tableName, deletedAt })

const snap = (
  trackers: Tracker[] = [],
  entries: Entry[] = [],
  milestones: Milestone[] = [],
  tombstones: Tombstone[] = []
) => buildSnapshot(trackers, entries, milestones, tombstones, NOW)

describe('mergeSnapshots', () => {
  test('cloud empty → keeps local data, restamps exportedAt', () => {
    const merged = mergeSnapshots(snap([baseTracker], [baseEntry]), snap(), NOW)
    expect(merged.trackers).toEqual([baseTracker])
    expect(merged.entries).toEqual([baseEntry])
    expect(merged.exportedAt).toBe(NOW)
  })

  test('local empty (fresh install) → pulls everything from cloud', () => {
    const merged = mergeSnapshots(snap(), snap([baseTracker], [baseEntry]), NOW)
    expect(merged.trackers).toEqual([baseTracker])
    expect(merged.entries).toEqual([baseEntry])
  })

  test('disjoint ids → union', () => {
    const a = tr({ id: 'a' })
    const b = tr({ id: 'b' })
    const merged = mergeSnapshots(snap([a]), snap([b]), NOW)
    expect(merged.trackers.map((t) => t.id).sort()).toEqual(['a', 'b'])
  })

  test('same id → higher updatedAt wins (cloud newer)', () => {
    const mine = tr({ name: 'Old name', updatedAt: '2026-07-01T00:00:00Z' })
    const theirs = tr({ name: 'New name', updatedAt: '2026-07-02T00:00:00Z' })
    const merged = mergeSnapshots(snap([mine]), snap([theirs]), NOW)
    expect(merged.trackers).toEqual([theirs])
  })

  test('same id → higher updatedAt wins (local newer)', () => {
    const mine = tr({ name: 'New name', updatedAt: '2026-07-02T00:00:00Z' })
    const theirs = tr({ name: 'Old name', updatedAt: '2026-07-01T00:00:00Z' })
    const merged = mergeSnapshots(snap([mine]), snap([theirs]), NOW)
    expect(merged.trackers).toEqual([mine])
  })

  test('equal stamps → local wins', () => {
    const mine = tr({ name: 'Mine', updatedAt: '2026-07-01T00:00:00Z' })
    const theirs = tr({ name: 'Theirs', updatedAt: '2026-07-01T00:00:00Z' })
    const merged = mergeSnapshots(snap([mine]), snap([theirs]), NOW)
    expect(merged.trackers).toEqual([mine])
  })

  test('records without updatedAt fall back to createdAt', () => {
    const mine = en({
      note: 'old',
      updatedAt: null,
      createdAt: '2026-07-01T00:00:00Z'
    })
    const theirs = en({ note: 'new', updatedAt: '2026-07-03T00:00:00Z' })
    const merged = mergeSnapshots(snap([], [mine]), snap([], [theirs]), NOW)
    expect(merged.entries).toEqual([theirs])
  })

  test('a tombstoned record never survives, even if edited after deletion', () => {
    const ghost = tr({ id: 'g', updatedAt: '2026-07-05T00:00:00Z' })
    const tomb = dead('g', 'trackers', '2026-07-04T00:00:00Z')
    const merged = mergeSnapshots(snap([ghost]), snap([], [], [], [tomb]), NOW)
    expect(merged.trackers).toEqual([])
    expect(merged.tombstones).toEqual([tomb])
  })

  test('tracker tombstone cascades: its entries and milestones are dropped', () => {
    const tomb = dead('t1', 'trackers', '2026-07-04T00:00:00Z')
    const merged = mergeSnapshots(
      snap([], [], [], [tomb]),
      snap([baseTracker], [baseEntry], [ms({})]),
      NOW
    )
    expect(merged.trackers).toEqual([])
    expect(merged.entries).toEqual([])
    expect(merged.milestones).toEqual([])
  })

  test('entry tombstone kills only that entry', () => {
    const e2 = en({ id: 'e2' })
    const tomb = dead('e1', 'entries', '2026-07-04T00:00:00Z')
    const merged = mergeSnapshots(
      snap([baseTracker], [], [], [tomb]),
      snap([baseTracker], [baseEntry, e2]),
      NOW
    )
    expect(merged.entries).toEqual([e2])
  })

  test('tombstones union by id keeping the latest deletedAt', () => {
    const older = dead('x', 'entries', '2026-07-01T00:00:00Z')
    const newer = dead('x', 'entries', '2026-07-02T00:00:00Z')
    const other = dead('y', 'trackers', '2026-07-03T00:00:00Z')
    const merged = mergeSnapshots(
      snap([], [], [], [older, other]),
      snap([], [], [], [newer]),
      NOW
    )
    expect(
      [...merged.tombstones].sort((a, b) => a.id.localeCompare(b.id))
    ).toEqual([newer, other])
  })
})
