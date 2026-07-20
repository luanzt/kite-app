# Card Redesign (Onboarding Language) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the WelcomeScreen card language (type badge + prominent streak/pace stat + per-type visual) into the Trackers list (`TrackerCard`) and Today (`LogRow`), preserving all Today logging interactions.

**Architecture:** Presentation-only. Extract the duplicated local `Ring` into one shared component, add two new pure-ish presentational components (`TypeBadge`, `MiniBars`), then re-skin `TrackerCard` and the Today `LogRow` using existing computed progress data. No calculator/repository/query/i18n-logic changes.

**Tech Stack:** React Native CLI, HeroUI Native, Uniwind (Tailwind v4 via `className`), react-native-svg, lucide-react-native, TanStack Query, i18next. Jest for pure-logic tests only.

## Global Constraints

- **Text:** Use `<Typography>` from `heroui-native`, never `<Text>`.
- **Styling:** Tailwind `className` only; `style={{…}}` only for genuinely runtime-dynamic values (svg stroke/fill, per-type/personal hex colors, continuous bar heights/widths) — never interpolate a value into a class string.
- **Icons:** lucide-react-native only, sized via `size`/`color` props.
- **Colors:** chrome via `global.css` tokens (`bg-surface`, `text-ink`, `border-line`, `bg-pace-*`, `text-pace-*`); svg/lucide hex via `useThemeColors()`; per-type identity via `TYPE_COLOR`; personal identity via `colorHex(tracker.color)`/`hexA`. NEVER route identity colors through `useThemeColors`.
- **Type badge color = per-type identity** (`TYPE_COLOR`): habit `#8b5cf6`, target `#2e7d5b`, average `#0d9488`, project `#e0457a`. Badge label = `t('types.<type>')`.
- **Do NOT change** `calculateHabit/Target/Average/Project`, `habitStats`, repository, queries, or the Today logging handlers (`onQuickLog`, `onQuickAdd`, `onOpenMenu`, `onOpen`) and `renderControl()` behavior.
- **i18n:** no new keys expected (reuse `types.*`, `cadenceLabel`, `list.goalBy/goal/due`, `today.targetIs`, `today.limitPer*`, `today.clean*`, `unit.*`, `list.avgPer*`). If a string is genuinely missing, add it to BOTH `en.json` and `vi.json` key-for-key. User data is never translated.
- **Verify:** `yarn tsc` and `yarn lint` must be clean at the end of every task.

## File Structure

- **Create** `src/features/trackers/components/Ring.tsx` — shared progress ring.
- **Create** `src/features/trackers/components/TypeBadge.tsx` — per-type pill.
- **Create** `src/features/trackers/components/MiniBars.tsx` — average sparkline + pure `normalizeBars`.
- **Create** `src/features/trackers/components/__tests__/miniBars.test.ts` — unit tests for `normalizeBars`.
- **Modify** `src/features/trackers/components/AverageStatsRow.tsx` — consume shared `Ring`.
- **Modify** `src/screens/today/DailyGoalsScreen.tsx` — remove local `Ring`, consume shared; re-skin `LogRow`.
- **Modify** `src/features/trackers/components/TrackerCard.tsx` — re-skin.

---

### Task 1: Extract shared `Ring`

Two identical-in-spirit `Ring` components exist (`DailyGoalsScreen.tsx:95`, `AverageStatsRow.tsx:23`). Merge into one. The Today one defaults its track to `theme.line`; the Average one takes an explicit `trackColor` and a fixed size. The shared API supports both.

**Files:**
- Create: `src/features/trackers/components/Ring.tsx`
- Modify: `src/features/trackers/components/AverageStatsRow.tsx:1-64` (remove local `Ring`, import shared)
- Modify: `src/screens/today/DailyGoalsScreen.tsx:95-139` (remove local `Ring`, import shared)

**Interfaces:**
- Produces: `Ring({ fraction, color, size, strokeWidth, trackColor? }: { fraction: number; color: string; size: number; strokeWidth: number; trackColor?: string })` — arc starts at −90°, track defaults to `useThemeColors().line`.

- [ ] **Step 1: Create the shared component**

Create `src/features/trackers/components/Ring.tsx`:

```tsx
import Svg, { Circle } from 'react-native-svg'
import { useThemeColors } from '@hooks/useThemeColors'

/**
 * Thin progress ring (arc starts at −90°): a colored arc over a neutral track.
 * `trackColor` defaults to the theme's line color. Extracted from the twin
 * copies that lived in DailyGoalsScreen and AverageStatsRow.
 */
export function Ring({
  fraction,
  color,
  size,
  strokeWidth,
  trackColor
}: {
  fraction: number
  color: string
  size: number
  strokeWidth: number
  trackColor?: string
}) {
  const theme = useThemeColors()
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, fraction))
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      // runtime: SVG transform, no className equivalent
      style={{ transform: [{ rotate: '-90deg' }] }}
    >
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill='none'
        stroke={trackColor ?? theme.line}
        strokeWidth={strokeWidth}
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill='none'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
      />
    </Svg>
  )
}
```

- [ ] **Step 2: Update `AverageStatsRow.tsx` to use the shared Ring**

Remove the local `Ring` function (lines 23-64) and its now-unused imports (`Svg, { Circle }` stays only if used elsewhere in the file — check; `Rect, Defs, LinearGradient, Stop` are used by the gradient and stay). Add `import { Ring } from './Ring'`. At the call site, pass the fixed size/stroke explicitly:

```tsx
// was: <Ring fraction={...} color={...} trackColor={...} />
<Ring fraction={/* unchanged */} color={/* unchanged */} trackColor={/* unchanged */} size={104} strokeWidth={8} />
```

(Replace `RING_SIZE`/`RING_STROKE` usages at the call site with `104`/`8`, or keep those consts and pass `size={RING_SIZE} strokeWidth={RING_STROKE}`.)

- [ ] **Step 3: Update `DailyGoalsScreen.tsx` to use the shared Ring**

Remove the local `Ring` function (lines 95-139). Add `import { Ring } from '@features/trackers/components/Ring'`. The two existing call sites (bad-habit ring ~L481, good-habit ring ~L536) already pass `{ fraction, color, size, strokeWidth }` — leave them unchanged (they get the `theme.line` track by default, matching prior behavior). Confirm `Svg`/`Circle` imports in this file are still used elsewhere; if the local `Ring` was their only consumer, remove those imports too.

- [ ] **Step 4: Verify types, lint, and visual parity**

```bash
yarn tsc && yarn lint
```
Expected: clean. Then rebuild the app (`yarn ios`) and confirm the Today habit rings and the Average detail ring look identical to before (same size, colors, arc).

- [ ] **Step 5: Commit**

```bash
git add src/features/trackers/components/Ring.tsx src/features/trackers/components/AverageStatsRow.tsx src/screens/today/DailyGoalsScreen.tsx
git commit -m "refactor(trackers): extract shared Ring component"
```

---

### Task 2: `MiniBars` sparkline + pure normalizer

The `average` card visual. `periodSessions(tracker, entries, today)` already returns `{ bars: { count }[], scaleMax }`, so `MiniBars` just needs to normalize counts against `scaleMax` and draw fixed-width bars. The normalizer is pure and TDD'd; the view is device-verified.

**Files:**
- Create: `src/features/trackers/components/MiniBars.tsx`
- Test: `src/features/trackers/components/__tests__/miniBars.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `normalizeBars(values: number[], scaleMax: number): number[]` (each 0..1) and `MiniBars({ values, scaleMax, color, height? }: { values: number[]; scaleMax: number; color: string; height?: number })`.

- [ ] **Step 1: Write the failing test**

Create `src/features/trackers/components/__tests__/miniBars.test.ts`:

```ts
import { normalizeBars } from '../MiniBars'

