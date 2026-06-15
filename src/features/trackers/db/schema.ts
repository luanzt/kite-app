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
