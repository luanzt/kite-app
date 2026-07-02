# Target Overview tab redesign — design spec

Date: 2026-07-02
Source design: Claude Design project `kite-app` → `Save Money Detail.dc.html`

## Goal

Rebuild the **Target detail Overview tab** (`TargetOverviewTab.tsx`) to match the
"Save Money Detail" mockup, while staying visually consistent with Habit Detail
by reusing Kite's existing design tokens and gradient technique.

## Scope

- **In scope:** the Overview tab body only (first tab of `TargetDetailView`).
- **Out of scope / untouched:** the tab bar (`HabitTabBar`), the History tab
  (`HabitHistoryTab`), the Notes tab (`HabitNotesTab`), the shared `DetailAppbar`,
  the navigator wiring, and `TrackerDetailScreen`. The design's 4th "Settings"
  pill is intentionally NOT implemented (no Settings tab exists in Kite).
- Styling uses **existing Kite tokens** (`bg-surface`, `border-line`,
  `rounded-xl-k`, `shadow-md`, spacing `s*`, the pace palette, and the
  `AchievementHero` SVG gradient `#3d7dd8`→`#2f63b3`). We do NOT hardcode the
  mockup's raw palette (`#EAEEF3`, `#2E5CD6`, 24–30px radii). The screen
  background stays `bg-bg`.

## Layout — three cards in a `ScrollView`

`TargetOverviewTab` currently renders `DetailHero` + `DetailStatGrid` +
`DetailBody`. It will instead render three new sub-components inside the same
`ScrollView` (same `paddingBottom: insets.bottom + 24` safe-area pattern).
`DetailHero` / `DetailStatGrid` / `DetailBody` remain in the codebase — they are
still used by the inline average/project detail path in `TrackerDetailScreen` —
but are no longer referenced by the target Overview tab.

### Card 1 — `TargetHero` (blue gradient)

Mirrors `AchievementHero`'s structure: an `overflow-hidden rounded-xl-k` card
with an absolutely-positioned `Svg` gradient fill (`Stop` `#3d7dd8` → `#2f63b3`),
white content on top.

- **Pace pill** (top, centered): a translucent-white rounded pill showing pace
  direction + expected pace value, e.g. "▲ 54.1K ahead · Pace 103K". Direction
  arrow/label from `paceStatus`; the "ahead/behind by" amount is
  `|current − expected|` (compact-formatted); "Pace" value is the `expected`
  timeline value. Hidden entirely when there is no deadline (`paceStatus === 'none'`).
- **Progress ring** (left): reuse the `AchievementHero` ring math
  (`react-native-svg` `Circle` with `strokeDasharray`/`strokeDashoffset`,
  `RING_SIZE`/`RING_STROKE`). Fill fraction = `progress.percent`. Center shows
  `fmtValCompact(tracker, current)`; below it "<toGo> to go" where
  `toGo = max(0, goal − current)` compact-formatted.
- **Stat stack** (right): two stacked stats separated by a faint divider
  (`bg-on-accent opacity-20 h-px`):
  - `dailyGoal` + " / day", caption "DAILY GOAL · <daysLeft> LEFT".
  - `projected` value, caption "PROJECTED · <projectedDate>". When projection is
    unavailable (no deadline, no progress yet, or already complete), show a
    dash/placeholder and the caption without a date.

### Card 2 — `TargetProgressBar` (white card)

`bg-surface border border-line rounded-xl-k p-s5 shadow-md`.

- Header row: "Progress" (label) and `<current> / <goal>` (current in brand,
  " / goal" in `text-ink-3`), compact-formatted.
- A track (`bg-surface-2`, `rounded`, ~34px tall) with a filled portion whose
  **width is `progress.percent`** — this is a genuinely continuous/computed value,
  so it uses an inline `style={{ width: … }}` (allowed exception per the styling
  rules), filled with the brand color.
- A **pace marker**: a thin vertical tick positioned at `paceMarkerPercent`
  (= `pacePercent(tracker)`), also an inline `style` left-offset (continuous).
  Hidden when there is no deadline.
- An axis row of ~5 evenly-spaced compact value labels (0 → goal).
- A centered caption: a short tick swatch + "Pace marker · <expected>".

### Card 3 — `TargetTrajectoryChart` (white card)

`bg-surface border border-line rounded-xl-k p-s5 shadow-md`.

- Header: left = today's date (localized) + "Pace: <expected>"; right =
  `<current>` + "<ahead/behind amount> <direction>".
