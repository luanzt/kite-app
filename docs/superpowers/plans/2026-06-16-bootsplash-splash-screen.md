# Bootsplash Splash Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the Kite logo centered on a `#f4f5f1` background as a native splash screen via `react-native-bootsplash`, hidden from JS after SQLite open+migrate, with a fade-out.

**Architecture:** `react-native-bootsplash` is a native module. The OS shows a themed/storyboard splash before JS loads; we generate its assets from `logo_app.png` with the library's CLI, wire native init (iOS `customize(_:)` override, Android `BootTheme` + `RNBootSplash.init`), then call `BootSplash.hide({ fade: true })` from `App.tsx` once `getDb()` resolves.

**Tech Stack:** React Native 0.85.3, react-native-bootsplash, react-native-screens 4.25.2 (≥4.16 → requires the `RNScreensFragmentFactory` Android variant), Swift AppDelegate, Kotlin MainActivity, op-sqlite (existing `getDb()`).

---

## Notes for the implementer (read first)

- **No Lottie cleanup needed.** `lottie-react-native` is NOT a dependency and is not imported anywhere; the `ios/Pods/Local Podspecs/lottie-react-native.podspec.json` artifact is stale and disappears on the next `pod install`. Do not add Lottie.
- **react-native-screens is 4.25.2 (≥ 4.16.0).** The Android `MainActivity.kt` MUST use the `RNScreensFragmentFactory()` variant (Task 4). Using the plain variant would crash on launch.
- **Native changes require a full rebuild** (`yarn ios` / `yarn android`), not a Metro reload (per CLAUDE.md / memory). Verification is on simulator/device.
- **`yarn tsc` must stay clean** before any commit (CLAUDE.md).
- Do **not** touch the pre-existing unstaged changes in `src/i18n/locales/{en,vi}.json`; they are unrelated. Only `git add` the specific files each task names.

---

## Task 1: Install react-native-bootsplash

**Files:**
- Modify: `package.json` (dependencies)
- Modify: `yarn.lock`
- Modify: `ios/Podfile.lock`

- [ ] **Step 1: Add the dependency**

Run:
```bash
yarn add react-native-bootsplash
```
Expected: `react-native-bootsplash` appears under `dependencies` in `package.json`; `yarn.lock` updated.

- [ ] **Step 2: Install the iOS pod**

Run:
```bash
cd ios && pod install && cd ..
```
Expected: output includes `Installing RNBootSplash (…)`. `ios/Podfile.lock` now lists `RNBootSplash`.

- [ ] **Step 3: Verify the JS module resolves and type-checks**

Run:
```bash
node -e "require.resolve('react-native-bootsplash'); console.log('ok')" && yarn tsc
```
Expected: prints `ok`, then `yarn tsc` exits 0 (no errors).

- [ ] **Step 4: Commit**

```bash
git add package.json yarn.lock ios/Podfile.lock
git commit -m "chore: add react-native-bootsplash dependency"
```

---

## Task 2: Generate native splash assets from the logo

This runs the library CLI to produce the iOS storyboard + asset catalog and the
Android `BootTheme` drawables, all from `logo_app.png` on a `#f4f5f1` background.

**Files (created/overwritten by the CLI):**
- Modify: `ios/Kite/LaunchScreen.storyboard` (regenerated as the BootSplash storyboard)
- Create: iOS asset catalog entries `ios/Kite/Images.xcassets/BootSplashLogo.imageset/*` and a `BootSplash` background color
- Create: `android/app/src/main/res/values/colors.xml` (or appends `bootsplash_background`)
- Create: `android/app/src/main/res/drawable*/bootsplash_logo.png` (density buckets)
- Modify: `android/app/src/main/res/values/styles.xml` (CLI may append a `BootTheme` — verified/fixed in Task 4)

- [ ] **Step 1: Run the generator**

Run:
```bash
npx react-native-bootsplash generate src/assets/images/logo_app.png \
  --platforms=android,ios \
  --background=F4F5F1 \
  --logo-width=180
```
Expected: the CLI prints "✨ Done" and lists the iOS storyboard + asset catalog
and Android drawable files it wrote. It also prints manual-wiring instructions
for `AppDelegate.swift` and `MainActivity.kt` — those are done in Tasks 3 and 4.

