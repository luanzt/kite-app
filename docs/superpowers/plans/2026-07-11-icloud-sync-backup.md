# iCloud Sync & Backup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** iOS-only, manual iCloud Sync & Backup (Strides-style) so Kite data survives app deletion/reinstall and can be pulled onto a user's other iOS devices.

**Architecture:** A `Sync & Backup` row in Settings (iOS only) opens a new `SyncBackupScreen`. Tapping **Sync Now** runs `runSync()`: read the JSON snapshot from the app's private iCloud container (`react-native-cloud-storage`, `AppData` scope, file `/kite-backup.json`) → merge with local SQLite per-record (last-write-wins on `updatedAt`, deletes win via a new `tombstones` table) → apply merged result to SQLite in a transaction → write merged snapshot back to iCloud → set `lastSyncedAt` → invalidate all TanStack queries. Spec: `docs/superpowers/specs/2026-07-11-icloud-sync-backup-design.md`.

**Tech Stack:** React Native 0.85, TypeScript strict, op-sqlite v16 (`executeSync`, `res.rows` plain array), TanStack Query, Zustand+MMKV (settings only), HeroUI Native + Uniwind (Tailwind className), lucide-react-native, i18next, `react-native-cloud-storage` (new dep, Nitro-based — `react-native-nitro-modules` already installed), Jest.

## Global Constraints

- Package manager is **yarn**. Run a single test file with `yarn test <path>`.
- TDD: write the failing test first, watch it fail, implement, watch it pass, commit.
- `yarn tsc` (strict) must be clean before every commit; run `yarn lint` too.
- UI text: `<Typography>` from `heroui-native`, NEVER `<Text>`.
- Styling: Tailwind `className` only; inline `style` ONLY for genuinely runtime-dynamic values (safe-area insets) with a one-line why-comment. Never interpolate values into class strings.
- Icons: `lucide-react-native` only, sized via `size` prop, colored via `color` prop with `useThemeColors()` hex.
- Buttons: HeroUI has NO `isLoading` — use `isDisabled` + conditional `<Spinner />`.
- Every user-visible string via `t('key')`; add keys to BOTH `src/i18n/locales/en.json` and `vi.json`, key-for-key.
- Named exports only (no default exports).
- op-sqlite v16: use `executeSync()`, read `res.rows` as a plain array (no `._array`).
- op-sqlite is mocked in Jest (`jest/op-sqlite-mock.js`); DB-calling functions are NOT unit-tested — pure functions are.
- Commit messages end with:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: Schema — `updated_at` columns + `tombstones` table

**Files:**
- Modify: `src/features/trackers/db/schema.ts`
- Test: `src/features/trackers/db/__tests__/schema.test.ts`

**Interfaces:**
- Consumes: existing `ColumnSpec`, `TableSpec`, `TABLES`, `missingColumns()`.
- Produces: `updated_at TEXT` as the LAST column of `TRACKER_COLUMNS`, `ENTRY_COLUMNS`, `MILESTONE_COLUMNS`; new exported `TOMBSTONE_COLUMNS: ColumnSpec[]`; `TABLES` gains a 4th entry `{ name: 'tombstones', columns: TOMBSTONE_COLUMNS }`. Existing DBs pick the column/table up automatically via `migrateTable()` — no hand-written migrations.

- [ ] **Step 1: Update the schema tests (they will fail)**

In `src/features/trackers/db/__tests__/schema.test.ts`:

1. Change the import to include the new exports:

```ts
import {
  missingColumns,
  TRACKER_COLUMNS,
  ENTRY_COLUMNS,
  MILESTONE_COLUMNS,
  TOMBSTONE_COLUMNS,
  TABLES
} from '../schema'
```

2. The first test ("returns spec columns absent from the live trackers table") — append the new column to the expected array so it ends:

```ts
    expect(missingColumns(TRACKER_COLUMNS, existing)).toEqual([
      { name: 'routine', decl: 'routine TEXT' },
      { name: 'reminder_time', decl: 'reminder_time TEXT' },
      { name: 'goal_note', decl: 'goal_note TEXT' },
      { name: 'average_window', decl: 'average_window TEXT' },
      { name: 'rolling_days', decl: 'rolling_days INTEGER' },
      { name: 'done_rule', decl: 'done_rule TEXT' },
      { name: 'progress_basis', decl: 'progress_basis TEXT' },
      { name: 'updated_at', decl: 'updated_at TEXT' }
    ])
```

3. Test "works the same for the entries spec" — expected becomes:

```ts
    expect(missingColumns(ENTRY_COLUMNS, existing)).toEqual([
      { name: 'note', decl: 'note TEXT' },
      { name: 'created_at', decl: "created_at TEXT NOT NULL DEFAULT ''" },
      { name: 'updated_at', decl: 'updated_at TEXT' }
    ])
```

4. Test "works the same for the milestones spec" — expected becomes:

```ts
    expect(missingColumns(MILESTONE_COLUMNS, existing)).toEqual([
      { name: 'progress', decl: 'progress REAL NOT NULL DEFAULT 0' },
      { name: 'order_index', decl: 'order_index INTEGER NOT NULL DEFAULT 0' },
      { name: 'updated_at', decl: 'updated_at TEXT' }
    ])
```

5. In the "internally consistent" test, add `TOMBSTONE_COLUMNS` to the looped array:

```ts
    for (const spec of [
      TRACKER_COLUMNS,
      ENTRY_COLUMNS,
      MILESTONE_COLUMNS,
      TOMBSTONE_COLUMNS
    ]) {
```

6. Append two new tests at the end of the describe block:

```ts
  it('declares a tombstones table for sync deletions', () => {
    const tombstones = TABLES.find((t) => t.name === 'tombstones')
    expect(tombstones).toBeDefined()
    expect(tombstones!.columns).toEqual(TOMBSTONE_COLUMNS)
    expect(TOMBSTONE_COLUMNS.map((c) => c.name)).toEqual([
      'id',
      'table_name',
      'deleted_at'
    ])
  })

  it('every synced table carries updated_at for LWW merging', () => {
    for (const spec of [TRACKER_COLUMNS, ENTRY_COLUMNS, MILESTONE_COLUMNS]) {
      expect(spec.some((c) => c.name === 'updated_at')).toBe(true)
    }
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test src/features/trackers/db/__tests__/schema.test.ts`
Expected: FAIL — `TOMBSTONE_COLUMNS` is not exported; the three `missingColumns` expectations don't match.

