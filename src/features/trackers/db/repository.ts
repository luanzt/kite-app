import { getDb } from './schema'
import type {
  Tracker,
  Entry,
  Milestone,
  Tombstone
} from '@features/trackers/types'

type Row = Record<string, any>

export function trackerToRow(t: Tracker): Row {
  return {
    id: t.id,
    name: t.name,
    type: t.type,
    icon: t.icon,
    color: t.color,
    unit: t.unit,
    direction: t.direction,
    target_value: t.targetValue,
    start_value: t.startValue,
    accumulation: t.accumulation,
    start_date: t.startDate,
    deadline: t.deadline,
    period: t.period,
    repeat_days: t.repeatDays ? JSON.stringify(t.repeatDays) : null,
    routine: t.routine,
    reminder_time: t.reminderTime,
    goal_note: t.goalNote,
    created_at: t.createdAt,
    archived: t.archived ? 1 : 0,
    average_window: t.averageWindow,
    rolling_days: t.rollingDays,
    done_rule: t.doneRule,
    progress_basis: t.progressBasis,
    updated_at: t.updatedAt ?? null
  }
}

export function rowToTracker(r: Row): Tracker {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    icon: r.icon,
    color: r.color,
    unit: r.unit ?? null,
    direction: r.direction ?? null,
    targetValue: r.target_value ?? null,
    startValue: r.start_value ?? null,
    accumulation: r.accumulation ?? null,
    startDate: r.start_date,
    deadline: r.deadline ?? null,
    period: r.period ?? null,
    repeatDays: r.repeat_days ? JSON.parse(r.repeat_days) : null,
    routine: r.routine ?? null,
    reminderTime: r.reminder_time ?? null,
    goalNote: r.goal_note ?? null,
    createdAt: r.created_at,
    archived: r.archived === 1,
    averageWindow: r.average_window ?? null,
    rollingDays: r.rolling_days ?? null,
    doneRule: r.done_rule ?? null,
    progressBasis: r.progress_basis ?? null,
    updatedAt: r.updated_at ?? null
  }
}

const COLS =
  'id,name,type,icon,color,unit,direction,target_value,start_value,accumulation,start_date,deadline,period,repeat_days,routine,reminder_time,goal_note,created_at,archived,average_window,rolling_days,done_rule,progress_basis,updated_at'
const PLACEHOLDERS = COLS.split(',')
  .map(() => '?')
  .join(',')

// NOTE: This op-sqlite version exposes the SYNCHRONOUS query method as
// `executeSync` (its `execute` is async and returns a Promise), and query
// results expose rows directly as `res.rows` (an array) — there is no
// `rows._array` wrapper. The functions below use `executeSync` + `res.rows`
// accordingly. See the Phase 3 report for details.

/** Verbatim row write — PRESERVES updatedAt. Used by sync apply. */
export function writeTrackerRow(t: Tracker): void {
  const r = trackerToRow(t)
  getDb().executeSync(
    `INSERT OR REPLACE INTO trackers (${COLS}) VALUES (${PLACEHOLDERS})`,
    COLS.split(',').map((c) => r[c])
  )
}

export function insertTracker(t: Tracker): void {
  // Stamp updatedAt so iCloud sync can last-write-wins merge this record.
  writeTrackerRow({ ...t, updatedAt: new Date().toISOString() })
}

export function listTrackers(): Tracker[] {
  const res = getDb().executeSync(
    `SELECT ${COLS} FROM trackers WHERE archived = 0 ORDER BY created_at DESC`
  )
  return (res.rows ?? []).map(rowToTracker)
}

export function getTracker(id: string): Tracker | null {
  const res = getDb().executeSync(`SELECT ${COLS} FROM trackers WHERE id = ?`, [
    id
  ])
  const row = res.rows?.[0]
  return row ? rowToTracker(row) : null
}

export function entryToRow(e: Entry): Row {
  return {
    id: e.id,
    tracker_id: e.trackerId,
    date: e.date,
    value: e.value,
    note: e.note,
    created_at: e.createdAt,
    updated_at: e.updatedAt ?? null
  }
}

export function rowToEntry(r: Row): Entry {
  return {
    id: r.id,
    trackerId: r.tracker_id,
    date: r.date,
    value: r.value,
    note: r.note ?? null,
    createdAt: r.created_at ?? '', // older rows predate the column → empty string
    updatedAt: r.updated_at ?? null
  }
}

const ENTRY_COLS = 'id,tracker_id,date,value,note,created_at,updated_at'
const ENTRY_PLACEHOLDERS = ENTRY_COLS.split(',')
  .map(() => '?')
  .join(',')

