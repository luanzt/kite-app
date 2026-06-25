# Habit Streak Status Line Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a motivational streak status line (Great start / Streak: N days / N day streak / Missed yesterday / Missed last time / Missed N days in row) under a habit's cadence on the Today card.

**Architecture:** A new pure function `habitStreakStatus(tracker, entries, todayISO)` in `habitStats.ts` (TDD unit-tested) computes a `{ kind, n }` status from full history. The Today card (`DailyGoalsScreen`) renders a second sub-line for habit rows from that status, fetching the habit's full entries via `useEntries`. i18n adds 6 keys (en+vi).

**Tech Stack:** TypeScript (strict), React Native, Uniwind (Tailwind v4 `className`), lucide-react-native, i18next, Jest (op-sqlite mocked).

## Global Constraints

- **Styling:** Tailwind `className` only — NEVER inline `style={{…}}` except runtime-dynamic values. NEVER interpolate a value into a class string (branch the whole literal class). Status colors: positive → `text-pace-on`, missed → `text-pace-behind`; lucide icon `color` via `PACE_COLOR.on_track` / `PACE_COLOR.behind`.
- **Text:** render `Typography` from `heroui-native`, NEVER `Text`.
- **Icons:** `lucide-react-native` only, sized via numeric `size` prop. Positive = `Icons.Flame`; missed = new `Icons.Warn` (lucide `TriangleAlert`).
- **i18n:** no hardcoded visible strings; `en.json` + `vi.json` key-for-key in sync; count interpolation via `{{count}}`.
- **Streak model (exact):** scan backward from today over [startDate, today]; a day is *done* when summed value ≥ `perDayGoal` (`doneDatesOf`). Step: done (due OR rest) → +1 continue; rest-not-done → skip; due-not-done (≠ today) → stop. Today on the Today card is always a due day.
- TypeScript strict — `yarn tsc` clean. `yarn lint` — no NEW warnings (pre-existing ones in icons.ts/TrackerListScreen.tsx/uniwind.d.ts/habitStats.test.ts/factory.ts are out of scope). Named exports only.
- op-sqlite mocked in Jest → `habitStreakStatus` is pure and IS unit-tested; the card render is verified on simulator.

---

## File Structure

- `src/features/trackers/calculators/habitStats.ts` — MODIFY: add `StreakStatus` type + `habitStreakStatus()`.
- `src/features/trackers/calculators/__tests__/habitStats.test.ts` — MODIFY: add `habitStreakStatus` test block.
- `src/features/trackers/icons.ts` — MODIFY: import `TriangleAlert`, add `Warn` to `Icons`.
- `src/i18n/locales/en.json`, `vi.json` — MODIFY: add 6 `today.*` streak keys.
- `src/screens/today/DailyGoalsScreen.tsx` — MODIFY: render line 2 for habit rows.

---

## Task 1: `habitStreakStatus` pure function + tests

**Files:**
- Modify: `src/features/trackers/calculators/habitStats.ts`
- Test: `src/features/trackers/calculators/__tests__/habitStats.test.ts`

**Interfaces:**
- Consumes: `doneDatesOf`, `isDueOn`, `isoAddDays` (already in `habitStats.ts`); `daysBetween` (from `@utils/date`, already imported); `Tracker`, `Entry`.
- Produces:
  ```ts
  export type StreakStatusKind =
    | 'none' | 'greatStart' | 'streakOngoing' | 'streakEnded'
    | 'missedYesterday' | 'missedLastTime' | 'missedDays'
  export type StreakStatus = { kind: StreakStatusKind; n: number }
  export function habitStreakStatus(
    tracker: Tracker, entries: Entry[], todayISO: string
  ): StreakStatus
  ```
  `n` is the count for `streakOngoing` (runEndingToday), `streakEnded` (runEndingYesterday), `missedDays` (missedRun); `0` for the other kinds.

- [ ] **Step 1: Write the failing tests**

