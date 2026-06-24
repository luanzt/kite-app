# Target Detail → 3 Tabs (Habit-style)

**Date:** 2026-06-24
**Scope:** `src/screens/trackers/TrackerDetailScreen.tsx`, `src/features/trackers/components/` (new `TargetDetailView`, `TargetOverviewTab`, a shared detail context or reuse), `LogEntryModal.tsx`, `HabitHistoryTab.tsx` / `HabitNotesTab.tsx` (or target variants), i18n EN/VI.

## Goal

Give the **Target** tracker detail screen the same 3-tab layout the Habit detail
has (Overview / History / Notes), reusing the existing tab shell. The log entry
sheet drops the Yes/No question and gains a numeric **value** input; History and
Notes show the logged **value** (with unit) instead of a Yes/No badge.

## Reference (current architecture)

- `TrackerDetailScreen` dispatches: `type === 'habit'` → `HabitDetailView` (3-tab
  material-top-tabs fed by `HabitDetailContext`); all other types → a single
  ScrollView of `DetailHero` + `DetailStatGrid` + `DetailBody` + `LogTodayButton`.
- `HabitDetailView` = `Tab.Navigator` with custom `HabitTabBar` and 3 screens
  (`charts`/`history`/`notes`) reading `useHabitDetail()` context.
- `HabitHistoryTab` renders `buildHistoryRows(tracker, entries, today)` —
  every *due* day (per `isDueOn` → `repeatDays`) from start to today, newest
  first; a logged day emits one `record` row per entry, an unlogged due day
  emits one dashed `empty` "Log" row. Yes/No pill via `entry.value > 0`.
- `HabitNotesTab` = pinned editable Goal note + list of entries that have a note,
  each with a Yes/No badge, tappable to edit.
- `LogEntryModal` = BottomSheet with "Did you do this habit?" Yes/No (→ value
  1/0), Notes, Date, Time, Save. Shared by all non-project types today (quick
  "Log today" uses value 1).
- `fmtVal(tracker, n)` formats a number with the tracker's unit ($ prefix or
  unit suffix) — reuse for value display.
- Target now has `repeatDays` (default every day), `startValue`, `startDate`,
  `deadline` — so `buildHistoryRows`/`isDueOn` already work for it unchanged.

## Decisions (confirmed with user)

1. **Tab 1 (Overview):** temporarily wrap the *current* target detail
   (`DetailHero` + `DetailStatGrid` + `DetailBody`) in a scrollable tab. No
   `LogTodayButton` in the tab (logging happens via History's Add Log / row tap,
   matching habit).
2. **Tab 2 (History):** reuse `buildHistoryRows` (scope = due days, same as
   habit — decision: "Theo Due"). Replace the Yes/No pill with the **per-record
   numeric value** (`fmtVal`). Unlogged due days keep the dashed "Log" row.
   Multiple logs in a day → one row each (decision: "Từng record riêng").
3. **Tab 3 (Notes):** same as habit — pinned Goal note + noted entries; replace
   the Yes/No badge with the entry's **numeric value**.
4. **Log sheet:** ONE shared `LogEntryModal`, branched by type. `habit` keeps
   Yes/No; non-habit shows a **Value input** (label "Value" + unit when present,
   e.g. "Value ($)"; `decimal-pad`; placeholder "0"). Save persists the entered
   number as `entry.value` (not 1/0).
5. **Value input copy:** label includes the unit when the tracker has one.

## Architecture

The Habit tab shell is already generic. Rather than fork it, **generalize the
naming minimally and reuse**:

- Keep `HabitDetailView`/context as-is for habit. Add a parallel
  **`TargetDetailView`** that uses the SAME `Tab.Navigator` + `HabitTabBar`
  pattern but mounts: `TargetOverviewTab` (new), the History tab, and the Notes
  tab. To avoid duplicating the context, reuse `HabitDetailContext`
  (`tracker`/`entries`/callbacks are type-agnostic) — it's already named for
  "detail", not strictly habit-only; the provider/hook stay shared.
- **History/Notes value rendering:** the only habit-specific bit in
  `HabitHistoryTab`/`HabitNotesTab` is the Yes/No status. Add a `valueMode` to
  switch a row's status slot from Yes/No → `fmtVal(tracker, entry.value)`.
  Implement by branching on `tracker.type === 'habit'` *inside* the existing
  components (they already receive `tracker`), so target reuses them directly —
  no new History/Notes files.
- **Overview tab:** new `TargetOverviewTab` = a `ScrollView` (own bottom
  safe-area) rendering `DetailHero` + `DetailStatGrid` + `DetailBody` exactly as
  the current non-habit branch does, minus `LogTodayButton`.

### `LogEntryModal` value branch

- Add local `value` state (string). When `tracker.type !== 'habit'`: render a
  value `TextField`/input (label `t('log.value')` + unit suffix when set,
  placeholder "0", `decimal-pad`) in place of the Yes/No block; hide the
  "Did you do this habit?" prompt.
- Init: editing → `String(entry.value)`; new → '' (placeholder 0).
- Save: `value: tracker.type === 'habit' ? (done ? 1 : 0) : (Number(value) || 0)`.
- Header cadence label: target has no habit cadence; `cadenceLabel` already
  handles non-habit gracefully (verify) — if it throws/looks wrong for target,
  fall back to the unit or omit. (Confirm during implementation; keep current
  behavior if acceptable.)

## i18n (EN/VI, key-for-key)

Add under `log`:
- `value` → "Value" / "Giá trị"
- `valuePh` → "0" / "0"

(History/Notes reuse `detail.logHistory`, `detail.addLog`, `detail.logShort`,
`detail.notLogged`, `detail.goalNote*`, `detail.logNotes`, `detail.noNotes*`,
`detail.notesCount` — all type-agnostic.)

## Out of scope / non-goals

- Redesigning the Overview tab content (tab 1 is "current detail, lifted as-is").
- Average/project detail (still single-scroll). Average *could* later reuse the
  same value-mode log sheet, but this spec only wires target.
- Changing pace math, `buildHistoryRows`, or `isDueOn`.
- The quick "Log today" button (removed from the tabbed target view; logging is
  via History Add Log + row tap, as habit).

## Testing

- `LogEntryModal` value-vs-Yes/No is a pure render/state branch — verified on
  simulator (DB-touching save path; op-sqlite mocked in Jest).
- History/Notes value rendering verified on simulator.
- No calculator/repository change → existing 81 unit tests stay green; `yarn
  tsc` + `yarn lint` clean before each commit.
- On-device: create a target, log a value, confirm it shows in History (value,
  not Yes/No), in Notes (with a note), back-fill an unlogged day, edit a log.
