# Export Data (CSV) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Settings → Export data row so a tap exports all tracker logs as a single CSV file and hands it to the native OS share sheet.

**Architecture:** A pure, unit-tested serializer (`export/csv.ts`) turns `Tracker[]` + `Entry[]` into an RFC 4180 CSV string (one row per entry, tracker info joined). The `SettingsScreen` handler reads the DB via the repository, base64-encodes the CSV, and calls `react-native-share`'s `Share.open` with a `data:` URI. No pre-export modal; the only guard is empty-data.

**Tech Stack:** React Native, TypeScript (strict), Jest, `react-native-share` (native), `js-base64` (pure JS), i18next.

## Global Constraints

- Package manager is **yarn**. After installing the native dep run `cd ios && pod install`.
- **`<Typography>` not `<Text>`**; style with Tailwind `className` not inline `style` (see CLAUDE.md). This task adds no new visible layout — it reuses the existing Export `Pressable`.
- **All visible strings via `t()`**; keep `src/i18n/locales/en.json` and `vi.json` key-for-key in sync. User data (tracker names, notes) is stored/exported verbatim, never translated.
- **op-sqlite is unavailable in Jest** — only the DB-free `csv.ts` is unit-tested; the screen glue + Share are verified on device/simulator.
- **TDD**: write the failing test first. `yarn tsc` and `yarn lint` must be clean before each commit.
- Repo reads available: `listAllTrackers(): Tracker[]` and `listAllEntries(): Entry[]` from `@features/trackers/db/repository` (both include archived).
- Domain types (`@features/trackers/types`): `Entry = { id, trackerId, date, value, note: string|null, createdAt }`; `Tracker` fields used: `name: string`, `type: TrackerType`, `unit: string|null`.

---

### Task 1: Pure CSV serializer

**Files:**
- Create: `src/features/trackers/export/csv.ts`
- Test: `src/features/trackers/export/__tests__/csv.test.ts`

**Interfaces:**
- Consumes: `Tracker`, `Entry` from `@features/trackers/types`.
- Produces:
  - `entriesToCsv(trackers: Tracker[], entries: Entry[]): string` — CSV text, BOM-prefixed, one header row + one row per entry, sorted by `date` asc then `createdAt` asc. Columns: `Date, Tracker, Type, Value, Unit, Note, Logged At`.
  - `exportFilename(now?: Date): string` → `kite-export-YYYY-MM-DD.csv`.

- [ ] **Step 1: Write the failing tests**

Create `src/features/trackers/export/__tests__/csv.test.ts`:

```ts
import { entriesToCsv, exportFilename } from '../csv'
import type { Tracker, Entry } from '@features/trackers/types'

const BOM = '﻿'
const HEADER = 'Date,Tracker,Type,Value,Unit,Note,Logged At'

function tracker(over: Partial<Tracker>): Tracker {
  return {
    id: 't1',
    name: 'Water',
    type: 'target',
    icon: 'drop',
    color: 'blue',
    unit: 'ml',
    direction: null,
    targetValue: null,
    startValue: null,
    accumulation: null,
    startDate: '2026-01-01',
    deadline: null,
    period: null,
    repeatDays: null,
    reminderTimes: [],
    goalNote: null,
    averageWindow: null,
    rollingDays: null,
    doneRule: null,
    progressBasis: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    archived: false,
    ...over
  }
}

function entry(over: Partial<Entry>): Entry {
  return {
    id: 'e1',
    trackerId: 't1',
    date: '2026-07-01',
    value: 500,
    note: null,
    createdAt: '2026-07-01T08:00:00.000Z',
    ...over
  }
}

describe('entriesToCsv', () => {
  it('emits a BOM + header row when there are no entries', () => {
    expect(entriesToCsv([], [])).toBe(BOM + HEADER)
  })

  it('joins tracker info and lays out columns in order', () => {
    const csv = entriesToCsv([tracker({})], [entry({})])
    const lines = csv.replace(BOM, '').split('\n')
    expect(lines[0]).toBe(HEADER)
    expect(lines[1]).toBe(
      '2026-07-01,Water,target,500,ml,,2026-07-01T08:00:00.000Z'
    )
  })

  it('leaves Unit blank when the tracker unit is null', () => {
    const csv = entriesToCsv(
      [tracker({ unit: null })],
      [entry({ value: 1 })]
    )
    const row = csv.replace(BOM, '').split('\n')[1]
    expect(row).toBe('2026-07-01,Water,target,1,,,2026-07-01T08:00:00.000Z')
  })

  it('sorts by date then createdAt', () => {
    const csv = entriesToCsv(
      [tracker({})],
      [
        entry({ id: 'b', date: '2026-07-02', createdAt: '2026-07-02T09:00:00.000Z', value: 2 }),
        entry({ id: 'a', date: '2026-07-01', createdAt: '2026-07-01T20:00:00.000Z', value: 1 }),
        entry({ id: 'c', date: '2026-07-01', createdAt: '2026-07-01T06:00:00.000Z', value: 3 })
      ]
    )
    const vals = csv
      .replace(BOM, '')
      .split('\n')
      .slice(1)
      .map((l) => l.split(',')[3])
    expect(vals).toEqual(['3', '1', '2'])
  })

  it('escapes commas, quotes and newlines per RFC 4180', () => {
    const csv = entriesToCsv(
      [tracker({ name: 'A, Inc "x"' })],
      [entry({ note: 'line1\nline2' })]
    )
    const row = csv.replace(BOM, '').split('\n').slice(1).join('\n')
    expect(row).toContain('"A, Inc ""x"""')
    expect(row).toContain('"line1\nline2"')
  })

  it('preserves UTF-8 note content', () => {
    const csv = entriesToCsv([tracker({})], [entry({ note: 'Chạy bộ 🏃' })])
    expect(csv).toContain('Chạy bộ 🏃')
  })

  it('emits a blank tracker cell when the tracker is missing', () => {
    const csv = entriesToCsv([], [entry({ trackerId: 'gone' })])
    const row = csv.replace(BOM, '').split('\n')[1]
    expect(row).toBe('2026-07-01,,,500,,,2026-07-01T08:00:00.000Z')
  })
})

describe('exportFilename', () => {
  it('formats as kite-export-YYYY-MM-DD.csv', () => {
    expect(exportFilename(new Date('2026-07-19T10:54:00.000Z'))).toBe(
      'kite-export-2026-07-19.csv'
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test src/features/trackers/export/__tests__/csv.test.ts`
Expected: FAIL — `Cannot find module '../csv'`.