In `src/features/trackers/calculators/__tests__/habitStats.test.ts`, add `habitStreakStatus` to the existing import from `'../habitStats'`, then append this test block at the end of the file. The fixture `base` (daily, repeatDays all 7, startDate `2026-06-01`) and `log(date, value=1)` helper already exist at the top of the file.

```ts
describe('habitStreakStatus', () => {
  // A Mon/Tue/Sat habit for rest-day cases. 2026-06: 1st=Mon. weekdayOf: Sun=0..Sat=6.
  // repeatDays for Mon/Tue/Sat = [1, 2, 6].
  const mts: Tracker = { ...base, repeatDays: [1, 2, 6] }

  it('new tracker, start today, not done → none', () => {
    const t = { ...base, startDate: '2026-06-10' }
    expect(habitStreakStatus(t, [], '2026-06-10')).toEqual({ kind: 'none', n: 0 })
  })

  it('start today + done → greatStart', () => {
    const t = { ...base, startDate: '2026-06-10' }
    expect(
      habitStreakStatus(t, [log('2026-06-10')], '2026-06-10')
    ).toEqual({ kind: 'greatStart', n: 0 })
  })

  it('past start, yesterday missed, today done → greatStart', () => {
    // startDate 06-01 daily; only today (06-10) done, 06-09 missed.
    expect(
      habitStreakStatus(base, [log('2026-06-10')], '2026-06-10')
    ).toEqual({ kind: 'greatStart', n: 0 })
  })

  it('today done + yesterday done → streakOngoing n=2', () => {
    const entries = [log('2026-06-09'), log('2026-06-10')]
    expect(habitStreakStatus(base, entries, '2026-06-10')).toEqual({
      kind: 'streakOngoing',
      n: 2
    })
  })

  it('today + two prior done → streakOngoing n=3', () => {
    const entries = [log('2026-06-08'), log('2026-06-09'), log('2026-06-10')]
    expect(habitStreakStatus(base, entries, '2026-06-10')).toEqual({
      kind: 'streakOngoing',
      n: 3
    })
  })

  it('today not done, yesterday done → streakEnded n=1', () => {
    expect(
      habitStreakStatus(base, [log('2026-06-09')], '2026-06-10')
    ).toEqual({ kind: 'streakEnded', n: 1 })
  })

  it('today not done, yesterday + prior done → streakEnded n=2', () => {
    const entries = [log('2026-06-08'), log('2026-06-09')]
    expect(habitStreakStatus(base, entries, '2026-06-10')).toEqual({
      kind: 'streakEnded',
      n: 2
    })
  })

  it('today not done, yesterday (due) missed → missedYesterday', () => {
    // daily: 06-09 is a due day and not done; 06-08 done so run stops there.
    expect(
      habitStreakStatus(base, [log('2026-06-08')], '2026-06-10')
    ).toEqual({ kind: 'missedYesterday', n: 0 })
  })

  it('today not done, two prior due missed → missedDays n=2', () => {
    // 06-07 done; 06-08 and 06-09 missed; today 06-10 not done.
    expect(
      habitStreakStatus(base, [log('2026-06-07')], '2026-06-10')
    ).toEqual({ kind: 'missedDays', n: 2 })
  })

  it('rest-day completion extends the streak', () => {
    // Mon/Tue/Sat due. Tue 06-02 done, Wed 06-03 (rest) not done,
    // Thu 06-04 (rest) done. Today = Sat 06-06 done.
    // back from 06-06(done,+1) → 06-05 rest skip → 06-04 rest done(+1)
    // → 06-03 rest skip → 06-02 due done(+1) → 06-01 Mon due NOT done → stop.
    // runEndingToday = 3.
    const entries = [log('2026-06-02'), log('2026-06-04'), log('2026-06-06')]
    expect(habitStreakStatus(mts, entries, '2026-06-06')).toEqual({
      kind: 'streakOngoing',
      n: 3
    })
  })

  it('missed last time when yesterday is a rest day', () => {
    // Mon/Tue/Sat. Today = Sat 06-06 not done. Yesterday 06-05 is Fri (rest).
    // Most recent prior DUE day = Tue 06-02, and it was missed (no logs at all).
    // missedRun counts consecutive prior due missed: Tue 06-02 missed,
    // Mon 06-01 missed → but only the run immediately before today; both due
    // days before today (Tue, Mon) missed and consecutive → missedRun = 2.
    // To isolate missedLastTime (n=1) we complete Mon so only Tue is missed:
    const entries = [log('2026-06-01')] // Mon done, Tue missed, today Sat not done
    expect(habitStreakStatus(mts, entries, '2026-06-06')).toEqual({
      kind: 'missedLastTime',
      n: 0
    })
  })

  it('missedRun excludes today and counts only the consecutive run', () => {
    // daily, today 06-10 not done. 06-09, 06-08 missed; 06-07 done.
    // missedRun = 2 (09 + 08), not counting today, not counting earlier.
    expect(
      habitStreakStatus(base, [log('2026-06-07')], '2026-06-10')
    ).toEqual({ kind: 'missedDays', n: 2 })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn test src/features/trackers/calculators/__tests__/habitStats.test.ts -t habitStreakStatus`
