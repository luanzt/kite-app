# Today Habit Progress Ring

**Date:** 2026-06-26
**Scope:** `src/screens/today/DailyGoalsScreen.tsx` (habit `done` rule + habit control), i18n if needed.

## Goal

On the Today card, replace the habit Yes/No check button with an **N/goal
progress ring** (image #5): the ring shows `N/goal` with a progress border, each
tap adds **+1**, overflow is allowed (7/6…), and reaching the goal moves the card
to COMPLETED. This unifies the card's "done" rule with the streak's "done" rule
(both = summed value ≥ per-day goal), fixing the inconsistency found during
verification where a goal-6 habit showed COMPLETED after one tap yet the streak
still read "Missed".

## Background (the inconsistency being fixed)

- `perDayGoal(tracker)` (in `habitStats.ts`) = `max(1, targetValue ?? 1)` for a
  daily habit (1 for weekly/monthly). It's how `doneDatesOf` (streak + detail)
  decides a day is "done".
- Today's card currently sets `done = todayLog > 0` (any positive log) and the
  habit control is a toggle `setValue(done ? 0 : 1)`. So a habit with goal 6
  flips to COMPLETED on one tap, but `habitStreakStatus`/`doneDatesOf` need 6 →
  the streak stays "Missed". The fix: card "done" = `todayLog >= perDayGoal`.

## Decisions (confirmed with user)

1. **All habits use an N/goal ring** (including goal = 1 → "0/1" → "1/1").
2. **Tap = +1**; **overflow allowed** (no cap at goal: 7/6, 8/6…).
3. **Done = `todayLog >= perDayGoal(tracker)`** for the card's completed/pending
   split — same rule the streak uses. (Streak/`doneDatesOf` already use it; only
   the card's `done` derivation changes.)
4. **No decrement on Today.** To reduce/correct, open Habit Detail (History tab).
5. Project unchanged (chevron); target/average keep their existing stepper.

## Design

### `done` rule (call site, ~line 244-247 of DailyGoalsScreen)

The screen builds `rows` with `done` per tracker. Change the habit branch so
`done` uses the per-day goal:

```ts
const done =
  tracker.type === 'project'
    ? false
    : tracker.type === 'habit'
    ? todayLog >= perDayGoal(tracker)
    : todayLog > 0
```

(target/average keep `todayLog > 0`; project stays false.) Import `perDayGoal`
from `@features/trackers/calculators/habitStats`.

### Habit control (in `renderControl`)

Replace the habit Yes/No `Pressable` with a ring button:

- `goal = perDayGoal(tracker)`, `n = todayLog`, `fraction = goal ? n / goal : 0`.
- A `Pressable` (h/w ~46) wrapping the existing `Ring` (already in the file) at
  `size 46, strokeWidth 4`, `color = PACE_COLOR.on_track` when `n >= goal` else
  the tracker color / brand; center shows `{n}/{goal}` (small bold).
- `onPress={() => setValue(n + 1)}` — increments the day's total (the entry id is
  the stable per-day `${id}-${today}`, so `setValue` overwrites the day's single
  record with the new total — consistent with the current overwrite model).
- When `n >= goal`, the ring is full and the center can show a check or the
  `{n}/{goal}` count; keep `{n}/{goal}` so overflow (7/6) is visible.

Visual: matches image #5's right-rail ring (e.g. "0/5"). Use `Typography`,
`className` for layout; the ring colors via the `color` prop (runtime value, not
a class). The center count text is `Typography`.

### COMPLETED/pending split + summary

`pending`/`completed`/`doneCount` already derive from `row.done`, so once `done`
uses `perDayGoal`, the card lands in the right section automatically and the
"N of M done" summary counts a habit only when its full daily goal is met.

## i18n

The ring center shows `{n}/{goal}` (numbers only) — no new copy needed. If a
label under the ring is desired it can reuse existing keys, but the image shows
just the count, so **no i18n change**.

## Out of scope

- Habit Detail / TrackerCard (Trackers tab) — unchanged.
- Decrement control on Today.
- Changing `perDayGoal`, `doneDatesOf`, or `habitStreakStatus` (already correct).
- target/average/project controls.

## Testing

- The `done`-rule change is pure-ish but lives in the DB-touching screen (op-sqlite
  mocked) → verified on simulator: goal-6 habit shows "0/6", six taps →
  "6/6" → COMPLETED → streak flips from "Missed" to a positive status; goal-1
  habit shows "0/1" → one tap → "1/1" → COMPLETED → "Great start". Overflow tap
  shows "7/6". Project/target/average controls unchanged.
- Full existing test suite (93) stays green; `yarn tsc` + `yarn lint` clean.
