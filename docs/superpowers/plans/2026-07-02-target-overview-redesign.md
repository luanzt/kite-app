# Target Overview Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Target detail Overview tab to match the "Save Money Detail" mockup — a blue gradient hero (progress ring + daily-goal/projected stats), a progress-bar card with a pace marker, and an actual/ideal/projected trajectory line chart.

**Architecture:** A new pure, unit-tested helper (`targetTrajectory.ts`) computes all domain-level series (cumulative actual, ideal endpoints, projection, daily goal). Three new presentational components (`TargetHero`, `TargetProgressBar`, `TargetTrajectoryChart`) consume that helper plus the existing `calculateTarget`/`pacePercent`, doing only view/SVG-geometry work. `TargetOverviewTab` composes the three in its existing `ScrollView`.

**Tech Stack:** React Native CLI, TypeScript (strict), HeroUI Native (`Typography`), Uniwind Tailwind v4 (`className`), `react-native-svg`, i18next, Jest.

## Global Constraints

- **Text:** `Typography` from `heroui-native` only — never `<Text>`.
- **Styling:** Tailwind `className` only. Inline `style` is allowed ONLY for genuinely continuous runtime values (progress-bar fill width, pace-marker left offset, SVG geometry) — add a one-line why-comment. Never interpolate a value into a class string.
- **Icons:** `lucide-react-native` only (via the existing `Icons` map); small inline SVG shapes (triangle/tick) are fine.
- **Overlays:** none needed here.
- **i18n:** every visible string via `t('…')`; add keys to BOTH `src/i18n/locales/en.json` and `vi.json`, key-for-key. Never translate user-entered data (tracker name, unit).
- **No new native deps** — `react-native-svg` is already installed.
- **`Tracker` objects** are built only via `buildTracker()` — but this plan constructs none; tests build plain typed literals for calculator input, which is the existing test convention.
- `yarn tsc` and `yarn lint` must be clean before the final commit.

**Reference values (verbatim from the codebase):**
- Hero gradient stops: `#3d7dd8` → `#2f63b3` (from `AchievementHero`).
- Ring geometry (from `AchievementHero`): `RING_SIZE = 128`, `RING_STROKE = 12`, `RING_R = (RING_SIZE - RING_STROKE) / 2`, `RING_C = 2 * Math.PI * RING_R`.
- `PACE_COLOR = { on_track:'#1f9d57', behind:'#e0564e', ahead:'#2456b5', none:'#a3a8a0' }` (import from `@features/trackers/icons`).
- `calculateTarget(tracker, entries, todayISO)` returns `{ current, goal, percent (0..1), paceStatus, expected (number|null) }`.
- `pacePercent(tracker)` → 0..100 or null; `daysLeft(tracker)` → number or null; `fmtVal`/`fmtValCompact`/`fmtCompact`/`fmtNum` from `@features/trackers/detailFormat`.
- `daysBetween(fromISO, toISO)` and `toISODate(date)` from `@utils/date`.
- Existing reusable i18n `detail` keys: `ahead` ("Ahead of pace"), `behind` ("Behind"), `onTrack` ("On track"), `none` ("No deadline"), `target` ("Target"), `days` ("days").

---

### Task 1: `buildTargetTrajectory` pure helper

**Files:**
- Create: `src/features/trackers/calculators/targetTrajectory.ts`
- Test: `src/features/trackers/calculators/__tests__/targetTrajectory.test.ts`
- Modify: `src/features/trackers/calculators/index.ts` (barrel export)

**Interfaces:**
- Consumes: `Tracker`, `Entry` from `@features/trackers/types`; `daysBetween` from `@utils/date`.
- Produces:
  ```ts
  export type TrajectoryPoint = { date: string; value: number }
  export type TargetTrajectory = {
    series: TrajectoryPoint[]
    idealLine: { start: TrajectoryPoint; end: TrajectoryPoint } | null
    projected: TrajectoryPoint | null
    dailyGoal: number
  }
  export function buildTargetTrajectory(
    tracker: Tracker,
    entries: Entry[],
    todayISO: string
  ): TargetTrajectory
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/features/trackers/calculators/__tests__/targetTrajectory.test.ts`:

```ts
import { buildTargetTrajectory } from '../targetTrajectory'
import type { Tracker, Entry } from '@features/trackers/types'

// A savings target: 0 → 200000 over 2026-06-01..2026-08-01 (61 days).
function baseTracker(overrides: Partial<Tracker> = {}): Tracker {
  return {
    id: 't1',
    name: 'Save Money',
    type: 'target',
    icon: 'wallet',
    color: 'blue',
    unit: '$',
    direction: 'good',
    targetValue: 200000,
    startValue: 0,
    accumulation: 'sum',
    startDate: '2026-06-01',
    deadline: '2026-08-01',
    period: 'daily',
    repeatDays: [],
    routine: 'any',
    reminderTime: null,
    goalNote: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    archived: false,
    ...overrides
  }
}

function entry(date: string, value: number): Entry {
  return {
    id: `${date}-${value}`,
    trackerId: 't1',
    date,
    value,
    note: null,
    createdAt: `${date}T00:00:00.000Z`
  }
}

describe('buildTargetTrajectory', () => {
  it('sum accumulation: series is the running cumulative total by date', () => {
    const t = baseTracker()
    const entries = [
      entry('2026-06-02', 3000),
      entry('2026-06-10', 12000),
      entry('2026-06-20', 5000)
    ]
    const r = buildTargetTrajectory(t, entries, '2026-06-21')
    expect(r.series).toEqual([
      { date: '2026-06-02', value: 3000 },
      { date: '2026-06-10', value: 15000 },
      { date: '2026-06-20', value: 20000 }
    ])
  })

  it('sorts entries ascending before accumulating', () => {
    const t = baseTracker()
    const entries = [entry('2026-06-20', 5000), entry('2026-06-02', 3000)]
    const r = buildTargetTrajectory(t, entries, '2026-06-21')
    expect(r.series.map((p) => p.value)).toEqual([3000, 8000])
  })

  it('latest accumulation: series is each entry value as-is (no running sum)', () => {
    const t = baseTracker({ accumulation: 'latest', startValue: 0 })
    const entries = [entry('2026-06-02', 30), entry('2026-06-20', 70)]
    const r = buildTargetTrajectory(t, entries, '2026-06-21')
    expect(r.series).toEqual([
      { date: '2026-06-02', value: 30 },
      { date: '2026-06-20', value: 70 }
    ])
  })

  it('idealLine spans startValue@startDate → targetValue@deadline', () => {
    const t = baseTracker()
    const r = buildTargetTrajectory(t, [], '2026-06-15')
    expect(r.idealLine).toEqual({
      start: { date: '2026-06-01', value: 0 },
      end: { date: '2026-08-01', value: 200000 }
    })
  })

  it('idealLine is null with no deadline', () => {
    const t = baseTracker({ deadline: null })
    const r = buildTargetTrajectory(t, [], '2026-06-15')
    expect(r.idealLine).toBeNull()
  })

  it('projected: extrapolates current rate to the goal date', () => {
    // 20 days elapsed (06-01..06-21), current 100000 → rate 5000/day.
    // remaining 100000 → 20 more days → 2026-07-11.
    const t = baseTracker()
    const entries = [entry('2026-06-21', 100000)]
    const r = buildTargetTrajectory(t, entries, '2026-06-21')
    expect(r.projected).toEqual({ value: 200000, date: '2026-07-11' })
  })

  it('projected is null with no deadline', () => {
    const t = baseTracker({ deadline: null })
    const r = buildTargetTrajectory(t, [entry('2026-06-21', 100000)], '2026-06-21')
    expect(r.projected).toBeNull()
  })

  it('projected is null when no progress yet (rate 0)', () => {
    const t = baseTracker()
    const r = buildTargetTrajectory(t, [], '2026-06-21')
    expect(r.projected).toBeNull()
  })

  it('projected is null when already at/over goal', () => {
    const t = baseTracker()
    const r = buildTargetTrajectory(t, [entry('2026-06-21', 200000)], '2026-06-21')
    expect(r.projected).toBeNull()
  })

  it('dailyGoal = remaining / daysLeft', () => {
    // current 100000, remaining 100000; today 2026-07-02 → deadline 08-01 = 30 days.
    const t = baseTracker()
    const r = buildTargetTrajectory(t, [entry('2026-07-01', 100000)], '2026-07-02')
    expect(r.dailyGoal).toBeCloseTo(100000 / 30, 5)
  })

  it('dailyGoal is 0 with no deadline', () => {
    const t = baseTracker({ deadline: null })
    const r = buildTargetTrajectory(t, [entry('2026-07-01', 100000)], '2026-07-02')
    expect(r.dailyGoal).toBe(0)
  })

  it('dailyGoal is 0 when already complete', () => {
    const t = baseTracker()
    const r = buildTargetTrajectory(t, [entry('2026-07-01', 200000)], '2026-07-02')
    expect(r.dailyGoal).toBe(0)
  })

  it('dailyGoal is 0 past the deadline', () => {
    const t = baseTracker()
    const r = buildTargetTrajectory(t, [entry('2026-07-01', 100000)], '2026-08-05')
    expect(r.dailyGoal).toBe(0)
  })

  it('no entries → empty series, current equals startValue', () => {
    const t = baseTracker({ startValue: 500 })
    const r = buildTargetTrajectory(t, [], '2026-06-15')
    expect(r.series).toEqual([])
  })

  it('decreasing goal (weight loss) still projects toward the lower goal', () => {
    // start 90, goal 80, over 100 days. Lost 5 in 20 days → rate 0.25/day.
    // remaining 5 → 20 more days.
    const t = baseTracker({
      startValue: 90,
      targetValue: 80,
      unit: 'kg',
      startDate: '2026-06-01',
      deadline: '2026-09-09'
    })
    const r = buildTargetTrajectory(t, [entry('2026-06-21', 85)], '2026-06-21')
    expect(r.projected?.date).toBe('2026-07-11')
    expect(r.projected?.value).toBe(80)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test src/features/trackers/calculators/__tests__/targetTrajectory.test.ts`
Expected: FAIL — "Cannot find module '../targetTrajectory'".

- [ ] **Step 3: Write the implementation**

Create `src/features/trackers/calculators/targetTrajectory.ts`:

```ts
import type { Tracker, Entry } from '@features/trackers/types'
import { daysBetween } from '@utils/date'

export type TrajectoryPoint = { date: string; value: number }

export type TargetTrajectory = {
  /** Cumulative actual value by entry date, ascending. */
  series: TrajectoryPoint[]
  /** startValue@startDate → targetValue@deadline; null when no deadline. */
  idealLine: { start: TrajectoryPoint; end: TrajectoryPoint } | null
  /** Linear extrapolation of the current rate to the goal; null when N/A. */
  projected: TrajectoryPoint | null
  /** (goal − current) / daysLeft; 0 when no deadline / done / past deadline. */
  dailyGoal: number
}

/** ISO date `days` after `fromISO` (UTC-safe, matches daysBetween's epoch math). */
function isoAddDays(fromISO: string, days: number): string {
  const base = Date.parse(`${fromISO.slice(0, 10)}T00:00:00Z`)
  return new Date(base + days * 86_400_000).toISOString().slice(0, 10)
}

/**
 * buildTargetTrajectory — pure domain-level series for the Target Overview
 * charts. Mirrors calculateTarget's accumulation rule so the drawn "actual"
 * matches the reported current. Returns raw values (no SVG coords); the chart
 * component maps these to the drawing viewport.
 */
export function buildTargetTrajectory(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string
): TargetTrajectory {
  const start = tracker.startValue ?? 0
  const goal = tracker.targetValue ?? 0
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  // series — same accumulation semantics as calculateTarget.
  let series: TrajectoryPoint[]
  if (tracker.accumulation === 'latest') {
    series = sorted.map((e) => ({ date: e.date, value: e.value }))
  } else {
    let running = start
    series = sorted.map((e) => {
      running += e.value
      return { date: e.date, value: running }
    })
  }

  const current = series.length ? series[series.length - 1].value : start

  // idealLine
  const idealLine = tracker.deadline
    ? {
        start: { date: tracker.startDate, value: start },
        end: { date: tracker.deadline, value: goal }
      }
    : null

  // projected — extrapolate current rate to the goal.
  let projected: TargetTrajectory['projected'] = null
  if (tracker.deadline) {
    const elapsed = daysBetween(tracker.startDate, todayISO)
    const made = current - start
    const span = goal - start
    const alreadyDone = span === 0 ? true : made / span >= 1
    if (elapsed > 0 && made !== 0 && !alreadyDone) {
      const ratePerDay = made / elapsed // signed: negative for decreasing goals
      const remaining = goal - current
      const daysToGoal = remaining / ratePerDay // same sign → positive
      if (Number.isFinite(daysToGoal) && daysToGoal > 0) {
        projected = {
          value: goal,
          date: isoAddDays(todayISO, Math.round(daysToGoal))
        }
      }
    }
  }

  // dailyGoal
  let dailyGoal = 0
  if (tracker.deadline) {
    const left = Math.max(0, daysBetween(todayISO, tracker.deadline))
    const remaining = goal - current
    const span = goal - start
    const done = span === 0 ? true : (current - start) / span >= 1
    if (left > 0 && !done) dailyGoal = Math.abs(remaining) / left
  }

  return { series, idealLine, projected, dailyGoal }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test src/features/trackers/calculators/__tests__/targetTrajectory.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Add barrel export**

In `src/features/trackers/calculators/index.ts`, add alongside the other exports:

```ts
export { buildTargetTrajectory } from './targetTrajectory'
export type { TargetTrajectory, TrajectoryPoint } from './targetTrajectory'
```

(Verify the file's existing export style first and match it — if it re-exports calculators individually, append these lines; if it uses `export *`, add `export * from './targetTrajectory'` instead.)

- [ ] **Step 6: Typecheck + commit**

Run: `yarn tsc`
Expected: no errors.

```bash
git add src/features/trackers/calculators/targetTrajectory.ts \
  src/features/trackers/calculators/__tests__/targetTrajectory.test.ts \
  src/features/trackers/calculators/index.ts
git commit -m "feat(trackers): add buildTargetTrajectory pure helper + tests

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: i18n keys

**Files:**
- Modify: `src/i18n/locales/en.json` (under `detail`)
- Modify: `src/i18n/locales/vi.json` (under `detail`)

**Interfaces:**
- Produces: `t('detail.dailyGoal')`, `t('detail.projected')`, `t('detail.toGo')`, `t('detail.paceMarker')`, `t('detail.left')`, `t('detail.pace')`, `t('detail.chartActual')`, `t('detail.chartProjected')`, `t('detail.chartIdeal')`, `t('detail.perDay')`.

- [ ] **Step 1: Add keys to `en.json`**

Inside the `"detail": { … }` object, add:

```json
"dailyGoal": "Daily goal",
"projected": "Projected",
"toGo": "to go",
"paceMarker": "Pace marker",
"left": "left",
"pace": "Pace",
"perDay": "/ day",
"chartActual": "Actual",
"chartProjected": "Projected",
"chartIdeal": "Ideal"
```

- [ ] **Step 2: Add the same keys to `vi.json`**

Inside its `"detail": { … }` object, add (Vietnamese):

```json
"dailyGoal": "Mục tiêu mỗi ngày",
"projected": "Dự phóng",
"toGo": "còn lại",
"paceMarker": "Vạch nhịp độ",
"left": "còn",
"pace": "Nhịp độ",
"perDay": "/ ngày",
"chartActual": "Thực tế",
"chartProjected": "Dự phóng",
"chartIdeal": "Lý tưởng"
```