Expected: FAIL — `habitStreakStatus is not a function` (not yet exported).

- [ ] **Step 3: Implement `habitStreakStatus`**

In `src/features/trackers/calculators/habitStats.ts`, append after `bestStreak`:

```ts
export type StreakStatusKind =
  | 'none'
  | 'greatStart'
  | 'streakOngoing'
  | 'streakEnded'
  | 'missedYesterday'
  | 'missedLastTime'
  | 'missedDays'

export type StreakStatus = { kind: StreakStatusKind; n: number }

/**
 * Motivational streak status for the Today card (today is always a due day
 * there). Scans backward from today: a *done* day (due or rest) extends the
 * run; a rest day not done is skipped; a due day not done (other than today)
 * breaks it. "Missed" counts only consecutive *due* days not done strictly
 * before today.
 */
export function habitStreakStatus(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string
): StreakStatus {
  const done = doneDatesOf(tracker, entries)
  const span = daysBetween(tracker.startDate, todayISO)
  if (span < 0) return { kind: 'none', n: 0 }

  const todayDone = done.has(todayISO)

  // Does any due day exist strictly before today?
  let hasPriorDue = false
  for (let i = 1; i <= span; i++) {
    if (isDueOn(tracker, isoAddDays(todayISO, -i))) {
      hasPriorDue = true
      break
    }
  }

  // Run of consecutive done days (due or rest) ending at the cursor, scanning
  // back; rest-not-done skipped; due-not-done stops. `fromToday` includes today.
  const runFrom = (startOffset: number): number => {
    let run = 0
    for (let i = startOffset; i <= span; i++) {
      const day = isoAddDays(todayISO, -i)
      if (done.has(day)) {
        run += 1
      } else if (isDueOn(tracker, day)) {
        break // a missed due day breaks the run
      }
      // else: rest day not done → skip (neutral)
    }
    return run
  }

  const runEndingToday = todayDone ? runFrom(0) : 0
  const runEndingYesterday = runFrom(1)

  // Consecutive due days not done, strictly before today (today excluded).
  let missedRun = 0
  for (let i = 1; i <= span; i++) {
    const day = isoAddDays(todayISO, -i)
    if (!isDueOn(tracker, day)) continue // skip rest days
    if (done.has(day)) break // a done due day ends the missed run
    missedRun += 1
  }

  // Was the most recent missed due day literally yesterday (today - 1)?
  const yest = isoAddDays(todayISO, -1)
  const lastMissedWasYesterday =
    span >= 1 && isDueOn(tracker, yest) && !done.has(yest)

  if (!hasPriorDue && !todayDone) return { kind: 'none', n: 0 }
  if (todayDone) {
    return runEndingToday >= 2
      ? { kind: 'streakOngoing', n: runEndingToday }
      : { kind: 'greatStart', n: 0 }
  }
  // !todayDone
  if (runEndingYesterday >= 1)
    return { kind: 'streakEnded', n: runEndingYesterday }
  if (missedRun >= 2) return { kind: 'missedDays', n: missedRun }
  return lastMissedWasYesterday
    ? { kind: 'missedYesterday', n: 0 }
    : { kind: 'missedLastTime', n: 0 }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `yarn test src/features/trackers/calculators/__tests__/habitStats.test.ts -t habitStreakStatus`
Expected: PASS (all 12 cases).

- [ ] **Step 5: Run the full suite + type-check + lint**

Run: `yarn test && yarn tsc && yarn lint`
Expected: full suite green (existing 81 + new cases); tsc clean; no new lint in habitStats.ts.

- [ ] **Step 6: Commit**

```bash
git add src/features/trackers/calculators/habitStats.ts src/features/trackers/calculators/__tests__/habitStats.test.ts
git commit -m "feat(habit): habitStreakStatus — streak/missed status for Today card

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: i18n keys + `Icons.Warn`

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/vi.json`
- Modify: `src/features/trackers/icons.ts`

**Interfaces:**
- Produces: i18n keys under `today` — `streakGreatStart`, `streakOngoing`, `streakEnded`, `missedYesterday`, `missedLastTime`, `missedDays`; `Icons.Warn` (lucide `TriangleAlert`). Consumed by Task 3.

- [ ] **Step 1: Add EN keys**

In `src/i18n/locales/en.json`, inside the `"today"` object, add (after the existing `"emptyBody"` line):

```json
    "streakGreatStart": "Great start",
    "streakOngoing": "Streak: {{count}} days",
    "streakEnded": "{{count}} day streak",
    "missedYesterday": "Missed yesterday",
    "missedLastTime": "Missed last time",
    "missedDays": "Missed {{count}} days in row",
