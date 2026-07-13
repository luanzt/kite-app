# Bad-habit Today Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make bad habits (slip limits) on the Today screen read as "stay under X" — due all day, limit-style card, remaining-quota ring — while still counting a clean day as done in the summary ring.

**Architecture:** Two pure-logic changes in `habitStats.ts` (`classifyTodayRow` bad-habit rule; new `todaySummary` helper) driven by TDD, then a presentation-only rework of the bad-habit branch in `DailyGoalsScreen.tsx`'s `LogRow` plus new i18n keys. No DB, calculator-math, or detail-screen changes.

**Tech Stack:** React Native + HeroUI Native (Typography), Uniwind/Tailwind classNames, lucide-react-native icons, i18next, Jest.

Spec: `docs/superpowers/specs/2026-07-12-bad-habit-today-card-design.md`

## Global Constraints

- Use `<Typography>` from `heroui-native`, never `<Text>`.
- Style via Tailwind `className` only; never interpolate values into a class string (branch whole literal classes instead). Inline `style` only for genuinely runtime values (existing tracker-color tints keep their inline style).
- Icons only from `lucide-react-native`, sized via the `size` prop.
- All visible strings through `t('key')`; `src/i18n/locales/en.json` and `vi.json` must stay key-for-key in sync.
- Named exports only. `yarn tsc` must be clean before every commit.
- This branch is off `main`, so the `Tracker` type still has `reminderTime` (singular) — do not reference `reminderTimes`.
- Amber warning color used on this screen is the literal `#e8923a`.

---

### Task 1: `classifyTodayRow` — clean bad habit is `due`, not `completed`

**Files:**
- Modify: `src/features/trackers/calculators/habitStats.ts:420-429` (the `classifyTodayRow` habit branch)
- Test: `src/features/trackers/calculators/__tests__/habitStats.test.ts:792-805` (existing bad-habit case)

**Interfaces:**
- Consumes: existing `classifyTodayRow(tracker, yes, no): TodayRowStatus` and the `base` Tracker fixture at the top of the test file.
- Produces: new behavior — bad habit: `yes > (targetValue ?? 0)` → `'missed'`, otherwise `'due'` (never `'completed'`). Task 2 and Task 4 rely on exactly this.

- [ ] **Step 1: Rewrite the existing bad-habit test to the new rule**

In `habitStats.test.ts`, replace the whole test `'bad habit: within the limit reads completed, over it reads missed'` (lines 792–805) with:

```ts
  it('bad habit: clean stays due (actionable all day), over the limit is missed', () => {
    const badH: Tracker = {
      ...base,
      type: 'habit',
      direction: 'bad',
      targetValue: 2
    }
    expect(classifyTodayRow(badH, 0, 0)).toBe('due') // clean so far
    expect(classifyTodayRow(badH, 2, 0)).toBe('due') // at the limit, still clean
    expect(classifyTodayRow(badH, 3, 0)).toBe('missed')
    const abstain: Tracker = { ...badH, targetValue: null } // limit 0 = never
    expect(classifyTodayRow(abstain, 0, 0)).toBe('due')
    expect(classifyTodayRow(abstain, 1, 0)).toBe('missed')
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test src/features/trackers/calculators/__tests__/habitStats.test.ts -t "bad habit: clean stays due"`
Expected: FAIL — received `'completed'` where `'due'` is expected.

- [ ] **Step 3: Change the rule in `classifyTodayRow`**

In `habitStats.ts`, replace the bad-habit block (currently lines 421–425):

```ts
  // Bad habit: staying at/under the limit reads "so far so good" (completed);
  // the only failure is exceeding it. There is nothing to be "due" for.
  if (tracker.direction === 'bad') {
    return yes > (tracker.targetValue ?? 0) ? 'missed' : 'completed'
  }
```

with:

```ts
  // Bad habit: clean (at/under the limit) stays DUE all day so the slip
  // control remains reachable; the only terminal state is exceeding the
  // limit (missed). The summary ring still credits a clean day as done —
  // see todaySummary().
  if (tracker.direction === 'bad') {
    return yes > (tracker.targetValue ?? 0) ? 'missed' : 'due'
  }
```