- [ ] **Step 3: Write the implementation**

Create `src/features/trackers/export/csv.ts`:

```ts
import type { Tracker, Entry } from '@features/trackers/types'

const HEADER = ['Date', 'Tracker', 'Type', 'Value', 'Unit', 'Note', 'Logged At']
const BOM = '﻿'

/** RFC 4180: quote a field iff it contains a comma, quote, CR or LF; double internal quotes. */
function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) return '"' + value.replace(/"/g, '""') + '"'
  return value
}

function line(cells: string[]): string {
  return cells.map(csvField).join(',')
}

/**
 * Serialize every entry to one CSV row, joining its tracker's name/type/unit.
 * BOM-prefixed so Excel opens it as UTF-8. Rows sorted by date then createdAt.
 * A missing tracker (defensive) yields blank Tracker/Type/Unit cells.
 */
export function entriesToCsv(trackers: Tracker[], entries: Entry[]): string {
  const byId = new Map(trackers.map((t) => [t.id, t]))
  const sorted = [...entries].sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
  )
  const rows = sorted.map((e) => {
    const t = byId.get(e.trackerId)
    return line([
      e.date,
      t?.name ?? '',
      t?.type ?? '',
      String(e.value),
      t?.unit ?? '',
      e.note ?? '',
      e.createdAt
    ])
  })
  return BOM + [line(HEADER), ...rows].join('\n')
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** kite-export-YYYY-MM-DD.csv (local date). */
export function exportFilename(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = pad(now.getMonth() + 1)
  const d = pad(now.getDate())
  return `kite-export-${y}-${m}-${d}.csv`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test src/features/trackers/export/__tests__/csv.test.ts`
Expected: PASS (8 tests).

Note: the `exportFilename` test uses a UTC instant at 10:54 which is the same calendar day in the repo's timezone; if the runner's TZ shifts it, pin the test to `new Date(2026, 6, 19)` (local) instead.

- [ ] **Step 5: Verify typecheck + lint**

Run: `yarn tsc && yarn lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/trackers/export/csv.ts src/features/trackers/export/__tests__/csv.test.ts
git commit -m "feat(export): pure CSV serializer for tracker entries"
```

---

### Task 2: Install share + base64 dependencies

**Files:**
- Modify: `package.json` (deps added by yarn)
- Modify: `ios/Podfile.lock` (by pod install)

**Interfaces:**
- Produces: `Share` (default export) from `react-native-share`; `Base64` from `js-base64`. Consumed by Task 3.

- [ ] **Step 1: Add the dependencies**

Run:
```bash
yarn add react-native-share js-base64
```

- [ ] **Step 2: Install iOS pods**

Run:
```bash
cd ios && pod install && cd ..
```
Expected: Pod installation completes; `RNShare` appears in the output.

- [ ] **Step 3: Verify the modules resolve**

Run: `yarn tsc`
Expected: clean (no "Cannot find module 'react-native-share'"). `js-base64` ships its own types.

- [ ] **Step 4: Commit**

```bash
git add package.json yarn.lock ios/Podfile.lock
git commit -m "chore(export): add react-native-share and js-base64"
```

---

### Task 3: i18n strings

**Files:**
- Modify: `src/i18n/locales/en.json` (the `set` block)
- Modify: `src/i18n/locales/vi.json` (the `set` block)

**Interfaces:**
- Produces i18n keys consumed by Task 4: `set.exportSub` (changed), `set.exportEmptyTitle`, `set.exportEmptyMsg`.

- [ ] **Step 1: Update `en.json`**

In `src/i18n/locales/en.json`, change the `exportSub` value and add two keys in the `set` block. Replace:

