# Firebase setup

Kite uses Firebase Analytics and Crashlytics in release builds. Development
builds disable collection so local testing does not affect production metrics.

1. Create a Firebase project and add these two apps:
   - Android package: `com.kite.app`
   - iOS bundle ID: `com.kite.habitapp`
2. Download `google-services.json` to `android/app/google-services.json`.
3. Download `GoogleService-Info.plist` to
   `ios/Kite/GoogleService-Info.plist`. The Xcode project already includes this
   path in the Kite target.
4. Run `yarn install-pod` and rebuild both native apps.

The two configuration files are intentionally gitignored. Keep a copy in the
team's secret/configuration store and restore them on new development machines
and CI runners.

Analytics collects automatic sessions, engagement, and active-user metrics.
The app additionally sends screen names, `tracker_created`, `tracker_updated`,
and `entry_logged`. Custom events contain only `tracker_type`; tracker names,
notes, values, dates, and local IDs are never sent.
