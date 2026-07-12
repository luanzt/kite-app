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
  // (fresh install). triggerSync asks iOS to fetch it — best-effort, since the
  // installed lib's typings mark it @provider icloud only; readFile below
  // surfaces real failures regardless.
  try {
    await CloudStorage.triggerSync(BACKUP_PATH, SCOPE)
  } catch {
    // ignore — best-effort download hint
  }
  const json = await CloudStorage.readFile(BACKUP_PATH, SCOPE)
  return parseSnapshot(json)
}

export async function writeBackup(snapshot: Snapshot): Promise<void> {
  await CloudStorage.writeFile(BACKUP_PATH, JSON.stringify(snapshot), SCOPE)
}