```json
    "data": "Data", "export": "Export data", "exportSub": "Save a JSON backup",
```
with:
```json
    "data": "Data", "export": "Export data", "exportSub": "Export entries as CSV",
    "exportEmptyTitle": "Nothing to export", "exportEmptyMsg": "You haven't logged anything yet.",
```

- [ ] **Step 2: Update `vi.json`**

In `src/i18n/locales/vi.json`, replace:

```json
    "data": "Dữ liệu", "export": "Xuất dữ liệu", "exportSub": "Lưu bản sao JSON",
```
with:
```json
    "data": "Dữ liệu", "export": "Xuất dữ liệu", "exportSub": "Xuất log ra CSV",
    "exportEmptyTitle": "Chưa có gì để xuất", "exportEmptyMsg": "Bạn chưa ghi log nào cả.",
```

- [ ] **Step 3: Verify JSON is valid and keys are in sync**

Run:
```bash
node -e "const e=require('./src/i18n/locales/en.json').set, v=require('./src/i18n/locales/vi.json').set; for (const k of ['exportSub','exportEmptyTitle','exportEmptyMsg']) { if(!(k in e)||!(k in v)) throw new Error('missing '+k) } console.log('ok')"
```
Expected: `ok`.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/vi.json
git commit -m "feat(export): CSV export i18n strings"
```

---

### Task 4: Wire the Export handler in Settings

**Files:**
- Modify: `src/screens/settings/SettingsScreen.tsx`

**Interfaces:**
- Consumes: `entriesToCsv`, `exportFilename` (Task 1); `Share`, `Base64` (Task 2); `set.exportEmptyTitle`/`set.exportEmptyMsg` (Task 3); `listAllTrackers`, `listAllEntries` (repository); existing `alert` from `useAlert()`.

- [ ] **Step 1: Add imports**

In `src/screens/settings/SettingsScreen.tsx`, add near the other `@features` imports (after line 30):

```tsx
import Share from 'react-native-share'
import { Base64 } from 'js-base64'
import { listAllTrackers, listAllEntries } from '@features/trackers/db/repository'
import { entriesToCsv, exportFilename } from '@features/trackers/export/csv'
```

- [ ] **Step 2: Add the `onExport` handler**

Add this handler inside `SettingsScreen`, right after `onClearAll` (after line 129):

```tsx
  const onExport = async () => {
    const trackers = listAllTrackers()
    const entries = listAllEntries()
    if (entries.length === 0) {
      alert({
        title: t('set.exportEmptyTitle'),
        message: t('set.exportEmptyMsg')
      })
      return
    }
    try {
      const csv = entriesToCsv(trackers, entries)
      const b64 = Base64.encode(csv)
      await Share.open({
        url: `data:text/csv;base64,${b64}`,
        filename: exportFilename(),
        type: 'text/csv',
        failOnCancel: false,
        useInternalStorage: true // Android API 30+ base64 sharing
      })
    } catch {
      // Swallow user-cancel and native errors — export must never crash Settings.
    }
  }
```

- [ ] **Step 3: Attach the handler to the Export row**

In the Export `Pressable` (currently starts at line 284 with `className='flex-row items-center gap-s3 border-b border-line p-s4 active:opacity-80'` and no `onPress`), add `onPress={onExport}`:

```tsx
            <Pressable
              onPress={onExport}
              className='flex-row items-center gap-s3 border-b border-line p-s4 active:opacity-80'
            >
```

- [ ] **Step 4: Verify typecheck + lint**

Run: `yarn tsc && yarn lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/screens/settings/SettingsScreen.tsx
git commit -m "feat(export): wire Export data row to CSV share sheet"
```

---

### Task 5: Manual verification on simulator

**Files:** none (verification only).

- [ ] **Step 1: Run the app**

Run: `yarn ios` (and separately `yarn android` if Android is available). A JS-only reload will not pick up the new `react-native-share` native module — a full rebuild is required.

- [ ] **Step 2: Verify the happy path**

With at least one tracker that has logged entries (log one from Today if needed), open Settings → tap **Export data**. Expected: the native share sheet appears. Save to Files, open the CSV in Numbers/Excel, and confirm: header row, one row per log, correct Date/Tracker/Type/Value/Unit/Logged At, and Vietnamese notes render correctly.

- [ ] **Step 3: Verify escaping**

Add an entry whose note contains a comma and a double-quote (e.g. `Ran 5km, felt "great"`). Export again and confirm that field stays intact as one cell (not split across columns) when opened in a spreadsheet.

- [ ] **Step 4: Verify the empty guard**

On a fresh install / after Clear all data (no entries), tap Export data. Expected: the "Nothing to export" alert, no share sheet.

- [ ] **Step 5: Verify cancel is silent**

Open the share sheet and dismiss it. Expected: no crash, no error alert, Settings stays usable.

---

## Notes for the implementer

- Line numbers in Task 4 reference the file as of 2026-07-19; if they've drifted, anchor on the quoted code instead (the Export `Pressable` is the middle row in the DATA `Group`, between the iOS-only Sync row and the Clear all data row).
- Do not route tracker identity colors or add new inline styles — this task changes behavior only, not layout.
