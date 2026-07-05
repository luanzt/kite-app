# Strides-style Average Tracker Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `average` tracker create/edit form to match the Strides reference (Goal, Time Period, Start Date, Due, Reminders, Average window, Move to Done, Progress Bar), backed by four new persisted model fields with real calculator/Today behavior.

**Architecture:** Four nullable columns are appended to the self-migrating `trackers` table and threaded through types → factory → repository. `calculateAverage` gains a rolling date-window and a progress-bar basis; `classifyTodayRow` gains a `doneRule` switch for average. Reminder scheduling and the Today due-day filter are extended to include average. The form's average section is rewritten with the same widgets/styling as the habit section.

**Tech Stack:** React Native CLI, TypeScript (strict), HeroUI Native + Uniwind (Tailwind v4), op-sqlite v16, TanStack Query, i18next, Jest.

**Spec:** `docs/superpowers/specs/2026-07-05-average-tracker-form-strides-design.md`

## Global Constraints

- Package manager is **yarn**. Type check: `yarn tsc`. Lint: `yarn lint`. Single test file: `yarn test <path>`.
- `yarn tsc` must be clean before every commit.
- UI text: `<Typography>` from `heroui-native`, NEVER `<Text>`.
- Styling: Tailwind `className` only; branch whole class strings on state; NEVER interpolate a value into a class string; inline `style` only for genuinely runtime-continuous values (with a why-comment) or via `StyleSheet.create`.
- All visible strings via `t('key')`; `src/i18n/locales/en.json` and `vi.json` stay key-for-key in sync.
- Construct `Tracker` objects only via `buildTracker()` (`features/trackers/factory.ts`).
- op-sqlite v16: `executeSync()` + `res.rows` (plain array). op-sqlite is mocked in Jest — DB-calling functions are device-verified, not unit-tested.
- New SQLite columns must be nullable (added via the auto `ALTER TABLE` path in `db/schema.ts`); never hand-write migration steps.
- TDD: write the failing test first for every behavioral change.
- Commit messages end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: Model layer — types, factory defaults, schema columns, repository mapping

The four new fields are required-but-nullable on `Tracker`, so types, factory, schema, repository, and every test fixture must land together to keep `yarn tsc` and the suite green.

**Files:**
- Modify: `src/features/trackers/types.ts`
- Modify: `src/features/trackers/factory.ts`
- Modify: `src/features/trackers/db/schema.ts:39-59` (`TRACKER_COLUMNS`)
- Modify: `src/features/trackers/db/repository.ts:6-58` (`trackerToRow`, `rowToTracker`, `COLS`)
- Test: `src/features/trackers/__tests__/factory.test.ts`
- Test: `src/features/trackers/db/__tests__/schema.test.ts`
- Test: `src/features/trackers/db/__tests__/repository.test.ts`
- Modify (fixtures only — add the four null fields): `src/features/trackers/calculators/__tests__/average.test.ts`, `target.test.ts`, `habit.test.ts`, `habitStats.test.ts`, `project.test.ts`, `targetTrajectory.test.ts`

**Interfaces:**
- Consumes: existing `Tracker`, `BuildTrackerInput`, `ColumnSpec`, `trackerToRow`/`rowToTracker`.
- Produces (later tasks rely on these exact names):
  - `types.ts`: `export type AverageWindow = 'since_start' | 'rolling'`, `export type DoneRule = 'when_logged' | 'when_goal_met'`, `export type ProgressBasis = 'overall_avg' | 'today_total'`; `Tracker` fields `averageWindow: AverageWindow | null`, `rollingDays: number | null`, `doneRule: DoneRule | null`, `progressBasis: ProgressBasis | null`.
  - `factory.ts`: `BuildTrackerInput` optional fields `averageWindow?`, `rollingDays?`, `doneRule?`, `progressBasis?` (same nullable types).
  - DB columns: `average_window TEXT`, `rolling_days INTEGER`, `done_rule TEXT`, `progress_basis TEXT`.

- [ ] **Step 1: Write the failing factory tests**

Append to `src/features/trackers/__tests__/factory.test.ts`:

```ts
describe('buildTracker — average Strides options', () => {
  it('defaults the four average fields for an average tracker', () => {
    const t = buildTracker({ name: 'Water', type: 'average', targetValue: 8 })
    expect(t.averageWindow).toBe('since_start')
    expect(t.rollingDays).toBeNull() // only set when rolling
    expect(t.doneRule).toBe('when_logged')
    expect(t.progressBasis).toBe('overall_avg')
  })

  it('rolling window defaults rollingDays to 7 and keeps explicit values', () => {
    const t = buildTracker({
      name: 'Water',
      type: 'average',
      averageWindow: 'rolling'
    })
    expect(t.averageWindow).toBe('rolling')
    expect(t.rollingDays).toBe(7)
    const t14 = buildTracker({
      name: 'Water',
      type: 'average',
      averageWindow: 'rolling',
      rollingDays: 14
    })
    expect(t14.rollingDays).toBe(14)
  })

  it('non-average types get null for all four fields', () => {
    const h = buildTracker({ name: 'Meditate', type: 'habit' })
    expect(h.averageWindow).toBeNull()
    expect(h.rollingDays).toBeNull()
    expect(h.doneRule).toBeNull()
    expect(h.progressBasis).toBeNull()
  })
})
```

