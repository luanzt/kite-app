# Notification Settings & Permission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Notifications row to Settings whose toggle reflects the user's reminder preference, kept honest against the real OS permission with a first-launch permission flow and a "Go to settings" path when the OS is blocking.

**Architecture:** Two independent variables — `notifyEnabled` (app preference, persisted in MMKV via Zustand) and `osGranted` (read live from notifee). The toggle displays the preference; a red triangle + inline note appear only on conflict (`notifyEnabled && !osGranted`). `notifications.ts` stays a pure module (no store/i18n); `App.tsx` orchestrates first-launch permission; a pure `decideToggleAction` helper is unit-tested.

**Tech Stack:** React Native 0.85, `@notifee/react-native` 9.1.8, Zustand + persist over `react-native-mmkv`, i18next, HeroUI Native, Jest.

## Global Constraints

- Use `<Typography>` from `heroui-native`, never `<Text>`.
- Style with Tailwind `className`, never inline `style` (exception: runtime safe-area / genuinely dynamic values via `StyleSheet`). Never interpolate a value into a class string.
- Icons only from `lucide-react-native`, sized/colored via `size`/`color` props.
- Overlays via HeroUI Native (use the existing `useAlert()`), never RN `Modal`.
- All user-visible strings via `t()`; keep `en.json` and `vi.json` key-for-key in sync.
- Named exports only. `yarn tsc` and `yarn lint` must be clean; write the failing test first (TDD).
- `notifications.ts` must stay free of the i18n runtime and the store — translated strings and preference flags are passed in as arguments.

---

### Task 1: Store — `notifyEnabled` + `permissionAsked`

**Files:**
- Modify: `src/store/useAppStore.ts`

**Interfaces:**
- Produces: `useAppStore` state gains `notifyEnabled: boolean` (default `false`), `permissionAsked: boolean` (default `false`), `setNotifyEnabled: (v: boolean) => void`, `markPermissionAsked: () => void`.

- [ ] **Step 1: Add the fields + setters to the store**

Edit `src/store/useAppStore.ts` — extend the `AppState` type and the store body:

```ts
type AppState = {
  themeMode: ThemeMode
  language: Language | null
  notifyEnabled: boolean
  permissionAsked: boolean
  setThemeMode: (mode: ThemeMode) => void
  toggleTheme: () => void
  setLanguage: (lang: Language) => void
  setNotifyEnabled: (v: boolean) => void
  markPermissionAsked: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      themeMode: 'light',
      setThemeMode: (mode: ThemeMode) => set({ themeMode: mode }),
      toggleTheme: () =>
        set((state) => ({
          themeMode: state.themeMode === 'light' ? 'dark' : 'light'
        })),
      language: null,
      setLanguage: (lang: Language) => set({ language: lang }),
      notifyEnabled: false,
      permissionAsked: false,
      setNotifyEnabled: (v: boolean) => set({ notifyEnabled: v }),
      markPermissionAsked: () => set({ permissionAsked: true })
    }),
    {
      name: 'app-storage',
      storage: mmkvZustandStorage
    }
  )
)
```

- [ ] **Step 2: Typecheck**

Run: `yarn tsc`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/store/useAppStore.ts
git commit -m "feat(store): add notifyEnabled + permissionAsked preferences"
```

---

### Task 2: Pure helper — `decideToggleAction`

**Files:**
- Create: `src/features/trackers/notificationToggle.ts`
- Test: `src/features/trackers/__tests__/notificationToggle.test.ts`

**Interfaces:**
- Produces: `type ToggleAction = 'toggle' | 'request'` and `decideToggleAction(osGranted: boolean, notifyEnabled: boolean): ToggleAction`.

Decision map (from spec Phase B):
- `(true,  *)`     → `'toggle'` (OS granted → free on/off)
- `(false, true)`  → `'toggle'` (denied but on → allow turning off)
- `(false, false)` → `'request'` (denied + off → try to request; caller alerts if the request fails)

- [ ] **Step 1: Write the failing test**

Create `src/features/trackers/__tests__/notificationToggle.test.ts`:

```ts
import { decideToggleAction } from '@features/trackers/notificationToggle'

