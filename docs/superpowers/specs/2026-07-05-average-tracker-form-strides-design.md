# Average Tracker Form — Strides-style redesign

**Date:** 2026-07-05
**Type:** Feature (form redesign + model extension)
**Tracker type affected:** `average` only

## Goal

Redo the **create/edit form for `average` trackers** to match the Strides
"Uống Nước" reference screens. The current average section (`Target / period`
number + `Unit` + a 3-way `period` Segmented) is replaced with a fuller,
habit-styled field set. Three Strides options (Average window, Move to Done,
Progress Bar) are added as **real model fields with real behavior**, not dead
toggles.

UI style must mirror the existing **habit** create form (same widgets, spacing,
label style). Nothing about habit/target/project forms changes.

## Reference → Kite field mapping

| Strides field | Kite widget | Model field | Behavior |
|---|---|---|---|
| Name | `FormInput` | `name` | unchanged (shared, above the type sections) |
| Icon / Color | shared pickers | `icon` / `color` | unchanged (shared) |
| **Goal** ("5 or More") | `FormInput` decimal-pad | `targetValue` | the average target number |
| **Time Period** ("Per Day") | `SelectField<Period>` | `period` | Daily / Weekly / Monthly (yearly omitted, matching current average) |
| **Start Date** | `DateField` | `startDate` | same widget as habit |
| **Due** ("Every Day") | `WeekdayPicker` | `repeatDays` | same widget as habit |
| **Reminders** ("6:00 PM") | `Toggle` + `TimeField` | `reminderTime` | same widget as habit |
| **Average** ("Since Start / Rolling") | `Segmented` + preset chips + custom input | `averageWindow` + `rollingDays` | see below |
| **Move to Done** ("When Logged / When Goal is Met") | `Segmented` | `doneRule` | Today-screen done rule |
| **Progress Bar** ("Overall Average / Today's total") | `Segmented` | `progressBasis` | how `percent` is computed |

**Removed from the average form:** the old `Unit` field (per user decision — the
average number shows without a unit) and the old inline period `Segmented`
(replaced by `Time Period` SelectField).

> Note: `unit` stays on the `Tracker` model (target/other types use it); it is
> just no longer edited on the average form. On save, average keeps
> `unit: null`.

## New model fields (all nullable, `average`-only)

Added to `src/features/trackers/types.ts`:

```ts
export type AverageWindow = 'since_start' | 'rolling'
export type DoneRule = 'when_logged' | 'when_goal_met'
export type ProgressBasis = 'overall_avg' | 'today_total'

// on Tracker:
averageWindow: AverageWindow | null
rollingDays: number | null   // rolling window size in calendar days; null unless rolling
doneRule: DoneRule | null
progressBasis: ProgressBasis | null
```

### SQLite migration (`db/schema.ts`)

Append four `ColumnSpec`s to the `trackers` table array (all nullable TEXT
except `rollingDays` = INTEGER null). The self-migrating `migrateTable()` runs
`ALTER TABLE trackers ADD COLUMN …` for each — no hand-written migration. This
follows the established add-column path (memory: sqlite-migration-add-column).

Repository mapping (`db/repository.ts`):
- `trackerToRow`: write the four new fields (strings/int, `null` when absent).
- `rowToTracker`: read them back, coercing `rollingDays` to `Number | null`.

### Factory defaults (`factory.ts`)

For `type === 'average'` (else `null`):
- `averageWindow`: `input.averageWindow ?? 'since_start'`
- `rollingDays`: `input.averageWindow === 'rolling' ? (input.rollingDays ?? 7) : null`
- `doneRule`: `input.doneRule ?? 'when_logged'`
- `progressBasis`: `input.progressBasis ?? 'overall_avg'`

## Behavior semantics (calculator + Today)

### `calculateAverage` (`calculators/average.ts`)

Currently: `current = mean(all entries)`, `percent = current/goal`,
`paceStatus = current >= goal ? on_track : behind`.

