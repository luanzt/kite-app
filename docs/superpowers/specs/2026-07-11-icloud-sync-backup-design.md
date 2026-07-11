# iCloud Sync & Backup — Design

**Date:** 2026-07-11
**Status:** Approved approach (A) — iCloud Drive file sync with row-level merge

## Goal

Add an iOS-only **Sync & Backup** feature (Strides-style) so a user's tracker
data survives app deletion/reinstall and can be shared across their own iOS
devices. Sync is **manual only**: nothing happens in the background; the user
opens the Sync & Backup screen and taps **Sync now**. On a fresh install (or a
second device), enabling sync and tapping Sync pulls everything down.

Android: the feature is completely hidden (`Platform.OS === 'ios'` guard). No
Google Drive support in this version.

## Approach chosen

**A. iCloud Drive file sync with per-record merge (chosen).** The app writes a
single JSON snapshot of all data to the app's private iCloud container
(`AppData` scope — invisible in the Files app). Sync = read cloud snapshot →
merge with local rows (last-write-wins per record, deletes win via tombstones)
→ apply merged result to SQLite → write merged snapshot back to iCloud.
Because the file lives in the user's iCloud, it persists after the app is
uninstalled.

Rejected: **B. CloudKit record sync** (needs a custom Swift native module,
change tokens, push — unjustified for manual sync). **C.
NSUbiquitousKeyValueStore** (1 MB cap — too small for entries).

**Library:** `react-native-cloud-storage` (kuatsu) — fs-like JS API
(`readFile`/`writeFile`/`exists`), `useIsCloudAvailable()` hook, `AppData`
scope, New-Architecture/Nitro based (the project already ships
`react-native-nitro-modules`). iOS-only usage here.

## Architecture

```
SyncBackupScreen ──> syncService.runSync()
                        │ 1. read /kite-backup.json from iCloud (AppData)
                        │ 2. mergeSnapshots(localSnapshot, cloudSnapshot)   [pure]
                        │ 3. apply merged snapshot to SQLite (transaction)
                        │ 4. write merged snapshot back to iCloud
                        │ 5. set lastSyncedAt; invalidate all TanStack queries
                        ▼
     src/features/trackers/sync/{snapshot.ts, icloud.ts, syncService.ts}
```

New module: `src/features/trackers/sync/`

- **`snapshot.ts`** — pure, DB-free, unit-tested:
  - `Snapshot` type: `{ schemaVersion: 1, exportedAt: string, trackers: Tracker[], entries: Entry[], milestones: Milestone[], tombstones: Tombstone[] }`
    (domain camelCase shapes via the existing row mappers, decoupled from SQL
    column names).
  - `buildSnapshot(trackers, entries, milestones, tombstones)`.
  - `mergeSnapshots(local, cloud): Snapshot` — merge rules below.
  - `countPending(snapshot, lastSyncedAt)` — pure pending-change count: rows
    whose `updatedAt` (fallback `createdAt`) is after `lastSyncedAt`, plus
    tombstones with `deletedAt` after it; `lastSyncedAt = null` → everything
    counts as pending.
- **`icloud.ts`** — thin wrapper over `CloudStorage`: `readBackup()`,
  `writeBackup(snapshot)`, `backupExists()`, all against `/kite-backup.json`
  in `CloudStorageScope.AppData`. Handles the "file exists in iCloud but not
  yet downloaded locally" case (trigger download / retry per the library's
  API) — implementation detail to confirm during the plan.
- **`syncService.ts`** — orchestration (steps in the diagram above). Applying
  the merged snapshot = full table replace (`DELETE` + `INSERT` of merged
  rows) inside a single transaction — deterministic and simple at this data
  size. On any cloud-read error the local DB is untouched.

### Merge rules (last-write-wins + tombstones)

- Per table, records are merged **by `id`**: union of both sides; when both
  have a record, the one with the higher `updatedAt` wins (fall back to
  `createdAt` when `updatedAt` is missing — pre-feature rows).
- **Tombstones always win** over a live record with the same id (no
  resurrection/undelete — accepted).
- **Cascade filter:** entries and milestones whose `trackerId` is tombstoned
  are dropped during merge (so deleting a tracker doesn't require per-entry
  tombstones).
- Tombstones are kept indefinitely (rows are tiny) — accepted for v1.
- Accepted trade-off: if two devices edit the same record between syncs, the
  later-synced edit wins that record.

## Schema changes (auto-migrating — append ColumnSpecs only)