- [ ] **Step 2: Write the failing schema test change**

In `src/features/trackers/db/__tests__/schema.test.ts`, the first test's expected array (currently ending at `goal_note`) becomes:

```ts
    expect(missingColumns(TRACKER_COLUMNS, existing)).toEqual([
      { name: 'routine', decl: 'routine TEXT' },
      { name: 'reminder_time', decl: 'reminder_time TEXT' },
      { name: 'goal_note', decl: 'goal_note TEXT' },
      { name: 'average_window', decl: 'average_window TEXT' },
      { name: 'rolling_days', decl: 'rolling_days INTEGER' },
      { name: 'done_rule', decl: 'done_rule TEXT' },
      { name: 'progress_basis', decl: 'progress_basis TEXT' }
    ])
```

- [ ] **Step 3: Write the failing repository tests**

Append inside the `describe('tracker row mapping', …)` block of `src/features/trackers/db/__tests__/repository.test.ts`:

```ts
  const avgTracker: Tracker = {
    ...tracker,
    type: 'average',
    averageWindow: 'rolling',
    rollingDays: 14,
    doneRule: 'when_goal_met',
    progressBasis: 'today_total'
  }

  test('trackerToRow maps the average Strides fields to snake_case columns', () => {
    const row = trackerToRow(avgTracker)
    expect(row.average_window).toBe('rolling')
    expect(row.rolling_days).toBe(14)
    expect(row.done_rule).toBe('when_goal_met')
    expect(row.progress_basis).toBe('today_total')
  })

  test('rowToTracker round-trips the average Strides fields', () => {
    expect(rowToTracker(trackerToRow(avgTracker))).toEqual(avgTracker)
  })

  test('rowToTracker defaults missing average fields to null (old rows)', () => {
    const row = trackerToRow(tracker)
    delete row.average_window
    delete row.rolling_days
    delete row.done_rule
    delete row.progress_basis
    const back = rowToTracker(row)
    expect(back.averageWindow).toBeNull()
    expect(back.rollingDays).toBeNull()
    expect(back.doneRule).toBeNull()
    expect(back.progressBasis).toBeNull()
  })
```

- [ ] **Step 4: Run the three test files to verify they fail**

Run:
```bash
yarn test src/features/trackers/__tests__/factory.test.ts src/features/trackers/db/__tests__/schema.test.ts src/features/trackers/db/__tests__/repository.test.ts
```
Expected: FAIL — TypeScript errors (`averageWindow` does not exist on `BuildTrackerInput`/`Tracker`) and the schema expectation mismatch.

- [ ] **Step 5: Add the unions + fields to `types.ts`**

In `src/features/trackers/types.ts`, after the `Routine` type add:

```ts
/** Average only: which entries feed the mean (Strides "Average"). */
export type AverageWindow = 'since_start' | 'rolling'
/** Average only: when the Today row counts as done (Strides "Move to Done"). */
export type DoneRule = 'when_logged' | 'when_goal_met'
/** Average only: what fills the progress bar (Strides "Progress Bar"). */
export type ProgressBasis = 'overall_avg' | 'today_total'
```

In the `Tracker` type, after the `goalNote` line add:

```ts
  averageWindow: AverageWindow | null // average only; null = since_start
  rollingDays: number | null // average only: rolling window in calendar days
  doneRule: DoneRule | null // average only; null = when_logged
  progressBasis: ProgressBasis | null // average only; null = overall_avg
```

- [ ] **Step 6: Extend the factory**

In `src/features/trackers/factory.ts`:

Add to the type import: `AverageWindow, DoneRule, ProgressBasis`.

Add to `BuildTrackerInput`:

```ts
  averageWindow?: AverageWindow | null
  rollingDays?: number | null
  doneRule?: DoneRule | null
  progressBasis?: ProgressBasis | null
```

In `buildTracker`, after `const isHabit = type === 'habit'` add `const isAverage = type === 'average'`, and after the `goalNote: null,` line add:

```ts
    averageWindow: isAverage ? input.averageWindow ?? 'since_start' : null,
    rollingDays:
      isAverage && (input.averageWindow ?? 'since_start') === 'rolling'
        ? input.rollingDays ?? 7
        : null,
    doneRule: isAverage ? input.doneRule ?? 'when_logged' : null,
    progressBasis: isAverage ? input.progressBasis ?? 'overall_avg' : null,
```

- [ ] **Step 7: Append the schema columns**

