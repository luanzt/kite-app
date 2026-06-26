# Habit Ring Append-Record Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each habit progress-ring tap on the Today screen create its own `Yes` log record (uuid, value 1) instead of overwriting a single per-day entry, so History shows one row per tap.

**Architecture:** In `DailyGoalsScreen`'s `LogRow`, add a habit-only `logYes()` that appends a fresh `uuid()` / `value: 1` / `createdAt: now` entry, and point the habit ring's `onPress` at it. The shared `setValue` (stable per-day id, overwrite) stays for the target/average steppers. Counting/classification is unchanged because `doneDatesOf` already sums per-day value.

**Tech Stack:** React Native, Uniwind, TanStack Query over op-sqlite, i18next, Jest (op-sqlite mocked).

## Global Constraints

- **Styling:** Tailwind `className` only — no inline `style` except runtime-dynamic; no value interpolated into a class string.
- **Text:** `Typography` from `heroui-native`, never `Text`.
- **Habit-ring-only change.** target/average steppers keep `setValue(absolute)` (overwrite, stable id); project unchanged.
- Each habit ring tap appends: `uuid()` id, `value: 1`, `createdAt: now`, `note: null` — same shape as `LogEntryModal` Detail logs. Overflow allowed (no cap). No decrement on Today.
- Construct ids via `uuid()` from `@features/trackers/factory` (do not hand-build).
- TypeScript strict — `yarn tsc` clean. `yarn lint` — no NEW warnings in `DailyGoalsScreen.tsx`. Named exports only.
- op-sqlite mocked in Jest → this DB-touching screen is verified on simulator; existing 100 tests stay green.

---

## File Structure

- `src/screens/today/DailyGoalsScreen.tsx` — MODIFY: import `uuid`; add `logYes()` in `LogRow`; switch the habit ring `onPress` to it.

---

## Task 1: Habit ring appends a Yes record per tap

**Files:**
- Modify: `src/screens/today/DailyGoalsScreen.tsx`

**Interfaces:**
- Consumes: `uuid` (from `@features/trackers/factory`); existing `onLog`, `tracker`, `today` in `LogRow`.
- Produces: no exported interface — internal handler change.

No Jest test (DB-touching screen). Verified on simulator. Committed once.

- [ ] **Step 1: Import `uuid`**

In `src/screens/today/DailyGoalsScreen.tsx`, add an import for `uuid` from the factory. Place it near the other `@features/trackers` imports (e.g. after the `habitStats` import block):

```tsx
import { uuid } from '@features/trackers/factory'
```

- [ ] **Step 2: Add `logYes()` beside `setValue` in `LogRow`**

Find the existing `setValue` definition in `LogRow`:

```tsx
  // Today's quick-set keeps a stable per-day id so tapping again overwrites the
  // day's value (on/off, set) rather than stacking records — unlike the Habit
  // Detail log, which creates a fresh record each time.
  const setValue = (v: number) =>
    onLog({
      id: entryId,
      trackerId: tracker.id,
      date: today,
      value: v,
      note: null,
      createdAt: new Date().toISOString()
    })
```

Add `logYes()` immediately after it (keep `setValue` — the steppers still use it):

```tsx
  // Habit ring: each tap is its own Yes record (uuid + now), so History shows
  // one row per tap — unlike the stepper's absolute set/overwrite.
  const logYes = () =>
    onLog({
      id: uuid(),
      trackerId: tracker.id,
      date: today,
      value: 1,
      note: null,
      createdAt: new Date().toISOString()
    })
```

- [ ] **Step 3: Point the habit ring at `logYes`**

In `renderControl`, the habit branch's ring `Pressable` currently is:

```tsx
        <Pressable
          onPress={() => setValue(n + 1)}
          className='h-[46px] w-[46px] items-center justify-center'
        >
```

Change its `onPress` to `logYes`:

```tsx
        <Pressable
          onPress={logYes}
          className='h-[46px] w-[46px] items-center justify-center'
        >
```

(Leave the target/average stepper's `setValue(...)` calls and the project branch unchanged.)

- [ ] **Step 4: Type-check, lint, test**

Run: `yarn tsc && yarn lint && yarn test`
Expected: tsc clean; no new lint in `DailyGoalsScreen.tsx`; full suite 100 green. Confirm `setValue`/`entryId` are still referenced (by the steppers) so there's no unused-variable warning.

- [ ] **Step 5: Verify on simulator**

Reload JS on a booted simulator. On the Today screen:
1. A goal-N habit (e.g. "Running", goal 6) shows "k/6"; tap the ring 3 times → "3/6" (overflow still works past 6).
2. Open that habit → Habit Detail → History: today now shows **3 separate "Yes" records** (one per tap), not one.
3. Tap the ring again on Today → History gains a 4th "Yes" record for today.
4. A goal-1 habit: one tap → "1/1" Completed; a second tap → "2/1" (two Yes records), does not toggle off.
5. A mis-tap is removable: delete one of today's Yes records from Habit Detail → History → the Today ring count drops by 1.
6. target/average rows: the − / + stepper still sets an absolute daily total (one entry per day — back-to-back + taps don't stack separate records). Project unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/screens/today/DailyGoalsScreen.tsx
git commit -m "feat(today): habit ring logs one Yes record per tap (History shows each)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Each habit ring tap appends a fresh uuid/value-1/now record → Task 1 Steps 2-3. ✅
- Overflow allowed, no cap → `logYes` always appends; ring fraction unchanged. ✅
- No decrement on Today; correction via Detail → no minus added; Step 5 item 5 verifies Detail deletion. ✅
- All habits incl. goal 1 → habit branch covers all habits; Step 5 item 4. ✅
- target/average steppers unchanged (keep `setValue` overwrite) → Task 1 leaves them; Step 3 note. ✅
- Counting/classification unchanged (`doneDatesOf` sums value) → not touched. ✅
- Build ids via `uuid()` → Step 1-2. ✅

**Placeholder scan:** No TBD/TODO; full code in every code step. ✅

**Type consistency:** `logYes()` builds an `Entry` with the same fields `setValue` uses (`id, trackerId, date, value, note, createdAt`), satisfying `onLog: (e: Entry) => void`; `uuid()` returns `string` matching `Entry.id`. `setValue`/`entryId` remain for the steppers (no unused-var). ✅