describe('decideToggleAction', () => {
  it('OS granted, currently off → toggle (turn on)', () => {
    expect(decideToggleAction(true, false)).toBe('toggle')
  })
  it('OS granted, currently on → toggle (turn off)', () => {
    expect(decideToggleAction(true, true)).toBe('toggle')
  })
  it('OS denied, currently on → toggle (allow turning off)', () => {
    expect(decideToggleAction(false, true)).toBe('toggle')
  })
  it('OS denied, currently off → request permission', () => {
    expect(decideToggleAction(false, false)).toBe('request')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/features/trackers/__tests__/notificationToggle.test.ts`
Expected: FAIL — cannot find module `notificationToggle`.

- [ ] **Step 3: Write the implementation**

Create `src/features/trackers/notificationToggle.ts`:

```ts
/** The action a notification-toggle tap should take, given the two states. */
export type ToggleAction = 'toggle' | 'request'

/**
 * Pure decision for a notification toggle tap.
 * - OS granted → free on/off ('toggle').
 * - OS denied but preference on → allow turning off ('toggle').
 * - OS denied and preference off → try to request ('request'); the caller
 *   shows the "Open Settings" alert if the request comes back denied.
 */
export function decideToggleAction(
  osGranted: boolean,
  notifyEnabled: boolean
): ToggleAction {
  if (osGranted) return 'toggle'
  if (notifyEnabled) return 'toggle'
  return 'request'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/features/trackers/__tests__/notificationToggle.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/trackers/notificationToggle.ts src/features/trackers/__tests__/notificationToggle.test.ts
git commit -m "feat(trackers): pure decideToggleAction helper + tests"
```

---

### Task 3: notifications.ts — status, open-settings, cancel-all, reschedule-all, slim init

**Files:**
- Modify: `src/features/trackers/notifications.ts`

**Interfaces:**
- Consumes: `getPermissionStatus` uses `notifee.getNotificationSettings()` + `AuthorizationStatus`; `cancelAllReminders`/`rescheduleAllReminders` use `repo.listTrackers()`.
- Produces:
  - `getPermissionStatus(): Promise<boolean>` — true if AUTHORIZED or PROVISIONAL.
  - `openSystemNotificationSettings(): Promise<void>` — wraps `notifee.openNotificationSettings()`.
  - `cancelAllReminders(): Promise<void>` — cancels reminders for every tracker.
  - `rescheduleAllReminders(bodyFor: (t: Tracker) => string): Promise<void>` — reschedules every habit/target that has a `reminderTime`.
  - `initNotifications(): Promise<void>` — now only `ensureReminderChannel()`.

- [ ] **Step 1: Add the repo import + new functions**

At the top of `src/features/trackers/notifications.ts`, add the repository import beneath the existing imports:

```ts
import * as repo from '@features/trackers/db/repository'
```

Replace the body of `initNotifications` and append the four new functions. New `initNotifications`:

```ts
/** Initialise notifications at app launch: create the Android channel only.
 *  First-launch permission is requested by the launch orchestrator (App.tsx),
 *  not here, so the request happens exactly once and can set the preference. */
export async function initNotifications(): Promise<void> {
  await ensureReminderChannel()
}
```

Append at the end of the file:

```ts
/** Current OS notification permission — true if granted (or provisional). */
export async function getPermissionStatus(): Promise<boolean> {
  try {
    const settings = await notifee.getNotificationSettings()
    return (
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
    )
  } catch {
    return false
  }
}

/** Open the OS notification-settings page for this app. */
export async function openSystemNotificationSettings(): Promise<void> {
  try {
    await notifee.openNotificationSettings()
  } catch {
    // ignore — best-effort
  }
}

/** Cancel reminders for every tracker (used when the preference is turned off). */
export async function cancelAllReminders(): Promise<void> {
  try {
    const trackers = repo.listTrackers()
    await Promise.all(trackers.map((t) => cancelTrackerReminders(t.id)))
  } catch {
    // ignore — best-effort
  }
}

/** (Re)schedule reminders for every habit/target that has a reminderTime.
 *  `bodyFor` supplies the already-translated body per tracker, so this module
 *  stays free of the i18n runtime. */
export async function rescheduleAllReminders(
  bodyFor: (t: Tracker) => string
): Promise<void> {
  try {
    const trackers = repo.listTrackers()
    await Promise.all(
      trackers.map((t) => scheduleTrackerReminders(t, bodyFor(t)))
    )
  } catch {
    // ignore — best-effort
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `yarn tsc`
Expected: no errors (`AuthorizationStatus`, `notifee`, `Tracker`, `cancelTrackerReminders`, `scheduleTrackerReminders` are already imported/defined in this file).

- [ ] **Step 3: Run the existing suite (nothing should break)**

Run: `yarn test`
Expected: all suites pass (op-sqlite is mocked; these new functions aren't unit-tested — verified on device per the DB-code convention).

- [ ] **Step 4: Commit**

```bash
git add src/features/trackers/notifications.ts
git commit -m "feat(trackers): notification status/open-settings + cancel/reschedule-all helpers"
```

---

### Task 4: App.tsx — first-launch permission orchestration

**Files:**
- Modify: `App.tsx`

**Interfaces:**
- Consumes: `initNotifications`, `requestNotificationPermission` from `notifications.ts`; `useAppStore.getState()` for `permissionAsked`, `setNotifyEnabled`, `markPermissionAsked`.

- [ ] **Step 1: Update imports**

In `App.tsx`, change the notifications import and add the store import:

```ts
import {
  initNotifications,
  requestNotificationPermission
} from '@features/trackers/notifications'
import { useAppStore } from '@store/useAppStore'
```

- [ ] **Step 2: Replace the launch `ready()` body**

Replace the `ready` function inside the `useEffect`:

```ts
    const ready = async () => {
      await getDb() // open + migrate on launch — hold splash until DB is ready
      await initNotifications() // create the Android channel
      // First launch only: ask once, and let the preference follow the result.
      const { permissionAsked, setNotifyEnabled, markPermissionAsked } =
        useAppStore.getState()
      if (!permissionAsked) {
        const granted = await requestNotificationPermission()
        setNotifyEnabled(granted)
        markPermissionAsked()
      }
    }
```

- [ ] **Step 3: Typecheck**

Run: `yarn tsc`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add App.tsx
git commit -m "feat(app): request notification permission once on first launch"
```

---

### Task 5: Gate scheduling on `notifyEnabled`

**Files:**
- Modify: `src/features/trackers/queries/index.ts`

**Interfaces:**
- Consumes: `useAppStore` for `notifyEnabled`; `scheduleTrackerReminders`, `cancelTrackerReminders`.

- [ ] **Step 1: Import the store**

Add near the top of `src/features/trackers/queries/index.ts`:

```ts
import { useAppStore } from '@store/useAppStore'
```

- [ ] **Step 2: Gate the schedule call in `useSaveTracker`**

Replace the `mutationFn` of `useSaveTracker` (keep the existing `tr` translation logic added earlier):

```ts
    mutationFn: async (t: Tracker) => {
      repo.insertTracker(t)
      // Only schedule when the user has notifications enabled; always safe to
      // cancel-then-(maybe)-reschedule via scheduleTrackerReminders.
      const enabled = useAppStore.getState().notifyEnabled
      if (enabled) {
        const body =
          t.type === 'target'
            ? tr('notification.targetBody')
            : tr('notification.habitBody')
        await scheduleTrackerReminders(t, body)
      } else {
        await cancelTrackerReminders(t.id)
      }
    },
```

Ensure `cancelTrackerReminders` is imported (it already is alongside `scheduleTrackerReminders`).

- [ ] **Step 3: Typecheck**

Run: `yarn tsc`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/trackers/queries/index.ts
git commit -m "feat(trackers): only schedule reminders when notifyEnabled is on"
```

---

### Task 6: i18n keys

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/vi.json`

**Interfaces:**
- Produces: `set.notifications`, `set.notifOsOff`, `set.goSettings`, `set.notifBlockedTitle`, `set.notifBlockedMsg`, `set.openSettings`.

- [ ] **Step 1: Add keys to the `set` namespace in `en.json`**

In `src/i18n/locales/en.json`, inside the `"set"` object, add these keys (append after `"offline"`, keeping valid JSON):

```json
    "notifications": "Notifications",
    "notifOsOff": "Notifications are turned off in system settings.",
    "goSettings": "Go to settings",
    "notifBlockedTitle": "Enable notifications",
    "notifBlockedMsg": "Notifications are turned off for Kite. Open Settings to allow reminders.",
    "openSettings": "Open Settings"
```

- [ ] **Step 2: Add the same keys to `vi.json`**

In `src/i18n/locales/vi.json`, inside the `"set"` object:

```json
    "notifications": "Thông báo",
    "notifOsOff": "Thông báo đang bị tắt trong Cài đặt hệ thống.",
    "goSettings": "Đi tới cài đặt",
    "notifBlockedTitle": "Bật thông báo",
    "notifBlockedMsg": "Thông báo cho Kite đang bị tắt. Mở Cài đặt để cho phép nhắc nhở.",
    "openSettings": "Mở Cài đặt"
```

- [ ] **Step 3: Validate JSON + key parity**

Run:
```bash
python3 -c "import json; en=json.load(open('src/i18n/locales/en.json')); vi=json.load(open('src/i18n/locales/vi.json')); k=['notifications','notifOsOff','goSettings','notifBlockedTitle','notifBlockedMsg','openSettings']; print('en ok', all(x in en['set'] for x in k)); print('vi ok', all(x in vi['set'] for x in k)); print('set parity', sorted(en['set'])==sorted(vi['set']))"
```
Expected: `en ok True`, `vi ok True`, `set parity True`.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/vi.json
git commit -m "i18n: notification settings row + permission strings (en/vi)"
```

---

### Task 7: Settings — Notifications row, conflict warning, tap handler

**Files:**
- Modify: `src/screens/settings/SettingsScreen.tsx`

**Interfaces:**
- Consumes: `useAppStore` (`notifyEnabled`, `setNotifyEnabled`); `getPermissionStatus`, `requestNotificationPermission`, `openSystemNotificationSettings`, `cancelAllReminders`, `rescheduleAllReminders` from `notifications.ts`; `decideToggleAction` from `notificationToggle.ts`; `useAlert` from `@components/ui`; `Toggle` from `@components/ui`; RN `AppState`; `useTranslation`.

- [ ] **Step 1: Add imports**

At the top of `src/screens/settings/SettingsScreen.tsx` add:

```ts
import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { useAlert, Toggle } from '@components/ui'
import { decideToggleAction } from '@features/trackers/notificationToggle'
import {
  getPermissionStatus,
  requestNotificationPermission,
  openSystemNotificationSettings,
  cancelAllReminders,
  rescheduleAllReminders
} from '@features/trackers/notifications'
```

(Existing imports for `Pressable/ScrollView/View`, `Typography`, `useTranslation`, `useAppStore`, `Icons`, `PACE_COLOR`, `KiteLogo` stay. `AlertTriangle` will be added via the Icons map in Step 2 if not present — check `Icons` first; if it lacks a triangle, import `AlertTriangle` directly from `lucide-react-native`.)

- [ ] **Step 2: Read live OS permission (mount + foreground)**

Inside `SettingsScreen`, after the existing store selectors, add:

```ts
  const { t } = useTranslation()
  const alert = useAlert()
  const notifyEnabled = useAppStore((s) => s.notifyEnabled)
  const setNotifyEnabled = useAppStore((s) => s.setNotifyEnabled)
  const [osGranted, setOsGranted] = useState(true)

  useEffect(() => {
    let active = true
    const refresh = () =>
      getPermissionStatus().then((g) => active && setOsGranted(g))
    refresh()
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh()
    })
    return () => {
      active = false
      sub.remove()
    }
  }, [])

  // Body used when (re)scheduling all reminders, translated per tracker type.
  const reminderBodyFor = (tr: { type: string }) =>
    tr.type === 'target'
      ? t('notification.targetBody')
      : t('notification.habitBody')

  const conflict = notifyEnabled && !osGranted
```

(`t` may already be declared at the top of the component — if so, don't redeclare it; keep a single `const { t } = useTranslation()`.)

- [ ] **Step 3: Tap handler**

Add inside the component:

```ts
  const onToggleNotifications = async () => {
    const action = decideToggleAction(osGranted, notifyEnabled)
    if (action === 'toggle') {
      const next = !notifyEnabled
      setNotifyEnabled(next)
      if (next) {
        await rescheduleAllReminders(reminderBodyFor)
      } else {
        await cancelAllReminders()
      }
      return
    }
    // action === 'request' → OS denied and currently off; try to request.
    const granted = await requestNotificationPermission()
    setOsGranted(granted)
    if (granted) {
      setNotifyEnabled(true)
      await rescheduleAllReminders(reminderBodyFor)
    } else {
      alert({
        title: t('set.notifBlockedTitle'),
        message: t('set.notifBlockedMsg'),
        confirmLabel: t('set.openSettings'),
        onConfirm: openSystemNotificationSettings,
        cancelLabel: t('common.close')
      })
    }
  }
```

- [ ] **Step 4: Render the Notifications row inside the Appearance group**

In the "appearance" `<Group>`, add a Notifications row. Change the Dark-mode row to have a bottom border (already does) and insert the Notifications row BEFORE the Language row (or after Dark mode). Use the existing row layout; the toggle uses the shared `Toggle`. Insert:

```tsx
            <View className='gap-s1 border-b border-line'>
              <View className='flex-row items-center gap-s3 p-s4'>
                <View className='h-[34px] w-[34px] items-center justify-center rounded-sm-k bg-surface-2'>
                  <Icons.Bell size={18} color='#1b1e18' />
                </View>
                <Typography className='flex-1 text-base font-semibold text-ink'>
                  {t('set.notifications')}
                </Typography>
                {conflict ? (
                  <View className='mr-s2'>
                    <Icons.Warn size={18} color={PACE_COLOR.behind} />
                  </View>
                ) : null}
                <Toggle value={notifyEnabled} onChange={onToggleNotifications} />
              </View>
              {conflict ? (
                <View className='flex-row flex-wrap items-center gap-s1 px-s4 pb-s3'>
                  <Typography className='text-xs text-pace-behind'>
                    {t('set.notifOsOff')}
                  </Typography>
                  <Pressable onPress={openSystemNotificationSettings} hitSlop={6}>
                    <Typography className='text-xs font-bold text-brand underline'>
                      {t('set.goSettings')}
                    </Typography>
                  </Pressable>
                </View>
              ) : null}
            </View>
```

Notes on the icons: `Icons.Bell` and `Icons.Warn` (= lucide `TriangleAlert`) both exist in `src/features/trackers/icons.ts` — use them directly. `Toggle`'s `onChange` receives the next boolean but we ignore it — `onToggleNotifications` computes the transition itself (it must, because a denied-off tap must NOT flip the toggle).

- [ ] **Step 5: Typecheck + lint**

Run: `yarn tsc && yarn eslint src/screens/settings/SettingsScreen.tsx`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/screens/settings/SettingsScreen.tsx
git commit -m "feat(settings): notifications row with permission-aware toggle + conflict note"
```

---

### Task 8: Manual verification on iOS simulator

**Files:** none (verification only).

- [ ] **Step 1: Run the app**

Run: `yarn ios` (Task 4 changes App.tsx JS only; but Task in the prior branch added the Android manifest permission — for Android you must `yarn android` to pick it up. iOS JS reload is enough here.)

- [ ] **Step 2: Verify the matrix**

- First launch (fresh install → `xcrun simctl uninstall booted com.kite.app` then reinstall): permission dialog appears once; accepting sets the toggle ON, denying sets it OFF.
- OS granted: toggle flips freely on/off with no prompt.
- OS denied + toggle off: tapping shows the "Enable notifications / Open Settings" alert.
- OS denied + toggle on: red triangle + "Notifications are turned off… Go to settings" note appear; tapping the toggle turns it OFF (note + triangle vanish); "Go to settings" opens the system page.
- Flip OS permission in Settings, return to the app: the Settings screen re-reads permission on foreground and the conflict indicator updates.

- [ ] **Step 3: Push-notification display sanity (optional)**

Confirm a delivered notification still renders (foreground + background) using the earlier `xcrun simctl push booted com.kite.app <payload.apns>` method.

---

## Self-Review

**Spec coverage:**
- State model (`notifyEnabled`, `permissionAsked`) → Task 1. ✅
- Phase A first-launch orchestration → Task 4. ✅
- Phase B toggle matrix → Task 2 (pure) + Task 7 (handler). ✅
- Warning UI (triangle + note, conflict only, foreground refresh) → Task 7. ✅
- Schedule gate on preference + cancel/reschedule-all → Task 3 + Task 5 + Task 7. ✅
- Pure module boundary (no store/i18n in notifications.ts) → Task 3 keeps it pure; body passed via `bodyFor`/`tr`. ✅
- i18n keys → Task 6. ✅
- Testing (unit `decideToggleAction`, manual matrix) → Task 2 + Task 8. ✅

**Placeholder scan:** No TBD/TODO; all code shown. Icon names have an explicit fallback path (Step 5). ✅

**Type consistency:** `decideToggleAction(osGranted, notifyEnabled)` used identically in Task 2 & Task 7. `rescheduleAllReminders(bodyFor)` defined in Task 3, called with `reminderBodyFor` in Task 7. `setNotifyEnabled`/`notifyEnabled` names consistent across Tasks 1, 5, 7. ✅
