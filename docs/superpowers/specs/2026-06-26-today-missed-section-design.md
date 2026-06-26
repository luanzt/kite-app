# Today "Missed" Section

**Date:** 2026-06-26
**Scope:** `src/screens/today/DailyGoalsScreen.tsx` (row classification + a third section), i18n.

## Goal

Add a **Missed** section to the Today screen, between "Due Today" and
"Completed" (image reference: Strides' "Missed" group). A habit lands in Missed
when the user has logged enough attempts to fill the day's goal but not enough
of them were Yes — i.e. the day is effectively decided and the goal was not met.

## Background (habit log model)

- A habit log is one `Entry` per attempt: **Yes → `value = 1`, No → `value = 0`**
  (see `LogEntryModal` habit branch). Multiple logs per day stack as separate
  entries (except the Today quick-ring, which keeps a single per-day record it
  overwrites with the running total — see Data note below).
- `perDayGoal(tracker)` = the day's Yes target (`max(1, targetValue ?? 1)` for
  daily; 1 for weekly/monthly).
- `doneDatesOf` sums `value` per day → since No contributes 0, **the daily sum =
  the number of Yes**. So "progress counts Yes only" already holds.

## Classification (confirmed with user)

For a due habit today, with `yes` = **sum of today's values** (a Yes is
`value 1`, the ring's single record holds the cumulative Yes count, so the sum
is the true Yes total), `no` = **count of today's entries with `value === 0`**
(each No is one entry), and `total = yes + no` (attempts, NOT entry count):

| Condition | Section |
|---|---|
| `yes >= goal` | **Completed** |
| `total >= goal && yes < goal` | **Missed** |
| otherwise (`yes < goal && total < goal`) | **Due Today** |

Example (goal 5): ring logs 3 Yes (one entry, `value 3` → `yes = 3`) + 2 No
(two entries, `value 0` → `no = 2`) → `total = 5 ≥ 5`, `yes = 3 < 5` → **Missed**.
Two more Yes (ring → `value 5`) → `yes = 5 ≥ 5` → **Completed**.

Notes:
- Only **habits** can be Missed. Non-habit (target/average) keep today's
  behavior: `done = todayLog > 0` → Completed/Due; they never enter Missed.
  Project stays in Due (chevron), never done/missed.
- "Missed" requires `total >= goal` — a half-logged day with room left
  (`total < goal`) stays in Due Today so the user can still finish.

## Data (how to get `yes` and `total` per tracker)

`DailyGoalsScreen` already fetches all of today's entries via
`useEntriesForDate(today)` into `todayEntries`. Derive two maps from it:
- `todayValue` (exists) — **sum of `value`** per tracker = `yes`.
- `todayNo` (new) — **count of entries with `value === 0`** per tracker = `no`.

Then `total = yes + no` per tracker.

Why count attempts this way (not raw entry count): the Today habit ring uses a
stable per-day entry id (`${id}-${today}`) it overwrites, so N ring taps produce
ONE entry whose `value` is the cumulative Yes (e.g. `value 3` = 3 Yes). Summing
`value` recovers the true Yes count; counting `value === 0` entries recovers the
No count (each No from Habit Detail's `LogEntryModal` is its own `value 0`
entry). So `total = yes + no` is the real attempt count, independent of how Yes
entries are stored. The Today screen only **classifies**; it does not add a No
control (per user: No is logged from Habit Detail).

## Row shape + classification (DailyGoalsScreen)

Extend the per-row derivation. Replace the current `done` split with a
three-way `status: 'due' | 'missed' | 'completed'`:

```ts
type RowStatus = 'due' | 'missed' | 'completed'
```

In the `rows` build:
- `yes = todayValue.get(id) ?? 0` (also the existing `todayLog`)
- `no = todayNo.get(id) ?? 0`; `total = yes + no`
- `goal = perDayGoal(tracker)`
- habit: `completed` if `yes >= goal`; else `missed` if `total >= goal`; else `due`.
- target/average: `completed` if `todayLog > 0` else `due` (never missed).
- project: `due` (chevron).

`Row` carries `status` (and keeps `done` derived as `status === 'completed'`
where the control/ring still needs it, OR the control reads `status`). The
three rendered lists become `due = rows.filter(status==='due')`,
`missed = rows.filter(status==='missed')`, `completed = rows.filter(status==='completed')`.
`doneCount`/summary count `completed` only (unchanged meaning).

## UI

Three sections in order, each shown only when non-empty (Due Today always shows
its header in the non-all-clear branch as today):
1. **DUE TODAY** — `due` rows (unchanged).
2. **MISSED** — `missed` rows; the section header uses `today.missed`. Rows use
   the same `LogRow`. The card background stays neutral (`bg-surface`) — Missed
   is not "completed", so it does NOT get the brand-faint fill; the existing
   missed streak line (amber icon + gray text) already conveys the state.
3. **COMPLETED** — `completed` rows (brand-faint fill, unchanged).

The "all clear" empty state (when everything is completed) is unchanged:
`allDone` = `due.length === 0 && missed.length === 0 && completed.length > 0`
(so a Missed habit keeps the screen out of the all-clear state).

## i18n (EN/VI, key-for-key) — under `today`

| key | en | vi |
|---|---|---|
| `missed` | Missed | Đã lỡ |

## Out of scope

- Adding a "No" control to the Today card (No is logged from Habit Detail).
- Changing `LogEntryModal`, `doneDatesOf`, `habitStreakStatus`, `perDayGoal`.
- TrackerCard (Trackers tab), target/average/project classification beyond the
  existing Completed/Due split.

## Testing

- The classification is a small derivation in the DB-touching screen (op-sqlite
  mocked) → verified on simulator: a goal-5 habit with 3 Yes (ring) + 2 No
  (Detail) shows in MISSED; adding Yes to reach 5 moves it to COMPLETED; a
  half-logged habit with room left stays in DUE TODAY. Non-habit unaffected.
- Existing 93 unit tests stay green; `yarn tsc` + `yarn lint` clean.