- [ ] **Step 4: Run the full test file to verify everything passes**

Run: `yarn test src/features/trackers/calculators/__tests__/habitStats.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/trackers/calculators/habitStats.ts src/features/trackers/calculators/__tests__/habitStats.test.ts
git commit -m "feat(today): clean bad habits stay due all day instead of auto-completed"
```

---

### Task 2: `todaySummary` — pure summary counting (clean bad habit counts as done)

**Files:**
- Modify: `src/features/trackers/calculators/habitStats.ts` (add export right after `classifyTodayRow`)
- Test: `src/features/trackers/calculators/__tests__/habitStats.test.ts` (new describe block; add `todaySummary` to the import list at the top)

**Interfaces:**
- Consumes: `TodayRowStatus` and `Tracker` types already in `habitStats.ts`.
- Produces: `todaySummary(rows: { tracker: Tracker; status: TodayRowStatus }[]): { done: number; total: number; allDone: boolean }` — Task 4's screen wiring imports exactly this name/signature. A row counts as done when `status === 'completed'` OR it is a clean bad habit (`type 'habit'`, `direction 'bad'`, `status 'due'`). `allDone` = `done === total` (empty list → true).

- [ ] **Step 1: Write the failing tests**

Append to `habitStats.test.ts` (top import list gains `todaySummary`):

```ts
describe('todaySummary', () => {
  const good: Tracker = { ...base, targetValue: 1 }
  const bad: Tracker = {
    ...base,
    id: 'b1',
    direction: 'bad',
    targetValue: 2
  }
  const row = (tracker: Tracker, status: 'due' | 'missed' | 'completed') => ({
    tracker,
    status: status as const
  })

  it('clean bad habit (due) counts as done; good due does not', () => {
    const s = todaySummary([row(good, 'due'), row(bad, 'due')])
    expect(s).toEqual({ done: 1, total: 2, allDone: false })
  })

  it('allDone when everything is completed or clean-bad', () => {
    const s = todaySummary([row(good, 'completed'), row(bad, 'due')])
    expect(s).toEqual({ done: 2, total: 2, allDone: true })
  })

  it('over-limit bad habit (missed) is not done and blocks allDone', () => {
    const s = todaySummary([row(good, 'completed'), row(bad, 'missed')])
    expect(s).toEqual({ done: 1, total: 2, allDone: false })
  })

  it('good missed is not done; empty list is trivially allDone', () => {
    expect(todaySummary([row(good, 'missed')])).toEqual({
      done: 0,
      total: 1,
      allDone: false
    })
    expect(todaySummary([])).toEqual({ done: 0, total: 0, allDone: true })
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `yarn test src/features/trackers/calculators/__tests__/habitStats.test.ts -t "todaySummary"`
Expected: FAIL — `todaySummary` is not exported.

- [ ] **Step 3: Implement `todaySummary`**

In `habitStats.ts`, directly below `classifyTodayRow`:

```ts
/**
 * Today-screen summary counts, decoupled from section placement: a clean bad
 * habit sits in Due Today (still actionable) yet counts as done — being at or
 * under the limit IS today's success. `allDone` is true when every row is
 * either completed or a clean bad habit (an empty day is trivially all done).
 */