- [ ] **Step 3: Implement the schema changes**

In `src/features/trackers/db/schema.ts`:

1. Append to `TRACKER_COLUMNS` (after `progress_basis`), to `ENTRY_COLUMNS` (after `created_at`), and to `MILESTONE_COLUMNS` (after `order_index`) — the same spec each time:

```ts
  { name: 'updated_at', decl: 'updated_at TEXT' }
```

2. Below `MILESTONE_COLUMNS`, add:

```ts
/**
 * Sync tombstones: one row per deleted record so iCloud sync can tell
 * "deleted here" apart from "never seen here". `id` is the dead record's id;
 * a deleted tracker gets ONE tombstone (its entries/milestones are dropped by
 * the merge cascade, not tombstoned individually).
 */
export const TOMBSTONE_COLUMNS: ColumnSpec[] = [
  { name: 'id', decl: 'id TEXT PRIMARY KEY' },
  { name: 'table_name', decl: "table_name TEXT NOT NULL DEFAULT ''" },
  { name: 'deleted_at', decl: "deleted_at TEXT NOT NULL DEFAULT ''" }
]
```

3. Add the table to `TABLES`:

```ts
export const TABLES: TableSpec[] = [
  { name: 'trackers', columns: TRACKER_COLUMNS },
  {
    name: 'entries',
    columns: ENTRY_COLUMNS,
    extras: [
      'CREATE INDEX IF NOT EXISTS idx_entries_tracker_date ON entries(tracker_id, date);'
    ]
  },
  { name: 'milestones', columns: MILESTONE_COLUMNS },
  { name: 'tombstones', columns: TOMBSTONE_COLUMNS }
]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test src/features/trackers/db/__tests__/schema.test.ts`
Expected: PASS (all tests).
Also run: `yarn tsc` — expected clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/trackers/db/schema.ts src/features/trackers/db/__tests__/schema.test.ts
git commit -m "feat(sync): add updated_at columns and tombstones table for iCloud sync

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Domain types + repository — `updatedAt` mapping/stamping, tombstones, list-all readers

**Files:**
- Modify: `src/features/trackers/types.ts`
- Modify: `src/features/trackers/db/repository.ts`
- Test: `src/features/trackers/db/__tests__/repository.test.ts`

**Interfaces:**
- Consumes: Task 1's schema columns.
- Produces (all in `@features/trackers/types` / `@features/trackers/db/repository`):
  - `type TombstoneTable = 'trackers' | 'entries' | 'milestones'`
  - `type Tombstone = { id: string; tableName: TombstoneTable; deletedAt: string }`
  - `Tracker`, `Entry`, `Milestone` each gain OPTIONAL `updatedAt?: string | null` (optional so existing literals compile; mappers normalize missing → `null`).
  - `writeTrackerRow(t: Tracker): void`, `writeEntryRow(e: Entry): void`, `writeMilestoneRow(m: Milestone): void` — verbatim writers that PRESERVE `updatedAt` (used by sync apply in Task 7).
  - `insertTracker` / `insertEntry` / `upsertMilestone` — unchanged signatures, now stamp `updatedAt = new Date().toISOString()` before writing.
  - `deleteTracker(id)` also inserts a `trackers` tombstone; `deleteEntry(id)` also inserts an `entries` tombstone.
  - `insertTombstone(tb: Tombstone): void`, `listTombstones(): Tombstone[]`
  - `listAllTrackers(): Tracker[]`, `listAllEntries(): Entry[]`, `listAllMilestones(): Milestone[]` — no archived filter (sync includes archived trackers).
  - Pure mappers exported for tests: `milestoneToRow`, `rowToMilestone`, `tombstoneToRow`, `rowToTombstone` (plus existing `trackerToRow`/`rowToTracker`/`entryToRow`/`rowToEntry` now carrying `updated_at`).

- [ ] **Step 1: Update + add repository mapping tests (they will fail)**

In `src/features/trackers/db/__tests__/repository.test.ts`:

1. Extend the import:

```ts
import {
  rowToTracker,
  trackerToRow,
  entryToRow,
  rowToEntry,
  milestoneToRow,
  rowToMilestone,
  tombstoneToRow,
  rowToTombstone
} from '../repository'
import type {
  Tracker,
  Entry,
  Milestone,
  Tombstone
} from '@features/trackers/types'
```

2. The `tracker` fixture (top of file): add `updatedAt: null,` after `createdAt: '2026-01-01T00:00:00Z',`. The `habit` fixture inside "round-trips a tracker with all nullable fields null": add `updatedAt: null,` after its `createdAt`. The `entry` fixture in the entries describe: add `updatedAt: null` after `createdAt: '2026-06-18T09:59:00Z'`.
   (Without this, the existing `toEqual` round-trips fail: `rowToTracker` now always emits the `updatedAt` key.)

3. Append new tests at the end of the file:

