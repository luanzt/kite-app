# Card redesign — bring the onboarding card language into Trackers & Today

**Date:** 2026-07-20
**Status:** Approved (design), pending implementation plan
**Mockup:** `scratchpad/kite-card-redesign.html` (published artifact) — faithful to `global.css` tokens, light + dark, all types + edge cases.

## Goal

The first-launch `WelcomeScreen` shows polished, per-type "showcase" cards
(type badge, prominent streak/pace stat, a type-specific progress visual). The
real data screens — Trackers list (`TrackerCard`) and Today (`LogRow`) — are
flatter and monochrome, so the app under-delivers on its own onboarding promise.
This redesign brings that card language into both real screens while keeping
Today's logging interactions intact.

It also fixes one real papercut: the **grey pace dot** before a tracker's name on
the Trackers list is `none` (grey) for every habit regardless of progress, so it
reads as a dead/broken element. It is removed and replaced by the type badge.

## Scope

**In scope**

- Redesign `TrackerCard` (Trackers list) to the vertical, onboarding-style layout.
- Redesign the Today `LogRow` shell to match, **preserving all interactions**
  (tap-to-log ring, quick-add `+`, done `✓`, long-press day-action menu, captions).
- Extract the duplicated local `Ring` into one shared component.
- Add a small `MiniBars` sparkline component for the `average` visual.
- Add a `TypeBadge` component.
- i18n: add any new copy keys (both `en.json` and `vi.json`, key-for-key).

**Out of scope**

- Detail screens, forms, settings, welcome screen (unchanged).
- Calculator / repository / query logic — this is presentation only. No change to
  `calculateHabit/Target/Average/Project` or `habitStats`.
- New data. Everything rendered already exists on `TrackerProgress` / the row.

## Locked design decisions

1. **Type badge color = per-type identity** (`TYPE_COLOR`): habit `#8b5cf6`,
   target `#2e7d5b`, average `#0d9488`, project `#e0457a`. The icon tile keeps
   the tracker's **personal** `tracker.color` (via `hexA(color, 0.14)`). Badge
   label reuses `t('types.<type>')`.
2. **Sub-line under the name = cadence / context**, not "success %":
   - habit (good): `cadenceLabel(tracker, t)` (e.g. "Every day", "5× a week").
   - habit (bad): the limit line — `today.limitPerWeek` etc. (e.g. "Max 5 / week").
   - target/project: goal line — `list.goalBy` / `list.goal` (e.g. "200K by Aug 1").
     Decreasing target additionally shows the range + a `↓` hint (see below).
   - average: the target line — `today.targetIs` (e.g. "Target 8h / day").
3. **Top-row inline stat** carries the "hero number" and is colored:
   - habit (good): `🔥 {streak} {unit}` streak, green when on a run, ink-3 at 0.
   - habit (bad): clean-run copy (`today.cleanOngoing` / `cleanStart`) green;
     `⚠ {cleanEnded}` red when over the limit today.
   - target/project: `▲ {percent}% · {pace}` — green `on_track`/`ahead`,
     red `behind`, ink-3 `none`. Arrow reflects pace, not value direction.
   - average: `{value} · {window} avg` in ink-3 (neutral; average has no pace).
4. **Progress visual is per-type:**
   - **habit → Ring** (shared component). Good habit: green arc = period done /
     goal. Bad habit: the ring is **always the behind-red color**, arc fills with
     slips vs. limit, maxing out (full red) once over.
   - **target/project → gradient PaceBar** full width, with the **current value**
     rendered bold at the end of the bar row (`fmtCompact`/`fmtVal`). Keeps the
     PaceBar's existing "expected" marker.
   - **average → MiniBars** sparkline (new), fed by `periodSessions` (the existing
     cadence-adapted bar series), tinted with `TYPE_COLOR.average`.
5. **Visual placement differs by screen** because Today needs an interactive rail:
   - **Trackers list:** habit Ring / average MiniBars sit in the **right rail**;
     target/project gradient bar renders **below** the row.
   - **Today:** the right rail is always the interactive control — habit = the
     tappable Ring (+ window caption), target/average = the `+` log button (`✓`
     when done, + caption). Therefore on Today the **average MiniBars and the
     target/project bar both render below** the row. (Today rows are few, so the
     extra height is acceptable — validate on device; if too tall, drop the
     average sparkline on Today and keep just the control.)
6. **Current value at the end of the target bar** — approved. Applies on both
   screens.

## Bad-habit & decreasing-target behavior (must match existing calculators)

These are already computed in `TrackerCard`/`LogRow`; the redesign only re-skins
them. The math is NOT touched.

- **Bad habit** (`type === 'habit' && direction === 'bad'`): stat = slips over
  the period limit (`habitN/limit` via `periodTotal` + `targetValue`). The `/limit`
  fragment and the ring are `pace.behind` red — it is a cap, not a goal. Under the
  limit the leading number is ink; over the limit (`habitN > limit`) the whole
  number is red and the ring is full red. Streak line uses the clean-run copy.
