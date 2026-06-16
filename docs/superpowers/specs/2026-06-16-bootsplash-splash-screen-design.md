# Splash screen with react-native-bootsplash

**Date:** 2026-06-16
**Status:** Approved, ready for implementation plan

## Goal

Replace the default React Native launch screens with a proper, flicker-free
splash that shows the Kite logo centered on a solid `#f4f5f1` background, and
hide it from JS once first-launch work (SQLite open + migrate) is done. No
white flash on launch, smooth fade into the app.

## Decisions

- **Library:** [`react-native-bootsplash`](https://github.com/zoontek/react-native-bootsplash)
  — native splash that the OS shows before JS loads, hidden via a JS call.
- **Center image:** `src/assets/images/logo_app.png` (1024×1024, RGBA with
  transparency — same asset as the app icon, for branding consistency).
- **Background:** `#f4f5f1` — matches the app's `--color-bg` token (global.css),
  so the transition from splash to app is seamless.
- **Content:** logo only. No tagline, no animation. The existing
  `splash.tagline` i18n key is left untouched (may be used elsewhere later).
- **Logo width:** start at `180` px; trivially adjustable by regenerating.

## Environment

- React Native `0.85.3`, React `19.2.3`.
- iOS entry: `ios/Kite/AppDelegate.swift`; launch screen
  `ios/Kite/LaunchScreen.storyboard` (will be regenerated).
- Android entry: `android/app/src/main/java/com/kite/app/MainActivity.kt`;
  themes in `android/app/src/main/res/values/styles.xml`.

## Architecture / flow

1. **Install** `react-native-bootsplash` (a native module) + `cd ios && pod install`.
2. **Generate native assets** with the library CLI from the logo:
   ```
   npx react-native-bootsplash generate src/assets/images/logo_app.png \
     --platforms=android,ios --background=F4F5F1 --logo-width=180
   ```
   Produces the iOS storyboard + asset catalog and Android `bootsplash.xml` +
   drawables, overwriting the default `LaunchScreen.storyboard`.
3. **Wire native init** (per the generator's printed instructions):
   - **iOS** `AppDelegate.swift`: call `RNBootSplash.initWithStoryboard("BootSplash", rootView: ...)`
     inside `application(_:didFinishLaunchingWithOptions:)`.
   - **Android** `MainActivity.kt`: `RNBootSplash.init(this, R.style.BootTheme)`
     in `onCreate` **before** `super.onCreate(...)`; add a `BootTheme` style in
     `styles.xml` and point the launch activity at it.
4. **Hide from JS** in `App.tsx`: keep the existing `useEffect`, and after
   `getDb()` completes (SQLite open + migrated) call
   `RNBootSplash.hide({ fade: true })`. This holds the splash up until the DB is
   ready, avoiding a blank flash and avoiding a premature hide.

## Files touched

- `package.json` + lockfile (`yarn.lock`)
- `ios/Podfile.lock`
- `ios/Kite/AppDelegate.swift`
- `ios/Kite/LaunchScreen.storyboard` (regenerated)
- iOS asset catalog (generated `BootSplash` imageset + colors)
- `android/app/src/main/java/com/kite/app/MainActivity.kt`
- `android/app/src/main/res/values/styles.xml`
- `android/app/src/main/res/drawable*` + `values` (generated bootsplash assets)
- `App.tsx`

## Testing / verification

No unit tests apply (native config + a one-line hide call; bootsplash isn't
exercisable in Jest). Verify on simulator/device:

- Cold launch shows the logo centered on `#f4f5f1` with no white flash.
- Splash fades out into the app once the DB is ready.
- Both iOS and Android.

Per CLAUDE.md / memory, native changes require a **full native rebuild**
(`yarn ios` / `yarn android`), not a Metro reload.

## Out of scope

- Tagline overlay on the splash.
- Animation / Lottie splash.
- Dark-mode splash variant (app is light-mode only today).