```ts
describe('updated_at mapping (sync LWW stamp)', () => {
  test('trackerToRow maps updatedAt to updated_at and back', () => {
    const t = { ...tracker, updatedAt: '2026-07-01T10:00:00Z' }
    const row = trackerToRow(t)
    expect(row.updated_at).toBe('2026-07-01T10:00:00Z')
    expect(rowToTracker(row)).toEqual(t)
  })

  test('rowToTracker defaults missing updated_at to null (old rows)', () => {
    const row = trackerToRow(tracker)
    delete row.updated_at
    expect(rowToTracker(row).updatedAt).toBeNull()
  })

  test('entry round-trips updatedAt', () => {
    const e: Entry = {
      id: 'e9',
      trackerId: 't1',
      date: '2026-07-01',
      value: 3,
      note: null,
      createdAt: '2026-07-01T08:00:00Z',
      updatedAt: '2026-07-02T08:00:00Z'
    }
    expect(rowToEntry(entryToRow(e))).toEqual(e)
  })
})

describe('milestone row mapping', () => {
  const milestone: Milestone = {
    id: 'm1',
    trackerId: 't1',
    title: 'Chapter 1',
    dueDate: '2026-08-01',
    progress: 0.5,
    orderIndex: 0,
    updatedAt: '2026-07-01T10:00:00Z'
  }

  test('milestoneToRow maps to snake_case columns', () => {
    const row = milestoneToRow(milestone)
    expect(row.tracker_id).toBe('t1')
    expect(row.due_date).toBe('2026-08-01')
    expect(row.order_index).toBe(0)
    expect(row.updated_at).toBe('2026-07-01T10:00:00Z')
  })

  test('rowToMilestone round-trips', () => {
    expect(rowToMilestone(milestoneToRow(milestone))).toEqual(milestone)
  })

  test('rowToMilestone defaults missing due_date/updated_at to null', () => {
    const row = milestoneToRow(milestone)
    delete row.due_date
    delete row.updated_at
    const back = rowToMilestone(row)
    expect(back.dueDate).toBeNull()
    expect(back.updatedAt).toBeNull()
  })
})

describe('tombstone row mapping', () => {
  const tb: Tombstone = {
    id: 't1',
    tableName: 'trackers',
    deletedAt: '2026-07-01T10:00:00Z'
  }

  test('tombstoneToRow maps to snake_case columns', () => {
    expect(tombstoneToRow(tb)).toEqual({
      id: 't1',
      table_name: 'trackers',
      deleted_at: '2026-07-01T10:00:00Z'
    })
  })

  test('rowToTombstone round-trips', () => {
    expect(rowToTombstone(tombstoneToRow(tb))).toEqual(tb)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test src/features/trackers/db/__tests__/repository.test.ts`
Expected: FAIL — `milestoneToRow` etc. not exported; `Tombstone` type missing; round-trips missing `updatedAt`.

- [ ] **Step 3: Implement types + repository changes**

In `src/features/trackers/types.ts`, add to `Tracker` (after `createdAt`), to `Entry` (after `createdAt`), and to `Milestone` (after `orderIndex`):

```ts
  updatedAt?: string | null // ISO datetime — stamped on every save; sync LWW key
```

and add at the end of the file:

```ts
/** Sync: which table a tombstone's dead record belonged to. */
export type TombstoneTable = 'trackers' | 'entries' | 'milestones'

/**
 * A deletion marker kept for iCloud sync: without it, a record deleted on
 * this device would look like "missing" to another device and be re-added on
 * merge. `id` is the deleted record's id.
 */
export type Tombstone = {
  id: string
  tableName: TombstoneTable
  deletedAt: string // ISO datetime
}
```

In `src/features/trackers/db/repository.ts`:

1. Import `Tombstone`:

```ts
import type { Tracker, Entry, Milestone, Tombstone } from '@features/trackers/types'
```

2. `trackerToRow`: add `updated_at: t.updatedAt ?? null` after `progress_basis`. `rowToTracker`: add `updatedAt: r.updated_at ?? null` after `progressBasis`.

3. `COLS`: append `,updated_at` (string ends `...,done_rule,progress_basis,updated_at`). `PLACEHOLDERS` derives automatically.

4. Split `insertTracker` into a verbatim writer + stamping save:

```ts
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
```

5. `entryToRow`: add `updated_at: e.updatedAt ?? null`; `rowToEntry`: add `updatedAt: r.updated_at ?? null`. Replace `ENTRY_COLS` + `insertEntry` with:

```ts
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
```

6. Milestones — add mappers, verbatim writer, stamping upsert; rewrite `listMilestones` on top of them:

```ts
const MILESTONE_COLS = 'id,tracker_id,title,due_date,progress,order_index,updated_at'

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
```

7. Tombstones + deletes-with-tombstones + list-all readers (append at the end; also update `deleteTracker`/`deleteEntry` in place):

```ts
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
```

`deleteTracker` / `deleteEntry` become:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test src/features/trackers/db/__tests__/repository.test.ts`
Expected: PASS.
Then run the FULL suite + typecheck: `yarn test && yarn tsc` — expected clean (the optional `updatedAt?` keeps every existing `Tracker`/`Entry` literal compiling).

- [ ] **Step 5: Commit**

```bash
git add src/features/trackers/types.ts src/features/trackers/db/repository.ts src/features/trackers/db/__tests__/repository.test.ts
git commit -m "feat(sync): stamp updatedAt on saves, record tombstones on deletes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: `sync/snapshot.ts` — Snapshot type, build/empty/parse (TDD)

**Files:**
- Create: `src/features/trackers/sync/snapshot.ts`
- Test: `src/features/trackers/sync/__tests__/snapshot.test.ts`

**Interfaces:**
- Consumes: `Tracker`, `Entry`, `Milestone`, `Tombstone` from `@features/trackers/types`.
- Produces (Tasks 4–7 rely on these EXACT names):
  - `SNAPSHOT_VERSION = 1`
  - `type Snapshot = { schemaVersion: number; exportedAt: string; trackers: Tracker[]; entries: Entry[]; milestones: Milestone[]; tombstones: Tombstone[] }`
  - `buildSnapshot(trackers, entries, milestones, tombstones, now?): Snapshot`
  - `emptySnapshot(now?): Snapshot`
  - `class SnapshotError extends Error { code: 'malformed' | 'newer_version' }`
  - `parseSnapshot(json: string): Snapshot` — throws `SnapshotError`.

- [ ] **Step 1: Write the failing tests**

Create `src/features/trackers/sync/__tests__/snapshot.test.ts`:

```ts
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

describe('buildSnapshot / emptySnapshot', () => {
  test('buildSnapshot wraps the arrays with version + exportedAt', () => {
    const s = buildSnapshot([baseTracker], [baseEntry], [], [], '2026-07-11T00:00:00Z')
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
    const future = JSON.stringify({ ...valid, schemaVersion: SNAPSHOT_VERSION + 1 })
    try {
      parseSnapshot(future)
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as SnapshotError).code).toBe('newer_version')
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test src/features/trackers/sync/__tests__/snapshot.test.ts`
Expected: FAIL — cannot find module `../snapshot`.

- [ ] **Step 3: Implement**

Create `src/features/trackers/sync/snapshot.ts`:

