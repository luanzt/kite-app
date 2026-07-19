# Export data — CSV (entries), native share sheet

**Date:** 2026-07-19
**Status:** Approved, ready for implementation plan

## Goal

Wire up the currently-presentational **Settings → Export data** row so a tap
exports the user's tracker data as a single CSV file and hands it to the OS
native share sheet (save to Files, send via Mail/AirDrop, etc.). Fully offline,
read-only, no login. This replaces the placeholder subtitle "Save a JSON backup".

## Decisions (locked)

- **Format:** CSV only (not JSON, not both).
- **Shape:** one CSV, one row per **entry** (log), with the entry's tracker
  info joined in. No milestones, no separate trackers file, no zip.
- **Delivery:** native share sheet via `react-native-share`. No pre-export
  modal / confirmation — export is non-destructive and the share sheet is
  itself the "where to send it" step. Tap → build → share directly. The only
  guard is empty-data (see below).
- **Type column:** raw English type key (`habit`/`target`/`average`/`project`),
  not localized — stable for analysis.
- **Value column:** raw numeric value (habit yes/no stays `1`/`0`).

## New dependencies

- **`react-native-share`** — native module, requires `cd ios && pod install`
  after install. Shares a base64 data URI with a filename; no filesystem lib
  needed. Android base64 sharing uses `useInternalStorage: true` (works on API
  30+ without `WRITE_EXTERNAL_STORAGE`).
- **`js-base64`** — pure JS (no pod install). Encodes the CSV string to base64
  for the data URI, handling UTF-8 correctly (Vietnamese notes / emoji). RN's
  `btoa` is unreliable and not UTF-8-safe, so we do not use it.

## Architecture

Data flow: **Settings tap → `onExport` → repository reads → pure `csv.ts` →
base64 → `Share.open`**. Follows the repo's offline-first layering; the pure
serializer is isolated and unit-tested, the native/DB glue lives in the screen.

### New module: `src/features/trackers/export/csv.ts` (pure, DB-free)

Unit-tested per the repo's testing strategy (op-sqlite is unavailable in Jest,
so all DB-free logic goes here).

```ts
// One row per entry, tracker info joined via a trackerId -> Tracker lookup.
export function entriesToCsv(trackers: Tracker[], entries: Entry[]): string

// kite-export-YYYY-MM-DD.csv
export function exportFilename(now?: Date): string
```

- **Columns (header row):** `Date, Tracker, Type, Value, Unit, Note, Logged At`
  - `Date` = entry.date (`YYYY-MM-DD`)
  - `Tracker` = tracker.name (verbatim, never translated)
  - `Type` = tracker.type (raw key)
  - `Value` = entry.value (raw number, stringified)
  - `Unit` = tracker.unit (may be empty)
  - `Note` = entry.note (verbatim, may contain commas/quotes/newlines)
  - `Logged At` = entry.createdAt
- **Sort:** by `date` ascending, then `createdAt` ascending.
- **Escaping:** RFC 4180 via a private `csvField(v: string)` helper — wrap a
  field in double quotes and double any internal `"` whenever it contains `,`,
  `"`, `\n`, or `\r`. This is the highest-risk correctness area (user notes are
  free text) → covered heavily by tests.
- **BOM:** prepend `﻿` so Excel opens the file as UTF-8.
- **Missing tracker (defensive):** if an entry's `trackerId` isn't in the
  lookup, still emit the row with blank Tracker/Type/Unit. In practice all are
  present because we read via `listAllTrackers()` (includes archived).

### Wiring: `src/screens/settings/SettingsScreen.tsx`

Add `onExport` and attach it to the existing Export data `Pressable` (remove the
presentational-only state):

1. Read `listAllTrackers()` + `listAllEntries()` from the repository (archived
   trackers included, so old entries keep a name).
2. **Empty guard:** if `entries.length === 0` → `useAlert()` "No data to
   export" and return (opening a share sheet with an empty file is pointless).
3. `const csv = entriesToCsv(trackers, entries)`
4. `const b64 = Base64.encode(csv)`
5. `Share.open({ url: 'data:text/csv;base64,' + b64, filename:
   exportFilename(), type: 'text/csv', failOnCancel: false, useInternalStorage:
   true })`
6. **Error handling:** wrap in try/catch and swallow (user-cancel and native
   errors), mirroring `notifications.ts` — a failed/cancelled share must never
   crash Settings. `failOnCancel: false` already avoids the cancel rejection.

### i18n (`src/i18n/locales/en.json` + `vi.json`, kept key-for-key in sync)

- Change `set.exportSub`: "Save a JSON backup" → **"Export entries as CSV"** /
  VI **"Xuất log ra CSV"**.
- Add keys for the empty-data alert title/message. Native share errors are
  swallowed silently (no i18n key needed). Wire through `t()` — no hardcoded
  strings.

## Error handling summary

| Case | Behavior |
|---|---|
| No entries | `useAlert` "No data to export", no share sheet |
| User cancels share | Silent (`failOnCancel: false`) |
| Native share error | Caught + swallowed, Settings stays usable |
| Note with `,` `"` newline | Escaped per RFC 4180 |
| UTF-8 note (VN/emoji) | Preserved via `js-base64` + BOM |

## Testing

- **Unit — `src/features/trackers/export/__tests__/csv.test.ts`:**
  - header row + column order
  - one row per entry; tracker fields joined correctly
  - sort by date then createdAt
  - `csvField` escaping: comma, embedded `"` (doubled), `\n`, `\r`, and a field
    needing none (left bare)
  - UTF-8 note content preserved
  - empty entries → header row only (still valid CSV) — note the screen guards
    empty before calling, but the function itself stays total
  - BOM prefix present
  - `exportFilename` format for a fixed date
- **Manual (device/simulator):** tap Export → share sheet appears → save to
  Files → open the CSV in Numbers/Excel and confirm columns, VN notes, and a
  note containing a comma all render correctly. Verify empty-data alert on a
  fresh install. Verify on both iOS and Android.

## Out of scope (YAGNI)

- JSON export, milestones CSV, multi-file/zip export.
- Re-import of an exported CSV.
- Date-range / per-tracker filtered export.
- A loading spinner (build is synchronous and fast).
