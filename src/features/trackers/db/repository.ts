import { getDb } from './schema'
import type { Tracker, Entry, Milestone } from '@features/trackers/types'

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
    created_at: t.createdAt,
    archived: t.archived ? 1 : 0
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
    createdAt: r.created_at,
    archived: r.archived === 1
  }
}

const COLS =
  'id,name,type,icon,color,unit,direction,target_value,start_value,accumulation,start_date,deadline,period,repeat_days,routine,reminder_time,created_at,archived'
const PLACEHOLDERS = COLS.split(',')
  .map(() => '?')
  .join(',')

// NOTE: This op-sqlite version exposes the SYNCHRONOUS query method as
// `executeSync` (its `execute` is async and returns a Promise), and query
// results expose rows directly as `res.rows` (an array) — there is no
// `rows._array` wrapper. The functions below use `executeSync` + `res.rows`
// accordingly. See the Phase 3 report for details.
export function insertTracker(t: Tracker): void {
  const r = trackerToRow(t)
  getDb().executeSync(
    `INSERT OR REPLACE INTO trackers (${COLS}) VALUES (${PLACEHOLDERS})`,
    COLS.split(',').map((c) => r[c])
  )
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

export function deleteTracker(id: string): void {
  const db = getDb()
  db.executeSync(`DELETE FROM entries WHERE tracker_id = ?`, [id])
  db.executeSync(`DELETE FROM milestones WHERE tracker_id = ?`, [id])
  db.executeSync(`DELETE FROM trackers WHERE id = ?`, [id])
}

export function insertEntry(e: Entry): void {
  getDb().executeSync(
    `INSERT OR REPLACE INTO entries (id,tracker_id,date,value,note) VALUES (?,?,?,?,?)`,
    [e.id, e.trackerId, e.date, e.value, e.note]
  )
}

export function listEntries(trackerId: string): Entry[] {
  const res = getDb().executeSync(
    `SELECT id,tracker_id,date,value,note FROM entries WHERE tracker_id = ? ORDER BY date ASC`,
    [trackerId]
  )
  return (res.rows ?? []).map((r: Row) => ({
    id: r.id,
    trackerId: r.tracker_id,
    date: r.date,
    value: r.value,
    note: r.note ?? null
  }))
}

export function listEntriesForDate(date: string): Entry[] {
  const res = getDb().executeSync(
    `SELECT id,tracker_id,date,value,note FROM entries WHERE date = ?`,
    [date.slice(0, 10)]
  )
  return (res.rows ?? []).map((r: Row) => ({
    id: r.id,
    trackerId: r.tracker_id,
    date: r.date,
    value: r.value,
    note: r.note ?? null
  }))
}

export function listMilestones(trackerId: string): Milestone[] {
  const res = getDb().executeSync(
    `SELECT id,tracker_id,title,due_date,progress,order_index FROM milestones WHERE tracker_id = ? ORDER BY order_index ASC`,
    [trackerId]
  )
  return (res.rows ?? []).map((r: Row) => ({
    id: r.id,
    trackerId: r.tracker_id,
    title: r.title,
    dueDate: r.due_date ?? null,
    progress: r.progress,
    orderIndex: r.order_index
  }))
}

export function upsertMilestone(m: Milestone): void {
  getDb().executeSync(
    `INSERT OR REPLACE INTO milestones (id,tracker_id,title,due_date,progress,order_index) VALUES (?,?,?,?,?,?)`,
    [m.id, m.trackerId, m.title, m.dueDate, m.progress, m.orderIndex]
  )
}
