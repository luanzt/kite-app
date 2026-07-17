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
import {
  initializeTelemetry,
  recordAppError,
  trackEntryLogged,
  trackScreen,
  trackTrackerSaved
} from '@utils/telemetry'

jest.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: jest.fn(() => 'analytics'),
  logEvent: jest.fn(() => Promise.resolve()),
  logScreenView: jest.fn(() => Promise.resolve()),
  setAnalyticsCollectionEnabled: jest.fn(() => Promise.resolve())
}))

jest.mock('@react-native-firebase/crashlytics', () => ({
  getCrashlytics: jest.fn(() => 'crashlytics'),
  log: jest.fn(),
  recordError: jest.fn(),
  setCrashlyticsCollectionEnabled: jest.fn(() => Promise.resolve())
}))

describe('telemetry', () => {
  beforeEach(() => jest.clearAllMocks())

  it('disables production collection in development builds', async () => {
    await initializeTelemetry()

    expect(getAnalytics).toHaveBeenCalled()
    expect(getCrashlytics).toHaveBeenCalled()
    expect(setAnalyticsCollectionEnabled).toHaveBeenCalledWith(
      'analytics',
      false
    )
    expect(setCrashlyticsCollectionEnabled).toHaveBeenCalledWith(
      'crashlytics',
      false
    )
  })

  it('tracks screens without route parameters', async () => {
    await trackScreen('TrackerDetail')

    expect(logScreenView).toHaveBeenCalledWith('analytics', {
      screen_class: 'TrackerDetail',
      screen_name: 'TrackerDetail'
    })
  })

  it('tracks only the tracker type when a tracker is saved', async () => {
    await trackTrackerSaved('habit', true)
    await trackTrackerSaved('target', false)

    expect(logEvent).toHaveBeenNthCalledWith(
      1,
      'analytics',
      'tracker_created',
      {
        tracker_type: 'habit'
      }
    )
    expect(logEvent).toHaveBeenNthCalledWith(
      2,
      'analytics',
      'tracker_updated',
      {
        tracker_type: 'target'
      }
    )
  })

  it('tracks an entry without its value, note, date, or tracker id', async () => {
    await trackEntryLogged('average')

    expect(logEvent).toHaveBeenCalledWith('analytics', 'entry_logged', {
      tracker_type: 'average'
    })
  })

  it('records errors with a non-sensitive context label', () => {
    const error = new Error('database failed')

    recordAppError(error, 'app_startup')

    expect(log).toHaveBeenCalledWith('crashlytics', 'app_startup')
    expect(recordError).toHaveBeenCalledWith('crashlytics', error)
  })
})