```ts
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

export function emptySnapshot(now: string = new Date().toISOString()): Snapshot {
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
  if (typeof obj !== 'object' || obj === null) throw new SnapshotError('malformed')
  const s = obj as Record<string, unknown>
  if (typeof s.schemaVersion !== 'number') throw new SnapshotError('malformed')
  if (s.schemaVersion > SNAPSHOT_VERSION) throw new SnapshotError('newer_version')
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test src/features/trackers/sync/__tests__/snapshot.test.ts`
Expected: PASS. Also `yarn tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/trackers/sync/
git commit -m "feat(sync): snapshot format — build, empty, parse+validate

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `sync/snapshot.ts` — `mergeSnapshots` (TDD)

**Files:**
- Modify: `src/features/trackers/sync/snapshot.ts`
- Test: `src/features/trackers/sync/__tests__/merge.test.ts`

**Interfaces:**
- Consumes: Task 3's `Snapshot` and `buildSnapshot`. Fixtures are repeated locally (see the note in Task 3's test — never import from another test file).
- Produces: `mergeSnapshots(local: Snapshot, cloud: Snapshot, now?: string): Snapshot` with rules: per-table union by `id`; both sides → higher stamp wins where stamp = `updatedAt ?? createdAt ?? ''`; ties/equal stamps → LOCAL wins; tombstones union by `id` keeping max `deletedAt`; a tombstoned id never survives; entries/milestones whose `trackerId` is tombstoned are dropped (cascade).

- [ ] **Step 1: Write the failing tests**

Create `src/features/trackers/sync/__tests__/merge.test.ts`:

```ts
import { buildSnapshot, mergeSnapshots } from '../snapshot'
import type { Tracker, Entry, Milestone, Tombstone } from '@features/trackers/types'

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
    const mine = en({ note: 'old', updatedAt: null, createdAt: '2026-07-01T00:00:00Z' })
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
    expect([...merged.tombstones].sort((a, b) => a.id.localeCompare(b.id))).toEqual([
      newer,
      other
    ])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test src/features/trackers/sync/__tests__/merge.test.ts`
Expected: FAIL — `mergeSnapshots` is not exported.

- [ ] **Step 3: Implement `mergeSnapshots`**

Append to `src/features/trackers/sync/snapshot.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test src/features/trackers/sync/__tests__/merge.test.ts`
Expected: PASS. Also `yarn tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/trackers/sync/
git commit -m "feat(sync): last-write-wins snapshot merge with tombstone cascade

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: `sync/snapshot.ts` — `countPending` (TDD)

**Files:**
- Modify: `src/features/trackers/sync/snapshot.ts`
- Test: `src/features/trackers/sync/__tests__/countPending.test.ts`

**Interfaces:**
- Produces: `countPending(local: Pick<Snapshot, 'trackers' | 'entries' | 'milestones' | 'tombstones'>, lastSyncedAt: string | null): number` — `null` (never synced) counts every row + every tombstone; otherwise counts rows whose stamp (`updatedAt ?? createdAt ?? ''`) is strictly after `lastSyncedAt`, plus tombstones with `deletedAt` after it. Used by `useSyncStats` (Task 7).

- [ ] **Step 1: Write the failing tests**

Create `src/features/trackers/sync/__tests__/countPending.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test src/features/trackers/sync/__tests__/countPending.test.ts`
Expected: FAIL — `countPending` is not exported.

- [ ] **Step 3: Implement `countPending`**

Append to `src/features/trackers/sync/snapshot.ts`:

```ts
/**
 * How many local changes the next Sync will upload. Null lastSyncedAt means
 * this device has never synced — everything counts. Rows whose stamp is ''
 * (legacy rows with no timestamps) only count in the never-synced case.
 */
export function countPending(
  local: Pick<Snapshot, 'trackers' | 'entries' | 'milestones' | 'tombstones'>,
  lastSyncedAt: string | null
): number {
  const rows: { updatedAt?: string | null; createdAt?: string }[] = [
    ...local.trackers,
    ...local.entries,
    ...local.milestones
  ]
  if (lastSyncedAt === null) return rows.length + local.tombstones.length
  return (
    rows.filter((r) => stampOf(r) > lastSyncedAt).length +
    local.tombstones.filter((tb) => tb.deletedAt > lastSyncedAt).length
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test src/features/trackers/sync/__tests__/countPending.test.ts`
Expected: PASS. Then run the whole suite: `yarn test` and `yarn tsc` — clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/trackers/sync/
git commit -m "feat(sync): countPending — unsynced-changes counter

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Install `react-native-cloud-storage`, Jest mock, settings-store fields, `sync/icloud.ts`

**Files:**
- Modify: `package.json` (+ lockfile, via yarn)
- Create: `jest/cloud-storage-mock.js`
- Modify: `jest.config.js`
- Modify: `src/store/useAppStore.ts`
- Create: `src/features/trackers/sync/icloud.ts`

**Interfaces:**
- Produces:
  - `useAppStore` gains `icloudSyncEnabled: boolean` (default `false`), `lastSyncedAt: string | null` (default `null`), `setIcloudSyncEnabled(v: boolean)`, `setLastSyncedAt(iso: string | null)` — persisted via the existing MMKV storage.
  - `sync/icloud.ts` exports `cloudAvailable(): Promise<boolean>`, `readBackup(): Promise<Snapshot | null>` (null when no backup file exists; throws `SnapshotError` on junk), `writeBackup(snapshot: Snapshot): Promise<void>`.
- No unit tests here: the wrapper is thin glue over a native module (mocked in Jest per project convention); it is verified on-device in Task 10. The store change is a two-field extension of an existing pattern.

- [ ] **Step 1: Install the library**

Run: `yarn add react-native-cloud-storage`
Expected: added to `dependencies`. (Do NOT run `pod install` yet — that is Task 10, the native/device task; nothing before then needs the iOS build.)

- [ ] **Step 2: Add the Jest mock**

Create `jest/cloud-storage-mock.js`:

```js
// Jest mock for react-native-cloud-storage — a Nitro/native module that
// cannot load in the Jest (node) environment, same situation as op-sqlite.
// Unit tests never exercise iCloud I/O; sync/icloud.ts is device-verified.
const CloudStorageScope = { AppData: 'app_data', Documents: 'documents' }

const CloudStorage = {
  isCloudAvailable: async () => false,
  exists: async () => false,
  readFile: async () => '',
  writeFile: async () => {},
  unlink: async () => {}
}

const useIsCloudAvailable = () => false

module.exports = { CloudStorage, CloudStorageScope, useIsCloudAvailable }
```

Update `jest.config.js`:

```js
module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '@op-engineering/op-sqlite': '<rootDir>/jest/op-sqlite-mock.js',
    'react-native-cloud-storage': '<rootDir>/jest/cloud-storage-mock.js'
  }
}
```

- [ ] **Step 3: Extend the settings store**

`src/store/useAppStore.ts` — add the fields to the type and the creator (settings only — this is state ABOUT syncing, not tracker data, so MMKV is correct):

```ts
type AppState = {
  themeMode: ThemeMode
  language: Language | null
  notifyEnabled: boolean
  permissionAsked: boolean
  icloudSyncEnabled: boolean
  lastSyncedAt: string | null
  setThemeMode: (mode: ThemeMode) => void
  setLanguage: (lang: Language) => void
  setNotifyEnabled: (v: boolean) => void
  markPermissionAsked: () => void
  setIcloudSyncEnabled: (v: boolean) => void
  setLastSyncedAt: (iso: string | null) => void
}
```

and inside `create(...)`:

```ts
      icloudSyncEnabled: false,
      lastSyncedAt: null,
      setIcloudSyncEnabled: (v: boolean) => set({ icloudSyncEnabled: v }),
      setLastSyncedAt: (iso: string | null) => set({ lastSyncedAt: iso })
```

- [ ] **Step 4: Write the iCloud wrapper**

Create `src/features/trackers/sync/icloud.ts`:

```ts
import { Platform } from 'react-native'
import { CloudStorage, CloudStorageScope } from 'react-native-cloud-storage'
import { parseSnapshot, type Snapshot } from './snapshot'

/**
 * Thin wrapper around react-native-cloud-storage for the ONE file Kite keeps
 * in the user's iCloud: /kite-backup.json in the app-private AppData scope
 * (invisible in the Files app; survives app uninstall). iOS-only — the
 * Settings entry point is gated on Platform.OS, this module just double-guards.
 */
const BACKUP_PATH = '/kite-backup.json'
const SCOPE = CloudStorageScope.AppData

/** False on Android, with no iCloud account, or with iCloud Drive disabled. */
export async function cloudAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false
  try {
    return await CloudStorage.isCloudAvailable()
  } catch {
    return false
  }
}

/** Read + parse the cloud backup; null when none exists yet (first ever sync). */
export async function readBackup(): Promise<Snapshot | null> {
  if (!(await CloudStorage.exists(BACKUP_PATH, SCOPE))) return null
  // The file can exist in iCloud without being downloaded to THIS device yet
  // (fresh install). triggerSync asks iOS to fetch it — best-effort, since not
  // every library version exposes it; readFile below surfaces real failures.
  const cs = CloudStorage as unknown as {
    triggerSync?: (path: string, scope: CloudStorageScope) => Promise<void>
  }
  try {
    await cs.triggerSync?.(BACKUP_PATH, SCOPE)
  } catch {
    // ignore — best-effort download hint
  }
  const json = await CloudStorage.readFile(BACKUP_PATH, SCOPE)
  return parseSnapshot(json)
}

export async function writeBackup(snapshot: Snapshot): Promise<void> {
  await CloudStorage.writeFile(BACKUP_PATH, JSON.stringify(snapshot), SCOPE)
}
```

NOTE for the implementer: after `yarn add`, check the installed version's actual exports (`node_modules/react-native-cloud-storage/lib/typescript` or its README). If `CloudStorage.triggerSync(path, scope)` is a first-class typed static, drop the `as unknown as` dance and call it directly. If the default-instance static API differs (e.g. requires `new CloudStorage(CloudStorageProvider.ICloud)`), adapt this file only — its three exports are the contract.

- [ ] **Step 5: Verify suite + typecheck**