```

- [ ] **Step 2: Add VI keys**

In `src/i18n/locales/vi.json`, inside the `"today"` object, add the matching keys after its last `today` entry:

```json
    "streakGreatStart": "Khởi đầu tốt",
    "streakOngoing": "Chuỗi: {{count}} ngày",
    "streakEnded": "Chuỗi {{count}} ngày",
    "missedYesterday": "Lỡ hôm qua",
    "missedLastTime": "Lỡ lần trước",
    "missedDays": "Lỡ {{count}} ngày liên tiếp",
```

- [ ] **Step 3: Add `Icons.Warn`**

In `src/features/trackers/icons.ts`, add `TriangleAlert` to the lucide import block (alphabetical-ish, alongside the other imports, before the closing `} from 'lucide-react-native'`):

```ts
  TriangleAlert,
```

Then add to the `Icons` object (after `Flame:`):

```ts
  Warn: TriangleAlert,
```

- [ ] **Step 4: Verify keys + tsc**

Run:
```bash
node -e "const en=require('./src/i18n/locales/en.json').today, vi=require('./src/i18n/locales/vi.json').today; const k=['streakGreatStart','streakOngoing','streakEnded','missedYesterday','missedLastTime','missedDays']; console.log('en missing', k.filter(x=>!(x in en))); console.log('vi missing', k.filter(x=>!(x in vi))); console.log('OK')"
yarn tsc
```
Expected: `en missing []`, `vi missing []`, `OK`; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/vi.json src/features/trackers/icons.ts
git commit -m "i18n+icons: streak status copy (en+vi) and Icons.Warn (TriangleAlert)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Render the streak line on the Today habit card

**Files:**
- Modify: `src/screens/today/DailyGoalsScreen.tsx`

**Interfaces:**
- Consumes: `habitStreakStatus`, `StreakStatus`, `StreakStatusKind` (Task 1); the i18n keys + `Icons.Warn` (Task 2); `useEntries` (from `@features/trackers/queries`), `PACE_COLOR` (from `@features/trackers/icons`).
- Produces: no exported interface — internal render in `LogRow`.

No Jest test (DB-touching screen, op-sqlite mocked). Verified on simulator. Committed once.

- [ ] **Step 1: Add imports**

In `src/screens/today/DailyGoalsScreen.tsx`:

- Add `useEntries` to the `@features/trackers/queries` import (which currently imports `useTrackers, useLogEntry, useEntriesForDate`):

```tsx
import {
  useTrackers,
  useLogEntry,
  useEntriesForDate,
  useEntries
} from '@features/trackers/queries'
```

- Add `PACE_COLOR` to the `@features/trackers/icons` import (currently `Icons, PACE_COLOR, hexA, iconEmoji, colorHex` — `PACE_COLOR` is already there per the file; if not, add it).
- Add the streak import near the other `@features/trackers` imports:

```tsx
import {
  habitStreakStatus,
  type StreakStatus
} from '@features/trackers/calculators/habitStats'
```

- [ ] **Step 2: Add a positive/text-class helper above `LogRow`**

Above the `LogRow` function, add a small mapping from status kind → i18n key + whether it's a "missed" (negative) kind:

```tsx
// Streak status kind → i18n key. Negative ("missed*") kinds render in the
// behind color with a warning icon; the rest are positive (flame).
const STREAK_KEY: Record<StreakStatus['kind'], string> = {
  none: '',
  greatStart: 'today.streakGreatStart',
  streakOngoing: 'today.streakOngoing',
  streakEnded: 'today.streakEnded',
  missedYesterday: 'today.missedYesterday',
  missedLastTime: 'today.missedLastTime',
  missedDays: 'today.missedDays'
}
const isMissedKind = (k: StreakStatus['kind']): boolean =>
  k === 'missedYesterday' || k === 'missedLastTime' || k === 'missedDays'
