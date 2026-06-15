import { open, type DB } from '@op-engineering/op-sqlite';

export const DB_NAME = 'kite.sqlite';

let db: DB | null = null;

export function getDb(): DB {
  if (!db) {
    db = open({ name: DB_NAME });
    migrate(db);
  }
  return db;
}

// For tests: allow injecting an in-memory DB
export function setDb(injected: DB): void {
  db = injected;
  migrate(db);
}

/**
 * Canonical `trackers` columns, in declaration order. `decl` is the column's
 * `ADD COLUMN` definition — kept nullable / DEFAULT-able so existing rows can be
 * back-filled when a column is added to a table created by an older app version.
 * `CREATE TABLE` keeps the stricter NOT NULL constraints on the base columns;
 * only later-added columns are listed here for the `ALTER TABLE` upgrade path.
 */
export const TRACKER_COLUMNS: { name: string; decl: string }[] = [
  { name: 'id', decl: 'id TEXT PRIMARY KEY' },
  { name: 'name', decl: 'name TEXT NOT NULL' },
  { name: 'type', decl: 'type TEXT NOT NULL' },
  { name: 'icon', decl: 'icon TEXT NOT NULL' },
  { name: 'color', decl: 'color TEXT NOT NULL' },
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
  { name: 'archived', decl: 'archived INTEGER NOT NULL DEFAULT 0' },
];

/**
 * Pure: given the column names a live `trackers` table currently has, return the
 * canonical columns that are missing (in declaration order) so they can be added
 * via `ALTER TABLE`. Extra/unknown columns on the live table are ignored.
 */
export function missingColumns(existing: string[]): { name: string; decl: string }[] {
  const have = new Set(existing);
  return TRACKER_COLUMNS.filter(c => !have.has(c.name));
}

export function migrate(database: DB): void {
  database.executeSync(`
    CREATE TABLE IF NOT EXISTS trackers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      unit TEXT,
      direction TEXT,
      target_value REAL,
      start_value REAL,
      accumulation TEXT,
      start_date TEXT NOT NULL,
      deadline TEXT,
      period TEXT,
      repeat_days TEXT,
      routine TEXT,
      reminder_time TEXT,
      created_at TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Upgrade path: a `trackers` table created by an older app version may be
  // missing columns added later (e.g. `routine`, `reminder_time`). SQLite's
  // `CREATE TABLE IF NOT EXISTS` never alters an existing table, so add any
  // missing columns here — without this, inserting a habit fails with
  // "table trackers has no column named routine".
  const info = database.executeSync(`PRAGMA table_info(trackers);`);
  const existing = (info.rows ?? []).map((r: Record<string, any>) => r.name as string);
  for (const col of missingColumns(existing)) {
    database.executeSync(`ALTER TABLE trackers ADD COLUMN ${col.decl};`);
  }
  database.executeSync(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      tracker_id TEXT NOT NULL,
      date TEXT NOT NULL,
      value REAL NOT NULL,
      note TEXT
    );
  `);
  database.executeSync(`CREATE INDEX IF NOT EXISTS idx_entries_tracker_date ON entries(tracker_id, date);`);
  database.executeSync(`
    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      tracker_id TEXT NOT NULL,
      title TEXT NOT NULL,
      due_date TEXT,
      progress REAL NOT NULL DEFAULT 0,
      order_index INTEGER NOT NULL DEFAULT 0
    );
  `);
}
