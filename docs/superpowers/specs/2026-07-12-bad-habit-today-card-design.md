# Bad-habit Today card: limit-style presentation + due-all-day classification

Date: 2026-07-12
Status: approved

## Problem

On the Today screen a bad habit (slip limit, e.g. "max 2 beers/day") renders
identically to a good habit: same "Daily" sub-line, same `n/goal` ring, same
tap gesture. Nothing tells the user one card means "reach 5" and the other
means "stay under 2" — and "0/2" on a limit reads like an unfinished goal.
Worse, the current `classifyTodayRow` puts a clean bad habit (0 slips) straight
into the **Completed** section from the start of the day, burying the
log-a-slip control at the bottom of the screen.

## Behavior

Shared Due Today list (no separate "Limits" section), but the bad-habit card
reads completely differently:

1. **Classification** (`classifyTodayRow`): bad habit clean (`yes <= limit`) →
   `'due'` (stays in Due Today all day, actionable); over the limit →
   `'missed'` (unchanged). A bad habit is never `'completed'` during the day.
2. **Summary ring** decouples from sections: `doneCount` = completed rows
   **+ clean bad habits** (clean = currently succeeding). From the morning the
   header reads "1 of 2 done" while the beer card still sits in Due Today.
3. **`allDone`** (🎉 all-clear state) = no *good* due rows and no missed rows.
   When allDone with bad habits present, the celebration copy shows but the
   clean bad-habit cards keep rendering below so slips can still be logged.
4. **Card presentation** (habit branch of `LogRow`, `direction === 'bad'`):
   - Sub-line: `🚫 Limit 2/day` — lucide `Ban` (13px, amber `#e8923a`)
     replaces the tracker-color dot; new i18n key `today.limitPerDay`.
   - Ring: keeps the existing drain-the-quota fraction, but the center shows
     only the **remaining count** ("2"), not "0/2". Colors: remaining > 0 →
     `pace.on_track` (green); at limit (0 left, still clean) → amber; over →
     full red ring (`pace.behind`), center shows the overflow as "+1".
   - Streak line: `habitStreakStatus` already returns clean-day runs for bad
     habits; add bad-specific copy keys instead of reusing good-habit "streak"
     wording — ongoing: "X days clean", start: "Clean so far today",
     ended: "X-day clean run ended".
   - Tap ring still logs one slip (kept — the card now looks distinct enough).
   - Card background does NOT flip to `bg-brand-faint` while merely clean.

## Changes

- `src/features/trackers/calculators/habitStats.ts`
  - `classifyTodayRow`: bad habit → `yes > limit ? 'missed' : 'due'`.
- `src/screens/today/DailyGoalsScreen.tsx`
  - `doneCount` / `allDone` reworked per Behavior 2–3 (extract a small pure
    helper if it keeps the screen readable).
  - `LogRow`: bad-habit sub-line, ring center text/colors, clean-flavored
    streak-key mapping.
- `src/i18n/locales/{en,vi}.json`: `today.limitPerDay`, `today.cleanOngoing`,
  `today.cleanStart`, `today.cleanEnded` (key-for-key in both files).

No DB/schema, calculator-math, or detail-screen changes — `bestStreak`,
`buildCalendarMonth`, `habitStreakStatus`, and `periodSessions` already handle
bad habits correctly.

## Testing

Unit tests (TDD):

- `classifyTodayRow` bad habit: 0 slips → `due`; at limit → `due`; over →
  `missed`; limit 0 ("never") clean → `due`, one slip → `missed`.
- Summary counting helper (if extracted): clean bad habit counts as done,
  over-limit does not; good habits count only when completed; allDone true
  with only clean bad habits remaining.

UI (ring text/colors, sub-line, streak copy) verified on simulator in EN + VI.