```

- [ ] **Step 3: Compute the status inside `LogRow` for habit rows**

`LogRow` already destructures `const { tracker, done, todayLog } = row`. After that line, add a query for the habit's full history + the status (hooks run unconditionally; the value is only used for habit rows):

```tsx
  const { data: allEntries = [] } = useEntries(tracker.id)
  const streak: StreakStatus | null =
    tracker.type === 'habit'
      ? habitStreakStatus(tracker, allEntries, today)
      : null
```

(`today` is already a prop of `LogRow`.)

- [ ] **Step 4: Render line 2 under the cadence sub-line**

In `LogRow`'s return, the sub-line block currently is:

```tsx
        <View className='flex-row items-center gap-s2 mt-[2px]'>
          <View
            className='rounded-full h-2 w-2'
            // runtime: user-chosen tracker.color
            style={{ backgroundColor: colorHex(tracker.color) }}
          />
          <Typography className='text-sm text-ink-2'>{subText}</Typography>
        </View>
```

Add the streak line immediately after that `</View>` (still inside the `flex-1` name column), rendering only when there's a habit streak status that isn't `none`:

```tsx
        <View className='flex-row items-center gap-s2 mt-[2px]'>
          <View
            className='rounded-full h-2 w-2'
            // runtime: user-chosen tracker.color
            style={{ backgroundColor: colorHex(tracker.color) }}
          />
          <Typography className='text-sm text-ink-2'>{subText}</Typography>
        </View>
        {streak && streak.kind !== 'none' ? (
          <View className='flex-row items-center gap-s1 mt-[2px]'>
            {isMissedKind(streak.kind) ? (
              <Icons.Warn size={13} color={PACE_COLOR.behind} />
            ) : (
              <Icons.Flame size={13} color={PACE_COLOR.on_track} />
            )}
            <Typography
              className={`text-sm font-bold ${
                isMissedKind(streak.kind)
                  ? 'text-pace-behind'
                  : 'text-pace-on'
              }`}
            >
              {t(STREAK_KEY[streak.kind], { count: streak.n })}
            </Typography>
          </View>
        ) : null}