/** Verbatim row write — PRESERVES updatedAt. Used by sync apply. */
export function writeEntryRow(e: Entry): void {
  const r = entryToRow(e)
  getDb().executeSync(
    `INSERT OR REPLACE INTO entries (${ENTRY_COLS}) VALUES (${ENTRY_PLACEHOLDERS})`,
    ENTRY_COLS.split(',').map((c) => r[c])
  )
}

export function insertEntry(e: Entry): void {
  writeEntryRow({ ...e, updatedAt: new Date().toISOString() })
}

export function listEntries(trackerId: string): Entry[] {
  const res = getDb().executeSync(
    `SELECT ${ENTRY_COLS} FROM entries WHERE tracker_id = ? ORDER BY date ASC`,
    [trackerId]
  )
  return (res.rows ?? []).map(rowToEntry)
}

export function listEntriesForDate(date: string): Entry[] {
  const res = getDb().executeSync(
    `SELECT ${ENTRY_COLS} FROM entries WHERE date = ?`,
    [date.slice(0, 10)]
  )
  return (res.rows ?? []).map(rowToEntry)
}

const MILESTONE_COLS =
  'id,tracker_id,title,due_date,progress,order_index,updated_at'

export function milestoneToRow(m: Milestone): Row {
  return {
    id: m.id,
    tracker_id: m.trackerId,
    title: m.title,
    due_date: m.dueDate,
    progress: m.progress,
    order_index: m.orderIndex,
    updated_at: m.updatedAt ?? null
  }
}

export function rowToMilestone(r: Row): Milestone {
  return {
    id: r.id,
    trackerId: r.tracker_id,
    title: r.title,
    dueDate: r.due_date ?? null,
    progress: r.progress,
    orderIndex: r.order_index,
    updatedAt: r.updated_at ?? null
  }
}

export function listMilestones(trackerId: string): Milestone[] {
  const res = getDb().executeSync(
    `SELECT ${MILESTONE_COLS} FROM milestones WHERE tracker_id = ? ORDER BY order_index ASC`,
    [trackerId]
  )
  return (res.rows ?? []).map(rowToMilestone)
}

/** Verbatim row write — PRESERVES updatedAt. Used by sync apply. */
export function writeMilestoneRow(m: Milestone): void {
  const r = milestoneToRow(m)
  getDb().executeSync(
    `INSERT OR REPLACE INTO milestones (${MILESTONE_COLS}) VALUES (?,?,?,?,?,?,?)`,
    MILESTONE_COLS.split(',').map((c) => r[c])
  )
}

export function upsertMilestone(m: Milestone): void {
  writeMilestoneRow({ ...m, updatedAt: new Date().toISOString() })
}

export function tombstoneToRow(tb: Tombstone): Row {
  return { id: tb.id, table_name: tb.tableName, deleted_at: tb.deletedAt }
}

export function rowToTombstone(r: Row): Tombstone {
  return { id: r.id, tableName: r.table_name, deletedAt: r.deleted_at }
}

export function insertTombstone(tb: Tombstone): void {
  const r = tombstoneToRow(tb)
  getDb().executeSync(
    `INSERT OR REPLACE INTO tombstones (id,table_name,deleted_at) VALUES (?,?,?)`,
    [r.id, r.table_name, r.deleted_at]
  )
}

export function listTombstones(): Tombstone[] {
  const res = getDb().executeSync(
    `SELECT id,table_name,deleted_at FROM tombstones`
  )
  return (res.rows ?? []).map(rowToTombstone)
}

/** Sync readers: EVERYTHING, including archived trackers. */
export function listAllTrackers(): Tracker[] {
  const res = getDb().executeSync(`SELECT ${COLS} FROM trackers`)
  return (res.rows ?? []).map(rowToTracker)
}

export function listAllEntries(): Entry[] {
  const res = getDb().executeSync(`SELECT ${ENTRY_COLS} FROM entries`)
  return (res.rows ?? []).map(rowToEntry)
}

export function listAllMilestones(): Milestone[] {
  const res = getDb().executeSync(`SELECT ${MILESTONE_COLS} FROM milestones`)
  return (res.rows ?? []).map(rowToMilestone)
}

export function deleteTracker(id: string): void {
  const db = getDb()
  db.executeSync(`DELETE FROM entries WHERE tracker_id = ?`, [id])
  db.executeSync(`DELETE FROM milestones WHERE tracker_id = ?`, [id])
  db.executeSync(`DELETE FROM trackers WHERE id = ?`, [id])
  // ONE tombstone for the tracker: the sync merge cascade drops its
  // entries/milestones on other devices (no per-row tombstones needed).
  insertTombstone({
    id,
    tableName: 'trackers',
    deletedAt: new Date().toISOString()
  })
}

export function deleteEntry(id: string): void {
  getDb().executeSync(`DELETE FROM entries WHERE id = ?`, [id])
  insertTombstone({
    id,
    tableName: 'entries',
    deletedAt: new Date().toISOString()
  })
}
