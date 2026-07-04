# Notification Settings & Permission — Design

**Date:** 2026-07-04
**Status:** Approved (pending spec review)

## Goal

Add a **Notifications** row to the Settings screen whose toggle reflects the
user's reminder preference, kept honest against the real OS permission state.
Handle first-launch permission onboarding, and give the user a clear path to the
system settings when the OS is blocking notifications.

## Concepts — two independent variables

1. **App preference** (`notifyEnabled: boolean`, persisted in MMKV) — does the
   user want reminders? Default `false`.
2. **OS permission** (`osGranted: boolean`, read live from the system) —
   granted vs denied (not-determined is treated as not-granted).

The toggle **displays the app preference**. The OS state only drives an inline
warning + triangle when the two conflict.

## Behaviour

### Phase A — First launch (permission onboarding)

On launch, after the DB is ready:

```
ensureReminderChannel()                       // always (Android channel)
if (!permissionAsked) {                        // first time app is ever opened
    granted = await requestNotificationPermission()   // OS shows the dialog
    setNotifyEnabled(granted)                  // preference follows the result
    markPermissionAsked()
}
// subsequent launches: do NOT request, do NOT touch preference
```

`permissionAsked` is a persisted flag so the request happens exactly once, at
the first launch. After that, `notifyEnabled` is the user's own setting and is
never auto-synced to the OS again.

### Phase B — User taps the toggle in Settings

```
osGranted === true:
    setNotifyEnabled(!notifyEnabled)           // free on/off, no prompt
    on  → rescheduleAllReminders()
    off → cancelAllReminders()

osGranted === false:
    if (notifyEnabled === true):               // currently on → allow turn off
        setNotifyEnabled(false)                // (warning + triangle disappear)
        cancelAllReminders()
    else:                                        // currently off → wants to turn on
        granted = await requestNotificationPermission()
        if granted: setNotifyEnabled(true); rescheduleAllReminders()
        else:       alert(blocked) + "Open Settings" → openSystemNotificationSettings()
```

Note on the Android "prompt again" count: the OS does not expose how many
prompts remain. We simply call `requestPermission()`; if the result is still
`denied` (out of prompts, or iOS already refused), we fall back to the
"Open Settings" alert. No manual counting — correct on both platforms.

### Warning UI — shown only on conflict

Condition: **`notifyEnabled === true && osGranted === false`** (app wants
reminders but the OS is blocking).

- A red **triangle ⚠️** to the right, next to the toggle (as originally asked).
- A red **inline note** below the row:
  *"Notifications are turned off in system settings."* followed by an
  underlined **"Go to settings"** link (`text-brand`, `Pressable`) →
  `openSystemNotificationSettings()`.

When `notifyEnabled === false` (with OS denied), nothing is shown — the app
isn't asking for reminders, so there's no conflict. When `osGranted === true`,
nothing is shown.

`osGranted` is re-read when the Settings screen mounts **and every time the app
returns to the foreground** (via an `AppState` listener). So after the user
flips the OS permission in system settings and comes back, the conflict clears
and the triangle + note disappear automatically.

## Reminder scheduling gate

Because reminders must be silent when the preference is off:

- `useSaveTracker` calls `scheduleTrackerReminders` **only when
  `notifyEnabled === true`**. The hook reads the flag from the store and decides;
  `notifications.ts` stays store-free. Cancel always runs (safe).
- Turning the toggle off cancels every scheduled trigger; turning it on
  reschedules for every tracker that has a `reminderTime`.

## Architecture / boundaries

`notifications.ts` stays a **pure module** (no hooks, no store, no i18n). It
gains:

- `getPermissionStatus(): Promise<boolean>` — wraps `getNotificationSettings`,
  returns granted (AUTHORIZED/PROVISIONAL).
- `openSystemNotificationSettings(): Promise<void>` — wraps notifee
  `openNotificationSettings()`.
- `cancelAllReminders(): Promise<void>` — cancel every scheduled trigger. Reads
  all trackers from the repository and cancels each one's reminders (reuses
  `cancelTrackerReminders`).
- `rescheduleAllReminders(bodyFor): Promise<void>` — read all trackers from the
  repository and, for each habit/target with a `reminderTime`, reschedule.
  `bodyFor` is a `(tracker) => string` callback the caller supplies so the
  already-translated body flows in without the module importing i18n (the
  Settings handler builds it from `t('notification.habitBody' | 'targetBody')`,
  mirroring how `useSaveTracker` already passes `body`).

  Note: these two functions call the repository, so — like the rest of the
  DB-touching code — they are verified on device, not unit-tested (op-sqlite is
  mocked in Jest).
- `initNotifications()` reduced to `ensureReminderChannel()` only (the
  request-on-first-launch logic moves to the orchestrator).

**`App.tsx`** is the orchestrator that may touch the store: on launch it runs
`ensureReminderChannel()`, and if `!permissionAsked` requests permission, sets
`notifyEnabled`, and marks asked.

**Pure decision helper (unit-tested):**

```ts
type ToggleAction = 'toggle' | 'request' | 'alertBlocked'
function decideToggleAction(osGranted: boolean, notifyEnabled: boolean): ToggleAction
// (true,  *)      → 'toggle'
// (false, true)   → 'toggle'      // allow turning off
// (false, false)  → 'request'     // try request; caller alerts if it fails
```

The `alertBlocked` outcome is produced by the caller when `request` returns
denied — it's not a direct branch of the matrix, so the helper returns
`'request'` and the Settings handler decides whether to alert based on the
request result. (Kept out of the helper so the helper stays a pure state→action
map with no async.)

## Files touched

1. `store/useAppStore.ts` — add `notifyEnabled`, `permissionAsked` + setters.
2. `features/trackers/notifications.ts` — add `getPermissionStatus`,
   `openSystemNotificationSettings`, `cancelAllReminders`,
   `rescheduleAllReminders`; slim down `initNotifications`.
3. `features/trackers/notificationToggle.ts` (new) — pure `decideToggleAction`.
4. `App.tsx` — first-launch permission orchestration.
5. `features/trackers/queries/index.ts` — gate `scheduleTrackerReminders` on
   `notifyEnabled`.
6. `screens/settings/SettingsScreen.tsx` — Notifications row (bell icon, label,
   triangle-on-conflict, Switch), inline note + "Go to settings" link, AppState
   listener re-reading `osGranted`, tap handler using `decideToggleAction`.
7. `i18n/locales/{en,vi}.json` — new keys.

## i18n keys (namespace `set`)

| key | en | vi |
|---|---|---|
| `notifications` | Notifications | Thông báo |
| `notifOsOff` | Notifications are turned off in system settings. | Thông báo đang bị tắt trong Cài đặt hệ thống. |
| `goSettings` | Go to settings | Đi tới cài đặt |
| `notifBlockedTitle` | Enable notifications | Bật thông báo |
| `notifBlockedMsg` | Notifications are turned off for Kite. Open Settings to allow reminders. | Thông báo cho Kite đang bị tắt. Mở Cài đặt để cho phép nhắc nhở. |
| `openSettings` | Open Settings | Mở Cài đặt |

## Testing

- **Unit:** `decideToggleAction` — all four state combinations.
- **Manual (simulator/device):** first-launch dialog → preference follows;
  toggle on/off when granted; toggle-on when denied → alert; conflict triangle
  + note appear/clear on foreground return; "Go to settings" opens the system
  page.

## Out of scope

- Per-tracker notification toggles (this is a single global preference).
- Counting remaining Android prompt attempts (OS doesn't expose it).
- Quiet hours / notification scheduling preferences.
