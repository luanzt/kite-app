# Today "Missed" Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Missed" section to the Today screen (between Due Today and Completed) for habits whose attempts today fill the goal but whose Yes count fell short — `(yes + no) >= goal && yes < goal`.

**Architecture:** A tiny pure classifier `classifyTodayRow(tracker, yes, no)` returns `'due' | 'missed' | 'completed'` (TDD unit-tested in `habitStats.test.ts`). `DailyGoalsScreen` derives a per-tracker `no`-count map alongside the existing `yes`-sum map, sets each row's `status` from the classifier, and renders three sections. `Row.done` stays (derived as `status === 'completed'`) so `LogRow` is untouched.

**Tech Stack:** TypeScript (strict), React Native, Uniwind (Tailwind v4 `className`), i18next, Jest (op-sqlite mocked).

## Global Constraints

- **Styling:** Tailwind `className` only — NEVER inline `style={{…}}` except runtime-dynamic values. NEVER interpolate a value into a class string.
- **Text:** render `Typography` from `heroui-native`, NEVER `Text`.
- **Classification (exact):** habit → `completed` if `yes >= goal`; else `missed` if `yes + no >= goal`; else `due`. `yes` = sum of today's `value`; `no` = count of today's entries with `value === 0`; `goal = perDayGoal(tracker)`. target/average → `completed` if `todayLog > 0` else `due` (never missed). project → `due`.
- Section order: **Due Today → Missed → Completed**; each shown only when non-empty (Due Today header shows in the non-all-clear branch as today). Missed cards stay `bg-surface` (no brand-faint fill).
- **i18n:** no hardcoded visible strings; en/vi key-for-key. New key `today.missed`.
- TypeScript strict — `yarn tsc` clean. `yarn lint` — no NEW warnings. Named exports only.
- op-sqlite mocked in Jest → the screen render is verified on simulator; the classifier is pure and IS unit-tested. Existing 93 tests stay green.

---

## File Structure

- `src/features/trackers/calculators/habitStats.ts` — MODIFY: add `TodayRowStatus` type + `classifyTodayRow()`.
- `src/features/trackers/calculators/__tests__/habitStats.test.ts` — MODIFY: add `classifyTodayRow` tests.
- `src/i18n/locales/en.json`, `vi.json` — MODIFY: add `today.missed`.
- `src/screens/today/DailyGoalsScreen.tsx` — MODIFY: `no`-count map, row `status`, three sections.

---

## Task 1: `classifyTodayRow` pure classifier + tests

**Files:**
- Modify: `src/features/trackers/calculators/habitStats.ts`
- Test: `src/features/trackers/calculators/__tests__/habitStats.test.ts`