```

(`t` is already available in `LogRow` via `useTranslation`.)

- [ ] **Step 5: Type-check, lint, test**

Run: `yarn tsc && yarn lint && yarn test`
Expected: tsc clean; no new lint in `DailyGoalsScreen.tsx`; full suite green.

- [ ] **Step 6: Verify on simulator**

Reload JS on a booted simulator. On the Today screen, for each due habit confirm:
1. A habit done today, nothing before → "🔥 Great start" (green) under "daily".
2. A habit done today + done yesterday → "🔥 Streak: 2 days".
3. A habit not yet done today but done yesterday → "🔥 1 day streak".
4. A habit not done today, yesterday (a due day) missed → "⚠️ Missed yesterday" (orange).
5. A habit not done today with 2 consecutive prior due days missed → "⚠️ Missed 2 days in row".
6. (If a Mon/Tue/Sat-style habit is available and today is Sat with the prior due day Tue missed and Fri a rest day) → "⚠️ Missed last time".
7. A brand-new habit (created today, not logged) → no second line (just "daily").
8. Non-habit cards (target/average/project) show no streak line (unchanged).

(Use the existing "Running"/"Cut" habits and toggle their today check / add back-dated logs via the Habit Detail History tab to exercise the cases.)

- [ ] **Step 7: Commit**

```bash
git add src/screens/today/DailyGoalsScreen.tsx
git commit -m "feat(today): streak status line under habit cadence on Today card

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Streak model (done due/rest +1, rest-not-done skip, due-not-done stop) → Task 1 `runFrom` + missedRun loops. ✅
- Status mapping table (none/greatStart/streakOngoing/streakEnded/missedYesterday/missedLastTime/missedDays), top-to-bottom → Task 1 final `if` ladder (order matches the spec table; `streakEnded` checked before missed, `missedDays` before single-miss). ✅
- missedRun excludes today, counts only consecutive run before today → Task 1 missedRun loop starts at `i=1`, breaks on done due. ✅
- lastMissedWasYesterday distinguishes missedYesterday vs missedLastTime → Task 1. ✅
- rest-day completion extends streak → Task 1 `runFrom` counts any `done.has(day)`; test case included. ✅
- UI line 2 only for habit, positive=flame/green, missed=warn/behind, hidden on `none` → Task 3. ✅
- TrackerCard + non-habit cards unchanged → Task 3 gates on `tracker.type === 'habit'`; no other file touched. ✅
- i18n 6 keys en+vi, count interpolation → Task 2. ✅
- `Icons.Warn` = TriangleAlert → Task 2. ✅
- Pure function unit-tested (TDD) → Task 1. ✅

**Placeholder scan:** No TBD/TODO; every code step has complete code; tests have real assertions. ✅

**Type consistency:** `StreakStatus`/`StreakStatusKind` defined in Task 1 and imported/used identically in Task 3; `habitStreakStatus(tracker, entries, todayISO)` signature consistent; `STREAK_KEY` keyed on `StreakStatus['kind']` covers all 7 kinds; `Icons.Warn` defined in Task 2, used in Task 3; `PACE_COLOR.on_track`/`.behind` match the keys in `icons.ts`. The Step-3 `useEntries` returns `Entry[]` matching `habitStreakStatus`'s param. ✅

**Note on the `missedLastTime` test fixture:** the test uses Mon/Tue/Sat with Mon done so only Tue (the most recent prior due day) is missed and yesterday (Fri) is a rest day → `missedRun === 1`, `lastMissedWasYesterday === false` → `missedLastTime`. Verified the offsets against 2026-06 (1st = Monday) in the spec.