describe('normalizeBars', () => {
  it('scales each value to a 0..1 fraction of scaleMax', () => {
    expect(normalizeBars([0, 2, 4], 4)).toEqual([0, 0.5, 1])
  })
  it('clamps values above scaleMax to 1', () => {
    expect(normalizeBars([8], 4)).toEqual([1])
  })
  it('returns all-zero heights when scaleMax is 0 (no divide-by-zero)', () => {
    expect(normalizeBars([0, 1], 0)).toEqual([0, 0])
  })
  it('handles an empty series', () => {
    expect(normalizeBars([], 5)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/features/trackers/components/__tests__/miniBars.test.ts`
Expected: FAIL — cannot find module `../MiniBars` / `normalizeBars is not a function`.

- [ ] **Step 3: Implement `MiniBars.tsx`**

Create `src/features/trackers/components/MiniBars.tsx`:

```tsx
import { View } from 'react-native'

/** Normalize each bar count to a 0..1 fraction of `scaleMax` (clamped). */
export function normalizeBars(values: number[], scaleMax: number): number[] {
  if (scaleMax <= 0) return values.map(() => 0)
  return values.map((v) => Math.max(0, Math.min(1, v / scaleMax)))
}

/**
 * Tiny cadence sparkline for the `average` card — a row of fixed-width bars
 * whose heights are counts normalized to `scaleMax` (from `periodSessions`).
 * `color` is the tracker's personal identity hex (never theme chrome), so it
 * must be an inline style — a computed hex can't live in a Tailwind class.
 */
export function MiniBars({
  values,
  scaleMax,
  color,
  height = 40
}: {
  values: number[]
  scaleMax: number
  color: string
  height?: number
}) {
  const fractions = normalizeBars(values, scaleMax)
  return (
    <View className='flex-row items-end gap-[3px]' style={{ height }}>
      {fractions.map((f, i) => (
        <View
          key={i}
          className='w-[7px] rounded-[3px]'
          // runtime: continuous height + personal identity color, no class equivalent
          style={{ height: Math.max(2, f * height), backgroundColor: color }}
        />
      ))}
    </View>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test src/features/trackers/components/__tests__/miniBars.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Verify types & lint**

```bash
yarn tsc && yarn lint
```
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/trackers/components/MiniBars.tsx src/features/trackers/components/__tests__/miniBars.test.ts
git commit -m "feat(trackers): add MiniBars sparkline for average cards"
```

---

### Task 3: `TypeBadge` pill

Small uppercase pill naming the tracker type, colored by `TYPE_COLOR`. Device-verified (repo does not unit-test presentational components).

**Files:**
- Create: `src/features/trackers/components/TypeBadge.tsx`

**Interfaces:**
- Consumes: `TYPE_COLOR`, `hexA` from `@features/trackers/icons`.
- Produces: `TypeBadge({ type }: { type: TrackerType })`.

- [ ] **Step 1: Implement `TypeBadge.tsx`**

Create `src/features/trackers/components/TypeBadge.tsx`:

```tsx
import { View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type { TrackerType } from '@features/trackers/types'
import { TYPE_COLOR, hexA } from '@features/trackers/icons'

/**
 * Uppercase type pill (HABIT / TARGET / AVERAGE / PROJECT). Colored by the
 * per-type identity palette (TYPE_COLOR) on a faint tint of the same hue — both
 * are computed hex, so they are the documented inline-style exception.
 */
export function TypeBadge({ type }: { type: TrackerType }) {
  const { t } = useTranslation()
  const hue = TYPE_COLOR[type]
  return (
    <View
      className='rounded-xs-k px-[7px] py-[2px]'
      // runtime: per-type identity tint, no class equivalent
      style={{ backgroundColor: hexA(hue, 0.13) }}
    >
      <Typography
        className='text-[10.5px] font-extrabold uppercase tracking-wide'
        // runtime: per-type identity color, no class equivalent
        style={{ color: hue }}
      >
        {t(`types.${type}`)}
      </Typography>
    </View>
  )
}
```

- [ ] **Step 2: Verify types & lint**

```bash
yarn tsc && yarn lint
```
Expected: clean. (`rounded-xs-k` = 6px radius from `global.css`; confirm it exists — it does.)

- [ ] **Step 3: Commit**

```bash
git add src/features/trackers/components/TypeBadge.tsx
git commit -m "feat(trackers): add TypeBadge pill"
```

---

### Task 4: Re-skin `TrackerCard` (Trackers list)

Rebuild the card body to the vertical onboarding layout. Reuse every existing computed value (`p`, `barPercent`, `barStatus`, `statValue`, `statLabel`, `habitN`, `habitGoal`, `isBadHabit`, `badOver`) — only the JSX changes, plus a per-type inline stat and sub-line, the habit ring / average MiniBars in the rail, and the target/project bar-with-value below.

**Files:**
- Modify: `src/features/trackers/components/TrackerCard.tsx` (imports + the `return (...)` at lines 178-240; add `subLine`/`inlineStat` derivation near the existing stat derivation)

**Interfaces:**
- Consumes: `Ring` (Task 1), `MiniBars` (Task 2), `TypeBadge` (Task 3); existing `PaceBar`, `progressFill`, `TYPE_COLOR`, `colorHex`, `hexA`, `iconEmoji`, `Icons`, `cadenceLabel`, `periodSessions`, `useThemeColors`.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Add imports**

At the top of `TrackerCard.tsx`, add:

```tsx
import { useThemeColors } from '@hooks/useThemeColors'
import { colorHex, TYPE_COLOR, progressFill, paceLabelKey } from '@features/trackers/icons'
import { cadenceLabel } from '@features/trackers/habitLabels'
import { periodSessions } from '@features/trackers/calculators/habitStats'
import { Ring } from './Ring'
import { MiniBars } from './MiniBars'
import { TypeBadge } from './TypeBadge'
```

(Extend the existing `@features/trackers/icons` import rather than duplicating it. `PACE_DOT_CLASS` is no longer used — remove it from the import.)

- [ ] **Step 2: Derive the sub-line and inline stat**

Inside the component, after the existing `statValue`/`statLabel` block (before `habitSub`), add `const c = useThemeColors()` near the top of the component body and compute:

```tsx
// Sub-line under the name: cadence for habits, limit for bad habits, goal/target
// for the rest. Decreasing target gets a ↓ prefix so its shrinking number reads.
const isDecreasingTarget =
  tracker.type === 'target' &&
  tracker.startValue != null &&
  tracker.startValue > (tracker.targetValue ?? 0)
let subLine: string
if (tracker.type === 'habit') {
  subLine = cadenceLabel(tracker, t)
} else if (tracker.type === 'average') {
  subLine = t('today.targetIs', {
    value: fmtCompact(tracker.targetValue ?? 0)
  })
} else {
  // target / project → the goal line, reusing the right-rail statLabel
  subLine = isDecreasingTarget ? `↓ ${statLabel}` : statLabel
}
```

- [ ] **Step 3: Replace the `return (...)` JSX**

Replace lines 178-240 with:

```tsx
  return (
    <Pressable onPress={onPress} className='active:opacity-90'>
      <View className='gap-s3 rounded-lg-k border border-line bg-surface p-s4 shadow-sm'>
        {/* top row: tile · (badge + inline stat / name / sub-line) · rail */}
        <View className='flex-row items-start gap-s3'>
          <View
            className='h-[46px] w-[46px] items-center justify-center rounded-md-k'
            // runtime: tint blended from the user-chosen tracker.color
            style={{ backgroundColor: hexA(tracker.color, 0.14) }}
          >
            <Typography className='text-[22px]'>
              {iconEmoji(tracker.icon)}
            </Typography>
          </View>

          <View className='min-w-0 flex-1'>
            <View className='flex-row items-center gap-s2'>
              <TypeBadge type={tracker.type} />
              {tracker.type === 'habit' ? (
                <View className='flex-row items-center gap-s1'>
                  <Icons.Flame
                    size={13}
                    color={(p.streak ?? 0) > 0 ? c.pace.on_track : c.pace.none}
                  />
                  <Typography
                    className={`text-sm font-semibold ${
                      (p.streak ?? 0) > 0 ? 'text-pace-on' : 'text-ink-3'
                    }`}
                  >
                    {`${p.streak ?? 0} ${t(UNIT_NOUN_KEY[periodUnitOf(tracker)], {
                      count: p.streak ?? 0
                    })}`}
                  </Typography>
                </View>
              ) : tracker.type === 'average' ? (
                <Typography className='text-sm font-semibold text-ink-3'>
                  {`${statValue} · ${statLabel}`}
                </Typography>
              ) : (
                // target / project → pace chip
                <Typography
                  className={`text-sm font-bold ${PACE_TEXT_CLASS[p.paceStatus]}`}
                >
                  {`${Math.round(p.percent * 100)}% · ${t(paceLabelKey(p.paceStatus))}`}
                </Typography>
              )}
            </View>

            <Typography
              numberOfLines={1}
              className='mt-[5px] text-lg font-bold text-ink'
            >
              {tracker.name}
            </Typography>
            <Typography numberOfLines={1} className='mt-[1px] text-sm text-ink-3'>
              {subLine}
            </Typography>
          </View>

          {/* rail: habit ring, average sparkline, else nothing */}
          {tracker.type === 'habit' ? (
            <View className='items-center justify-center'>
              <Ring
                fraction={barPercent}
                color={
                  isBadHabit
                    ? c.pace.behind
                    : progressFill(barStatus, c.pace, c.brand)
                }
                size={46}
                strokeWidth={4.5}
              />
              <View className='absolute inset-0 items-center justify-center'>
                <Typography
                  className={`text-xs font-extrabold ${
                    badOver ? 'text-pace-behind' : 'text-ink'
                  }`}
                >
                  {isBadHabit ? (
                    <>
                      {`${habitN}`}
                      <Typography className='text-xs font-extrabold text-pace-behind'>
                        {`/${habitGoal}`}
                      </Typography>
                    </>
                  ) : (
                    `${habitN}/${habitGoal}`
                  )}
                </Typography>
              </View>
            </View>
          ) : tracker.type === 'average' ? (
            <MiniBars
              values={periodSessions(tracker, entries, today).bars.map(
                (b) => b.count
              )}
              scaleMax={periodSessions(tracker, entries, today).scaleMax}
              color={colorHex(tracker.color)}
            />
          ) : null}
        </View>

        {/* below: target / project gradient bar with the current value */}
        {tracker.type === 'target' || tracker.type === 'project' ? (
          <View className='flex-row items-center gap-s2'>
            <View className='flex-1'>
              <PaceBar percent={barPercent} paceStatus={barStatus} height={8} />
            </View>
            <Typography className='text-sm font-extrabold text-ink'>
              {statValue}
            </Typography>
          </View>
        ) : null}
      </View>
    </Pressable>
  )
```

- [ ] **Step 4: Add the pace-text-class lookup used above**

The pace WORD comes from the existing exported `paceLabelKey(status)` in `icons.ts` (maps `on_track→detail.onTrack`, `behind→detail.behind`, `ahead→detail.ahead`, `none→detail.none`) — all four keys already exist in both locale files, so no i18n change. Only the CSS-class lookup is local. Near the existing `HABIT_WINDOW_LABEL`/`UNIT_NOUN_KEY` module constants, add:

```tsx
import type { PaceStatus } from '@features/trackers/types'

const PACE_TEXT_CLASS: Record<PaceStatus, string> = {
  on_track: 'text-pace-on',
  behind: 'text-pace-behind',
  ahead: 'text-pace-ahead',
  none: 'text-pace-none'
}
```

- [ ] **Step 5: Verify & device-check**

```bash
yarn tsc && yarn lint && yarn test
```
Expected: clean; all existing tests pass. Rebuild (`yarn ios`) and verify on the Trackers list: habit (good) ring + streak, habit (bad) red `/limit` ring, target ahead (green bar + value), a decreasing target (`↓` sub-line, bar fills toward goal), average (MiniBars) — in light AND dark.

- [ ] **Step 6: Commit**

```bash
git add src/features/trackers/components/TrackerCard.tsx src/i18n/locales/en.json src/i18n/locales/vi.json
git commit -m "feat(trackers): redesign TrackerCard with type badge and per-type visuals"
```

---

### Task 5: Re-skin the Today `LogRow`

Re-skin the `LogRow` shell in `DailyGoalsScreen.tsx` to match the card language, **preserving `renderControl()` and every handler verbatim**. Move the streak into a top-row inline stat next to a `TypeBadge`; replace the grey-dot/limit/subText cluster with a single sub-line; add the target/project bar (and, if it renders acceptably on device, the average MiniBars) below the row. The right rail stays exactly `renderControl()`.

**Files:**
- Modify: `src/screens/today/DailyGoalsScreen.tsx` — `LogRow` component (imports for the file; the `return (...)` at lines 593-668). Keep `renderControl` (lines 447-591) and all derivations (`streak`, `streakText`, `streakNegative`, `subText`, `progress`, `isBad`) unchanged.

**Interfaces:**
- Consumes: `TypeBadge` (Task 3), `MiniBars` (Task 2), existing `PaceBar` (import if not present), `TYPE_COLOR`/`colorHex`, `periodSessions`, `cadenceLabel`.
- Produces: nothing downstream.

- [ ] **Step 1: Add imports to `DailyGoalsScreen.tsx`**

Ensure these are imported (add any missing):

```tsx
import { TypeBadge } from '@features/trackers/components/TypeBadge'
import { MiniBars } from '@features/trackers/components/MiniBars'
import { PaceBar } from '@features/trackers/components/PaceBar'
import { cadenceLabel } from '@features/trackers/habitLabels'
// periodSessions is already imported from calculators/habitStats; colorHex from icons
```

- [ ] **Step 2: Add sub-line + bar derivation inside `LogRow`**

After the existing `subText` block (ends ~line 445), add:

```tsx
// One sub-line for the new layout: cadence for good habits, the limit for bad
// habits, the goal/target line (subText) otherwise. Decreasing target gets ↓.
const isDecreasingTarget =
  tracker.type === 'target' &&
  tracker.startValue != null &&
  tracker.startValue > (tracker.targetValue ?? 0)
const subLine =
  tracker.type === 'habit'
    ? isBad
      ? t(LIMIT_KEY[tracker.period ?? 'daily'], {
          value: fmtCompact(tracker.targetValue ?? 0)
        })
      : cadenceLabel(tracker, t)
    : isDecreasingTarget
    ? `↓ ${subText}`
    : subText
// Progress bar (target/project) shown below the row, mirroring the Trackers card.
const showBar = tracker.type === 'target' || tracker.type === 'project'
const barPercent = progress?.percent ?? 0
const barStatus: PaceStatus = progress?.paceStatus ?? 'none'
```

- [ ] **Step 3: Replace the `LogRow` `return (...)` (lines 593-668)**

```tsx
  return (
    <Pressable
      onPress={() => onOpen(tracker.id)}
      onLongPress={
        tracker.type === 'habit' ? () => onOpenMenu(tracker) : undefined
      }
      className='gap-s2 border-t border-line px-s4 py-s3'
    >
      <View className='flex-row items-center gap-s3'>
        <View
          className='h-[48px] w-[48px] items-center justify-center rounded-full'
          // runtime: tint from user-chosen tracker.color
          style={{ backgroundColor: hexA(tracker.color, 0.14) }}
        >
          <Typography className='text-[22px]'>
            {iconEmoji(tracker.icon)}
          </Typography>
        </View>

        <View className='min-w-0 flex-1'>
          <View className='flex-row items-center gap-s2'>
            <TypeBadge type={tracker.type} />
            {row.status === 'missed' && !isBad ? (
              <Typography className='text-sm text-ink-2'>
                {t('today.missedEncourage')}
              </Typography>
            ) : streak && streak.kind !== 'none' && streakText ? (
              <View className='flex-row items-center gap-s1'>
                {streakNegative ? (
                  <Icons.Warn size={13} color={AMBER} />
                ) : isBad && streak.kind === 'greatStart' ? (
                  <Icons.Check size={13} color={c.pace.on_track} />
                ) : (
                  <Icons.Flame size={13} color={c.pace.on_track} />
                )}
                <Typography
                  className={`text-sm font-semibold ${
                    streakNegative ? 'text-ink-2' : 'text-pace-on'
                  }`}
                >
                  {streakText}
                </Typography>
              </View>
            ) : null}
          </View>

          <Typography
            numberOfLines={1}
            className='mt-[3px] text-[17px] font-bold text-ink'
          >
            {tracker.name}
          </Typography>
          <Typography numberOfLines={1} className='mt-[1px] text-sm text-ink-3'>
            {subLine}
          </Typography>
        </View>

        {renderControl()}
      </View>

      {showBar ? (
        <View className='flex-row items-center gap-s2 pl-[60px]'>
          <View className='flex-1'>
            <PaceBar percent={barPercent} paceStatus={barStatus} height={7} />
          </View>
        </View>
      ) : null}
    </Pressable>
  )
```

Note: `renderControl()` already renders the target/average value + pace on the right, so the below-bar for target/project is additive context (no current-value duplication needed on Today — the rail shows it). Average keeps its rail value; do NOT add MiniBars on Today in this step (defer to Step 5's device check).

- [ ] **Step 4: Verify types, lint, tests**

```bash
yarn tsc && yarn lint && yarn test
```
Expected: clean; all pass.

- [ ] **Step 5: Device check — interactions MUST still work**

Rebuild (`yarn ios`). On Today verify, in light AND dark:
- Good once-a-day habit: tap check toggles done; long-press opens menu.
- Multi-count / weekly habit: ring tap does one-tap +1 until goal, then opens menu; long-press opens menu.
- Bad habit: ring red, tap under limit opens log sheet, at/over opens menu; long-press opens menu.
- Target/average: tapping the row opens detail; tapping the rail value opens the log sheet; bar shows below for target.
- Row height acceptable. If too tall, drop the sub-line for habits (cadence is also implied by the badge) — make that trim here and re-verify.

- [ ] **Step 6: Commit**

```bash
git add src/screens/today/DailyGoalsScreen.tsx
git commit -m "feat(today): redesign LogRow with type badge and per-type bar"
```

---

### Task 6: Final pass — remove dead code, full verification

**Files:**
- Modify: any file with now-unused imports/constants (`PACE_DOT_CLASS` in `TrackerCard`, `colorHex` grey-dot usage removed from `LogRow`, `LIMIT_KEY`/`WINDOW_KEY` still used by `renderControl` — keep).

- [ ] **Step 1: Grep for dead references**

```bash
yarn lint
```
Expected: no `no-unused-vars`. Remove anything flagged (e.g. `PACE_DOT_CLASS` import if unused, the old grey-dot `colorHex` call site is gone).

- [ ] **Step 2: Full suite**

```bash
yarn tsc && yarn lint && yarn test
```
Expected: all clean/green.

- [ ] **Step 3: Final device sweep**

Rebuild; walk Trackers + Today with all four types (create a project + average + bad habit + decreasing target if not present), light and dark. Confirm parity with the approved mockup.

- [ ] **Step 4: Commit (if anything changed)**

```bash
git add -A
git commit -m "chore(trackers): remove dead card styling after redesign"
```

---

## Self-Review

**Spec coverage:**
- Type badge per-type color → Task 3 + Tasks 4/5 usage. ✓
- Sub-line = cadence/context → Tasks 4 (Step 2) & 5 (Step 2). ✓
- Colored streak/pace inline stat → Tasks 4 (Step 3) & 5 (Step 3). ✓
- Per-type visual (habit ring / target bar / average MiniBars) → Ring (Task 1), MiniBars (Task 2), used in Tasks 4/5. ✓
- Current value at end of target bar → Task 4 (Step 3). Today shows value in the rail already (noted Task 5 Step 3). ✓
- Bad habit (red `/limit`, over→full red) → Task 4 (Step 3) ring block; Today unchanged via `renderControl`. ✓
- Decreasing target (`↓` sub-line, bar toward goal) → Tasks 4/5 `isDecreasingTarget`. ✓
- Remove grey pace dot → Task 4 replaces the dot cluster; Task 5 removes the LogRow grey dot. ✓
- Extract Ring → Task 1. ✓
- Preserve Today interactions → Task 5 keeps `renderControl` + handlers, Step 5 verifies. ✓
- Theming (tokens + useThemeColors + identity colors) → Global Constraints + per-task inline-style notes. ✓
- i18n both files → Global Constraints; verified no new keys needed (badge reuses `types.*`, pace word reuses existing `paceLabelKey`→`detail.*` which all exist). ✓

**Placeholder scan:** No TBD/TODO. The only conditional is Task 4 Step 4 (verify `detail.*` keys / reuse the existing `paceStatusKey` helper) and Task 5 Step 5 (device-driven trim) — both give an explicit fallback action, not a blank.

**Type consistency:** `Ring` props identical across Tasks 1/4/5. `normalizeBars`/`MiniBars` signatures match between Task 2 and Task 4 usage. `PaceStatus`, `barPercent`, `barStatus` names consistent across Tasks 4/5. `periodSessions(...).bars`/`.scaleMax` match the verified type in `habitStats.ts`.