- [ ] **Step 3: Verify both files parse and are key-for-key in sync**

Run:
```bash
node -e "const a=Object.keys(require('./src/i18n/locales/en.json').detail).sort();const b=Object.keys(require('./src/i18n/locales/vi.json').detail).sort();const miss=a.filter(k=>!b.includes(k)).concat(b.filter(k=>!a.includes(k)));console.log(miss.length?('OUT OF SYNC: '+miss):'detail keys in sync')"
```
Expected: `detail keys in sync`.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/vi.json
git commit -m "i18n(detail): add target overview redesign strings

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `TargetHero` component (blue gradient card)

**Files:**
- Create: `src/features/trackers/components/TargetHero.tsx`

**Interfaces:**
- Consumes: `calculateTarget` (`@features/trackers/calculators/target`), `buildTargetTrajectory` + `TargetTrajectory` (Task 1), `fmtValCompact`/`daysLeft` (`@features/trackers/detailFormat`), `toISODate` (`@utils/date`), `PACE_COLOR` is not needed (gradient is fixed white-on-blue).
- Produces:
  ```ts
  export function TargetHero({ tracker, entries }: { tracker: Tracker; entries: Entry[] }): JSX.Element
  ```

- [ ] **Step 1: Write the component**

Create `src/features/trackers/components/TargetHero.tsx`:

```tsx
import { View, StyleSheet } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import Svg, { Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg'
import type { Tracker, Entry } from '@features/trackers/types'
import { calculateTarget } from '@features/trackers/calculators/target'
import { buildTargetTrajectory } from '@features/trackers/calculators'
import { fmtValCompact, daysLeft } from '@features/trackers/detailFormat'
import { toISODate } from '@utils/date'

const RING_SIZE = 128
const RING_STROKE = 12
const RING_R = (RING_SIZE - RING_STROKE) / 2
const RING_C = 2 * Math.PI * RING_R

// react-native-svg gradient fill for the card, clipped by overflow-hidden.
const styles = StyleSheet.create({
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }
})

/** Localized short date "11 Jul" for the projected caption. */
function shortDate(iso: string, lang: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(lang, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC'
  })
}

/**
 * TargetHero — the Target Overview header. A brand gradient card (matching
 * AchievementHero) with a white progress ring on the left, a pace pill on top,
 * and a daily-goal / projected stat stack on the right.
 */
export function TargetHero({
  tracker,
  entries
}: {
  tracker: Tracker
  entries: Entry[]
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const today = toISODate(new Date())
  const p = calculateTarget(tracker, entries, today)
  const traj = buildTargetTrajectory(tracker, entries, today)
  const frac = Math.max(0, Math.min(1, p.percent))
  const remain = daysLeft(tracker)
  const toGo = Math.max(0, p.goal - p.current)

  const hasPace = p.paceStatus !== 'none'
  const aheadAmount =
    p.expected != null ? Math.abs(p.current - p.expected) : null
  const paceDirKey =
    p.paceStatus === 'behind'
      ? 'behind'
      : p.paceStatus === 'ahead'
      ? 'ahead'
      : 'onTrack'

  return (
    <View className='m-s5 overflow-hidden rounded-xl-k'>
      <Svg style={styles.gradient} width='100%' height='100%'>
        <Defs>
          <LinearGradient id='kite-target-hero' x1='0' y1='0' x2='1' y2='1'>
            <Stop offset='0' stopColor='#3d7dd8' />
            <Stop offset='1' stopColor='#2f63b3' />
          </LinearGradient>
        </Defs>
        <Rect x='0' y='0' width='100%' height='100%' fill='url(#kite-target-hero)' />
      </Svg>

      <View className='p-s5'>
        {/* pace pill */}
        {hasPace && aheadAmount != null ? (
          <View className='mb-s4 flex-row justify-center'>
            <View className='flex-row items-center gap-s2 rounded-full bg-on-accent/20 px-s3 py-s1'>
              <Typography className='text-xs font-bold text-on-accent'>
                {`${fmtValCompact(tracker, aheadAmount)} ${t(
                  `detail.${paceDirKey}`
                ).toLowerCase()} · ${t('detail.pace')} ${fmtValCompact(
                  tracker,
                  p.expected ?? 0
                )}`}
              </Typography>
            </View>
          </View>
        ) : null}

        <View className='flex-row items-center gap-s5'>
          {/* ring */}
          <View className='h-[128px] w-[128px] items-center justify-center'>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_R}
                stroke='rgba(255,255,255,0.22)'
                strokeWidth={RING_STROKE}
                fill='none'
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_R}
                stroke='#ffffff'
                strokeWidth={RING_STROKE}
                strokeLinecap='round'
                fill='none'
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - frac)}
                rotation={-90}
                originX={RING_SIZE / 2}
                originY={RING_SIZE / 2}
              />
            </Svg>
            <View className='absolute inset-0 items-center justify-center'>
              <Typography className='text-title-k font-bold text-on-accent'>
                {fmtValCompact(tracker, p.current)}
              </Typography>
              <Typography className='mt-s1 text-xs font-bold text-on-accent opacity-70'>
                {`${fmtValCompact(tracker, toGo)} ${t('detail.toGo')}`}
              </Typography>
            </View>
          </View>

          {/* stat stack */}
          <View className='flex-1 gap-s3'>
            <View>
              <View className='flex-row items-end gap-s2'>
                <Typography className='text-h2-k font-bold text-on-accent'>
                  {fmtValCompact(tracker, traj.dailyGoal)}
                </Typography>
                <Typography className='mb-[3px] text-sm font-bold text-on-accent opacity-70'>
                  {t('detail.perDay')}
                </Typography>
              </View>
              <Typography className='mt-s1 text-xs font-bold uppercase text-on-accent opacity-75'>
                {`${t('detail.dailyGoal')} · ${remain ?? 0} ${t('detail.left')}`}
              </Typography>
            </View>

            <View className='h-px bg-on-accent opacity-20' />

            <View>
              <Typography className='text-h2-k font-bold text-on-accent'>
                {traj.projected
                  ? fmtValCompact(tracker, traj.projected.value)
                  : '—'}
              </Typography>
              <Typography className='mt-s1 text-xs font-bold uppercase text-on-accent opacity-75'>
                {traj.projected
                  ? `${t('detail.projected')} · ${shortDate(
                      traj.projected.date,
                      lang
                    )}`
                  : t('detail.projected')}
              </Typography>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}
```