Run: `yarn test && yarn tsc && yarn lint`
Expected: all clean (mock keeps Jest happy; tsc uses the library's real types).

- [ ] **Step 6: Commit**

```bash
git add package.json yarn.lock jest/cloud-storage-mock.js jest.config.js src/store/useAppStore.ts src/features/trackers/sync/icloud.ts
git commit -m "feat(sync): react-native-cloud-storage wrapper, jest mock, sync settings state

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: `replaceAllData` + `syncService.runSync` + `useSyncStats` hook

**Files:**
- Modify: `src/features/trackers/db/repository.ts`
- Create: `src/features/trackers/sync/syncService.ts`
- Modify: `src/features/trackers/queries/index.ts`

**Interfaces:**
- Consumes: Task 2's verbatim writers + list-all readers, Task 3–5's snapshot functions, Task 6's `readBackup`/`writeBackup` + store setters.
- Produces:
  - `repository.replaceAllData(s: { trackers: Tracker[]; entries: Entry[]; milestones: Milestone[]; tombstones: Tombstone[] }): void` — full-table replace inside one transaction, rows written VERBATIM (updatedAt preserved).
  - `syncService.runSync(qc: QueryClient): Promise<void>` — throws on failure (screen catches); on success `lastSyncedAt` is set and all queries invalidated.
  - `queries.useSyncStats(lastSyncedAt: string | null)` → `{ trackers: number; logs: number; pending: number }`.
- DB- and iCloud-touching code — NOT unit-tested (project convention); device-verified in Task 10. The pure pieces it composes were tested in Tasks 3–5.

- [ ] **Step 1: Add `replaceAllData` to the repository**

Append to `src/features/trackers/db/repository.ts`:

```ts
/**
 * Sync apply: make the local DB exactly equal to a merged snapshot. Full
 * replace (not upsert) so records deleted by the merge disappear locally too.
 * One transaction — an exception rolls everything back, so a failed sync can
 * never leave SQLite half-written.
 */
export function replaceAllData(s: {
  trackers: Tracker[]
  entries: Entry[]
  milestones: Milestone[]
  tombstones: Tombstone[]
}): void {
  const db = getDb()
  db.executeSync('BEGIN')
  try {
    db.executeSync('DELETE FROM trackers')
    db.executeSync('DELETE FROM entries')
    db.executeSync('DELETE FROM milestones')
    db.executeSync('DELETE FROM tombstones')
    for (const t of s.trackers) writeTrackerRow(t)
    for (const e of s.entries) writeEntryRow(e)
    for (const m of s.milestones) writeMilestoneRow(m)
    for (const tb of s.tombstones) insertTombstone(tb)
    db.executeSync('COMMIT')
  } catch (err) {
    db.executeSync('ROLLBACK')
    throw err
  }
}
```

- [ ] **Step 2: Write the sync orchestrator**

Create `src/features/trackers/sync/syncService.ts`:

```ts
import type { QueryClient } from '@tanstack/react-query'
import * as repo from '@features/trackers/db/repository'
import { useAppStore } from '@store/useAppStore'
import { buildSnapshot, emptySnapshot, mergeSnapshots } from './snapshot'
import { readBackup, writeBackup } from './icloud'

/**
 * Manual iCloud sync (the Sync Now button): local ⊕ cloud → both.
 *
 *   1. snapshot local SQLite (everything, incl. archived + tombstones)
 *   2. read the cloud backup (missing file → empty snapshot)
 *   3. merge (pure LWW; deletes win — see snapshot.ts)
 *   4. apply merged result to SQLite (transaction)
 *   5. write merged snapshot back to iCloud
 *   6. record lastSyncedAt + refresh every query
 *
 * Ordering makes failures safe: if the cloud WRITE (5) fails after the local
 * apply (4), lastSyncedAt stays unset, so the next run re-merges the same
 * data — the operation is idempotent. Errors propagate to the caller (the
 * screen shows the alert).
 */
export async function runSync(qc: QueryClient): Promise<void> {
  const local = buildSnapshot(
    repo.listAllTrackers(),
    repo.listAllEntries(),
    repo.listAllMilestones(),
    repo.listTombstones()
  )
  const cloud = (await readBackup()) ?? emptySnapshot()
  const merged = mergeSnapshots(local, cloud)
  repo.replaceAllData(merged)
  await writeBackup(merged)
  useAppStore.getState().setLastSyncedAt(new Date().toISOString())
  await qc.invalidateQueries()
}
```

- [ ] **Step 3: Add the stats hook**

In `src/features/trackers/queries/index.ts` add the import and hook:

```ts
import { countPending } from '@features/trackers/sync/snapshot'
```

```ts
/**
 * Sync & Backup screen stats. Keyed on lastSyncedAt so a completed sync
 * refetches; runSync's blanket invalidateQueries() also covers it.
 */
export function useSyncStats(lastSyncedAt: string | null) {
  return useQuery({
    queryKey: ['syncStats', lastSyncedAt],
    queryFn: () => {
      const trackers = repo.listAllTrackers()
      const entries = repo.listAllEntries()
      const milestones = repo.listAllMilestones()
      const tombstones = repo.listTombstones()
      return {
        trackers: trackers.length,
        logs: entries.length,
        pending: countPending(
          { trackers, entries, milestones, tombstones },
          lastSyncedAt
        )
      }
    }
  })
}
```

- [ ] **Step 4: Verify suite + typecheck**

Run: `yarn test && yarn tsc && yarn lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/trackers/db/repository.ts src/features/trackers/sync/syncService.ts src/features/trackers/queries/index.ts
git commit -m "feat(sync): runSync orchestrator, transactional replaceAllData, useSyncStats

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: i18n — `sync.*` strings (en + vi)

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/vi.json`

**Interfaces:**
- Produces the `sync.*` keys Task 9's UI consumes. Both files MUST stay key-for-key in sync.

- [ ] **Step 1: Add the keys**

In `en.json`, insert a top-level `"sync"` object after the `"set"` object:

```json
"sync": {
  "row": "Sync & Backup",
  "rowSub": "Back up to iCloud",
  "title": "iCloud Sync",
  "enabledBody": "Your data is backed up and synced between your devices.",
  "disabledBody": "Back up your trackers to iCloud and sync them across your devices. Your data stays private in your iCloud.",
  "unavailableBody": "iCloud is not available. Sign in to iCloud in the Settings app and make sure iCloud Drive is turned on.",
  "enable": "Enable Sync & Backup",
  "disable": "Disable Sync & Backup",
  "syncNow": "Sync Now",
  "stats": "You're syncing {{trackers}} trackers and {{logs}} logs.",
  "pending": "{{count}} changes not synced yet",
  "upToDate": "Everything is synced",
  "lastSynced": "Last synced: {{time}}",
  "neverSynced": "Not synced yet — tap Sync Now",
  "errTitle": "Sync failed",
  "errBody": "Could not sync with iCloud. Check your connection and try again.",
  "errNewer": "This backup was created by a newer version of Kite. Please update the app."
}
```

In `vi.json`, the same object in the same position:

```json
"sync": {
  "row": "Sync & Backup",
  "rowSub": "Sao lưu qua iCloud",
  "title": "iCloud Sync",
  "enabledBody": "Dữ liệu của bạn đang được sao lưu và đồng bộ giữa các thiết bị.",
  "disabledBody": "Sao lưu mục tiêu lên iCloud và đồng bộ giữa các thiết bị của bạn. Dữ liệu luôn riêng tư trong iCloud của bạn.",
  "unavailableBody": "iCloud chưa sẵn sàng. Hãy đăng nhập iCloud trong ứng dụng Cài đặt và bật iCloud Drive.",
  "enable": "Bật Sync & Backup",
  "disable": "Tắt Sync & Backup",
  "syncNow": "Đồng bộ ngay",
  "stats": "Đang đồng bộ {{trackers}} mục tiêu và {{logs}} lượt ghi.",
  "pending": "{{count}} thay đổi chưa đồng bộ",
  "upToDate": "Đã đồng bộ tất cả",
  "lastSynced": "Đồng bộ lần cuối: {{time}}",
  "neverSynced": "Chưa đồng bộ — bấm Đồng bộ ngay",
  "errTitle": "Đồng bộ thất bại",
  "errBody": "Không thể đồng bộ với iCloud. Kiểm tra kết nối rồi thử lại.",
  "errNewer": "Bản sao lưu này được tạo bởi phiên bản Kite mới hơn. Vui lòng cập nhật ứng dụng."
}
```

- [ ] **Step 2: Verify key parity + JSON validity**

Run:

```bash
node -e "
const en = require('./src/i18n/locales/en.json');
const vi = require('./src/i18n/locales/vi.json');
const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' && !Array.isArray(v) ? keys(v, p + k + '.') : [p + k]);
const a = new Set(keys(en)), b = new Set(keys(vi));
const missing = [...a].filter((k) => !b.has(k)).concat([...b].filter((k) => !a.has(k)));
console.log(missing.length ? 'MISSING: ' + missing.join(', ') : 'OK — en/vi in sync');
"
```

Expected: `OK — en/vi in sync`.

- [ ] **Step 3: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/vi.json
git commit -m "feat(sync): en/vi strings for Sync & Backup

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: UI — Cloud icons, navigation, Settings row, `SyncBackupScreen`

**Files:**
- Modify: `src/features/trackers/icons.ts`
- Modify: `src/navigation/types.ts`
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/screens/settings/SettingsScreen.tsx`
- Create: `src/screens/settings/SyncBackupScreen.tsx`

**Interfaces:**
- Consumes: `useSyncStats` (Task 7), `runSync` (Task 7), `SnapshotError` (Task 3), store fields (Task 6), `sync.*` strings (Task 8), `useIsCloudAvailable` from `react-native-cloud-storage`.
- Produces: route `SyncBackup: undefined` in `RootStackParamList`; `Icons.Cloud` / `Icons.CloudOff`; the screen itself. No unit tests (screens aren't unit-tested in this project) — device verification in Task 10.

- [ ] **Step 1: Add cloud icons**

In `src/features/trackers/icons.ts`: add `Cloud` and `CloudOff` to the lucide import list, and to the `Icons` map (after `Download`):

```ts
  Cloud,
  CloudOff,
```

- [ ] **Step 2: Register the route**

`src/navigation/types.ts` — add to `RootStackParamList`:

```ts
  SyncBackup: undefined
```

`src/navigation/RootNavigator.tsx` — import and register:

```ts
import { SyncBackupScreen } from '@screens/settings/SyncBackupScreen'
```

```tsx
        <Stack.Screen name='SyncBackup' component={SyncBackupScreen} />
```

- [ ] **Step 3: Create `SyncBackupScreen`**

Create `src/screens/settings/SyncBackupScreen.tsx`:

```tsx
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Button, Spinner, Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useQueryClient } from '@tanstack/react-query'
import { useIsCloudAvailable } from 'react-native-cloud-storage'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@navigation/types'
import { Icons } from '@features/trackers/icons'
import { runSync } from '@features/trackers/sync/syncService'
import { SnapshotError } from '@features/trackers/sync/snapshot'
import { useSyncStats } from '@features/trackers/queries'
import { useAppStore } from '@store/useAppStore'
import { useAlert } from '@components/ui'
import { useThemeColors } from '@hooks/useThemeColors'

type Nav = NativeStackNavigationProp<RootStackParamList>

/**
 * Strides-style iCloud Sync screen (iOS only — the Settings row that leads
 * here is Platform-gated). Manual sync only: nothing runs in the background;
 * the user taps Sync Now and runSync() merges local SQLite with the iCloud
 * backup. On a fresh install the same tap pulls everything back down.
 */
export function SyncBackupScreen() {
  const nav = useNavigation<Nav>()
  const { t } = useTranslation()
  const c = useThemeColors()
  const insets = useSafeAreaInsets()
  const alert = useAlert()
  const qc = useQueryClient()

  const cloudOk = useIsCloudAvailable()
  const enabled = useAppStore((s) => s.icloudSyncEnabled)
  const setEnabled = useAppStore((s) => s.setIcloudSyncEnabled)
  const lastSyncedAt = useAppStore((s) => s.lastSyncedAt)
  const { data: stats } = useSyncStats(lastSyncedAt)
  const [syncing, setSyncing] = useState(false)

  const onSyncNow = async () => {
    setSyncing(true)
    try {
      await runSync(qc)
    } catch (err) {
      const newer =
        err instanceof SnapshotError && err.code === 'newer_version'
      alert({
        title: t('sync.errTitle'),
        message: newer ? t('sync.errNewer') : t('sync.errBody'),
        variant: 'danger'
      })
    } finally {
      setSyncing(false)
    }
  }

  const body = !cloudOk
    ? t('sync.unavailableBody')
    : enabled
    ? t('sync.enabledBody')
    : t('sync.disabledBody')

  return (
    <View className='flex-1 bg-bg'>
      {/* appbar */}
      <View
        className='flex-row items-center gap-s2 bg-surface px-s2 pb-s2'
        style={{ paddingTop: insets.top + 6 }} // safe-area, runtime
      >
        <Pressable
          onPress={() => nav.goBack()}
          hitSlop={8}
          className='h-[38px] w-[38px] items-center justify-center'
        >
          <Icons.Back size={22} color={c.ink} />
        </Pressable>
        <Typography className='text-lg font-bold text-ink'>
          {t('sync.title')}
        </Typography>
      </View>

      <ScrollView
        contentContainerClassName='items-center gap-s4 px-s5 pt-s8'
        // runtime: safe-area inset + static offset
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <View className='h-[96px] w-[96px] items-center justify-center rounded-full bg-brand-weak'>
          {cloudOk ? (
            <Icons.Cloud size={46} color={c.brand} />
          ) : (
            <Icons.CloudOff size={46} color={c.ink3} />
          )}
        </View>

        <Typography className='text-2xl font-extrabold text-brand'>
          {t('sync.title')}
        </Typography>

        <Typography className='text-center text-base leading-6 text-ink-2'>
          {body}
        </Typography>

        {enabled ? (
          <View className='w-full items-center gap-s3 pt-s2'>
            <Button
              variant='primary'
              isDisabled={syncing || !cloudOk}
              onPress={onSyncNow}
              className='w-full'
            >
              {syncing ? <Spinner /> : <Button.Label>{t('sync.syncNow')}</Button.Label>}
            </Button>
            <Button
              variant='danger-soft'
              isDisabled={syncing}
              onPress={() => setEnabled(false)}
              className='w-full'
            >
              <Button.Label>{t('sync.disable')}</Button.Label>
            </Button>

            <Typography className='pt-s2 text-center text-sm text-ink-3'>
              {t('sync.stats', {
                trackers: stats?.trackers ?? 0,
                logs: stats?.logs ?? 0
              })}
            </Typography>
            {stats && stats.pending > 0 ? (
              <Typography className='text-center text-sm font-semibold text-pace-behind'>
                {t('sync.pending', { count: stats.pending })}
              </Typography>
            ) : (
              <Typography className='text-center text-sm text-pace-on'>
                {t('sync.upToDate')}
              </Typography>
            )}
            <Typography className='text-center text-xs text-ink-3'>
              {lastSyncedAt
                ? t('sync.lastSynced', {
                    time: new Date(lastSyncedAt).toLocaleString()
                  })
                : t('sync.neverSynced')}
            </Typography>
          </View>
        ) : (
          <View className='w-full pt-s2'>
            <Button
              variant='primary'
              isDisabled={!cloudOk}
              onPress={() => setEnabled(true)}
              className='w-full'
            >
              <Button.Label>{t('sync.enable')}</Button.Label>
            </Button>
          </View>
        )}
      </ScrollView>
    </View>
  )
}
```

- [ ] **Step 4: Add the Settings row (iOS only)**

In `src/screens/settings/SettingsScreen.tsx`:

1. Add `Platform` to the react-native import:

```ts
import { AppState, Platform, Pressable, ScrollView, View } from 'react-native'
```

2. Add navigation imports (after the existing imports):

```ts
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@navigation/types'
```

3. Inside `SettingsScreen()`, add:

```ts
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
```

4. In the `{/* data */}` `<Group>`, insert as the FIRST child (above the Export `Pressable`) — iCloud is an Apple-only service, so the row is hidden entirely on Android:

```tsx
            {Platform.OS === 'ios' ? (
              <Pressable
                onPress={() => nav.navigate('SyncBackup')}
                className='flex-row items-center gap-s3 border-b border-line p-s4 active:opacity-80'
              >
                <View className='h-[34px] w-[34px] items-center justify-center rounded-sm-k bg-surface-2'>
                  <Icons.Cloud size={18} color={c.ink} />
                </View>
                <View className='flex-1'>
                  <Typography className='text-base font-semibold text-ink'>
                    {t('sync.row')}
                  </Typography>
                  <Typography className='mt-[1px] text-xs text-ink-3'>
                    {t('sync.rowSub')}
                  </Typography>
                </View>
                <Icons.Chevron size={18} color={c.ink3} />
              </Pressable>
            ) : null}
```

- [ ] **Step 5: Verify**

Run: `yarn tsc && yarn lint && yarn test`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/trackers/icons.ts src/navigation/types.ts src/navigation/RootNavigator.tsx src/screens/settings/SettingsScreen.tsx src/screens/settings/SyncBackupScreen.tsx
git commit -m "feat(sync): Sync & Backup screen + iOS-only Settings row

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Native iCloud capability + device verification + docs

**Files:**
- Modify: `ios/` (pods, Xcode project — capability step is done IN XCODE)
- Modify: `CLAUDE.md` (document the sync subsystem)

**Interfaces:**
- Consumes: everything above. This is the only task that needs a Mac GUI + an iCloud-signed-in device/simulator; flag any step you cannot perform for the human.

- [ ] **Step 1: Install pods**

Run: `cd ios && pod install && cd ..`
Expected: `react-native-cloud-storage` pod appears in the install output.

- [ ] **Step 2: Add the iCloud capability (Xcode — manual)**

In Xcode: open `ios/Kite.xcworkspace` → target **Kite** → **Signing & Capabilities** → **+ Capability** → **iCloud** → tick **iCloud Documents** → add/select container **`iCloud.com.kite.app`**. Xcode creates/updates `ios/Kite/Kite.entitlements` with:

```xml
<key>com.apple.developer.icloud-container-identifiers</key>
<array><string>iCloud.com.kite.app</string></array>
<key>com.apple.developer.icloud-services</key>
<array><string>CloudDocuments</string></array>
<key>com.apple.developer.ubiquity-container-identifiers</key>
<array><string>iCloud.com.kite.app</string></array>
```

(If working non-interactively: report this as a REQUIRED HUMAN STEP and stop this task until done. Commit the `.entitlements` + `project.pbxproj` changes Xcode makes.)

- [ ] **Step 3: Device verification checklist**

Build: `yarn ios` on a simulator/device **signed in to iCloud** (Simulator: Settings → sign in with Apple ID; iCloud Drive on).

1. Settings tab shows **Sync & Backup** row (iOS). On an Android build/emulator the row is absent.
2. Screen shows the disabled state → tap **Enable Sync & Backup**.
3. Stats line shows real counts; pending counter equals total rows (never synced).
4. Tap **Sync Now** → spinner → "Everything is synced", "Last synced" appears.
5. Log a new entry on Today, return → pending shows 1 change → Sync → 0.
6. Delete a tracker → pending ≥ 1 (tombstone) → Sync → 0.
7. **The reinstall test (the whole point):** delete the app → reinstall (`yarn ios`) → Settings → Sync & Backup → Enable → Sync Now → ALL trackers/entries/milestones return; archived stay archived; the deleted tracker from step 6 does NOT return.
8. Sign out of iCloud (or use a signed-out simulator) → screen shows the unavailable state; buttons disabled; no crash.
9. Switch language to VI → all sync screen strings are Vietnamese; dark mode → screen renders correctly.

- [ ] **Step 4: Update CLAUDE.md**

In `CLAUDE.md`, under the `src/features/trackers/` bullet list (after the `notifications.ts` bullet), add:

```markdown
- `sync/` — iOS-only manual iCloud Sync & Backup (Settings → Sync & Backup).
  `snapshot.ts` (pure, unit-tested): the `/kite-backup.json` format
  (`SNAPSHOT_VERSION`), `mergeSnapshots` (per-record last-write-wins on
  `updatedAt`, deletes win via `tombstones`, children of a deleted tracker are
  cascade-dropped) and `countPending`. `icloud.ts`: thin
  `react-native-cloud-storage` wrapper (AppData scope — survives uninstall).
  `syncService.ts`: `runSync(qc)` = read cloud → merge → `replaceAllData`
  (transaction) → write cloud → set `lastSyncedAt` (MMKV) → invalidate all
  queries. Every save stamps `updatedAt`; deletes write a tombstone row.
  Requires the iCloud Documents capability (`iCloud.com.kite.app`) in Xcode.
```

Also update the "Zustand + MMKV hold ONLY app settings" line to mention `icloudSyncEnabled`/`lastSyncedAt` are settings-level sync state (allowed), and remove nothing else.

- [ ] **Step 5: Final full check + commit**

Run: `yarn test && yarn tsc && yarn lint`
Expected: clean.

```bash
git add ios/ CLAUDE.md
git commit -m "feat(sync): iCloud entitlements + docs for Sync & Backup

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