In `src/features/trackers/db/schema.ts`, append to `TRACKER_COLUMNS` (after the `archived` entry — order must match the schema test, which lists them after `goal_note`; `archived` is already in the test's `existing` list so appending at the array end is correct):

```ts
  { name: 'average_window', decl: 'average_window TEXT' },
  { name: 'rolling_days', decl: 'rolling_days INTEGER' },
  { name: 'done_rule', decl: 'done_rule TEXT' },
  { name: 'progress_basis', decl: 'progress_basis TEXT' }
```

- [ ] **Step 8: Map the columns in the repository**

In `src/features/trackers/db/repository.ts`:

`trackerToRow` — after `archived: t.archived ? 1 : 0` add:

```ts
    average_window: t.averageWindow,
    rolling_days: t.rollingDays,
    done_rule: t.doneRule,
    progress_basis: t.progressBasis
```

(mind the comma on the previous line).

`rowToTracker` — after `archived: r.archived === 1` add:

```ts
    averageWindow: r.average_window ?? null,
    rollingDays: r.rolling_days ?? null,
    doneRule: r.done_rule ?? null,
    progressBasis: r.progress_basis ?? null
```

`COLS` — append the new columns:

```ts
const COLS =
  'id,name,type,icon,color,unit,direction,target_value,start_value,accumulation,start_date,deadline,period,repeat_days,routine,reminder_time,goal_note,created_at,archived,average_window,rolling_days,done_rule,progress_basis'
```

- [ ] **Step 9: Add the four null fields to every Tracker test fixture**

Add these four lines to each `Tracker` object literal below (immediately before its `archived: false` line):

```ts
  averageWindow: null,
  rollingDays: null,
  doneRule: null,
  progressBasis: null,
```

Fixture locations:
- `src/features/trackers/calculators/__tests__/average.test.ts` — `const avg: Tracker`
- `src/features/trackers/calculators/__tests__/target.test.ts` — `const base: Tracker`
- `src/features/trackers/calculators/__tests__/habit.test.ts` — `const habit: Tracker`
- `src/features/trackers/calculators/__tests__/habitStats.test.ts` — `const base: Tracker`
- `src/features/trackers/calculators/__tests__/project.test.ts` — `const proj: Tracker`
- `src/features/trackers/calculators/__tests__/targetTrajectory.test.ts` — the object literal returned by `baseTracker()`
- `src/features/trackers/db/__tests__/repository.test.ts` — BOTH `const tracker: Tracker` (top of file) and `const habit: Tracker` (inside the all-nulls round-trip test)

- [ ] **Step 10: Run the full suite and type check**

Run: `yarn test && yarn tsc`
Expected: all suites PASS, tsc clean.

- [ ] **Step 11: Commit**

```bash
git add -A src docs
git commit -m "feat(trackers): add Strides average fields to model, schema & factory

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `calculateAverage` — rolling window + progress-bar basis

**Files:**
- Modify: `src/features/trackers/calculators/average.ts`
- Test: `src/features/trackers/calculators/__tests__/average.test.ts`

**Interfaces:**
- Consumes: `Tracker.averageWindow/rollingDays/progressBasis` (Task 1); `isoAddDays(iso: string, n: number): string` exported from `./habitStats`.
- Produces: `calculateAverage(tracker: Tracker, entries: Entry[], todayISO: string): TrackerProgress` — same signature, third param renamed from `_todayISO` (now used). Null fields reproduce the old behavior exactly.

- [ ] **Step 1: Write the failing tests**

Append to `src/features/trackers/calculators/__tests__/average.test.ts` (the `avg` fixture and `e()` helper already exist; `avg` has the four null fields from Task 1):

```ts
describe('calculateAverage — rolling window', () => {
  const rolling: Tracker = { ...avg, averageWindow: 'rolling', rollingDays: 7 }

  test('only entries within the last N days count toward the mean', () => {
    const p = calculateAverage(
      rolling,
      [e('2026-06-01', 100), e('2026-06-10', 4), e('2026-06-13', 8)],
      '2026-06-13'
    )
    expect(p.current).toBe(6) // (4+8)/2 — 06-01 is outside the 7-day window
  })

  test('boundary: 6 days ago is inside, 7 days ago is outside', () => {
    // today 06-13, N=7 → window covers 06-07..06-13
    const inside = calculateAverage(rolling, [e('2026-06-07', 5)], '2026-06-13')
    expect(inside.current).toBe(5)
    const outside = calculateAverage(
      rolling,
      [e('2026-06-06', 5)],
      '2026-06-13'
    )
    expect(outside.current).toBe(0)
  })

  test('empty window → current 0, behind', () => {
    const p = calculateAverage(rolling, [e('2026-05-01', 9)], '2026-06-13')
    expect(p.current).toBe(0)
    expect(p.paceStatus).toBe('behind')
  })

  test('null rollingDays falls back to a 7-day window', () => {
    const p = calculateAverage(
      { ...rolling, rollingDays: null },
      [e('2026-06-06', 5), e('2026-06-13', 9)],
      '2026-06-13'
    )
    expect(p.current).toBe(9)
  })
})

describe('calculateAverage — today_total progress basis', () => {
  const todayBasis: Tracker = { ...avg, progressBasis: 'today_total' }

  test("percent & pace use today's summed total; current stays the mean", () => {
    const p = calculateAverage(
      todayBasis,
      [
        e('2026-06-12', 2),
        e('2026-06-13', 3),
        { ...e('2026-06-13', 5), id: 'second-log' }
      ],
      '2026-06-13'
    )
    expect(p.current).toBeCloseTo(10 / 3) // mean over all entries, unchanged
    expect(p.percent).toBe(1) // today 3+5 = 8 >= goal 8
    expect(p.paceStatus).toBe('on_track')
  })

  test("behind when today's total is below goal even if the mean meets it", () => {
    const p = calculateAverage(
      todayBasis,
      [e('2026-06-12', 20), e('2026-06-13', 2)],
      '2026-06-13'
    )
    expect(p.percent).toBe(2 / 8)
    expect(p.paceStatus).toBe('behind')
  })
})
```

- [ ] **Step 2: Run the test file to verify the new cases fail**

Run: `yarn test src/features/trackers/calculators/__tests__/average.test.ts`
Expected: FAIL — the 6 new tests fail (rolling entries not filtered, percent uses the mean); the 4 original tests still pass.

- [ ] **Step 3: Implement**

Replace the body of `src/features/trackers/calculators/average.ts` with:

```ts
import type { Tracker, Entry, TrackerProgress } from '@features/trackers/types'
import { isoAddDays } from './habitStats'

/**
 * Average tracker progress. `averageWindow`/`rollingDays` choose which entries
 * feed the mean (all-time vs the last N calendar days); `progressBasis`
 * chooses what fills the progress bar (the mean itself vs today's summed
 * total). Null fields reproduce the pre-Strides behavior exactly.
 */
export function calculateAverage(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string
): TrackerProgress {
  const goal = tracker.targetValue ?? 0

  // Window: rolling = entries dated within the last N days, today inclusive.
  const windowed =
    tracker.averageWindow === 'rolling'
      ? entries.filter(
          (e) =>
            e.date.slice(0, 10) >
            isoAddDays(todayISO, -(tracker.rollingDays ?? 7))
        )
      : entries
  const current = windowed.length
    ? windowed.reduce((sum, e) => sum + e.value, 0) / windowed.length
    : 0

  // Progress-bar basis: the mean itself, or today's summed total.
  const basis =
    tracker.progressBasis === 'today_total'
      ? entries
          .filter((e) => e.date.slice(0, 10) === todayISO)
          .reduce((sum, e) => sum + e.value, 0)
      : current

  const percent = goal === 0 ? 0 : Math.max(0, Math.min(1, basis / goal))
  const paceStatus = basis >= goal && goal > 0 ? 'on_track' : 'behind'
  return { current, goal, percent, paceStatus }
}
```

- [ ] **Step 4: Run the test file to verify it passes**

Run: `yarn test src/features/trackers/calculators/__tests__/average.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Full suite + tsc, then commit**

Run: `yarn test && yarn tsc`
Expected: PASS, clean.

```bash
git add src/features/trackers/calculators/average.ts src/features/trackers/calculators/__tests__/average.test.ts
git commit -m "feat(trackers): rolling window & progress basis in calculateAverage

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: `classifyTodayRow` — doneRule for average

**Files:**
- Modify: `src/features/trackers/calculators/habitStats.ts:337-348` (`classifyTodayRow`)
- Test: `src/features/trackers/calculators/__tests__/habitStats.test.ts` (the existing `classifyTodayRow` describe, near the end of the file)

**Interfaces:**
- Consumes: `Tracker.doneRule` (Task 1). Caller contract (unchanged): `DailyGoalsScreen` passes `yes` = summed numeric value logged today for non-habit trackers.
- Produces: same signature `classifyTodayRow(tracker: Tracker, yes: number, no: number): TodayRowStatus`.

- [ ] **Step 1: Write the failing tests**

Append inside the `classifyTodayRow` describe block of `habitStats.test.ts`:

```ts
  it("average when_goal_met: completed only when today's total reaches the goal", () => {
    const avgGoal: Tracker = {
      ...base,
      type: 'average',
      targetValue: 8,
      doneRule: 'when_goal_met'
    }
    expect(classifyTodayRow(avgGoal, 0, 0)).toBe('due')
    expect(classifyTodayRow(avgGoal, 5, 0)).toBe('due') // logged, but under goal
    expect(classifyTodayRow(avgGoal, 8, 0)).toBe('completed')
  })

  it('average when_goal_met with no positive goal falls back to any-log', () => {
    const noGoal: Tracker = {
      ...base,
      type: 'average',
      targetValue: null,
      doneRule: 'when_goal_met'
    }
    expect(classifyTodayRow(noGoal, 0, 0)).toBe('due')
    expect(classifyTodayRow(noGoal, 2, 0)).toBe('completed')
  })

  it('average when_logged (and null doneRule) keeps the any-log rule', () => {
    const logged: Tracker = {
      ...base,
      type: 'average',
      targetValue: 8,
      doneRule: 'when_logged'
    }
    expect(classifyTodayRow(logged, 1, 0)).toBe('completed')
    expect(classifyTodayRow({ ...logged, doneRule: null }, 1, 0)).toBe(
      'completed'
    )
  })
```

- [ ] **Step 2: Run the test file to verify the new cases fail**

Run: `yarn test src/features/trackers/calculators/__tests__/habitStats.test.ts`
Expected: FAIL — `when_goal_met` cases return `'completed'` at `yes=5` (any-log rule still applies); other new cases pass.

- [ ] **Step 3: Implement**

In `habitStats.ts`, change `classifyTodayRow` to:

```ts
export function classifyTodayRow(
  tracker: Tracker,
  yes: number,
  no: number
): TodayRowStatus {
  if (tracker.type === 'project') return 'due'
  if (tracker.type === 'average' && tracker.doneRule === 'when_goal_met') {
    const goal = tracker.targetValue ?? 0
    // No positive goal to meet → fall through to the any-log rule below.
    if (goal > 0) return yes >= goal ? 'completed' : 'due'
  }
  if (tracker.type !== 'habit') return yes > 0 ? 'completed' : 'due'
  const goal = perDayGoal(tracker)
  if (yes >= goal) return 'completed'
  if (yes + no >= goal) return 'missed'
  return 'due'
}
```

Note: the habit branch already declares `const goal` — the average branch's `goal` is inside its own `if` block, so there is no redeclaration conflict.

- [ ] **Step 4: Run the test file to verify it passes**

Run: `yarn test src/features/trackers/calculators/__tests__/habitStats.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite + tsc, then commit**

Run: `yarn test && yarn tsc`
Expected: PASS, clean.

```bash
git add src/features/trackers/calculators/habitStats.ts src/features/trackers/calculators/__tests__/habitStats.test.ts
git commit -m "feat(trackers): doneRule-aware Today classification for average

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Wiring — average reminders + Today due-day filter

No unit tests (notifee is native, `isDueToday` is screen-local; both device-verified per project testing strategy). Guarded by tsc + the full suite.

**Files:**
- Modify: `src/features/trackers/notifications.ts:98-113`
- Modify: `src/features/trackers/queries/index.ts:60-64`
- Modify: `src/screens/today/DailyGoalsScreen.tsx:42-47`
- Modify: `src/i18n/locales/en.json` (`notification` object), `src/i18n/locales/vi.json` (`notification` object)

**Interfaces:**
- Consumes: `scheduleTrackerReminders(tracker, body)` (existing), `Tracker.repeatDays`.
- Produces: i18n key `notification.averageBody` used by `useSaveTracker`.

- [ ] **Step 1: Open the reminder gate to average**

In `src/features/trackers/notifications.ts`, change line 112:

```ts
  const reminds =
    tracker.type === 'habit' ||
    tracker.type === 'target' ||
    tracker.type === 'average'
```

And update the doc-comment lines 98-100 to:

```ts
 * Habits, targets and averages are reminded on their `repeatDays` (or every
 * day if none — their forms let the user pick weekdays). Projects are not
 * reminded.
```

- [ ] **Step 2: Pick the average notification body**

In `src/features/trackers/queries/index.ts` (`useSaveTracker`), replace the `body` ternary:

```ts
        const body =
          t.type === 'target'
            ? tr('notification.targetBody')
            : t.type === 'average'
              ? tr('notification.averageBody')
              : tr('notification.habitBody')
```

- [ ] **Step 3: Add the i18n key (both locales)**

`en.json` — extend the `notification` object:

```json
  "notification": { "habitBody": "Time to keep your streak going", "targetBody": "Log your progress toward the goal", "averageBody": "Time to log today's number" }
```

`vi.json` — same shape:

```json
  "notification": { "habitBody": "Đến giờ giữ vững chuỗi ngày rồi", "targetBody": "Ghi lại tiến độ hướng tới mục tiêu", "averageBody": "Đến giờ ghi lại số liệu hôm nay" }
```

- [ ] **Step 4: Respect average repeatDays on Today**

In `src/screens/today/DailyGoalsScreen.tsx`, change `isDueToday` to:

```ts
function isDueToday(t: Tracker, todayISO: string): boolean {
  const dueByWeekday = t.type === 'habit' || t.type === 'average'
  if (dueByWeekday && t.repeatDays && t.repeatDays.length) {
    return t.repeatDays.includes(weekdayOf(todayISO))
  }
  return true
}
```

- [ ] **Step 5: Full suite + tsc + lint, then commit**

Run: `yarn test && yarn tsc && yarn lint`
Expected: PASS, clean, no new lint errors.

```bash
git add src/features/trackers/notifications.ts src/features/trackers/queries/index.ts src/screens/today/DailyGoalsScreen.tsx src/i18n/locales/en.json src/i18n/locales/vi.json
git commit -m "feat(trackers): wire average reminders & Today due-day filter

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Form — i18n keys + the Strides-style average section

Screen code — no unit tests (device-verified in Task 6). Guarded by tsc + lint.

**Files:**
- Modify: `src/i18n/locales/en.json` (`form` object), `src/i18n/locales/vi.json` (`form` object)
- Modify: `src/screens/trackers/TrackerFormScreen.tsx` (imports, state, hydrate effect, `onSave`, the `average` JSX block)

**Interfaces:**
- Consumes: `AverageWindow`, `DoneRule`, `ProgressBasis` types (Task 1); `buildTracker` input fields (Task 1); existing widgets `FormInput`, `SelectField`, `DateField`, `WeekdayPicker`, `Toggle`, `TimeField`, `Segmented`, `FieldLabel`, `FieldLabelRow`, `InfoTooltip`; `TYPE_COLOR.average`, `Icons.Bell`; existing `periodLabels`.
- Produces: the finished form. New i18n keys listed in Step 1.

- [ ] **Step 1: Add the form i18n keys (both locales, key-for-key)**

`en.json` — add inside the `form` object (before the `"wd"` line):

```json
    "avgGoal": "Goal", "avgGoalPh": "5",
    "avgWindow": "Average", "avgSinceStart": "Since Start Date", "avgRolling": "Rolling Average",
    "avgRollingDays": "Rolling window (days)", "avgCustom": "Custom",
    "avgWindowHelp": "Since Start Date averages every log since you began. Rolling Average only averages the last N days — recent performance instead of all-time.",
    "moveToDone": "Move to Done", "moveWhenLogged": "When Logged", "moveWhenGoalMet": "When Goal is Met",
    "moveHelp": "When Logged marks the day done as soon as you log anything. When Goal is Met waits until today's total reaches your goal.",
    "progressBar": "Progress Bar", "progressOverall": "Overall Average", "progressToday": "Today's Total",
    "progressHelp": "Overall Average fills the bar from your average versus your goal. Today's Total fills it from what you've logged today.",
```

`vi.json` — same keys:

```json
    "avgGoal": "Mục tiêu", "avgGoalPh": "5",
    "avgWindow": "Cách tính trung bình", "avgSinceStart": "Từ ngày bắt đầu", "avgRolling": "Trung bình trượt",
    "avgRollingDays": "Cửa sổ trượt (ngày)", "avgCustom": "Tùy chỉnh",
    "avgWindowHelp": "Từ ngày bắt đầu tính trung bình mọi lần ghi kể từ khi bắt đầu. Trung bình trượt chỉ tính N ngày gần nhất — phản ánh phong độ gần đây thay vì toàn bộ.",
    "moveToDone": "Chuyển sang Hoàn thành", "moveWhenLogged": "Khi đã ghi", "moveWhenGoalMet": "Khi đạt mục tiêu",
    "moveHelp": "Khi đã ghi đánh dấu hoàn thành ngay khi bạn ghi bất kỳ giá trị nào. Khi đạt mục tiêu chờ đến khi tổng hôm nay đạt mục tiêu.",
    "progressBar": "Thanh tiến độ", "progressOverall": "Trung bình tổng", "progressToday": "Tổng hôm nay",
    "progressHelp": "Trung bình tổng đo thanh theo mức trung bình so với mục tiêu. Tổng hôm nay đo theo số bạn đã ghi trong hôm nay.",
```

- [ ] **Step 2: Imports + module constant**

In `TrackerFormScreen.tsx`, extend the types import:

```ts
import type {
  Accumulation,
  AverageWindow,
  DoneRule,
  HabitDirection,
  Period,
  ProgressBasis,
  Routine,
  Tracker
} from '@features/trackers/types'
```

Below the `COLORS` constant add:

```ts
/** Rolling-average preset windows (days) — Strides-style quick picks. */
const ROLLING_PRESETS = [7, 14, 21]
```

- [ ] **Step 3: State + hydration**

After the `reminderTime` state declarations add:

```ts
  // Average-only Strides options.
  const [averageWindow, setAverageWindow] = useState<AverageWindow>(
    editing?.averageWindow ?? 'since_start'
  )
  const [rollingDaysStr, setRollingDaysStr] = useState(
    editing?.rollingDays != null ? String(editing.rollingDays) : '7'
  )
  const [doneRule, setDoneRule] = useState<DoneRule>(
    editing?.doneRule ?? 'when_logged'
  )
  const [progressBasis, setProgressBasis] = useState<ProgressBasis>(
    editing?.progressBasis ?? 'overall_avg'
  )
```

In the hydrate `useEffect` (after `setReminderTime(...)`) add:

```ts
    setAverageWindow(editing.averageWindow ?? 'since_start')
    setRollingDaysStr(
      editing.rollingDays != null ? String(editing.rollingDays) : '7'
    )
    setDoneRule(editing.doneRule ?? 'when_logged')
    setProgressBasis(editing.progressBasis ?? 'overall_avg')
```

- [ ] **Step 4: `onSave` — validation, parsing, buildTracker input, tracker object**

Replace the top of `onSave` (through the validation block) with:

```ts
  const onSave = () => {
    const isHabit = type === 'habit'
    const isTarget = type === 'target'
    const isAverage = type === 'average'

    // Required fields: habit/target/average need a goal > 0; habit & average
    // also need at least one Due day.
    if (isHabit || isTarget || isAverage) {
      const goalNum = Number(target)
      const problems: string[] = []
      if (!target.trim() || !Number.isFinite(goalNum) || goalNum <= 0)
        problems.push(t('form.errGoal'))
      if ((isHabit || isAverage) && repeatDays.length === 0)
        problems.push(t('form.errDue'))
      if (problems.length) {
        alert({
          title: t('form.errTitle'),
          message: problems.join('\n'),
          variant: 'danger'
        })
        return
      }
    }

    // Rolling window: parse the free-text days, falling back to 7.
    const parsedRolling = Number(rollingDaysStr)
    const rollingDaysNum =
      Number.isFinite(parsedRolling) && parsedRolling >= 1
        ? Math.round(parsedRolling)
        : 7
```

Then replace the `buildTracker` call with:

```ts
    const base = buildTracker({
      name: name.trim() || t(`type.${type}`),
      type,
      icon,
      color,
      unit: isAverage ? null : unit.trim() || null,
      targetValue: target ? Number(target) : null,
      startValue: isTarget ? Number(startValue) || 0 : undefined,
      accumulation: isTarget ? accum : undefined,
      period: isAverage || isHabit ? period : undefined,
      startDate:
        isHabit || isTarget || isAverage
          ? startDate.trim() || undefined
          : undefined,
      repeatDays: isHabit || isTarget || isAverage ? repeatDays : undefined,
      routine: isHabit ? routine : undefined,
      reminderTime:
        (isHabit || isTarget || isAverage) && reminderOn
          ? reminderTime.trim() || null
          : null,
      averageWindow: isAverage ? averageWindow : undefined,
      rollingDays:
        isAverage && averageWindow === 'rolling' ? rollingDaysNum : undefined,
      doneRule: isAverage ? doneRule : undefined,
      progressBasis: isAverage ? progressBasis : undefined
    })
```

And in the `tracker` object below it, change the `startDate` line to:

```ts
      startDate:
        isHabit || isTarget || isAverage
          ? base.startDate
          : editing?.startDate ?? base.startDate,
```

- [ ] **Step 5: Replace the average JSX block**

Replace the entire `{/* average-specific */}` block (`{type === 'average' ? (…) : null}`) with:

```tsx
        {/* average-specific */}
        {type === 'average' ? (
          <>
            {/* goal + time period */}
            <View className='flex-row gap-s3'>
              <View className='flex-1 gap-s2'>
                <FieldLabel>{t('form.avgGoal')}</FieldLabel>
                <FormInput
                  value={target}
                  onChangeText={setTarget}
                  placeholder={t('form.avgGoalPh')}
                  keyboardType='decimal-pad'
                />
              </View>
              <View className='flex-[2] gap-s2'>
                <FieldLabel>{t('form.timePeriod')}</FieldLabel>
                <SelectField<Period>
                  label={t('form.timePeriod')}
                  value={period}
                  onChange={setPeriod}
                  options={[
                    { value: 'daily', label: periodLabels.daily },
                    { value: 'weekly', label: periodLabels.weekly },
                    { value: 'monthly', label: periodLabels.monthly }
                  ]}
                />
              </View>
            </View>

            {/* start date */}
            <View className='gap-s2'>
              <FieldLabel>{t('form.startDate')}</FieldLabel>
              <DateField value={startDate} onChange={setStartDate} />
            </View>

            {/* due / repeat days */}
            <View className='gap-s2'>
              <FieldLabel>{t('form.due')}</FieldLabel>
              <WeekdayPicker
                value={repeatDays}
                onChange={setRepeatDays}
                labels={{
                  mon: t('form.wd.mon'),
                  tue: t('form.wd.tue'),
                  wed: t('form.wd.wed'),
                  thu: t('form.wd.thu'),
                  fri: t('form.wd.fri'),
                  sat: t('form.wd.sat'),
                  sun: t('form.wd.sun')
                }}
              />
            </View>

            {/* reminders */}
            <View className='gap-s2'>
              <View className='flex-row items-center justify-between'>
                <View className='flex-row items-center gap-s2'>
                  <Icons.Bell size={18} color={TYPE_COLOR.average} />
                  <FieldLabel>{t('form.reminders')}</FieldLabel>
                </View>
                <Toggle value={reminderOn} onChange={setReminderOn} />
              </View>
              {reminderOn ? (
                <View className='gap-s2'>
                  <FieldLabel>{t('form.alert')}</FieldLabel>
                  <TimeField
                    value={reminderTime}
                    onChange={setReminderTime}
                    placeholder='18:00'
                  />
                </View>
              ) : null}
            </View>

            {/* average window (Strides "Average") */}
            <View className='gap-s2'>
              <FieldLabelRow
                trailing={
                  <InfoTooltip
                    title={t('form.helpTitle')}
                    description={t('form.avgWindowHelp')}
                  />
                }
              >
                {t('form.avgWindow')}
              </FieldLabelRow>
              <Segmented<AverageWindow>
                value={averageWindow}
                onChange={setAverageWindow}
                options={[
                  { value: 'since_start', label: t('form.avgSinceStart') },
                  { value: 'rolling', label: t('form.avgRolling') }
                ]}
              />
              {averageWindow === 'rolling' ? (
                <View className='gap-s2'>
                  <FieldLabel>{t('form.avgRollingDays')}</FieldLabel>
                  <View className='flex-row items-center gap-s2'>
                    {ROLLING_PRESETS.map((d) => {
                      const sel = rollingDaysStr === String(d)
                      return (
                        <Pressable
                          key={d}
                          onPress={() => setRollingDaysStr(String(d))}
                          className={`h-[46px] w-[56px] items-center justify-center rounded-md-k border ${
                            sel
                              ? 'border-brand bg-brand-weak'
                              : 'border-line bg-surface'
                          }`}
                        >
                          <Typography
                            className={`text-base font-bold ${
                              sel ? 'text-brand' : 'text-ink-2'
                            }`}
                          >
                            {d}
                          </Typography>
                        </Pressable>
                      )
                    })}
                    <View className='flex-1'>
                      <FormInput
                        value={rollingDaysStr}
                        onChangeText={setRollingDaysStr}
                        placeholder={t('form.avgCustom')}
                        keyboardType='decimal-pad'
                      />
                    </View>
                  </View>
                </View>
              ) : null}
            </View>

            {/* move to done */}
            <View className='gap-s2'>
              <FieldLabelRow
                trailing={
                  <InfoTooltip
                    title={t('form.helpTitle')}
                    description={t('form.moveHelp')}
                  />
                }
              >
                {t('form.moveToDone')}
              </FieldLabelRow>
              <Segmented<DoneRule>
                value={doneRule}
                onChange={setDoneRule}
                options={[
                  { value: 'when_logged', label: t('form.moveWhenLogged') },
                  { value: 'when_goal_met', label: t('form.moveWhenGoalMet') }
                ]}
              />
            </View>

            {/* progress bar */}
            <View className='gap-s2'>
              <FieldLabelRow
                trailing={
                  <InfoTooltip
                    title={t('form.helpTitle')}
                    description={t('form.progressHelp')}
                  />
                }
              >
                {t('form.progressBar')}
              </FieldLabelRow>
              <Segmented<ProgressBasis>
                value={progressBasis}
                onChange={setProgressBasis}
                options={[
                  { value: 'overall_avg', label: t('form.progressOverall') },
                  { value: 'today_total', label: t('form.progressToday') }
                ]}
              />
            </View>
          </>
        ) : null}
```

- [ ] **Step 6: Full suite + tsc + lint, then commit**

Run: `yarn test && yarn tsc && yarn lint`
Expected: PASS, clean.

```bash
git add src/screens/trackers/TrackerFormScreen.tsx src/i18n/locales/en.json src/i18n/locales/vi.json
git commit -m "feat(form): Strides-style average tracker form

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: End-to-end verification on device/simulator

DB, notifee, and screen code are not unit-testable (op-sqlite mocked in Jest) — verify on a simulator. JS-only change: no native rebuild needed if an app build is already installed; `yarn ios` otherwise.

**Files:** none (verification only).

- [ ] **Step 1: Static gates**

Run: `yarn test && yarn tsc && yarn lint`
Expected: all PASS/clean.

- [ ] **Step 2: Launch the app**

Run: `yarn ios` (or reload Metro if already built).
Expected: app boots; existing trackers list loads (proves the 4-column `ALTER TABLE` migration ran without breaking old rows).

- [ ] **Step 3: Manual checklist — create**

1. Trackers → + → Average. Verify the form shows: Name, Icon, Color, Goal + Time Period (row), Start Date, Due, Reminders, Average, Move to Done, Progress Bar — and NO Unit field.
2. Save with empty Goal → alert shows the goal error. Deselect all Due days → alert shows the due error.
3. Set Goal 8, Time Period Daily, Due = Mon–Fri only, Reminders ON 18:00, Average = Rolling (tap 14; type 10 in Custom → chip highlight clears), Move to Done = When Goal is Met, Progress Bar = Today's Total. Save.

- [ ] **Step 4: Manual checklist — behavior**

1. Today tab: the tracker appears only on a due weekday (change the Due days to exclude today, save, verify it disappears from Today; restore).
2. Log a value below the goal → row stays in Due (when_goal_met); log up to ≥ 8 total → moves to Completed; the card's progress ring/bar reflects today's total.
3. Edit the tracker → all ten fields re-hydrate with the saved values (Rolling shows 10 in the custom input).
4. iOS Settings → verify a pending notification exists for the tracker (or set the reminder 2 minutes ahead and background the app to see it fire).
5. Switch language to Tiếng Việt (Settings) → the new labels render in Vietnamese.

- [ ] **Step 5: Report**

No commit — report any deviation found back into the plan before fixing.
