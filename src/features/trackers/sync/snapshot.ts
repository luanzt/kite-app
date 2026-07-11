import type {
  Tracker,
  Entry,
  Milestone,
  Tombstone
} from '@features/trackers/types'

/**
 * The iCloud backup format. One JSON file (`/kite-backup.json`) holds the
 * whole database in domain (camelCase) shape — decoupled from SQL columns.
 * Bump SNAPSHOT_VERSION only on breaking shape changes; older apps refuse
 * newer snapshots (never write a downgraded file).
 */
export const SNAPSHOT_VERSION = 1

export type Snapshot = {
  schemaVersion: number
  exportedAt: string // ISO datetime
  trackers: Tracker[]
  entries: Entry[]
  milestones: Milestone[]
  tombstones: Tombstone[]
}

export function buildSnapshot(
  trackers: Tracker[],
  entries: Entry[],
  milestones: Milestone[],
  tombstones: Tombstone[],
  now: string = new Date().toISOString()
): Snapshot {
  return {
    schemaVersion: SNAPSHOT_VERSION,
    exportedAt: now,
    trackers,
    entries,
    milestones,
    tombstones
  }
}

export function emptySnapshot(
  now: string = new Date().toISOString()
): Snapshot {
  return buildSnapshot([], [], [], [], now)
}

export class SnapshotError extends Error {
  readonly code: 'malformed' | 'newer_version'

  constructor(code: 'malformed' | 'newer_version') {
    super(
      code === 'newer_version'
        ? 'Snapshot was written by a newer app version'
        : 'Malformed snapshot'
    )
    this.name = 'SnapshotError'
    this.code = code
  }
}

/** Parse + validate a cloud snapshot. Throws SnapshotError, never returns junk. */
export function parseSnapshot(json: string): Snapshot {
  let obj: unknown
  try {
    obj = JSON.parse(json)
  } catch {
    throw new SnapshotError('malformed')
  }
  if (typeof obj !== 'object' || obj === null)
    throw new SnapshotError('malformed')
  const s = obj as Record<string, unknown>
  if (typeof s.schemaVersion !== 'number') throw new SnapshotError('malformed')
  if (s.schemaVersion > SNAPSHOT_VERSION)
    throw new SnapshotError('newer_version')
  for (const key of ['trackers', 'entries', 'milestones', 'tombstones']) {
    if (!Array.isArray(s[key])) throw new SnapshotError('malformed')
  }
  return {
    schemaVersion: s.schemaVersion,
    exportedAt: typeof s.exportedAt === 'string' ? s.exportedAt : '',
    trackers: s.trackers as Tracker[],
    entries: s.entries as Entry[],
    milestones: s.milestones as Milestone[],
    tombstones: s.tombstones as Tombstone[]
  }
}

/** LWW stamp: prefer updatedAt, fall back to createdAt (pre-sync rows), else ''. */
function stampOf(r: { updatedAt?: string | null; createdAt?: string }): string {
  return r.updatedAt ?? r.createdAt ?? ''
}

/** Union tombstones by id, keeping the latest deletedAt for duplicates. */
function mergeTombstones(a: Tombstone[], b: Tombstone[]): Tombstone[] {
  const byId = new Map<string, Tombstone>()
  for (const tb of [...a, ...b]) {
    const prev = byId.get(tb.id)
    if (!prev || tb.deletedAt > prev.deletedAt) byId.set(tb.id, tb)
  }
  return [...byId.values()]
}

/**
 * Union two row arrays by id. When both sides have a record the higher stamp
 * wins; on a tie the LOCAL copy wins (a device keeps its own bytes). Ids in
 * `dead` are dropped — a tombstone always beats a live record.
 */
function mergeRows<
  T extends { id: string; updatedAt?: string | null; createdAt?: string }
>(local: T[], cloud: T[], dead: Set<string>): T[] {
  const byId = new Map<string, T>()
  for (const row of cloud) byId.set(row.id, row)
  for (const row of local) {
    const other = byId.get(row.id)
    if (!other || stampOf(row) >= stampOf(other)) byId.set(row.id, row)
  }
  return [...byId.values()].filter((r) => !dead.has(r.id))
}

/**
 * Merge the local DB with the cloud backup. Pure — the caller applies the
 * result to SQLite and writes it back to iCloud. ISO-8601 strings compare
 * correctly as plain strings, so no Date parsing is needed.
 */
export function mergeSnapshots(
  local: Snapshot,
  cloud: Snapshot,
  now: string = new Date().toISOString()
): Snapshot {
  const tombstones = mergeTombstones(local.tombstones, cloud.tombstones)
  const deadTrackers = new Set<string>()
  const deadEntries = new Set<string>()
  const deadMilestones = new Set<string>()
  for (const tb of tombstones) {
    if (tb.tableName === 'trackers') deadTrackers.add(tb.id)
    else if (tb.tableName === 'entries') deadEntries.add(tb.id)
    else deadMilestones.add(tb.id)
  }

  const trackers = mergeRows(local.trackers, cloud.trackers, deadTrackers)
  // Cascade: children of a tombstoned tracker die with it (they carry no
  // tombstone of their own — deleteTracker writes a single tracker tombstone).
  const orphan = (r: { trackerId: string }) => deadTrackers.has(r.trackerId)
  const entries = mergeRows(local.entries, cloud.entries, deadEntries).filter(
    (e) => !orphan(e)
  )
  const milestones = mergeRows(
    local.milestones,
    cloud.milestones,
    deadMilestones
  ).filter((m) => !orphan(m))

  return buildSnapshot(trackers, entries, milestones, tombstones, now)
}
