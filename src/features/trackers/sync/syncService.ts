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