- [ ] **Step 2: Confirm the generated assets exist**

Run:
```bash
ls ios/Kite/BootSplash.storyboard ios/Kite/LaunchScreen.storyboard 2>/dev/null; \
ls -d ios/Kite/Images.xcassets/BootSplashLogo.imageset 2>/dev/null; \
ls android/app/src/main/res/drawable*/bootsplash_logo.png 2>/dev/null; \
grep -i bootsplash android/app/src/main/res/values/colors.xml 2>/dev/null
```
Expected: a BootSplash storyboard exists (the CLI names it `BootSplash.storyboard`
and updates `LaunchScreen.storyboard` to reference it, OR regenerates
`LaunchScreen.storyboard` directly — either is fine), the `BootSplashLogo`
imageset exists, at least one `bootsplash_logo.png` drawable exists, and
`colors.xml` contains a `bootsplash_background` (= `#F4F5F1`) entry.

> If the CLI named the iOS storyboard `BootSplash.storyboard`, that exact name
> (`"BootSplash"`) is what Task 3 passes to `initWithStoryboard`. If it only
> updated `LaunchScreen.storyboard`, pass `"LaunchScreen"` instead. **Note which
> name exists — Task 3 Step 1 depends on it.**

- [ ] **Step 3: Commit the generated assets**

```bash
git add ios/Kite android/app/src/main/res
git commit -m "feat(splash): generate bootsplash assets (logo on #f4f5f1)"
```

---

## Task 3: Wire iOS native init (AppDelegate.swift)

For RN 0.85's `RCTReactNativeFactory` setup, initialize the splash by overriding
`customize(_ rootView:)` on `ReactNativeDelegate` (NOT a manual call in
`didFinishLaunchingWithOptions`).

**Files:**
- Modify: `ios/Kite/AppDelegate.swift`

- [ ] **Step 1: Add the import and the `customize` override**

In `ios/Kite/AppDelegate.swift`, add `import RNBootSplash` to the import block at
the top (after `import ReactAppDependencyProvider`):

```swift
import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import RNBootSplash
```

Then add a `customize` override to the `ReactNativeDelegate` class so the whole
class reads:

```swift
class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }

  override func customize(_ rootView: RCTRootView) {
    super.customize(rootView)
    RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)
  }
}
```

> Use `"BootSplash"` if Task 2 produced `BootSplash.storyboard`; use
> `"LaunchScreen"` if the CLI only updated `LaunchScreen.storyboard`. Match the
> filename (without extension) that exists from Task 2 Step 2.

- [ ] **Step 2: Commit**

```bash
git add ios/Kite/AppDelegate.swift
git commit -m "feat(splash): init bootsplash in iOS AppDelegate"
```