export function todaySummary(
  rows: { tracker: Tracker; status: TodayRowStatus }[]
): { done: number; total: number; allDone: boolean } {
  const done = rows.filter(
    (r) =>
      r.status === 'completed' ||
      (r.tracker.type === 'habit' &&
        r.tracker.direction === 'bad' &&
        r.status === 'due')
  ).length
  return { done, total: rows.length, allDone: done === rows.length }
}
```

- [ ] **Step 4: Run the full test file to verify it passes**

Run: `yarn test src/features/trackers/calculators/__tests__/habitStats.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/trackers/calculators/habitStats.ts src/features/trackers/calculators/__tests__/habitStats.test.ts
git commit -m "feat(today): todaySummary counts clean bad habits as done"
```

---

### Task 3: i18n keys + `Icons.Ban`

**Files:**
- Modify: `src/i18n/locales/en.json` (the `today` object)
- Modify: `src/i18n/locales/vi.json` (the `today` object)
- Modify: `src/features/trackers/icons.ts` (lucide import list + `Icons` map)

**Interfaces:**
- Produces: i18n keys `today.limitPerDay`, `today.cleanStart`, `today.cleanOngoing`, `today.cleanEnded`, and `Icons.Ban` (a lucide icon component). Task 4 consumes all five.

- [ ] **Step 1: Add the four keys to `en.json`**

Inside the `"today": { … }` object (after `"targetIs"`, keeping valid JSON commas):

```json
    "targetIs": "Target: {{value}}",
    "limitPerDay": "Limit {{value}}/day",
    "cleanStart": "Clean so far today",
    "cleanOngoing": "{{count}} days clean",
    "cleanEnded": "{{count}}-day clean run ended"
```

- [ ] **Step 2: Add the same keys to `vi.json`**

```json
    "targetIs": "Mục tiêu: {{value}}",
    "limitPerDay": "Giới hạn {{value}}/ngày",
    "cleanStart": "Hôm nay vẫn sạch",
    "cleanOngoing": "{{count}} ngày sạch",
    "cleanEnded": "Đứt chuỗi {{count}} ngày sạch"
```

- [ ] **Step 3: Add `Ban` to the icon map**

In `src/features/trackers/icons.ts`: add `Ban,` to the `lucide-react-native` import list (alphabetically near the top, e.g. after `TriangleAlert`’s group — exact position doesn’t matter), and add `Ban,` to the `Icons` object next to `Flame,` / `Warn: TriangleAlert,` (around lines 123–124).

- [ ] **Step 4: Verify types and tests**

Run: `yarn tsc && yarn test src/i18n`
Expected: tsc clean; any locale-sync tests pass (if `yarn test src/i18n` matches no test files, run `yarn test` instead and expect all green).

- [ ] **Step 5: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/vi.json src/features/trackers/icons.ts
git commit -m "feat(today): limit/clean-streak copy (en+vi) and Ban icon for bad habits"
```

---

### Task 4: `DailyGoalsScreen` — limit-style card + summary wiring

**Files:**
- Modify: `src/screens/today/DailyGoalsScreen.tsx` (imports, module constants, `LogRow`, screen body)

**Interfaces:**
- Consumes: `todaySummary` from `@features/trackers/calculators/habitStats` (Task 2), i18n keys + `Icons.Ban` (Task 3), new `classifyTodayRow` behavior (Task 1).
- Produces: final UI. No new exports.

All edits below are in `src/screens/today/DailyGoalsScreen.tsx`; line numbers refer to the current file.

- [ ] **Step 1: Imports and module constants**

Add `todaySummary` to the existing `habitStats` import (lines 26–32):

```ts
import {
  classifyTodayRow,
  habitStreakStatus,
  perDayGoal,
  todaySummary,
  type StreakStatus,
  type TodayRowStatus
} from '@features/trackers/calculators/habitStats'
```

Below the existing `STREAK_KEY` map (ends line 107), add the amber constant and the bad-habit streak-copy map, and reuse `AMBER` in the one existing hardcoded spot (line 317, `<Icons.Warn size={13} color='#e8923a' />` → `color={AMBER}`):

```ts
// Amber warning tone shared by the limit icon and warn states on this screen.
const AMBER = '#e8923a'

// Bad-habit streak line: clean-day copy instead of "streak" wording. Only the
// kinds habitStreakStatus can return for a bad habit are mapped.
const BAD_STREAK_KEY: Partial<Record<StreakStatus['kind'], string>> = {
  greatStart: 'today.cleanStart',
  streakOngoing: 'today.cleanOngoing',
  streakEnded: 'today.cleanEnded'
}
```

- [ ] **Step 2: `LogRow` — flags and streak-key selection**

Right after `const { tracker, done, todayLog } = row` (line 152), add:

```ts
  const isBad = tracker.type === 'habit' && tracker.direction === 'bad'
```

After the `streak` computation (lines 154–157), add the derived streak line inputs:

```ts
  // Bad habits use clean-day copy; a bad-habit streakEnded (went over today)
  // renders as a warning, mirroring isMissedKind for good habits.
  const streakKey = streak
    ? isBad
      ? BAD_STREAK_KEY[streak.kind] ?? ''
      : STREAK_KEY[streak.kind]
    : ''
  const streakNegative = streak
    ? isBad
      ? streak.kind === 'streakEnded'
      : isMissedKind(streak.kind)
    : false
```

- [ ] **Step 3: `LogRow` — remaining-quota ring for bad habits**

Replace the habit branch of `renderControl` (lines 199–242) with:

```tsx
    if (tracker.type === 'habit') {
      const n = todayLog
      if (isBad) {
        // Limit ring: shows the REMAINING quota (starts full, drains per
        // slip). Center is the remaining count — or the overflow as "+X"
        // once over the limit. Tap logs one slip.
        const limit = tracker.targetValue ?? 0
        const over = n > limit
        const remaining = Math.max(0, limit - n)
        const ringColor = over
          ? c.pace.behind
          : remaining === 0
          ? AMBER
          : c.pace.on_track
        const ringFraction = over ? 1 : limit > 0 ? remaining / limit : 1
        return (
          <Pressable
            onPress={logYes}
            className='h-[46px] w-[46px] items-center justify-center'
          >
            <Ring
              fraction={ringFraction}
              color={ringColor}
              size={46}
              strokeWidth={4}
            />
            <View className='absolute inset-0 items-center justify-center'>
              <Typography
                className={`text-xs font-extrabold ${
                  over
                    ? 'text-pace-behind'
                    : remaining === 0
                    ? 'text-[#e8923a]'
                    : 'text-pace-on'
                }`}
              >
                {over ? `+${n - limit}` : `${remaining}`}
              </Typography>
            </View>
          </Pressable>
        )
      }
      const goal = perDayGoal(tracker)
      const ringColor = done ? c.pace.on_track : c.pace.ahead
      return (
        <Pressable
          onPress={logYes}
          className='h-[46px] w-[46px] items-center justify-center'
        >
          <Ring
            fraction={goal ? n / goal : 0}
            color={ringColor}
            size={46}
            strokeWidth={4}
          />
          <View className='absolute inset-0 items-center justify-center'>
            <Typography
              className={`text-xs font-extrabold ${
                done ? 'text-pace-on' : 'text-ink-2'
              }`}
            >
              {`${n}/${goal}`}
            </Typography>
          </View>
        </Pressable>
      )
    }
```

(Note this splits the old shared `isBad`/`over` ternaries into two plain paths — behavior for good habits is unchanged.)

- [ ] **Step 4: `LogRow` — limit sub-line and clean streak line**

Replace the sub-line row (lines 299–306) so bad habits show a Ban icon + limit text instead of the color dot + "Daily":

```tsx
        {isBad ? (
          <View className='flex-row items-center gap-s2 mt-[2px]'>
            <Icons.Ban size={13} color={AMBER} />
            <Typography className='text-sm text-ink-2'>
              {t('today.limitPerDay', {
                value: fmtCompact(tracker.targetValue ?? 0)
              })}
            </Typography>
          </View>
        ) : (
          <View className='flex-row items-center gap-s2 mt-[2px]'>
            <View
              className='rounded-full h-2 w-2'
              // runtime: user-chosen tracker.color
              style={{ backgroundColor: colorHex(tracker.color) }}
            />
            <Typography className='text-sm text-ink-2'>{subText}</Typography>
          </View>
        )}
```

Replace the missed/streak block (lines 307–329) — bad habits skip the generic "You'll get it next time!" (their streak line already carries the over-limit story) and swap icon/copy per `streakNegative`:

