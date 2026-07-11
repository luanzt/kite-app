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