> iOS build verification happens in Task 6 (one rebuild covers both platforms' wiring).

---

## Task 4: Wire Android native init (MainActivity.kt + styles.xml)

react-native-screens is 4.25.2 (≥ 4.16.0), so use the `RNScreensFragmentFactory`
variant of `onCreate`.

**Files:**
- Modify: `android/app/src/main/java/com/kite/app/MainActivity.kt`
- Modify: `android/app/src/main/res/values/styles.xml`

- [ ] **Step 1: Ensure the `BootTheme` style exists**

Open `android/app/src/main/res/values/styles.xml`. If Task 2's CLI already added
a `BootTheme`, leave it. If not, make the file read exactly:

```xml
<resources>

    <!-- Base application theme. -->
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
        <!-- Customize your theme here. -->
        <item name="android:editTextBackground">@drawable/rn_edit_text_material</item>
    </style>

    <style name="BootTheme" parent="Theme.BootSplash">
        <item name="bootSplashBackground">@color/bootsplash_background</item>
        <item name="bootSplashLogo">@drawable/bootsplash_logo</item>
        <item name="postBootSplashTheme">@style/AppTheme</item>
    </style>

</resources>
```

- [ ] **Step 2: Add the bootsplash init to MainActivity**

Replace the entire contents of
`android/app/src/main/java/com/kite/app/MainActivity.kt` with:

```kotlin
package com.kite.app

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory
import com.zoontek.rnbootsplash.RNBootSplash

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "Kite"

  override fun onCreate(savedInstanceState: Bundle?) {
    supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
    RNBootSplash.init(this, R.style.BootTheme) // initialize the splash screen
    super.onCreate(savedInstanceState)
  }

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
```

- [ ] **Step 3: Commit**

```bash
git add android/app/src/main/java/com/kite/app/MainActivity.kt android/app/src/main/res/values/styles.xml
git commit -m "feat(splash): init bootsplash in Android MainActivity + BootTheme"
```

> Android build verification happens in Task 6.

---

## Task 5: Hide the splash from JS after the DB is ready (App.tsx)

Hold the splash until `getDb()` resolves (SQLite open + migrated), then fade out.
`getDb()` is memoized and currently called fire-and-forget in `App.tsx`'s
`useEffect`; make that effect async so we can await it before hiding.

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Add the import**

In `App.tsx`, add the import alongside the other top-level imports (after
`import { initI18n } from '@i18n/index'`):

```tsx
import BootSplash from 'react-native-bootsplash'
```

- [ ] **Step 2: Hide after `getDb()` in the existing effect**

Replace the existing `useEffect` body in `App.tsx`:

```tsx
  useEffect(() => {
    getDb() // open + migrate on launch
    initNotifications() // request notification permission + create channel
  }, [])
```

with:

```tsx
  useEffect(() => {
    const ready = async () => {
      await getDb() // open + migrate on launch — hold splash until DB is ready
      initNotifications() // request notification permission + create channel
    }
    ready().finally(() => {
      BootSplash.hide({ fade: true })
    })
  }, [])
```

> `getDb()` is awaited so the splash stays up until the DB is open/migrated.
> `initNotifications()` stays fire-and-forget (a permission prompt must not block
> hiding the splash). `.finally` guarantees the splash hides even if `getDb()`
> rejects, so a DB error can never leave the user stuck on the splash.

- [ ] **Step 3: Type-check**

Run:
```bash
yarn tsc
```
Expected: exits 0, no errors. (Confirms the `react-native-bootsplash` types
resolve and the async effect is well-typed.)

- [ ] **Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat(splash): hide bootsplash after SQLite open+migrate"
```

---

## Task 6: Verify on simulator/device (manual)

No automated tests apply (native config + a hide call; bootsplash is not
exercisable in Jest). This task is manual verification — the implementer runs it
and reports results; do not mark complete on assumption.

**Files:** none (verification only).

- [ ] **Step 1: Clean type-check + lint**

Run:
```bash
yarn tsc && yarn lint
```
Expected: both exit 0.

- [ ] **Step 2: Rebuild and run iOS (full native build, not Metro reload)**

Run:
```bash
yarn ios
```
Expected at launch: the Kite logo appears centered on a `#f4f5f1` background,
then fades out into the app with **no white flash** between splash and app.

- [ ] **Step 3: Rebuild and run Android (full native build)**

Run:
```bash
yarn android
```
Expected at launch: same as iOS — logo centered on `#f4f5f1`, fades into the app,
no crash (confirms the `RNScreensFragmentFactory` wiring), no white flash.

- [ ] **Step 4: Confirm and report**

Confirm both platforms show the splash and transition cleanly. If the logo is
too large/small, regenerate with a different `--logo-width` (Task 2 Step 1) and
re-run. Report the verification outcome (pass/fail per platform) to the user.

---

## Self-review notes

- **Spec coverage:** install (T1), generate from `logo_app.png` on `#f4f5f1` (T2),
  iOS wiring (T3), Android wiring (T4), hide after `getDb()` with fade (T5),
  manual verify both platforms (T6). All spec decisions covered. Tagline/animation/
  dark-mode explicitly out of scope per spec — no tasks, intentionally.
- **react-native-screens ≥ 4.16 variant** is used in T4 (verified version 4.25.2),
  preventing a launch crash.
- **iOS init** uses the RN 0.85 `customize(_:)` override (corrected from the
  spec's older `didFinishLaunchingWithOptions` phrasing) — confirmed against the
  current AppDelegate.swift structure.
- **No Lottie task** — confirmed not a dependency; stale podspec is harmless.
- **Storyboard name ambiguity** (T2 Step 2 → T3 Step 1) is called out explicitly
  so the implementer passes the correct name to `initWithStoryboard`.
