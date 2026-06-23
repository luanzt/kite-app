# Target Tracker Form Redesign

**Date:** 2026-06-23
**Scope:** `src/screens/trackers/TrackerFormScreen.tsx` (target branch only), `src/features/trackers/factory.ts`, `src/i18n/locales/{en,vi}.json`

## Goal

Update the **Target** tracker form (image #1, current Kite UI) to match the Strides
"Finish" reference (image #2, a "Save Money" target goal). The reference exposes
Start Value / Goal Value / Start Date / Goal Date / Add-to-Total / Due / Reminders.
The current Kite form is missing **Start Value** and **Start Date** (the model has
`startValue`/`startDate` but the form hard-codes `startValue = 0` and never lets the
user pick a Start Date — both are required for correct pace math in
`calculateTarget`).

No field in image #1 is unused, so **nothing is removed** — this is rename + add.

## Decisions (confirmed with user)

1. **Add Start Value + Start Date.** Rename "Target value" → "Goal Value" and
   "Deadline" → "Goal Date" to match #2.
2. **Add Due + Reminders** to the target form (mirror #2 fully), reusing the same
   `WeekdayPicker` + `Toggle`/`TimeField` the habit form uses. (Reminders is UI-only
   until notifee is wired — a known deferred follow-up; no behavior regression.)
3. **Keep the Direction toggle** (Higher / Lower is better). It is functional —
   `calculateTarget` uses start vs goal span for decreasing goals.
4. **Add to Total** stays as the existing **Segmented "Mode"** (Accumulate / Latest
   value) — clearer than a bare toggle; it maps to the same `accumulation` field.
5. **Due** uses `WeekdayPicker`, default all days selected (= "Every Day").
6. **Unit layout:** Row 1 = Start Value | Goal Value (split 1:1). Row 2 = Unit
   (full width).

## New field order (target branch)

1. Name *(shared, already at top of form)*
2. Icon *(shared)*
3. Color *(shared)*
4. **Start Value** | **Goal Value** — one row, two equal `FormInput`s, `decimal-pad`
5. **Unit** — full-width `FormInput`
6. **Mode** — `Segmented` Accumulate / Latest value *(unchanged)*
7. **Direction** — `Segmented` Higher / Lower is better *(unchanged)*
8. **Start Date** | **Goal Date** — two `DateField`s, one row
9. **Due** — `WeekdayPicker` (default `[0..6]`) — NEW for target
10. **Reminders** — `Toggle` + conditional `TimeField` (same block as habit) — NEW for target

## Implementation

### `factory.ts` — `BuildTrackerInput` + `buildTracker`

- Add `startValue?: number | null` to `BuildTrackerInput`.
- Change `startValue: type === 'target' ? 0 : null`
  → `startValue: type === 'target' ? (input.startValue ?? 0) : null`.
- Allow `repeatDays` and `reminderTime` to apply to target too (currently gated to
  habit). New rule: pass through whatever the caller provides; the form only sends
  them for habit and target.
  - `repeatDays: input.repeatDays ?? ((isHabit || type === 'target') ? [0,1,2,3,4,5,6] : null)`
  - `reminderTime: input.reminderTime ?? null` (drop the `isHabit` gate — already null when not provided)
  - `routine` stays habit-only (target has no routine).

### `TrackerFormScreen.tsx`

**New state:**
- `const [startValue, setStartValue] = useState(editing?.startValue != null ? String(editing.startValue) : '')`
- Hydrate `startValue` in the `useEffect` hydration block.
- Reuse existing `startDate`, `repeatDays`, `reminderOn`, `reminderTime` state for target.

**Render (target branch) — replace current target JSX:**
- Row: Start Value (`flex-1`) | Goal Value (`flex-1`).
- Unit row (full width).
- Mode `Segmented` (unchanged).
- Direction `Segmented` (unchanged).
- Row: Start Date `DateField` | Goal Date `DateField`.
- Due `WeekdayPicker` (same labels object as habit).
- Reminders block (Bell icon + label + `Toggle`; conditional `TimeField`) — copy the
  habit block.

**`onSave`:**
- Treat target like habit for these inputs:
  - `startValue: type === 'target' ? (Number(startValue) || 0) : undefined` → passed to `buildTracker`.
  - `startDate`: use the user-picked `startDate` for target (currently target ignores
    it and falls back to `editing?.startDate ?? base.startDate`). Change the
    `startDate` resolution so `habit || target` use `base.startDate` (built from the
    picked value); other types keep `editing?.startDate ?? base.startDate`.
  - `repeatDays: (isHabit || type === 'target') ? repeatDays : undefined`.
  - `reminderTime: (isHabit || type === 'target') && reminderOn ? reminderTime.trim() || null : null`.
- **Validation:** extend the required-goal check to target — Goal Value must be a
  finite number > 0. Reuse `form.errGoal`. (Start Value defaults to 0 when blank; no
  validation needed.) Due is not required for target (a target can be open-ended),
  so do NOT enforce `errDue` for target.

### i18n — `en.json` + `vi.json` (key-for-key)

Add under `form`:
| key | en | vi |
|---|---|---|
| `goalValue` | Goal Value | Giá trị mục tiêu |
| `goalDate` | Goal Date | Ngày mục tiêu |
| `startValueLabel` | Start Value | Giá trị bắt đầu |
| `startValuePh` | 0 | 0 |
| `goalValuePh` | 2000 | 2000 |

(Existing `form.startDate`, `form.due`, `form.reminders`, `form.alert`, `form.mode`,
`form.sum`, `form.latest`, `form.direction`, `form.higher`, `form.lower`,
`form.unit`, `form.unitPh`, `form.wd.*` are reused as-is. `form.target` /
`form.deadline` are no longer used by the target branch but stay in the file —
other types/tests may reference them; leave them.)

## Out of scope / non-goals

- Wiring reminders to notifee (deferred follow-up).
- Tags (image #2 has Tags; the Kite model has no tags — not added).
- Changing habit / average / project branches.
- Changing the target calculator (it already consumes `startValue`/`startDate`).

## Testing

- `factory.ts` is pure → add/extend a unit test asserting a target built with
  `startValue` keeps it (and defaults to 0 when omitted), and that a target with
  `repeatDays`/`reminderTime` retains them.
- Form rendering & DB persistence are verified on simulator (op-sqlite mocked in
  Jest, per project testing strategy).
- `yarn tsc` and `yarn lint` clean before commit.