```tsx
        {row.status === 'missed' && !isBad ? (
          // Missed today (attempts filled the goal but not enough Yes) — a muted
          // encouragement line instead of the streak text.
          <Typography className='text-sm text-ink-2 mt-[2px]'>
            {t('today.missedEncourage')}
          </Typography>
        ) : streak && streak.kind !== 'none' && streakKey ? (
          <View className='flex-row items-center gap-s1 mt-[2px]'>
            {streakNegative ? (
              // amber warning icon; the text stays muted (like the cadence line)
              <Icons.Warn size={13} color={AMBER} />
            ) : isBad && streak.kind === 'greatStart' ? (
              <Icons.Check size={13} color={c.pace.on_track} />
            ) : (
              <Icons.Flame size={13} color={c.pace.on_track} />
            )}
            <Typography
              className={`text-sm ${
                streakNegative ? 'text-ink-2' : 'text-pace-on'
              }`}
            >
              {t(streakKey, { count: streak.n })}
            </Typography>
          </View>
        ) : null}
```

`Icons.Check` already exists in the `Icons` map (`Check` is imported in `icons.ts`).

- [ ] **Step 5: Screen body — summary from `todaySummary`, Due section always renders**

Replace the count lines (lines 370–374):

```ts
  const total = rows.length
  const dueRows = rows.filter((r) => r.status === 'due')
  const missed = rows.filter((r) => r.status === 'missed')
  const completed = rows.filter((r) => r.status === 'completed')
  const doneCount = completed.length
```

with:

```ts
  const dueRows = rows.filter((r) => r.status === 'due')
  const missed = rows.filter((r) => r.status === 'missed')
  const completed = rows.filter((r) => r.status === 'completed')
  // Summary decouples from sections: a clean bad habit sits in Due Today yet
  // counts as done, and allDone tolerates clean bad habits still listed below.
  const { done: doneCount, total, allDone } = todaySummary(rows)
```

Delete the old `allDone` computation (lines 444–446, `const allDone = dueRows.length === 0 && missed.length === 0` and its comment) — it is now provided by `todaySummary`.

Change the Due Today section guard (line 503) from:

```tsx
        {dueRows.length > 0 && !allDone ? (
```

to (clean bad habits keep rendering below the celebration):

```tsx
        {dueRows.length > 0 ? (
```

The `missed`/`completed` section guards keep their `!allDone` checks (they are necessarily empty / redundant when allDone).

- [ ] **Step 6: Type-check, lint, full tests**

Run: `yarn tsc && yarn lint && yarn test`
Expected: all clean/green. (`subText` for habits is still computed but only rendered for good habits — that's fine, it's used by the non-bad branch.)

- [ ] **Step 7: Verify on the simulator**

Run: `yarn ios` (dev env). With a good habit (goal 5) and a bad habit (limit 2):
- Bad card sits in **Due Today** with 🚫 "Limit 2/day", ring full green, center "2", header reads "1 of 2 done".
- Tap the bad ring twice → center "0", ring amber; header still "1 of 2 done".
- Tap once more → card moves to **Missed**, ring full red, center "+1", warn line "Đứt chuỗi …"/"…clean run ended" (if a prior clean day existed), header "0 of 2 done".
- Complete the good habit with only a clean bad habit left → summary flips to "2 of 2 done" + all-clear copy, 🎉 block shows, and the bad card still renders below it.
- Switch Settings → Tiếng Việt and re-check the four new strings.

- [ ] **Step 8: Commit**

```bash
git add src/screens/today/DailyGoalsScreen.tsx
git commit -m "feat(today): limit-style bad-habit card with remaining-quota ring"
```

---

## Self-Review Notes

- Spec coverage: Behavior 1 → Task 1; Behavior 2–3 → Tasks 2 & 4 Step 5; Behavior 4 (sub-line, ring, streak copy, tap, no faint bg) → Tasks 3 & 4 Steps 1–4. Card background needs no change — `done` is `status === 'completed'`, which a bad habit never reaches.
- Types: `todaySummary` name/signature identical in Task 2 (definition), Task 4 Step 1 (import), Step 5 (usage). `StreakStatus['kind']` values used in `BAD_STREAK_KEY` match `habitStreakStatus`'s bad-habit returns (`greatStart | streakOngoing | streakEnded | none`).
- `text-[#e8923a]` appears as a complete literal class (twice), so Tailwind generates it — no interpolation.