- An SVG (`react-native-svg`, responsive `width="100%"` + fixed `viewBox`) with:
  - horizontal Y grid lines + right-aligned Y labels (compact values),
  - a solid **goal line** at the top,
  - a dotted diagonal **ideal line** (start→goal over start→deadline),
  - the **actual** cumulative area (gradient fill) + solid line,
  - a dashed **projected** line from the last actual point to the goal at the
    current rate,
  - a **current dot** at the last actual point,
  - X-axis date labels.
- Legend row: Actual (solid) / Projected (dashed) / Ideal (dotted).
- **Degrade gracefully:** with no deadline, draw only the actual line (no ideal,
  no projected). With no entries, the actual line is empty (only the ideal line
  if a deadline exists).

All SVG coordinate math (mapping domain values → x/y, building `path` `d`
strings, the area gradient) lives inside the component because it depends on the
drawing viewport. The component consumes only the **domain-level** series from
the helper below.

## New pure helper — `calculators/targetTrajectory.ts`

DB-free, pure, unit-tested (TDD: failing tests first). Signature:

```ts
buildTargetTrajectory(tracker: Tracker, entries: Entry[], todayISO: string): TargetTrajectory
```

Returns:

- `series: { date: string; value: number }[]` — cumulative actual value by entry
  date, sorted ascending. Uses the **same accumulation rule as `calculateTarget`**
  (`sum` → running total from `startValue`; `latest` → the latest entry value).
- `idealLine: { start: { date; value }; end: { date; value } } | null` — from
  `startValue` at `startDate` to `targetValue` at `deadline`; `null` when there
  is no deadline.
- `projected: { value: number; date: string } | null` — linear extrapolation
  from the current rate `(current − start) / daysElapsed` until it reaches the
  goal; `null` when there is no deadline, `daysElapsed <= 0`, no progress, or the
  goal is already reached.
- `dailyGoal: number` — `max(0, (goal − current) / daysLeft)`; `0` when no
  deadline, past deadline, or already complete.

The helper does NOT recompute pace status or the marker percent — the component
reuses the existing `calculateTarget` (`paceStatus`, `expected`, `current`,
`goal`, `percent`) and `pacePercent(tracker)` from `detailFormat`.

### Edge cases the helper/tests must cover

- No deadline → `idealLine`/`projected` null, `dailyGoal` 0.
- No entries → `series` empty, `current === startValue`.
- Decreasing goal (start > goal, e.g. weight loss) → fractions computed the same
  way as `calculateTarget`; direction stays correct.
- Past the deadline / already at goal → `dailyGoal` 0, `projected` null.
- `accumulation === 'latest'` vs `'sum'` → series matches the calculator.

## i18n keys (add to BOTH `en.json` and `vi.json`, under `detail`)

`dailyGoal`, `projected`, `toGo`, `paceMarker`, `left`, `chartActual`,
`chartProjected`, `chartIdeal`. Reuse existing `ahead`, `behind`, `onTrack`,
`none`, `target`, `days`. User-entered data (name, unit) is never translated.

## Styling rules (repo-mandated)

- `Typography` only (never `Text`); Tailwind `className` only, except
  genuinely-continuous runtime values (progress-bar width, pace-marker offset,
  SVG geometry) which use inline `style` per the documented exception, with a
  why-comment.
- Icons from `lucide-react-native` only (via the existing `Icons` map where a
  glyph is needed); the pace triangle/tick may be a small inline SVG shape.
- No new native deps — `react-native-svg` is already installed and used by
  `AchievementHero`/`HistoryChart`.

## Files

- **New:** `src/features/trackers/calculators/targetTrajectory.ts`
- **New:** `src/features/trackers/calculators/__tests__/targetTrajectory.test.ts`
- **New:** `src/features/trackers/components/TargetHero.tsx`
- **New:** `src/features/trackers/components/TargetProgressBar.tsx`
- **New:** `src/features/trackers/components/TargetTrajectoryChart.tsx`
- **Edit:** `src/features/trackers/components/TargetOverviewTab.tsx` (compose the three)
- **Edit:** `src/i18n/locales/en.json`, `src/i18n/locales/vi.json`

## Testing / verification

- Unit tests for `targetTrajectory` (Jest, `yarn test <file>`), covering the edge
  cases above. `yarn tsc` and `yarn lint` clean.
- The three view components are verified on the simulator (SVG drawing can't be
  unit-tested), per the repo's testing strategy.
