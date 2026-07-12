# Multi-reminder redesign (habit / target / average)

**Date:** 2026-07-12
**Status:** Approved design, pre-implementation

## Goal

Replace the single per-tracker reminder with a list of reminder times, edited
through a dedicated bottom-sheet modal. New trackers get a 6 PM reminder that
is **on by default**. The app has not shipped, so this is a clean break — no
backward compatibility with the old `reminderTime` field.

## Data model

- `Tracker.reminderTime: string | null` is **removed** and replaced by
  `reminderTimes: string[]` — an array of `"HH:MM"` strings in insertion
  order. `[]` means reminders are off.
- `db/schema.ts`: the `reminderTime` ColumnSpec is replaced by
  `reminderTimes TEXT` (nullable, JSON-stringified like `repeatDays`).
  The orphaned `reminderTime` column in existing dev DBs is simply ignored.
- `db/repository.ts`: `trackerToRow`/`rowToTracker` JSON-stringify/parse
  `reminderTimes` exactly like `repeatDays`; a NULL/absent column reads as `[]`.
- `factory.ts` (`buildTracker`): habit/target/average default to
  `['18:00']` (reminder on by default); project defaults to `[]`.
- iCloud sync: snapshots are whole-row last-write-wins, so the new field
  rides along with no sync-code changes.

## Notifications (`notifications.ts`)

- Schedule one weekly-repeating trigger per **(reminder time × due weekday)**.
  Notification id: `rem-${trackerId}-${day}-${index}` where `index` is the
  position in `reminderTimes`.
- `cancelTrackerReminders` switches to `notifee.getTriggerNotificationIds()`
  filtered by the `rem-${trackerId}-` prefix, so cancellation never depends on
  knowing how many reminders the old version of the tracker had.
- Malformed times are skipped individually (same swallow-everything policy).
- `rescheduleAllReminders` / `cancelAllReminders` keep their signatures.

## Form UI — new `ReminderField` component

Lives in `src/components/ui/ReminderField.tsx`, barreled in
`src/components/ui/index.ts`. Used by all three type sections in
`TrackerFormScreen`, replacing the current inline Toggle + TimeField block.

Props: `{ enabled, onEnabledChange, times, onTimesChange }`.

**Trigger row (in the form):** Bell icon + "Reminders" label; right side shows
a summary — `18:00` for one reminder, `18:00 +2` for three, `Off` when
disabled — plus a chevron. Tapping opens the modal.

**Modal (HeroUI `BottomSheet`), two internal views:**

1. **List view (default):**
   - Header: title + a `Toggle` for on/off. Turning it off hides/dims the
     list but keeps the times in state, so re-enabling restores them.
   - One row per reminder time showing the time; tapping a row switches the
     sheet to the wheel view for that row.
   - Each row has a trash button, **hidden while only one reminder remains**
     (turning reminders fully off is the toggle's job).
   - **"Add reminder"** button: immediately appends `nextReminderTime(times)`
     — last time + 1 h, wrapping past midnight (23:30 → 00:30), bumping a
     further +1 h while the slot is already taken. Disabled at **6** reminders
     (cap chosen to stay well under iOS's 64-pending-notification limit:
     6 times × 7 weekdays = 42 triggers worst case for one tracker).
2. **Wheel view:** the time wheel (reusing the `TimeSheet` picker logic from
   `TimeField`) with Save/Back — the sheet swaps its content rather than
   opening a nested `BottomSheet`, avoiding sheet-in-sheet portal/gesture
   issues.

**Form state (`TrackerFormScreen`):** `reminderOn` (defaults to `true` on
create) and `reminderTimes` (defaults to `['18:00']`). On save:
`reminderTimes = reminderOn ? times : []`.

## Pure logic & tests (TDD)

New module `src/features/trackers/reminders.ts`:

- `nextReminderTime(times: string[]): string` — +1 h from the last entry,
  wraps past midnight, bumps while duplicate; returns `'18:00'` for an empty
  list.
- `reminderSummary(times: string[]): string` — the trigger-row summary text
  (`''`/off handled by the caller, `18:00`, `18:00 +2`).
- `MAX_REMINDERS = 6`.

Unit tests written first for `reminders.ts`; existing factory, repository
row-mapping, and schema tests updated for `reminderTimes`. Notifee is a
native module (mocked in Jest), so scheduling is verified on the simulator.

## i18n

New keys under `form.` (e.g. `form.addReminder`, `form.reminderOff`) added to
both `en.json` and `vi.json`, key-for-key.

## Out of scope

- Per-reminder weekday overrides (all reminders follow the tracker's
  `repeatDays`).
- Reminders for projects.
- Any data migration from the old `reminderTime` column.