New logic, keyed off the three fields (all default to today's behavior when
`null`, so existing average trackers are unaffected):

1. **Window** (`averageWindow`):
   - `since_start` (or null): mean of **all** entries (unchanged).
   - `rolling`: mean of the entries whose `date` falls within the **last
     `rollingDays` calendar days including today** (default 7) — i.e.
     `e.date > isoAddDays(todayISO, -rollingDays)`. It is a *date* window, not
     an entry-count window (the field is named Days; presets 7/14/21 mean days).
     No entries in the window → `current = 0`.
   - Aggregation stays **mean over entries** in the window (same as
     `since_start`) — switching to mean-of-daily-totals would change existing
     trackers' displayed Ø, breaking the "null = old behavior" guarantee.
2. **Progress bar basis** (`progressBasis`) drives `percent` only (not
   `current`, which stays the displayed average):
   - `overall_avg` (or null): `percent = current / goal` (unchanged).
   - `today_total`: `percent = (sum of today's entries) / goal`.
     `today` uses the `_todayISO` arg (rename to `todayISO`, now used).
3. `paceStatus`: `on_track` when the bar basis value ≥ goal, else `behind`
   (mirrors the current rule but respects the chosen basis).

`goal === 0` guard stays (percent 0, behind).

### `classifyTodayRow` (`habitStats.ts`)

Current non-habit rule: `yes > 0 ? 'completed' : 'due'`.

For `average` with `doneRule`:
- `when_logged` (or null): any log today → `completed` (current behavior; `yes`
  here is "any entry today" — see note).
- `when_goal_met`: today's total ≥ goal → `completed`, else `due`.

