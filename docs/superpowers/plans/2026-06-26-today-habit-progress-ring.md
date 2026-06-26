# Today Habit Progress Ring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Today habit Yes/No check with an N/goal progress ring (tap = +1, overflow allowed, reaching goal → COMPLETED), and make the card's "done" rule use the per-day goal so it matches the streak.

**Architecture:** One-file change to `DailyGoalsScreen.tsx`: the per-row `done` derivation switches the habit branch to `todayLog >= perDayGoal(tracker)`, and the habit control in `renderControl` becomes a `Ring` (already defined in the file) + `{n}/{goal}` count that increments on tap. No new logic functions; `perDayGoal` is reused from `habitStats`.

**Tech Stack:** React Native, Uniwind (Tailwind v4 `className`), react-native-svg (existing `Ring`), i18next, Jest (op-sqlite mocked).

## Global Constraints

- **Styling:** Tailwind `className` only — NEVER inline `style={{…}}` except runtime-dynamic values. The `Ring` colors come from the `color` prop (runtime value), which is correct (SVG stroke, no className). NEVER interpolate a value into a class string.
- **Text:** render `Typography` from `heroui-native`, NEVER `Text`.
- **Done rule (exact):** habit card `done = todayLog >= perDayGoal(tracker)`; target/average keep `todayLog > 0`; project stays `false`.
- **Tap = +1, overflow allowed** (no cap). No decrement control on Today.
- TypeScript strict — `yarn tsc` clean. `yarn lint` — no NEW warnings in `DailyGoalsScreen.tsx`. Named exports only.
- op-sqlite mocked in Jest → this DB-touching screen is verified on simulator; existing 93 tests stay green.

---

## File Structure

- `src/screens/today/DailyGoalsScreen.tsx` — MODIFY: import `perDayGoal`; change the habit `done` rule (line ~286); replace the habit control in `renderControl` with a ring.

---

## Task 1: Habit progress ring on the Today card

**Files:**
- Modify: `src/screens/today/DailyGoalsScreen.tsx`

**Interfaces:**
- Consumes: `perDayGoal` (from `@features/trackers/calculators/habitStats`), the in-file `Ring` component, `PACE_COLOR` + `colorHex` (already imported from `@features/trackers/icons`), `setValue` (already defined in `LogRow`).
- Produces: no exported interface — internal render + derivation change.

No Jest test (DB-touching screen, op-sqlite mocked). Verified on simulator. Committed once.

- [ ] **Step 1: Import `perDayGoal`**

In `src/screens/today/DailyGoalsScreen.tsx`, the existing import from `@features/trackers/calculators/habitStats` currently brings in `habitStreakStatus` and the `StreakStatus` type:

```tsx
import {
  habitStreakStatus,
  type StreakStatus
} from '@features/trackers/calculators/habitStats'
```

Add `perDayGoal`:

```tsx
import {
  habitStreakStatus,
  perDayGoal,
  type StreakStatus
} from '@features/trackers/calculators/habitStats'
```

- [ ] **Step 2: Change the habit `done` rule**

Find (around line 286):

```tsx
  const rows: Row[] = due.map((tracker) => {
    const todayLog = todayValue.get(tracker.id) ?? 0
    const done = tracker.type === 'project' ? false : todayLog > 0
    return { tracker, done, todayLog }
  })
```

Replace the `done` line so a habit is done only when it meets its per-day goal:

```tsx
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

- [ ] **Step 3: Replace the habit control with a ring**

In `renderControl` (inside `LogRow`), find the habit branch:

```tsx
    if (tracker.type === 'habit') {
      return (
        <Pressable
          onPress={() => setValue(done ? 0 : 1)}
          className={`items-center justify-center rounded-full h-[46px] w-[46px] border-[2.5px] ${
            done ? 'border-pace-on bg-pace-on' : 'border-line-strong bg-white'
          }`}
        >
          <Icons.Check size={24} color={done ? '#ffffff' : 'transparent'} />
        </Pressable>
      )
    }
```

Replace it with a tap-to-increment ring showing `{n}/{goal}`:

```tsx
    if (tracker.type === 'habit') {
      const goal = perDayGoal(tracker)
      const n = todayLog
      const ringColor = done ? PACE_COLOR.on_track : colorHex(tracker.color)
      return (
        <Pressable
          onPress={() => setValue(n + 1)}
          className='h-[46px] w-[46px] items-center justify-center'
        >
          <Ring fraction={goal ? n / goal : 0} color={ringColor} size={46} strokeWidth={4} />
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

(`PACE_COLOR` and `colorHex` are already imported; `Ring`, `View`, `Typography`, `setValue`, `todayLog`, `done` are all already in scope.)

- [ ] **Step 4: Type-check, lint, test**

Run: `yarn tsc && yarn lint && yarn test`
Expected: tsc clean; no new lint in `DailyGoalsScreen.tsx`; full suite 93 green.

- [ ] **Step 5: Verify on simulator**

Reload JS on a booted simulator. On the Today screen:
1. A goal-1 habit (e.g. "Read B") shows a ring "0/1"; one tap → "1/1", ring full, card moves to COMPLETED, streak line shows a positive status (e.g. "Great start").
2. A goal-6 habit (e.g. "Running") shows "0/6"; tap six times → "1/6"…"6/6"; only at 6/6 does the card move to COMPLETED and the streak flip off "Missed".
3. Tap once more on a completed goal-6 habit → "7/6" (overflow allowed; stays COMPLETED).
4. The "N of M done" summary counts a multi-goal habit as done only when its full goal is met.
5. target/average rows still show the −/+ stepper; project still shows the chevron (unchanged).

- [ ] **Step 6: Commit**

```bash
git add src/screens/today/DailyGoalsScreen.tsx
git commit -m "feat(today): habit progress ring (N/goal, +1 tap) unifies done rule

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- All habits use N/goal ring (incl. goal 1) → Step 3 (ring for the whole habit branch). ✅
- Tap = +1, overflow allowed → Step 3 `setValue(n + 1)`, no cap. ✅
- Done = `todayLog >= perDayGoal` → Step 2. ✅
- No decrement on Today → Step 3 has only the +1 Pressable. ✅
- Unifies card done with streak done → Step 2 uses the same `perDayGoal` the streak's `doneDatesOf` uses. ✅
- Project/target/average unchanged → Step 2 keeps their `done`; Step 3 only touches the habit branch. ✅
- No new copy → numbers only; no i18n change. ✅

**Placeholder scan:** No TBD/TODO; full code in every code step. ✅

**Type consistency:** `perDayGoal(tracker): number` matches its `habitStats` export; `Ring` props (`fraction, color, size, strokeWidth`) match the in-file `Ring` signature; `PACE_COLOR.on_track` and `colorHex(tracker.color)` match `icons.ts`; `setValue(v: number)` matches its definition in `LogRow`. ✅
