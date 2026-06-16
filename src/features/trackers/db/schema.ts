import { open, type DB } from '@op-engineering/op-sqlite'

export const DB_NAME = 'kite.sqlite'

let db: DB | null = null

export function getDb(): DB {
  if (!db) {
    db = open({ name: DB_NAME })
    migrate(db)
  }
  return db
}

// For tests: allow injecting an in-memory DB
export function setDb(injected: DB): void {
  db = injected
  migrate(db)
}

/**
 * A table's canonical columns, in declaration order. `decl` is the column's
 * full SQL definition — used both inside `CREATE TABLE` and as the body of an
 * `ALTER TABLE … ADD COLUMN` when an older DB is missing it.
 *
 * IMPORTANT: any column that could be ADDED later must be nullable or carry a
 * DEFAULT — SQLite cannot `ADD COLUMN` a bare `NOT NULL` to a table that may
 * already hold rows. Base columns added at table creation can stay strict, but
 * we keep `NOT NULL` ones DEFAULT-able here so the same spec drives both paths.
 */
export type ColumnSpec = { name: string; decl: string }
export type TableSpec = {
  name: string
  columns: ColumnSpec[]
  /** Extra statements (indexes, etc.) run idempotently after the table exists. */
  extras?: string[]
}

export const TRACKER_COLUMNS: ColumnSpec[] = [
  { name: 'id', decl: 'id TEXT PRIMARY KEY' },
  { name: 'name', decl: "name TEXT NOT NULL DEFAULT ''" },
  { name: 'type', decl: "type TEXT NOT NULL DEFAULT 'habit'" },
  { name: 'icon', decl: "icon TEXT NOT NULL DEFAULT 'star'" },
  { name: 'color', decl: "color TEXT NOT NULL DEFAULT 'blue'" },
  { name: 'unit', decl: 'unit TEXT' },
  { name: 'direction', decl: 'direction TEXT' },
  { name: 'target_value', decl: 'target_value REAL' },
  { name: 'start_value', decl: 'start_value REAL' },
  { name: 'accumulation', decl: 'accumulation TEXT' },
  { name: 'start_date', decl: "start_date TEXT NOT NULL DEFAULT ''" },
  { name: 'deadline', decl: 'deadline TEXT' },
  { name: 'period', decl: 'period TEXT' },
  { name: 'repeat_days', decl: 'repeat_days TEXT' },
  { name: 'routine', decl: 'routine TEXT' },
  { name: 'reminder_time', decl: 'reminder_time TEXT' },
  { name: 'created_at', decl: "created_at TEXT NOT NULL DEFAULT ''" },
  { name: 'archived', decl: 'archived INTEGER NOT NULL DEFAULT 0' }
]

export const ENTRY_COLUMNS: ColumnSpec[] = [
  { name: 'id', decl: 'id TEXT PRIMARY KEY' },
  { name: 'tracker_id', decl: "tracker_id TEXT NOT NULL DEFAULT ''" },
  { name: 'date', decl: "date TEXT NOT NULL DEFAULT ''" },
  { name: 'value', decl: 'value REAL NOT NULL DEFAULT 0' },
  { name: 'note', decl: 'note TEXT' }
]

export const MILESTONE_COLUMNS: ColumnSpec[] = [
  { name: 'id', decl: 'id TEXT PRIMARY KEY' },
  { name: 'tracker_id', decl: "tracker_id TEXT NOT NULL DEFAULT ''" },
  { name: 'title', decl: "title TEXT NOT NULL DEFAULT ''" },
  { name: 'due_date', decl: 'due_date TEXT' },
  { name: 'progress', decl: 'progress REAL NOT NULL DEFAULT 0' },
  { name: 'order_index', decl: 'order_index INTEGER NOT NULL DEFAULT 0' }
]

/** Every table the app owns, each self-describing for create + upgrade. */
export const TABLES: TableSpec[] = [
  { name: 'trackers', columns: TRACKER_COLUMNS },
  {
    name: 'entries',
    columns: ENTRY_COLUMNS,
    extras: [
      'CREATE INDEX IF NOT EXISTS idx_entries_tracker_date ON entries(tracker_id, date);'
    ]
  },
  { name: 'milestones', columns: MILESTONE_COLUMNS }
]

/**
 * Pure: given a table's canonical column spec and the column names the live
 * table currently has, return the spec columns that are missing (in declaration
 * order) so they can be added via `ALTER TABLE`. Extra/unknown live columns are
 * ignored.
 */
export function missingColumns(
  spec: ColumnSpec[],
  existing: string[]
): ColumnSpec[] {
  const have = new Set(existing)
  return spec.filter((c) => !have.has(c.name))
}

/**
 * Create the table if absent, then add any spec column the existing table is
 * missing. `CREATE TABLE IF NOT EXISTS` never alters an existing table, so the
 * ADD COLUMN pass is what lets a DB created by an older app version pick up
 * later-added columns (without it, e.g. inserting a habit fails with
 * "table trackers has no column named routine").
 */
function migrateTable(database: DB, table: TableSpec): void {
  const cols = table.columns.map((c) => c.decl).join(', ')
  database.executeSync(`CREATE TABLE IF NOT EXISTS ${table.name} (${cols});`)

  const info = database.executeSync(`PRAGMA table_info(${table.name});`)
  const existing = (info.rows ?? []).map(
    (r: Record<string, any>) => r.name as string
  )
  for (const col of missingColumns(table.columns, existing)) {
    database.executeSync(`ALTER TABLE ${table.name} ADD COLUMN ${col.decl};`)
  }

  for (const extra of table.extras ?? []) {
    database.executeSync(extra)
  }
}

export function migrate(database: DB): void {
  for (const table of TABLES) {
    migrateTable(database, table)
  }
}