Note on the `yes` argument: `classifyTodayRow(tracker, yes, no)` is called with
`yes` = the summed numeric value logged today for non-habit trackers (the Today
screen logs real values for average). So for average:
- `when_logged` (or null): `yes > 0 → 'completed'`, else `'due'` (today's rule).
- `when_goal_met`: `yes >= (tracker.targetValue ?? 0) → 'completed'`, else `'due'`.

The signature and the caller in `DailyGoalsScreen` are unchanged; only the
average branch inside `classifyTodayRow` gains the `doneRule` switch.

### Wiring gaps found in review (MUST fix, or two fields ship dead)

1. **Reminders** — `notifications.ts` gates scheduling on
   `tracker.type === 'habit' || tracker.type === 'target'`
   (`scheduleTrackerReminders`). Without adding `'average'` to that gate, a
   saved `reminderTime` never schedules anything. Also update the doc comment,
   and the notification body pick in `queries/index.ts` (currently
   `targetBody`/`habitBody`) to use a new `notification.averageBody` key.
2. **Due on Today** — `isDueToday()` in `DailyGoalsScreen.tsx` only respects
   `repeatDays` for `type === 'habit'`; extend the gate to
   `habit || average` so the Due weekday picker actually filters the Today
   list. (Target has the same latent issue — out of scope here.)

## Form UI layout (`TrackerFormScreen.tsx`, `type === 'average'` block)

Order (each field-group styled exactly like the habit block — `FieldLabel`,
`gap-s2`, rows with `gap-s3`):

1. **Goal + Time Period** — one row: `flex-1` Goal `FormInput` (decimal-pad,
   placeholder from `form.goalPh`), `flex-[2]` `SelectField<Period>` (daily/
   weekly/monthly).
2. **Start Date** — `DateField`.
3. **Due** — `WeekdayPicker` (same labels object as habit).
4. **Reminders** — `Toggle` header + conditional `TimeField` (same as habit;
   bell uses `TYPE_COLOR.average`).
5. **Average window** — `FieldLabelRow` + `InfoTooltip`, a `Segmented`
   (Since Start / Rolling). When `rolling`: show preset chips **7 / 14 / 21** +
   a "Custom" `FormInput` (numeric). Selecting a preset sets `rollingDays`;
   typing custom overrides it. Chips are a small local `Pressable` row styled
   like the icon picker (branch the selected class, no interpolation).
6. **Move to Done** — `FieldLabelRow` + `InfoTooltip`, `Segmented`
   (When Logged / When Goal is Met).
7. **Progress Bar** — `FieldLabelRow` + `InfoTooltip`, `Segmented`
   (Overall Average / Today's Total).

New local state in the screen: `averageWindow`, `rollingDays` (string for the
input), `doneRule`, `progressBasis`; hydrated in the `useEffect` from `editing`,
and passed into `buildTracker` + the final `tracker` object for the `average`
branch. `onSave` for average validates Goal > 0 (add average to the existing
goal-required check).

`onSave` currently gates three fields on `isHabit || isTarget` — all three
ternaries must include average:
- `startDate: isHabit || isTarget ? startDate… : …` → `+ isAverage`
- `repeatDays: isHabit || isTarget ? repeatDays : undefined` → `+ isAverage`
- `reminderTime: (isHabit || isTarget) && reminderOn ? … : null` → `+ isAverage`

Average also keeps `unit: null` on save (the Unit input is removed from this
form).

## i18n (both `en.json` and `vi.json`, key-for-key)

New `form.*` keys:
`avgWindow`, `avgSinceStart`, `avgRolling`, `avgRollingDays`, `avgCustom`,
`avgWindowHelp`, `moveToDone`, `moveWhenLogged`, `moveWhenGoalMet`,
`moveHelp`, `progressBar`, `progressOverall`, `progressToday`, `progressHelp`.
Plus `notification.averageBody` (reminder body for average trackers).
(Vietnamese translations mirror the Strides wording.)

## Files touched

- `src/features/trackers/types.ts` — 4 fields + 3 unions.
- `src/features/trackers/db/schema.ts` — 4 ColumnSpecs on `trackers`.
- `src/features/trackers/db/repository.ts` — row mapping both ways.
- `src/features/trackers/factory.ts` — defaults + `BuildTrackerInput`.
- `src/features/trackers/calculators/average.ts` — windowed/basis logic.
- `src/features/trackers/calculators/habitStats.ts` — `classifyTodayRow` for average.
- `src/features/trackers/notifications.ts` — add average to the reminder gate.
- `src/features/trackers/queries/index.ts` — averageBody pick for reminders.
- `src/screens/today/DailyGoalsScreen.tsx` — `isDueToday` respects average repeatDays.
- `src/screens/trackers/TrackerFormScreen.tsx` — the average section.
- `src/i18n/locales/{en,vi}.json` — new keys.

## Testing (TDD)

Unit tests (op-sqlite mocked; DB code verified on device):
- `calculators/__tests__/average.test.ts` — new cases: rolling date-window
  (entries inside/outside the window, boundary day, empty window → 0,
  multiple entries on one day), `today_total` basis, `since_start`+`overall_avg`
  unchanged (regression), `goal=0` guard, defaults (null fields) = old behavior.
- `calculators/__tests__/habitStats.test.ts` — `classifyTodayRow` for average
  under both `doneRule`s.
- `factory` test — average defaults for the 4 new fields.
- Repository row-mapping test — round-trips the 4 fields.

Write the failing test first for each behavioral change, then implement.

## Out of scope

- Average **detail** screen changes beyond what the calculator already feeds it
  (the card sub-line and progress bar read `percent`/`current`, so they reflect
  the new basis automatically; no new detail UI in this spec).
- Strides "Accountability / Tags / Start Over" rows (not part of Kite).
- **Goal direction** — Strides shows "5 **or More**", implying an "or Less"
  variant (e.g. average screen-time ≤ 2h). Kite's average calculator is
  higher-is-better only; adding direction touches percent/pace math and is
  deferred.
- **Aggregation change** — mean-of-daily-totals instead of mean-over-entries
  would better match "5 per day" when users log increments, but it changes
  existing trackers' displayed average; deliberately kept as-is.
- `isDueToday` for **target** ignoring `repeatDays` (pre-existing; untouched).