**Interfaces:**
- Consumes: `perDayGoal` (already in `habitStats.ts`), `Tracker`.
- Produces:
  ```ts
  export type TodayRowStatus = 'due' | 'missed' | 'completed'
  export function classifyTodayRow(
    tracker: Tracker, yes: number, no: number
  ): TodayRowStatus
  ```
  habit: `completed` if `yes >= perDayGoal`; else `missed` if `yes + no >= perDayGoal`; else `due`. project: always `due`. other (target/average): `completed` if `yes > 0` else `due` (here `yes` is the caller's `todayLog`; `no` is unused for non-habit).

- [ ] **Step 1: Write the failing tests**

In `src/features/trackers/calculators/__tests__/habitStats.test.ts`, add `classifyTodayRow` to the existing import from `'../habitStats'`, then append this block at the end. The `base` fixture (daily, `targetValue: null`) exists at the top; note `perDayGoal` for `targetValue: null` is `max(1, 1) = 1`, so use explicit `targetValue` in tests that need goal > 1.

```ts
describe('classifyTodayRow', () => {
  const g5: Tracker = { ...base, targetValue: 5 } // goal 5
  const g1: Tracker = { ...base, targetValue: 1 } // goal 1

  it('habit completed when yes >= goal', () => {
    expect(classifyTodayRow(g5, 5, 0)).toBe('completed')
    expect(classifyTodayRow(g5, 7, 0)).toBe('completed') // overflow still completed
  })

  it('habit missed when yes+no >= goal but yes < goal', () => {
    expect(classifyTodayRow(g5, 3, 2)).toBe('missed')
    expect(classifyTodayRow(g5, 0, 5)).toBe('missed')
  })

  it('habit due when yes < goal and yes+no < goal', () => {
    expect(classifyTodayRow(g5, 3, 1)).toBe('due') // room left
    expect(classifyTodayRow(g5, 0, 0)).toBe('due') // nothing logged
  })

  it('goal-1 habit: one yes completes, one no (no yes) is missed', () => {
    expect(classifyTodayRow(g1, 1, 0)).toBe('completed')
    expect(classifyTodayRow(g1, 0, 1)).toBe('missed')
    expect(classifyTodayRow(g1, 0, 0)).toBe('due')
  })

  it('completed takes priority over missed when yes >= goal even with extra logs', () => {
    // yes 5 (goal 5) plus a stray no → still completed (yes>=goal wins)
    expect(classifyTodayRow(g5, 5, 1)).toBe('completed')
  })

  it('project is always due', () => {
    const project: Tracker = { ...base, type: 'project' }
    expect(classifyTodayRow(project, 0, 0)).toBe('due')
  })

  it('target/average: completed when yes>0 (todayLog), else due; never missed', () => {
    const target: Tracker = { ...base, type: 'target', targetValue: 2000 }
    expect(classifyTodayRow(target, 0, 0)).toBe('due')
    expect(classifyTodayRow(target, 500, 0)).toBe('completed')
    const average: Tracker = { ...base, type: 'average', targetValue: 8 }
    expect(classifyTodayRow(average, 0, 3)).toBe('due') // no never makes non-habit missed
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn test src/features/trackers/calculators/__tests__/habitStats.test.ts -t classifyTodayRow`
Expected: FAIL — `classifyTodayRow is not a function`.

- [ ] **Step 3: Implement `classifyTodayRow`**

In `src/features/trackers/calculators/habitStats.ts`, append after `habitStreakStatus`:

```ts
export type TodayRowStatus = 'due' | 'missed' | 'completed'

/**
 * Which Today-screen section a tracker belongs to. `yes` is today's Yes total
 * (sum of logged values), `no` is today's No count (entries with value 0).
 * Habit: completed once Yes meets the per-day goal; missed once the attempts
 * (yes + no) fill the goal but Yes fell short; otherwise still due. Non-habit
 * (target/average) is completed when anything was logged today (`yes > 0`),
 * else due — it is never "missed". Project is always due.
 */
export function classifyTodayRow(
  tracker: Tracker,
  yes: number,
  no: number
): TodayRowStatus {
  if (tracker.type === 'project') return 'due'
  if (tracker.type !== 'habit') return yes > 0 ? 'completed' : 'due'
  const goal = perDayGoal(tracker)
  if (yes >= goal) return 'completed'
  if (yes + no >= goal) return 'missed'
  return 'due'
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn test src/features/trackers/calculators/__tests__/habitStats.test.ts -t classifyTodayRow`
Expected: PASS (all cases).

- [ ] **Step 5: Full suite + tsc + lint**

Run: `yarn test && yarn tsc && yarn lint`
Expected: full suite green (93 + new cases); tsc clean; no new lint in habitStats.ts.

- [ ] **Step 6: Commit**

```bash
git add src/features/trackers/calculators/habitStats.ts src/features/trackers/calculators/__tests__/habitStats.test.ts
git commit -m "feat(habit): classifyTodayRow — due/missed/completed for Today sections

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: i18n `today.missed`

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/vi.json`

**Interfaces:**
- Produces: `today.missed`. Consumed by Task 3.

- [ ] **Step 1: Add EN key**

In `src/i18n/locales/en.json`, inside the `"today"` object, after the existing `"completed"` key (`"completed": "Completed",`), add:

```json
    "missed": "Missed",
```

- [ ] **Step 2: Add VI key**

In `src/i18n/locales/vi.json`, inside the `"today"` object, after its `"completed"` key, add:

```json
    "missed": "Đã lỡ",
```

- [ ] **Step 3: Verify**

Run:
```bash
node -e "const en=require('./src/i18n/locales/en.json').today, vi=require('./src/i18n/locales/vi.json').today; console.log('en.missed', en.missed, '| vi.missed', vi.missed); console.log('OK')"
```
Expected: `en.missed Missed | vi.missed Đã lỡ`, `OK`.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/vi.json
git commit -m "i18n: add today.missed (en+vi)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Wire the Missed section into DailyGoalsScreen

**Files:**
- Modify: `src/screens/today/DailyGoalsScreen.tsx`

**Interfaces:**
- Consumes: `classifyTodayRow`, `TodayRowStatus` (Task 1); `today.missed` (Task 2); existing `perDayGoal`, `useEntriesForDate`, `LogRow`.
- Produces: no exported interface.

No Jest test (DB-touching screen). Verified on simulator. Committed once.

- [ ] **Step 1: Import the classifier**

In `src/screens/today/DailyGoalsScreen.tsx`, the existing import from `@features/trackers/calculators/habitStats` is:

```tsx
import {
  habitStreakStatus,
  perDayGoal,
  type StreakStatus
} from '@features/trackers/calculators/habitStats'
```

Add `classifyTodayRow`:

```tsx
import {
  classifyTodayRow,
  habitStreakStatus,
  perDayGoal,
  type StreakStatus
} from '@features/trackers/calculators/habitStats'
```

- [ ] **Step 2: Build a per-tracker `no`-count map**

Find the existing today-value aggregation:

```tsx
  // Sum of today's logged value per tracker.
  const todayValue = new Map<string, number>()
  for (const e of todayEntries) {
    todayValue.set(e.trackerId, (todayValue.get(e.trackerId) ?? 0) + e.value)
  }
```

Add a `no`-count map right after it (an entry with `value === 0` is a No):

```tsx
  // Count of today's "No" logs (value 0) per tracker — used to classify a
  // habit as missed (attempts filled the goal but not enough were Yes).
  const todayNo = new Map<string, number>()
  for (const e of todayEntries) {
    if (e.value === 0)
      todayNo.set(e.trackerId, (todayNo.get(e.trackerId) ?? 0) + 1)
  }
```

- [ ] **Step 3: Add `status` to `Row` and derive it**

Change the `Row` type:

```tsx
type Row = {
  tracker: Tracker
  done: boolean
  todayLog: number
}
```

to add `status`:

```tsx
type Row = {
  tracker: Tracker
  status: TodayRowStatus
  done: boolean
  todayLog: number
}
```

Then change the `rows` build:

```tsx
  const due = trackers.filter((tr) => isDueToday(tr, today))
  const rows: Row[] = due.map((tracker) => {
    const todayLog = todayValue.get(tracker.id) ?? 0
    const done =
      tracker.type === 'project'
        ? false
        : tracker.type === 'habit'
        ? todayLog >= perDayGoal(tracker)
        : todayLog > 0
    return { tracker, done, todayLog }
  })
```

to classify each row (the classifier takes `yes = todayLog`, `no = todayNo`; `done` stays as `status === 'completed'` so `LogRow` is unchanged):

```tsx
  const due = trackers.filter((tr) => isDueToday(tr, today))
  const rows: Row[] = due.map((tracker) => {
    const todayLog = todayValue.get(tracker.id) ?? 0
    const no = todayNo.get(tracker.id) ?? 0
    const status = classifyTodayRow(tracker, todayLog, no)
    return { tracker, status, done: status === 'completed', todayLog }
  })
```

- [ ] **Step 4: Re-derive the three section lists**

Find:

```tsx
  const total = rows.length
  const doneCount = rows.filter((r) => r.done).length
  const pending = rows.filter((r) => !r.done)
  const completed = rows.filter((r) => r.done)
```

Replace with a three-way split (rename `pending` → `dueRows` for clarity, add `missed`):

```tsx
  const total = rows.length
  const dueRows = rows.filter((r) => r.status === 'due')
  const missed = rows.filter((r) => r.status === 'missed')
  const completed = rows.filter((r) => r.status === 'completed')
  const doneCount = completed.length
```

- [ ] **Step 5: Render the Missed section + use `dueRows`**

The Due Today section currently maps `pending`. Update it to map `dueRows`, then add the Missed section between Due Today and Completed. Find the Due Today block:

```tsx
            <Typography className='text-xs font-bold uppercase text-ink-3 px-s5 pt-5 pb-2'>
              {t('today.dueToday')}
            </Typography>
            <View className='px-s5 gap-s3'>
              {pending.map((row) => (
                <LogRow
                  key={row.tracker.id}
                  row={row}
                  today={today}
                  onLog={onLog}
                  onOpen={onOpen}
                />
              ))}
            </View>
          </>
        )}
```

Replace it with (map `dueRows`, and append the Missed section after the `)}` that closes the all-clear ternary):

```tsx
            <Typography className='text-xs font-bold uppercase text-ink-3 px-s5 pt-5 pb-2'>
              {t('today.dueToday')}
            </Typography>
            <View className='px-s5 gap-s3'>
              {dueRows.map((row) => (
                <LogRow
                  key={row.tracker.id}
                  row={row}
                  today={today}
                  onLog={onLog}
                  onOpen={onOpen}
                />
              ))}
            </View>
          </>
        )}

        {missed.length > 0 && !allDone ? (
          <>
            <Typography className='text-xs font-bold uppercase text-ink-3 px-s5 pt-5 pb-2'>
              {t('today.missed')}
            </Typography>
            <View className='px-s5 gap-s3'>
              {missed.map((row) => (
                <LogRow
                  key={row.tracker.id}
                  row={row}
                  today={today}
                  onLog={onLog}
                  onOpen={onOpen}
                />
              ))}
            </View>
          </>
        ) : null}
```

(The Completed section below it already gates on `completed.length > 0 && !allDone` — leave it as is. `allDone = total > 0 && doneCount === total`: a Missed habit keeps `doneCount < total`, so `allDone` is false and the screen won't show the all-clear state — no change needed.)

- [ ] **Step 6: Type-check, lint, test**

Run: `yarn tsc && yarn lint && yarn test`
Expected: tsc clean; no new lint in `DailyGoalsScreen.tsx` (confirm no leftover reference to `pending`); full suite 93 green.

- [ ] **Step 7: Verify on simulator**

Reload JS on a booted simulator. Use a habit with goal 5 (e.g. set "Cut"/"Running" goal to 5 via the form, or use an existing multi-goal habit). Then:
1. Fresh day, nothing logged → habit in **DUE TODAY**, ring "0/5".
2. Tap the ring 3 times (3 Yes) → still **DUE TODAY** ("3/5"), because attempts (3) < goal.
3. Open Habit Detail → History → log 2 **No** entries for today (the value log sheet for habit has Yes/No; pick No) → back on Today the habit moves to **MISSED** (yes 3 + no 2 = 5 ≥ goal, yes 3 < 5), card on neutral background with the amber "Missed…" line.
4. Tap the ring 2 more times (now 5 Yes) → habit moves to **COMPLETED** (yes 5 ≥ goal), brand-faint background.
5. A goal-1 habit: one ring tap → **COMPLETED**; instead logging a single No in Detail (0 Yes) → **MISSED**.
6. Non-habit (target/average) never appears in Missed; project stays in Due.
7. Section order top-to-bottom is Due Today → Missed → Completed; empty sections are hidden.

- [ ] **Step 8: Commit**

```bash
git add src/screens/today/DailyGoalsScreen.tsx
git commit -m "feat(today): Missed section for habits that filled attempts but missed goal

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Classification (completed/missed/due, yes/no/goal rules, non-habit never missed, project due) → Task 1 `classifyTodayRow` + tests. ✅
- `yes` = sum of value, `no` = count of value-0 entries, `total = yes+no` → Task 3 Steps 2-3 (todayValue + todayNo). ✅
- Three sections, order Due → Missed → Completed, each non-empty only → Task 3 Step 5. ✅
- Missed cards neutral (no brand-faint) → `LogRow` background is keyed on `done` = `status==='completed'`, so a Missed row (`done=false`) renders `bg-surface` automatically; no change needed, covered. ✅
- all-clear excludes Missed → Task 3 Step 5 note (`doneCount < total` when missed exists). ✅
- i18n `today.missed` en/vi → Task 2. ✅
- Pure classifier unit-tested (TDD) → Task 1. ✅
- Out of scope (no No control on Today, LogEntryModal/doneDatesOf/perDayGoal/TrackerCard unchanged) → not touched. ✅

**Placeholder scan:** No TBD/TODO; full code in every code step; tests have real assertions. ✅

**Type consistency:** `TodayRowStatus` and `classifyTodayRow(tracker, yes, no)` defined in Task 1, imported/used identically in Task 3; `Row` gains `status: TodayRowStatus` with `done` derived from it (so `LogRow`'s `row.done`/`row.todayLog` props still satisfied); `dueRows`/`missed`/`completed`/`doneCount` consistent across Steps 4-5; `today.missed` key matches Task 2. The Step-3 classifier call passes `todayLog` as `yes` — matches the classifier's non-habit branch (uses `yes > 0`) and habit branch (uses the sum). ✅
