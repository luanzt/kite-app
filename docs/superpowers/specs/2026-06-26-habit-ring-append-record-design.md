# Habit Ring: Each Tap Logs Its Own Record

**Date:** 2026-06-26
**Scope:** `src/screens/today/DailyGoalsScreen.tsx` (habit ring tap handler only).

## Goal

Make each tap of a habit's progress ring on the Today screen create its own
`Yes` log record (a fresh `value: 1` entry), instead of overwriting one shared
per-day entry. This fixes the mismatch the user found: a habit showing "8/6" on
Today had only **one** record in its History, because the ring wrote a single
entry with `value = 8` rather than eight records.

## Background (current behavior)

In `LogRow`, the ring (and the target/average stepper) call a shared
`setValue(v)` that upserts ONE entry per day with a stable id
`${tracker.id}-${today}`:

```ts
const entryId = `${tracker.id}-${today}`
const setValue = (v: number) =>
  onLog({ id: entryId, trackerId: tracker.id, date: today, value: v, note: null, createdAt: new Date().toISOString() })
```

- Habit ring: `onPress={() => setValue(n + 1)}` → overwrites the single entry
  with the new cumulative total. So N taps = 1 entry, `value = N`.
- `doneDatesOf` sums per-day `value`, so progress/streak/missed counting is by
  total — that stays correct either way.
- History (`buildHistoryRows`) lists **per entry**, so the single ring entry
  shows as one "Yes" row regardless of how many taps it represents — the bug.

## Decisions (confirmed with user)

1. **Each habit ring tap appends a fresh `Yes` record** — a new entry with a
   unique `uuid()`, `value: 1`, `createdAt: now` (the same shape `LogEntryModal`
   uses for Detail logs). N taps = N entries → History shows N "Yes" rows.
2. **Overflow stays allowed** (no cap): tapping past the goal keeps adding Yes
   records (7/6, 8/6…).
3. **No decrement / undo on Today.** A mis-tap is corrected by deleting the
   record from Habit Detail → History. (The ring has no minus.)
4. **Applies to all habits, including goal = 1** — one tap = one Yes record;
   tapping again adds another (2/1), it does not toggle off.
5. **target / average steppers are UNCHANGED** — they set an absolute daily
   total (− / +), so they keep the stable-id overwrite (`setValue(absolute)`).
   This change is **habit-ring-only**.

## Design

Split the habit ring's handler from the shared `setValue`. Add a habit-only
`logYes()` that appends a record; keep `setValue` for the steppers.

In `LogRow`:
- Import `uuid` from `@features/trackers/factory` (already exported there).
- Add, alongside `setValue`:
  ```ts
  // Habit ring: each tap is its own Yes record (uuid + now), so History shows
  // one row per tap — unlike the stepper's absolute set/overwrite.
  const logYes = () =>
    onLog({
      id: uuid(),
      trackerId: tracker.id,
      date: today,
      value: 1,
      note: null,
      createdAt: new Date().toISOString()
    })
  ```
- Change the habit ring `onPress` from `() => setValue(n + 1)` to `logYes`.
- Leave the target/average stepper's `setValue(...)` calls and the project
  branch untouched. (`entryId`/`setValue` stay — still used by the steppers.)

No counting/classification change: `todayLog` (sum of values) is still the Yes
total, `todayNo` still counts `value === 0` entries, so the ring fraction,
Completed/Missed classification, streak, and summary all behave exactly as
before — only the on-disk representation of habit Yes logs changes from one
fat entry to N unit entries.

## Interaction with the Today quick-log invalidation

`useLogEntry` (`onLog`) invalidates `['entries', trackerId]` and the per-date
cache, so after a tap the ring (`useEntriesForDate` sum) and History
(`useEntries`) both refetch — the new record appears immediately in both.

## Out of scope

- target / average / project controls.
- Habit Detail `LogEntryModal` (already appends per-log).
- A decrement/undo control on Today (correction is via Detail).
- `doneDatesOf`, `perDayGoal`, `habitStreakStatus`, `classifyTodayRow`,
  `buildHistoryRows` — all unchanged.

## Testing

- This is a DB-touching screen change (op-sqlite mocked in Jest) → verified on
  simulator: tap a goal-N habit ring K times → ring shows "K/N"; open Habit
  Detail → History → **K separate "Yes" records** for today (not one). A mis-tap
  can be removed from History. target/average steppers still set an absolute
  total (one entry/day). Streak / Completed / Missed unchanged.
- Existing 100 unit tests stay green; `yarn tsc` + `yarn lint` clean.