- **Decreasing target** (`calculateTarget` with `startValue > targetValue`, e.g.
  weight loss): `percent` already = progress-toward-goal fraction; the bar fills
  0→100 as `current` falls toward `goal`. Pace (`on_track`/`behind`/`ahead`) and
  the `expected` marker come straight from the calculator. Sub-line shows the
  range and a `↓` hint so the shrinking number isn't confusing
  (e.g. "80 → 70 kg by Sep 1").

## Card anatomy (shared)

```
┌───────────────────────────────────────────────┐
│ [tile]  [BADGE]  <inline stat>          [rail] │   ← rail: Ring (habit) /
│         <name>                                 │      +/✓ control (Today non-habit)
│         <sub-line>                             │
│ · · · · · · · · · · · · · · · · · · · · · · · ·│
│ [ gradient bar ················  <value> ]     │   ← target/project only
│ [ mini bars ]                                  │   ← average (in rail on Trackers)
└───────────────────────────────────────────────┘
```

- Container: `rounded-lg-k border border-line bg-surface p-s4 shadow-sm` (existing).
- Tile: `h-[46px] w-[46px] rounded-md-k`, `hexA(tracker.color, 0.14)` bg, emoji via
  `iconEmoji(tracker.icon)`.
- Badge: small uppercase pill, `TYPE_COLOR` text on a ~13% tint of the same hue.
  Because Tailwind can't interpolate the hue into a class, the tint/text color
  are the documented **inline-style exception** (runtime color from `TYPE_COLOR`
  / `useThemeColors`), like the tile already does.
- Name: `text-lg font-bold text-ink`, `numberOfLines={1}`.
- Sub-line: `text-sm text-ink-3`.

## Components

| Component | Action | Notes |
|-----------|--------|-------|
| `Ring` | **Extract** to `src/features/trackers/components/Ring.tsx` | Currently duplicated in `AverageStatsRow.tsx` and `DailyGoalsScreen.tsx`. Props: `fraction, color, size, strokeWidth, trackColor?`. Both call sites switch to the shared one. |
| `TypeBadge` | **New** `components/TypeBadge.tsx` | Props: `type: TrackerType`. Renders the pill using `TYPE_COLOR` + `t('types.<type>')`. |
| `MiniBars` | **New** `components/MiniBars.tsx` | Props: `values: number[], color: string, height?`. Pure svg/View bars normalized to max. Fed by `periodSessions`. |
| `PaceBar` | **Reuse** | Already supports fill %, pace color, expected marker. Add current-value slot at the row level (in the card), not inside PaceBar. |
| `TrackerCard` | **Rewrite body** | New layout; keep `progressFor()` dispatch and all existing per-type stat derivation. |
| `LogRow` | **Rewrite shell** | Keep `renderControl()` and every handler (`onQuickLog/onQuickAdd/onOpenMenu`), captions, and the bad-habit ring logic verbatim; wrap in the new layout and add badge + bar/sparkline. |

## i18n

Reuse existing keys where possible: `types.*` (badge), `cadenceLabel` output,
`list.goalBy/goal/due`, `today.targetIs`, `today.limitPer*`, `today.cleanStart/
cleanOngoing/cleanEnded`, `unit.*`, `detail.on/behind/ahead/success`.
New keys only if a string doesn't already exist (e.g. a decreasing-target range
formatter, an average "N-day avg" window label). Any new key goes in **both**
`en.json` and `vi.json`, key-for-key. User data (names/notes) is never translated.

## Theming

All chrome uses `global.css` tokens (`bg-surface`, `text-ink`, `border-line`,
`bg-pace-*`, `bg-brand-weak`) so both themes flow automatically. For svg
`stroke`/`fill` and the badge's per-type hue (Tailwind can't reach these), use
`useThemeColors()` for pace/chrome hex and `TYPE_COLOR`/`hexA` for per-type
identity — never route identity colors through `useThemeColors`.

## Testing

Presentation-only, so this is largely device verification. Add unit tests for the
new pure helpers where they exist:
- `MiniBars` normalization helper (if extracted as a pure fn).
- `Ring` dash math (if extracted as a pure fn), otherwise visual-only.
- Existing calculator tests already cover bad-habit and decreasing-target math —
  do NOT duplicate; just confirm the redesign reads the same fields.
Manual: `yarn tsc` + `yarn lint` clean; verify all four types + bad habit + a
decreasing target render correctly in light and dark on simulator, and that every
Today interaction (tap-log ring, `+`, `✓`, long-press menu) still works.

## Risks

- **Today row height** grows (badge + bar below). Mitigate by validating on device;
  if too tall, collapse the sub-line or move the bar inline.
- **`Ring` extraction** touches two call sites — regression risk on the Today
  bad-habit ring. Extract first, verify parity, then restyle.
- **Badge inline colors** must be the documented runtime exception; do not attempt
  to interpolate hue into a Tailwind class.
