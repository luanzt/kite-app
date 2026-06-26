# Today — Target/Average card: read-only value + pace (drop stepper)

Date: 2026-06-26
Status: Approved (design)

## Problem

On the Today screen, `target` and `average` trackers use a `−  N  +` stepper to
quick-log. This is wrong for money/weight goals: "Gom Tiền Du Lịch" has goal 30K
and a single deposit is often 500K — stepping by a fixed 25K step is nonsensical.
The sub-line also shows only the raw current value (`0 VND`), giving no sense of
the goal or whether you're on pace.

Strides (reference, image #3) shows these as **read-only**: a big current value
plus a small colored pace line, and tapping the row opens a numeric log screen.

## Goal

Match that pattern for `target` and `average` on Today:

1. Replace the stepper with a **read-only value + pace** block, right-aligned.
2. Sub-line becomes **`Goal: 30K by 29 Nov 2026`** (compact numbers; date omitted
   when no deadline).
3. **Tap the value+pace block** → open the existing `LogEntryModal` (numeric
   value sheet) at Today.

`habit` (ring + tap) and `project` (chevron) are unchanged.

## Behavior by type

### target
- **Value (big, bold, `text-brand-ink`, right-aligned):** `progress.current`
  from `calculateTarget`, formatted compact.
- **Pace line (small):** `Pace: {fmtCompact(expected)}` where `expected` is the
  value you should have reached by today along the timeline. Color by
  `paceStatus`: `text-pace-on` (on_track), `text-pace-ahead` (ahead),
  `text-pace-behind` (behind). When `paceStatus === 'none'` (no deadline), hide
  the pace line entirely.
- **Sub-line:** `Goal: {fmtCompact(targetValue)} by {deadline}`. No deadline →
  `Goal: {fmtCompact(targetValue)}` (drop "by ...").

### average
- **Value (big):** today's logged value (`todayLog`), formatted compact.
- **Pace line:** `Avg: {fmtCompact(progress.current)}` (cumulative average).
  Color by `paceStatus` (`on_track` when avg ≥ target → green, else
  `text-pace-behind` red). Average has no timeline, so it always shows `Avg:`
  (never hidden).
- **Sub-line:** `Target: {fmtCompact(targetValue)}` (averages have no deadline).

### habit / project
Unchanged: habit keeps the ring (`N/goal`, tap = +1 Yes); project keeps the
chevron that opens detail.

## Number formatting — `fmtCompact`

New helper alongside `fmtNum`/`fmtVal` in `src/features/trackers/detailFormat.ts`:

- `< 1000` → `fmtNum(n)` unchanged (`0`, `7.5`, `850`).
- `>= 1000` → `K`: `1000 → 1K`, `30000 → 30K`, `999000 → 999K`.
- `>= 1_000_000` → `M`: `3000000 → 3M`, `1500000 → 1.5M`.
- One decimal max, trailing `.0` stripped (`1500000 → 1.5M`, `2000000 → 2M`).
- Unit handling: keep current `fmtVal` rules — `$` prefixes, other units suffix.
  On Today the value block shows the compact number; the unit shows in the
  sub-line goal text (e.g. `Goal: 100K VND by ...`) or is implied. We will use
  `fmtCompact` for the bare number and append the unit where the sub-line is
  built, mirroring how `fmtVal` does it.

(Locale: `fmtNum` already uses `toLocaleString`; compact suffixes `K`/`M` are
ASCII and not localized — acceptable, matches Strides.)

## Calculator change — add `expected`

`TrackerProgress` gains an optional field:

```ts
expected?: number | null  // value you should have reached by today (timeline), or null
```

`calculateTarget`: where it already computes `timeFrac`, also set
`expected = start + span * timeFrac` (only when a deadline exists and
`total > 0`; otherwise `expected = null`). No change to `paceStatus` logic.

`calculateAverage`: `expected = null` (no timeline). The card uses
`progress.current` for the `Avg:` line, not `expected`.

This is pure logic → **TDD**: add tests in `target.test.ts` asserting
`expected` equals the linear interpolation for given start/goal/deadline/elapsed,
and is `null` when there's no deadline.

## Today screen wiring (`DailyGoalsScreen`)

- `LogRow` already pulls `allEntries = useEntries(tracker.id)`. Compute
  `progress` there: `calculateTarget(tracker, allEntries, today)` for target,
  `calculateAverage(...)` for average.
- `renderControl()` for `target`/`average`: render the value+pace `Pressable`
  block instead of the stepper. On press, call a new `onQuickLog(tracker)` prop.
- **One shared `LogEntryModal`** lives in `DailyGoalsScreen`. State:
  `logTarget: Tracker | null`. `onQuickLog` sets it; the sheet's `visible` is
  `logTarget != null`; `defaultDate = today`. `onSave` → `log.mutate(e)` (already
  wired). `onClose` → `setLogTarget(null)`. Create-only (no edit/delete from
  Today), so `onDelete` is omitted.
- The stepper helpers `quickStep` and the local `fmtNum` in DailyGoalsScreen are
  no longer needed for target/average; `quickStep` can be removed if nothing else
  uses it. (Habit still uses the local `fmtNum` for the ring count.)

## i18n (en + vi, key-for-key)

Add under `today`:
- `today.goalBy`: `"Goal: {{value}} by {{date}}"` / vi `"Mục tiêu: {{value}} trước {{date}}"`
- `today.goal`: `"Goal: {{value}}"` / vi `"Mục tiêu: {{value}}"`
- `today.pace`: `"Pace: {{value}}"` / vi `"Nhịp: {{value}}"`
- `today.avg`: `"Avg: {{value}}"` / vi `"TB: {{value}}"`
- `today.targetIs`: `"Target: {{value}}"` / vi `"Mục tiêu: {{value}}"`

Deadline date formatted via `toLocaleDateString` (`en-US`/`vi-VN`,
`{ day:'numeric', month:'short', year:'numeric' }`) → `29 Nov 2026`.

## Out of scope

- Editing/deleting a logged entry from Today (still done in Detail).
- Changing the habit ring or project chevron.
- Pace marker / PaceBar on the Today card (just the text line).