- Add `updated_at TEXT` to **trackers, entries, milestones**.
  `repository.ts` sets it (ISO string) on every save/upsert. Existing rows
  keep `NULL` (merge falls back to `createdAt`).
- New table **`tombstones`**: `{ id TEXT PRIMARY KEY, table_name TEXT NOT NULL DEFAULT '', deleted_at TEXT NOT NULL DEFAULT '' }`.
  - `deleteTracker(id)` → one tombstone (`table_name='trackers'`) — its
    entries/milestones are handled by the merge cascade filter.
  - `deleteEntry(id)` → tombstone (`table_name='entries'`).
  - Milestone deletion (if/when exposed) → tombstone (`table_name='milestones'`).

## Settings state (Zustand + MMKV — settings only, per project rule)

- `icloudSyncEnabled: boolean` (default `false`).
- `lastSyncedAt: string | null` (default `null`).

## UI

### Settings screen (iOS only)

New row **Sync & Backup** at the top of the existing **Data** group, rendered
only when `Platform.OS === 'ios'`. Cloud icon, chevron; navigates to the new
`SyncBackup` stack screen (add to `RootStackParamList` + `RootNavigator`).

### `SyncBackupScreen` (`src/screens/settings/SyncBackupScreen.tsx`)

Strides-style: centered cloud hero icon, title "iCloud Sync", then one of
three states:

1. **iCloud unavailable** (not signed in / iCloud Drive off — via
   `useIsCloudAvailable()`): explanation text + hint to sign in to iCloud in
   iOS Settings. Enable/Sync actions disabled.
2. **Sync disabled**: description of what sync does + primary button
   **"Enable Sync & Backup"** (just flips the setting — first real transfer
   happens on Sync now).
3. **Sync enabled**:
   - Description: "Your data is backed up and synced between your devices."
   - Stats line: "You're syncing X trackers and Y logs." (repository counts).
   - Pending line: "Z changes not synced yet" + "Last synced: <relative time>"
     (hidden when Z = 0 and never synced-state handled).
   - Primary button **"Sync now"** → runs `runSync()`; shows `Spinner` inside
     the button while running (HeroUI pattern: `isDisabled` + conditional
     Spinner); success → refresh stats + `lastSyncedAt`; failure → `useAlert()`
     dialog with i18n message.
   - Secondary/danger-soft button **"Disable Sync & Backup"** — flips the
     setting off; cloud data is **not** deleted (a "delete cloud backup"
     action is out of scope for v1).

All strings via i18n under a new `sync.*` namespace in both `en.json` and
`vi.json` (key-for-key). Styling per project rules: `Typography`, Tailwind
`className`, lucide icons, HeroUI components.

### Data-flow / refresh

`runSync()` invalidates the whole query cache (`queryClient.invalidateQueries()`)
so Today/Trackers/detail screens reflect merged data immediately. The pending
count on the screen comes from a small query hook (e.g. `usePendingSyncCount`)
keyed off `lastSyncedAt`.

## Error handling

- iCloud unavailable → state 1 UI; no calls made.
- Cloud read fails → alert, local DB untouched, `lastSyncedAt` unchanged.
- Cloud write fails after local apply → alert; local keeps merged data,
  `lastSyncedAt` unchanged, so the next Sync re-merges (idempotent) and
  re-writes.
- Malformed/incompatible snapshot (`schemaVersion` newer than app) → alert
  asking the user to update the app; nothing applied.
- All sync errors are caught — sync can never crash the app or corrupt SQLite
  (transaction rollback on apply failure).

## Native setup (one-time)

1. `yarn add react-native-cloud-storage` + `cd ios && pod install`.
2. Xcode → target **Kite** → Signing & Capabilities → add **iCloud**
   capability → enable **iCloud Documents** → container
   `iCloud.com.kite.app`.
3. Testing requires a real device or a simulator signed in to iCloud.

## Testing strategy

- **Unit (TDD, Jest):** `snapshot.ts` — merge LWW, tombstone wins, cascade
  filter, `createdAt` fallback, pending count; snapshot build/round-trip.
  Repository row-mapping additions (`updated_at`, tombstones) via the existing
  op-sqlite mock patterns where applicable.
- **Device (manual):** enable → sync → verify file survives uninstall →
  reinstall → enable + sync pulls data back; two-simulator/device merge check;
  iCloud-signed-out state.

## Out of scope (v1)

- Background/automatic sync, CloudKit push, Google Drive/Android, deleting the
  cloud backup from the app, undelete/resurrection of deleted records,
  tombstone garbage collection.
