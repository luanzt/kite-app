import {
  getAnalytics,
  logEvent,
  logScreenView,
  setAnalyticsCollectionEnabled
} from '@react-native-firebase/analytics'
import {
  getCrashlytics,
  log,
  recordError,
  setCrashlyticsCollectionEnabled
} from '@react-native-firebase/crashlytics'
import type { TrackerType } from '@features/trackers/types'

/** Keep development traffic out of production MAU, retention, and crash data. */
export async function initializeTelemetry() {
  try {
    const enabled = !__DEV__
    await Promise.all([
      setAnalyticsCollectionEnabled(getAnalytics(), enabled),
      setCrashlyticsCollectionEnabled(getCrashlytics(), enabled)
    ])
  } catch {
    // Missing/temporary telemetry configuration must not block app startup.
  }
}

export async function trackScreen(screenName: string) {
  try {
    await logScreenView(getAnalytics(), {
      screen_class: screenName,
      screen_name: screenName
    })
  } catch {
    // Telemetry must never affect navigation or offline app behavior.
  }
}

export async function trackTrackerSaved(
  trackerType: TrackerType,
  isNew: boolean
) {
  try {
    await logEvent(
      getAnalytics(),
      isNew ? 'tracker_created' : 'tracker_updated',
      { tracker_type: trackerType }
    )
  } catch {
    // Telemetry must never affect local tracker writes.
  }
}

export async function trackEntryLogged(trackerType: TrackerType) {
  try {
    await logEvent(getAnalytics(), 'entry_logged', {
      tracker_type: trackerType
    })
  } catch {
    // Telemetry must never affect local entry writes.
  }
}

export function recordAppError(error: unknown, context: string) {
  try {
    const crashlytics = getCrashlytics()
    log(crashlytics, context)
    recordError(
      crashlytics,
      error instanceof Error ? error : new Error(String(error))
    )
  } catch {
    // Crash reporting is best-effort and must not mask the original failure.
  }
}
