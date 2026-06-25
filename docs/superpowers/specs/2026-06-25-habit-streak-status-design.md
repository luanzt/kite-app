# Habit Streak Status Line (Today card)

**Date:** 2026-06-25
**Scope:** `src/features/trackers/calculators/habitStats.ts` (new pure `habitStreakStatus`), `src/features/trackers/calculators/__tests__/habitStats.test.ts` (tests), `src/screens/today/DailyGoalsScreen.tsx` (render line 2), `src/i18n/locales/{en,vi}.json`.

## Goal

Add a second sub-line under a habit's cadence on the **Today** card showing a
motivational streak status: "Great start", "Streak: N days", "N day streak",
"Missed yesterday", or "Missed N days in row" (matching the reference image). The
Today card only renders habits whose cadence is **due today**, so the status is
always computed in the context of "today is a due day".

## Streak model (confirmed with user)

Scan **backwards day-by-day** from today over the tracker's history
(start date → today). A day is **done** when its summed logged value meets the
per-day goal (`doneDatesOf`). Stepping backward:

- **done day** (whether a due day or a rest day) → counts, continue (+1).
- **rest day, not done** → neutral, skip (does not extend, does not break).
- **due day, not done** (and not today) → breaks the run (stop).

So a rest day the user *did* complete still extends the streak, and only a
**missed due day** resets it. Example (due = Mon/Tue/Sat; Tue done, Wed[rest]
not done, Thu[rest] done) → counting back from Thu: Thu done (+1) → Wed rest
skip → Tue done (+1) → streak = 2.

### Derived quantities (today is always a due day here)

- `todayDone` — today met its goal.
- `runEndingToday` — consecutive run (per the rules above) ending at and
  including today (0 when today not done).
- `runEndingYesterday` — the run ending at the most recent **completed** day
  strictly before today, per the same skip/break rules. Concretely: step back
  from yesterday; skip rest-not-done; stop at the first due-not-done; count
  done days. (0 when the most recent prior due day was missed.)
- `missedRun` — consecutive **due** days not done, counting back from today
  (including today), skipping rest days. (Only due days count as "missed" —
  rest days are never a miss.)
- `hasPriorDue` — at least one due day exists strictly before today within
  [startDate, today].

## Status mapping → `{ kind, n }`

`kind ∈ { none, greatStart, streakOngoing, streakEnded, missedYesterday, missedDays }`

| Condition | kind | n | line-2 text |
|---|---|---|---|
| `!hasPriorDue && !todayDone` | `none` | – | (hidden — no line 2) |
| `todayDone && runEndingToday === 1` | `greatStart` | – | "Great start" |
| `todayDone && runEndingToday >= 2` | `streakOngoing` | runEndingToday | "Streak: {n} days" |
| `!todayDone && runEndingYesterday >= 1` | `streakEnded` | runEndingYesterday | "{n} day streak" |
| `!todayDone && missedRun === 1` | `missedYesterday` | – | "Missed yesterday" |
| `!todayDone && missedRun >= 2` | `missedDays` | missedRun | "Missed {n} days in row" |

Resolution order is top-to-bottom (first match wins). Note `greatStart` is the
start-today-and-done case AND the past-start-but-yesterday-missed-and-today-done
case — both yield `runEndingToday === 1`, so one rule covers both.

## UI (DailyGoalsScreen card)

- Line 1 unchanged: color dot + cadence (`tracker.period`, e.g. "daily").
- Line 2, only when `kind !== 'none'` and `tracker.type === 'habit'`:
  - positive kinds (`greatStart`, `streakOngoing`, `streakEnded`): lucide
    `Flame` (`Icons.Flame`) in `pace-on` green + text in `pace-on`.
  - missed kinds (`missedYesterday`, `missedDays`): a warning lucide icon
    (`TriangleAlert` — add to `Icons` as `Icons.Warn` if absent) in
    `pace-behind` + text in `pace-behind`.
- Only habits get line 2 (target/average/project keep their existing single
  sub-line). `TrackerCard.tsx` (Trackers tab) is NOT changed.

## Data flow

`DailyGoalsScreen` currently fetches only *today's* entries
(`useEntriesForDate`). The streak needs full history per habit. Fetch all
entries for the due habits and pass each habit's entries into
`habitStreakStatus`. Approach: in `DailyGoalsScreen`, for the due habits, read
their entries via the existing `useEntries(id)` query. Since hooks can't be
called in a `.map`, compute the status inside `LogRow` (one component instance
per row) by calling `useEntries(tracker.id)` there for habit rows, then
`habitStreakStatus(tracker, entries, today)`. (`useEntries` is a cached query;
one subscription per visible habit row is acceptable for the Today list size.)

## i18n (EN/VI, key-for-key) — under `today`

| key | en | vi |
|---|---|---|
| `streakGreatStart` | "Great start" | "Khởi đầu tốt" |
| `streakOngoing` | "Streak: {{count}} days" | "Chuỗi: {{count}} ngày" |
| `streakEnded` | "{{count}} day streak" | "Chuỗi {{count}} ngày" |
| `missedYesterday` | "Missed yesterday" | "Lỡ hôm qua" |
| `missedDays` | "Missed {{count}} days in row" | "Lỡ {{count}} ngày liên tiếp" |

## Testing

`habitStreakStatus` is pure → TDD unit tests in `habitStats.test.ts` covering:
- new tracker, start today, not done → `none`.
- start today + done → `greatStart`.
- past start, yesterday missed, today done → `greatStart`.
- today done + yesterday done (run 2) → `streakOngoing` n=2; run 3 → n=3.
- today not done, yesterday done → `streakEnded` n=1; prior also done → n=2.
- today not done, yesterday missed (due) → `missedYesterday`.
- today not done, missed 2 due days → `missedDays` n=2.
- rest-day-done extends streak (the Mon/Tue/Sat example: Tue done, Thu[rest]
  done → counting includes the rest-day completion).
- missed due day with an intervening rest-done still breaks (rest done skipped,
  due-not-done breaks).

Card render verified on simulator.

## Out of scope

- `TrackerCard.tsx` (Trackers tab) — unchanged.
- Non-habit cards — unchanged.
- Changing `calculateHabit`'s `streak` field (the detail/ring still uses it).