Note: `bg-on-accent/20` is a static literal opacity utility (not interpolation) — Tailwind generates it at build time. If it renders unstyled on-device, fall back to a literal class `bg-white/20`; both are static.

- [ ] **Step 2: Typecheck**

Run: `yarn tsc`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `yarn lint`
Expected: no errors for this file (no inline-style objects, no `<Text>`).

- [ ] **Step 4: Commit**

```bash
git add src/features/trackers/components/TargetHero.tsx
git commit -m "feat(trackers): add TargetHero gradient card

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: `TargetProgressBar` component

**Files:**
- Create: `src/features/trackers/components/TargetProgressBar.tsx`

**Interfaces:**
- Consumes: `calculateTarget`, `pacePercent`/`fmtValCompact` (`detailFormat`), `PACE_COLOR` (`@features/trackers/icons`), `toISODate` (`@utils/date`).
- Produces:
  ```ts
  export function TargetProgressBar({ tracker, entries }: { tracker: Tracker; entries: Entry[] }): JSX.Element
  ```

- [ ] **Step 1: Write the component**

Create `src/features/trackers/components/TargetProgressBar.tsx`:

```tsx
import { View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type { Tracker, Entry } from '@features/trackers/types'
import { calculateTarget } from '@features/trackers/calculators/target'
import { fmtValCompact, pacePercent } from '@features/trackers/detailFormat'
import { PACE_COLOR } from '@features/trackers/icons'
import { toISODate } from '@utils/date'

const AXIS_TICKS = 5

/**
 * TargetProgressBar — a beefed-up pace bar: current/goal header, a tall filled
 * track with a vertical pace marker at the time-elapsed position, a value axis,
 * and a "pace marker" caption. Fill width, marker offset and fill color are
 * continuous runtime values → inline style (the documented exception).
 */
export function TargetProgressBar({
  tracker,
  entries
}: {
  tracker: Tracker
  entries: Entry[]
}) {
  const { t } = useTranslation()
  const today = toISODate(new Date())
  const p = calculateTarget(tracker, entries, today)
  const start = tracker.startValue ?? 0
  const fillFrac = Math.max(0, Math.min(1, p.percent))
  const markerPct = pacePercent(tracker) // 0..100 | null
  const fillColor = PACE_COLOR[p.paceStatus]

  // axis: 5 evenly-spaced values from start → goal
  const axis = Array.from({ length: AXIS_TICKS }, (_, i) =>
    fmtValCompact(tracker, start + ((p.goal - start) * i) / (AXIS_TICKS - 1))
  )

  return (
    <View className='mx-s5 mb-s5 rounded-xl-k border border-line bg-surface p-s5 shadow-md'>
      <View className='mb-s3 flex-row items-baseline justify-between'>
        <Typography className='text-h3-k font-bold text-ink'>
          {t('common.progress', 'Progress')}
        </Typography>
        <Typography className='text-h3-k font-bold text-brand'>
          {fmtValCompact(tracker, p.current)}
          <Typography className='text-h3-k font-bold text-ink-3'>
            {` / ${fmtValCompact(tracker, p.goal)}`}
          </Typography>
        </Typography>
      </View>

      {/* track */}
      <View className='h-[34px] overflow-hidden rounded-md-k bg-surface-2'>
        <View
          className='h-full rounded-md-k'
          // runtime: fill is a live % of progress; color is the pace enum hex
          style={{ width: `${fillFrac * 100}%`, backgroundColor: fillColor }}
        />
      </View>

      {/* pace marker */}
      {markerPct != null ? (
        <View className='relative mt-s1 h-[8px]'>
          <View
            className='absolute top-0 h-[6px] w-[2px] bg-ink'
            // runtime: marker sits at the live time-elapsed %
            style={{ left: `${markerPct}%` }}
          />
        </View>
      ) : (
        <View className='mt-s1 h-[8px]' />
      )}

      {/* axis */}
      <View className='flex-row justify-between'>
        {axis.map((label, i) => (
          <Typography
            key={`${label}-${i}`}
            className='text-[11px] font-bold text-ink-3'
          >
            {label}
          </Typography>
        ))}
      </View>

      {markerPct != null ? (
        <View className='mt-s3 flex-row items-center justify-center gap-s2'>
          <View className='h-[2px] w-[14px] bg-ink' />
          <Typography className='text-xs font-medium text-ink-3'>
            {`${t('detail.paceMarker')} · ${fmtValCompact(
              tracker,
              p.expected ?? 0
            )}`}
          </Typography>
        </View>
      ) : null}
    </View>
  )
}
```

Note: `t('common.progress', 'Progress')` uses an i18n default so it renders even before a `common.progress` key exists. If `common.progress` is missing, add it in Task 2's follow-up — but the default keeps this task independently shippable. To keep both locales clean, add `"progress": "Progress"` / `"progress": "Tiến độ"` under `common` in Task 2 if not already present (verify first).

- [ ] **Step 2: Ensure `common.progress` exists in both locales**

Run:
```bash
node -e "const en=require('./src/i18n/locales/en.json');const vi=require('./src/i18n/locales/vi.json');console.log('en.common.progress='+en.common.progress+' vi.common.progress='+vi.common.progress)"
```
If either prints `undefined`, add `"progress": "Progress"` to `en.json`'s `common` and `"progress": "Tiến độ"` to `vi.json`'s `common`, then re-run.

- [ ] **Step 3: Typecheck + lint**

Run: `yarn tsc && yarn lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/trackers/components/TargetProgressBar.tsx src/i18n/locales/en.json src/i18n/locales/vi.json
git commit -m "feat(trackers): add TargetProgressBar with pace marker

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: `TargetTrajectoryChart` component

**Files:**
- Create: `src/features/trackers/components/TargetTrajectoryChart.tsx`

**Interfaces:**
- Consumes: `calculateTarget`, `buildTargetTrajectory` + `TargetTrajectory`/`TrajectoryPoint` (Task 1), `fmtValCompact`/`fmtCompact` (`detailFormat`), `daysBetween`/`toISODate` (`@utils/date`).
- Produces:
  ```ts
  export function TargetTrajectoryChart({ tracker, entries }: { tracker: Tracker; entries: Entry[] }): JSX.Element
  ```

- [ ] **Step 1: Write the component**

Create `src/features/trackers/components/TargetTrajectoryChart.tsx`:

```tsx
import { View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import Svg, {
  Line,
  Path,
  Circle,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop
} from 'react-native-svg'
import type { Tracker, Entry } from '@features/trackers/types'
import { calculateTarget } from '@features/trackers/calculators/target'
import { buildTargetTrajectory } from '@features/trackers/calculators'
import { fmtValCompact, fmtCompact } from '@features/trackers/detailFormat'
import { daysBetween, toISODate } from '@utils/date'

// viewBox coordinate space (matches the design's 350x210 canvas)
const VB_W = 350
const VB_H = 210
const X0 = 44
const X1 = 342
const Y_TOP = 12
const Y_BOT = 186
const PLOT_W = X1 - X0
const PLOT_H = Y_BOT - Y_TOP
const Y_TICKS = 5
const X_TICKS = 5

/**
 * TargetTrajectoryChart — the actual-vs-ideal-vs-projected line chart. All
 * domain values come from buildTargetTrajectory; this component only maps them
 * to the fixed viewBox and builds SVG path strings (SVG geometry is the
 * documented inline-style exception, expressed as SVG props here).
 */
export function TargetTrajectoryChart({
  tracker,
  entries
}: {
  tracker: Tracker
  entries: Entry[]
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const today = toISODate(new Date())
  const p = calculateTarget(tracker, entries, today)
  const traj = buildTargetTrajectory(tracker, entries, today)

  const start = tracker.startValue ?? 0
  const goal = tracker.targetValue ?? 0
  const vMin = Math.min(start, goal)
  const vMax = Math.max(start, goal) || 1

  // domain → viewBox mappers. Day axis is anchored on startDate.
  const totalDays = tracker.deadline
    ? Math.max(1, daysBetween(tracker.startDate, tracker.deadline))
    : Math.max(
        1,
        daysBetween(
          tracker.startDate,
          traj.series.length
            ? traj.series[traj.series.length - 1].date
            : today
        )
      )
  const xr = (iso: string) => {
    const d = Math.max(0, Math.min(totalDays, daysBetween(tracker.startDate, iso)))
    return X0 + (d / totalDays) * PLOT_W
  }
  const yr = (v: number) =>
    Y_BOT - ((v - vMin) / (vMax - vMin || 1)) * PLOT_H

  // actual line + area
  const pts = traj.series.map((s) => [xr(s.date), yr(s.value)] as const)
  const actualPath = pts.length
    ? 'M ' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')
    : ''
  const areaPath =
    pts.length > 0
      ? `${actualPath} L ${pts[pts.length - 1][0].toFixed(1)} ${Y_BOT} L ${pts[0][0].toFixed(1)} ${Y_BOT} Z`
      : ''
  const last = pts.length ? pts[pts.length - 1] : null

  // projected dashed line from last actual point to the projected goal point
  const projectedPath =
    last && traj.projected
      ? `M ${last[0].toFixed(1)} ${last[1].toFixed(1)} L ${xr(
          traj.projected.date
        ).toFixed(1)} ${yr(traj.projected.value).toFixed(1)}`
      : ''

  // ideal dotted diagonal
  const ideal = traj.idealLine
  const idealX0 = ideal ? xr(ideal.start.date) : 0
  const idealY0 = ideal ? yr(ideal.start.value) : 0
  const idealX1 = ideal ? xr(ideal.end.date) : 0
  const idealY1 = ideal ? yr(ideal.end.value) : 0

  // y grid ticks (value labels)
  const yGrid = Array.from({ length: Y_TICKS }, (_, i) => {
    const v = vMin + ((vMax - vMin) * i) / (Y_TICKS - 1)
    return { y: yr(v), label: fmtCompact(v) }
  })

  // x labels (date at even day offsets)
  const xLabels = Array.from({ length: X_TICKS }, (_, i) => {
    const dayOffset = Math.round((totalDays * i) / (X_TICKS - 1))
    const iso = new Date(
      Date.parse(`${tracker.startDate}T00:00:00Z`) + dayOffset * 86_400_000
    )
      .toISOString()
      .slice(0, 10)
    const label = new Date(`${iso}T00:00:00Z`).toLocaleDateString(lang, {
      day: 'numeric',
      month: 'numeric',
      timeZone: 'UTC'
    })
    return { x: X0 + (dayOffset / totalDays) * PLOT_W, label }
  })

  const hasPace = p.paceStatus !== 'none'
  const aheadAmount =
    p.expected != null ? Math.abs(p.current - p.expected) : null
  const paceDirKey =
    p.paceStatus === 'behind' ? 'behind' : p.paceStatus === 'ahead' ? 'ahead' : 'onTrack'
  const todayLabel = new Date(`${today}T00:00:00Z`).toLocaleDateString(lang, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  })

  return (
    <View className='mx-s5 mb-s5 rounded-xl-k border border-line bg-surface p-s5 shadow-md'>
      {/* header */}
      <View className='mb-s3 flex-row items-start justify-between'>
        <View>
          <Typography className='text-h3-k font-bold text-brand'>
            {todayLabel}
          </Typography>
          {hasPace ? (
            <Typography className='mt-[1px] text-sm text-ink-3'>
              {`${t('detail.pace')}: ${fmtValCompact(tracker, p.expected ?? 0)}`}
            </Typography>
          ) : null}
        </View>
        <View className='items-end'>
          <Typography className='text-h3-k font-bold text-brand'>
            {fmtValCompact(tracker, p.current)}
          </Typography>
          {hasPace && aheadAmount != null ? (
            <Typography className='mt-[1px] text-sm font-bold text-brand'>
              {`${fmtValCompact(tracker, aheadAmount)} ${t(
                `detail.${paceDirKey}`
              ).toLowerCase()}`}
            </Typography>
          ) : null}
        </View>
      </View>

      {/* chart */}
      <Svg width='100%' viewBox={`0 0 ${VB_W} ${VB_H}`}>
        <Defs>
          <LinearGradient id='kite-traj-area' x1='0' y1='0' x2='0' y2='1'>
            <Stop offset='0' stopColor='#2456b5' stopOpacity={0.28} />
            <Stop offset='1' stopColor='#2456b5' stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        {yGrid.map((g, i) => (
          <Line
            key={`grid-${i}`}
            x1={X0}
            y1={g.y}
            x2={X1}
            y2={g.y}
            stroke='#eef1f5'
            strokeWidth={1}
          />
        ))}
        {yGrid.map((g, i) => (
          <SvgText
            key={`ylab-${i}`}
            x={X0 - 6}
            y={g.y + 3.5}
            textAnchor='end'
            fontSize={10}
            fontWeight='700'
            fill='#8a8e80'
          >
            {g.label}
          </SvgText>
        ))}

        {/* goal line */}
        <Line
          x1={X0}
          y1={yr(goal)}
          x2={X1}
          y2={yr(goal)}
          stroke='#2456b5'
          strokeWidth={1.5}
        />

        {/* ideal dotted */}
        {ideal ? (
          <Line
            x1={idealX0}
            y1={idealY0}
            x2={idealX1}
            y2={idealY1}
            stroke='#8a8e80'
            strokeWidth={1.5}
            strokeDasharray='1 5'
            strokeLinecap='round'
            opacity={0.7}
          />
        ) : null}

        {/* actual area + line */}
        {areaPath ? <Path d={areaPath} fill='url(#kite-traj-area)' /> : null}
        {actualPath ? (
          <Path
            d={actualPath}
            fill='none'
            stroke='#2456b5'
            strokeWidth={2.8}
            strokeLinejoin='round'
            strokeLinecap='round'
          />
        ) : null}

        {/* projected dashed */}
        {projectedPath ? (
          <Path
            d={projectedPath}
            fill='none'
            stroke='#5b8af0'
            strokeWidth={2.4}
            strokeDasharray='7 6'
            strokeLinecap='round'
          />
        ) : null}

        {/* current dot */}
        {last ? (
          <Circle cx={last[0]} cy={last[1]} r={4.5} fill='#2456b5' stroke='#ffffff' strokeWidth={2} />
        ) : null}

        {xLabels.map((x, i) => (
          <SvgText
            key={`xlab-${i}`}
            x={x.x}
            y={205}
            textAnchor='middle'
            fontSize={10}
            fontWeight='700'
            fill='#8a8e80'
          >
            {x.label}
          </SvgText>
        ))}
      </Svg>

      {/* legend */}
      <View className='mt-s3 flex-row justify-center gap-s5'>
        <LegendItem color='#2456b5' label={t('detail.chartActual')} />
        <LegendItem color='#5b8af0' label={t('detail.chartProjected')} dashed />
        <LegendItem color='#8a8e80' label={t('detail.chartIdeal')} dotted />
      </View>
    </View>
  )
}

function LegendItem({
  color,
  label,
  dashed,
  dotted
}: {
  color: string
  label: string
  dashed?: boolean
  dotted?: boolean
}) {
  return (
    <View className='flex-row items-center gap-s2'>
      <Svg width={16} height={3}>
        <Line
          x1={0}
          y1={1.5}
          x2={16}
          y2={1.5}
          stroke={color}
          strokeWidth={3}
          strokeLinecap='round'
          strokeDasharray={dashed ? '5 4' : dotted ? '1 3' : undefined}
        />
      </Svg>
      <Typography className='text-xs font-bold text-ink-2'>{label}</Typography>
    </View>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `yarn tsc && yarn lint`
Expected: no errors. (`fill`/`stroke` are SVG props, not the banned `style` object; hex colors passed to `react-native-svg` props are fine.)

- [ ] **Step 3: Commit**

```bash
git add src/features/trackers/components/TargetTrajectoryChart.tsx
git commit -m "feat(trackers): add TargetTrajectoryChart (actual/ideal/projected)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Compose in `TargetOverviewTab`

**Files:**
- Modify: `src/features/trackers/components/TargetOverviewTab.tsx`

**Interfaces:**
- Consumes: `TargetHero` (Task 3), `TargetProgressBar` (Task 4), `TargetTrajectoryChart` (Task 5).

- [ ] **Step 1: Replace the tab body**

Rewrite `src/features/trackers/components/TargetOverviewTab.tsx` to:

```tsx
import { ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Tracker, Entry } from '@features/trackers/types'
import { TargetHero } from './TargetHero'
import { TargetProgressBar } from './TargetProgressBar'
import { TargetTrajectoryChart } from './TargetTrajectoryChart'

/**
 * Target Overview tab — redesigned to the "Save Money Detail" mockup: a blue
 * gradient hero (ring + daily-goal/projected), a progress-bar card with a pace
 * marker, and an actual/ideal/projected trajectory chart. Logging happens from
 * the History tab, so there is no Log-today button here.
 */
export function TargetOverviewTab({
  tracker,
  entries
}: {
  tracker: Tracker
  entries: Entry[]
}) {
  const insets = useSafeAreaInsets()
  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} // safe-area, runtime
      showsVerticalScrollIndicator={false}
    >
      <TargetHero tracker={tracker} entries={entries} />
      <TargetProgressBar tracker={tracker} entries={entries} />
      <TargetTrajectoryChart tracker={tracker} entries={entries} />
    </ScrollView>
  )
}
```

Note: `useMilestones`/`progressFor`/`DetailHero`/`DetailStatGrid`/`DetailBody` imports are removed here — they remain used by the inline average/project path in `TrackerDetailScreen`, so do NOT delete those files.

- [ ] **Step 2: Typecheck + lint + full test run**

Run: `yarn tsc && yarn lint && yarn test`
Expected: no type/lint errors; all Jest tests pass (including Task 1's).

- [ ] **Step 3: Commit**

```bash
git add src/features/trackers/components/TargetOverviewTab.tsx
git commit -m "feat(trackers): compose redesigned Target Overview tab

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: On-device verification

**Files:** none (manual/simulator verification).

- [ ] **Step 1: Run the app**

Run: `yarn ios` (or `yarn android`). Open a **target** tracker's detail (e.g. create one: "Save Money", unit `$`, start 0, target 200000, a start date and a deadline ~2 months out) and log a few entries.

- [ ] **Step 2: Verify each card against the mockup**

Confirm on-device:
- Hero: blue gradient, white ring shows the right %, center current + "to go", pace pill reads e.g. "… ahead · Pace …", daily-goal and projected stats populate; ring/stat text is not clipped.
- Progress bar: fill width tracks %, colored by pace status, pace marker tick sits at the time-elapsed position, axis labels read start→goal, caption shows the expected pace value.
- Trajectory: actual solid line + gradient area, dotted ideal diagonal, dashed projected line to goal, current dot, Y/X labels legible, legend shows Actual/Projected/Ideal.
- Edge cases: a target with **no deadline** hides the pace pill / marker / ideal / projected and still renders cleanly; a target with **no entries** shows an empty actual line but the ideal line (if deadline) and 0% ring.
- Switch language to Vietnamese (Settings) and confirm all labels are translated.

- [ ] **Step 3: (No commit — verification only.)** Note any visual gaps for follow-up polish.

---

## Notes for the executor

- Tasks 3–5 are independent presentational components and can be built in any order after Task 1; Task 6 depends on all of 3–5; Task 2 should land before/with Task 3 (the components reference the new keys). Task 7 is last.
- Do not add dark-mode tokens (deferred per CLAUDE.md — light-only palette).
- If `bg-on-accent/20` renders unstyled on-device, switch to `bg-white/20` (both static literals; see Task 3 note).
