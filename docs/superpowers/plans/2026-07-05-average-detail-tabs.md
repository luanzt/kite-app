# Average Detail 3-Tab Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `average` trackers the habit/target-style 3-tab detail screen (Charts / History / Notes) with a Strides-style Charts tab: period-comparison card with a 9-option window picker, streak/average-ring/success-rate stats card, and a value bar chart.

**Architecture:** A new pure engine `calculators/averageStats.ts` (TDD'd like `habitStats`) feeds three new components. `AverageDetailView` clones `TargetDetailView`'s tab shell (same `HabitDetailProvider`/`HabitTabBar`, reusing `HabitHistoryTab`/`HabitNotesTab` untouched); `TrackerDetailScreen` gains an `average` branch. Card 3 reuses the existing `WeeklyChart` component unchanged via a `PeriodSessions`-shaped builder.

**Tech Stack:** React Native CLI, TypeScript strict, HeroUI Native (BottomSheet) + Uniwind, @react-navigation/material-top-tabs, react-native-svg, i18next, Jest.

**Spec:** `docs/superpowers/specs/2026-07-05-average-detail-tabs-design.md`
**Branch:** `feature/average-detail-tabs` (already created off main; main includes the average-form feature — `Tracker` has `averageWindow/rollingDays/doneRule/progressBasis`).

## Global Constraints

- Package manager **yarn**: `yarn test <path>`, `yarn test`, `yarn tsc`, `yarn lint`. `yarn tsc` clean before every commit; `yarn lint` must add no NEW problems (pre-existing noise in `uniwind.d.ts`, `icons.ts`, `factory.ts`, `TrackerListScreen.tsx`, `habitStats.test.ts:400` is known).
- `<Typography>` from heroui-native, never `<Text>`.
- Tailwind `className` only; branch whole class strings; NEVER interpolate variables into class strings. Inline `style` allowed only for runtime-continuous values (bar width %, ring dashoffset, safe-area) with a why-comment.
- Overlays use HeroUI `BottomSheet` (never react-native `Modal`).
- All visible strings via `t('key')`; `en.json`/`vi.json` stay key-for-key in sync.
- Icons only from `lucide-react-native` (or the `Icons` map in `features/trackers/icons.ts`).
- Pure calculators live in `calculators/`, are DB-free, and are unit-tested; component/screen files are device-verified, not unit-tested.
- Commit messages end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: Engine part 1 — `isoAddMonths` + `compareWindows`

**Files:**
- Create: `src/features/trackers/calculators/averageStats.ts`
- Test: `src/features/trackers/calculators/__tests__/averageStats.test.ts` (new)

**Interfaces:**
- Consumes: `isoAddDays` (exported from `./habitStats`), `daysBetween`, `weekdayOf` (from `@utils/date`), `Tracker`/`Entry` types.
- Produces (Tasks 2–4 rely on these exact names):
  - `export type CompareWindow = '7d' | '14d' | '30d' | '4w' | '3m' | '6m' | '12m' | '7logs' | '30logs'`
  - `export type ComparePeriod = { startISO: string | null; endISO: string | null; avg: number; perLog: boolean }`
  - `export function isoAddMonths(iso: string, n: number): string`
  - `export function compareWindows(tracker: Tracker, entries: Entry[], todayISO: string, win: CompareWindow): { current: ComparePeriod; previous: ComparePeriod; deltaPct: number | null }`

- [ ] **Step 1: Write the failing tests**

Create `src/features/trackers/calculators/__tests__/averageStats.test.ts`:

```ts
import { isoAddMonths, compareWindows } from '../averageStats'
import type { Tracker, Entry } from '@features/trackers/types'

const avg: Tracker = {
  id: 'a1',
  name: 'Water',
  type: 'average',
  icon: 'drop',
  color: 'cyan',
  unit: null,
  direction: null,
  targetValue: 8,
  startValue: null,
  accumulation: null,
  startDate: '2026-06-01',
  deadline: null,
  period: 'daily',
  repeatDays: null,
  routine: null,
  reminderTime: null,
  goalNote: null,
  averageWindow: null,
  rollingDays: null,
  doneRule: null,
  progressBasis: null,
  createdAt: '2026-06-01T00:00:00Z',
  archived: false
}

const e = (date: string, value: number, createdAt?: string): Entry => ({
  id: `${date}-${createdAt ?? 'a'}`,
  trackerId: 'a1',
  date,
  value,
  note: null,
  createdAt: createdAt ?? `${date}T08:00:00Z`
})

describe('isoAddMonths', () => {
  it('shifts whole months', () => {
    expect(isoAddMonths('2026-07-05', -3)).toBe('2026-04-05')
    expect(isoAddMonths('2026-07-05', 1)).toBe('2026-08-05')
  })
  it('clamps the day to the target month length', () => {
    expect(isoAddMonths('2026-03-31', -1)).toBe('2026-02-28')
    expect(isoAddMonths('2024-03-31', -1)).toBe('2024-02-29') // leap year
    expect(isoAddMonths('2026-01-31', 1)).toBe('2026-02-28')
  })
  it('crosses year boundaries', () => {
    expect(isoAddMonths('2026-01-15', -2)).toBe('2025-11-15')
    expect(isoAddMonths('2025-11-15', 3)).toBe('2026-02-15')
  })
})

describe('compareWindows — day windows', () => {
  it('7d: current = last 7 days incl. today, previous = the 7 before', () => {
    const entries = [
      e('2026-06-29', 7), // first day of current window
      e('2026-07-05', 7), // today
      e('2026-06-28', 14), // last day of previous window
      e('2026-06-22', 14), // first day of previous window
      e('2026-06-21', 99) // outside both
    ]
    const r = compareWindows(avg, entries, '2026-07-05', '7d')
    expect(r.current).toEqual({
      startISO: '2026-06-29',
      endISO: '2026-07-05',
      avg: 2, // (7+7)/7 days
      perLog: false
    })
    expect(r.previous).toEqual({
      startISO: '2026-06-22',
      endISO: '2026-06-28',
      avg: 4, // (14+14)/7
      perLog: false
    })
    expect(r.deltaPct).toBe(-50)
  })

  it('divides by the fixed window length even with sparse data', () => {
    const r = compareWindows(avg, [e('2026-07-05', 14)], '2026-07-05', '14d')
    expect(r.current.avg).toBe(1) // 14/14, not 14/1
    expect(r.current.startISO).toBe('2026-06-22')
  })

  it('4w is a 28-day window', () => {
    const r = compareWindows(avg, [], '2026-07-05', '4w')
    expect(r.current.startISO).toBe('2026-06-08')
    expect(r.previous.startISO).toBe('2026-05-11')
    expect(r.previous.endISO).toBe('2026-06-07')
  })

  it('deltaPct is null when the previous window is empty', () => {
    const r = compareWindows(avg, [e('2026-07-05', 5)], '2026-07-05', '7d')
    expect(r.deltaPct).toBeNull()
  })

  it('deltaPct is positive when improving', () => {
    const r = compareWindows(
      avg,
      [e('2026-07-01', 21), e('2026-06-25', 7)],
      '2026-07-05',
      '7d'
    )
    expect(r.deltaPct).toBe(200) // 3 vs 1 avg/day
  })
})

describe('compareWindows — month windows', () => {
  it('3m: windows are calendar-month spans divided by their true day count', () => {
    // today 2026-07-05 → current (2026-04-06 .. 2026-07-05) = 91 days,
    // previous (2026-01-06 .. 2026-04-05) = 90 days
    const entries = [e('2026-05-10', 91), e('2026-02-10', 180)]
    const r = compareWindows(avg, entries, '2026-07-05', '3m')
    expect(r.current.startISO).toBe('2026-04-06')
    expect(r.current.endISO).toBe('2026-07-05')
    expect(r.current.avg).toBeCloseTo(1) // 91/91
    expect(r.previous.startISO).toBe('2026-01-06')
    expect(r.previous.endISO).toBe('2026-04-05')
    expect(r.previous.avg).toBeCloseTo(2) // 180/90
    expect(r.deltaPct).toBeCloseTo(-50)
  })
})

describe('compareWindows — log windows', () => {
  it('7logs: newest 7 entries vs the 7 before, mean per log', () => {
    // 10 entries, one per day 2026-06-20..06-29, value = day index 1..10
    const entries = Array.from({ length: 10 }, (_, i) =>
      e(`2026-06-${20 + i}`, i + 1)
    )
    const r = compareWindows(avg, entries, '2026-07-05', '7logs')
    // newest 7 = values 4..10 (dates 06-23..06-29), mean 7
    expect(r.current).toEqual({
      startISO: '2026-06-23',
      endISO: '2026-06-29',
      avg: 7,
      perLog: true
    })
    // previous group = remaining 3 (values 1..3), mean 2
    expect(r.previous).toEqual({
      startISO: '2026-06-20',
      endISO: '2026-06-22',
      avg: 2,
      perLog: true
    })
    expect(r.deltaPct).toBe(250)
  })

  it('orders same-day logs by createdAt', () => {
    const entries = [
      e('2026-07-01', 1, '2026-07-01T08:00:00Z'),
      e('2026-07-01', 100, '2026-07-01T20:00:00Z'),
      ...Array.from({ length: 7 }, (_, i) => e(`2026-07-0${2 + i}`, 10)) // 07-02..07-08
    ]
    // 9 entries total; newest 7 exclude the two 07-01 logs... assert group sizes
    const r = compareWindows(avg, entries, '2026-07-09', '7logs')
    expect(r.current.perLog).toBe(true)
    expect(r.previous.startISO).toBe('2026-07-01')
    expect(r.previous.endISO).toBe('2026-07-01')
    expect(r.previous.avg).toBe(50.5) // mean of the two same-day logs
  })

  it('empty groups get null ranges and avg 0', () => {
    const r0 = compareWindows(avg, [], '2026-07-05', '7logs')
    expect(r0.current).toEqual({ startISO: null, endISO: null, avg: 0, perLog: true })
    expect(r0.deltaPct).toBeNull()
    const r1 = compareWindows(avg, [e('2026-07-01', 5)], '2026-07-05', '7logs')
    expect(r1.previous.startISO).toBeNull()
    expect(r1.deltaPct).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test file to verify it fails**

Run: `yarn test src/features/trackers/calculators/__tests__/averageStats.test.ts`
Expected: FAIL — module `../averageStats` not found.

- [ ] **Step 3: Implement**

Create `src/features/trackers/calculators/averageStats.ts`:

```ts
import type { Tracker, Entry } from '@features/trackers/types'
import { daysBetween } from '@utils/date'
import { isoAddDays } from './habitStats'

/**
 * Average detail derivations — pure helpers feeding the Average Detail screen
 * (period-comparison card, streak/success stats, value bar chart). DB-free and
 * unit-tested, mirroring habitStats.
 */

export type CompareWindow =
  | '7d'
  | '14d'
  | '30d'
  | '4w'
  | '3m'
  | '6m'
  | '12m'
  | '7logs'
  | '30logs'

export type ComparePeriod = {
  startISO: string | null // null for an empty log-window group
  endISO: string | null
  avg: number
  perLog: boolean // true → "avg/log" label, false → "avg/day"
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

/** Shift an ISO date by `n` whole months, clamping the day (Mar 31 −1m → Feb 28). */
export function isoAddMonths(iso: string, n: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = ((total % 12) + 12) % 12 // 0-based month, safe for negatives
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate()
  return `${ny}-${pad2(nm + 1)}-${pad2(Math.min(d, lastDay))}`
}

/** Sum of entry values dated within [startISO, endISO] inclusive. */
function sumRange(entries: Entry[], startISO: string, endISO: string): number {
  let sum = 0
  for (const e of entries) {
    const d = e.date.slice(0, 10)
    if (d >= startISO && d <= endISO) sum += e.value
  }
  return sum
}

function deltaOf(cur: number, prev: number): number | null {
  return prev === 0 ? null : ((cur - prev) / prev) * 100
}

const DAY_WINDOWS: Partial<Record<CompareWindow, number>> = {
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '4w': 28
}
const MONTH_WINDOWS: Partial<Record<CompareWindow, number>> = {
  '3m': 3,
  '6m': 6,
  '12m': 12
}
const LOG_WINDOWS: Partial<Record<CompareWindow, number>> = {
  '7logs': 7,
  '30logs': 30
}

function logGroup(group: Entry[]): ComparePeriod {
  if (group.length === 0)
    return { startISO: null, endISO: null, avg: 0, perLog: true }
  const dates = group.map((e) => e.date.slice(0, 10)).sort()
  const avg = group.reduce((s, e) => s + e.value, 0) / group.length
  return {
    startISO: dates[0],
    endISO: dates[dates.length - 1],
    avg,
    perLog: true
  }
}

/**
 * The comparison card's two periods. Day windows (7d/14d/30d/4w=28d) divide by
 * the FIXED window length ("avg/day"); month windows divide by the true day
 * count of their calendar span; log windows are the mean of the N newest logs
 * vs the N before them ("avg/log"). deltaPct is null when the previous period
 * has no value to compare against.
 */
export function compareWindows(
  _tracker: Tracker,
  entries: Entry[],
  todayISO: string,
  win: CompareWindow
): { current: ComparePeriod; previous: ComparePeriod; deltaPct: number | null } {
  const dayN = DAY_WINDOWS[win]
  if (dayN != null) {
    const curStart = isoAddDays(todayISO, -(dayN - 1))
    const prevEnd = isoAddDays(todayISO, -dayN)
    const prevStart = isoAddDays(todayISO, -(2 * dayN - 1))
    const current: ComparePeriod = {
      startISO: curStart,
      endISO: todayISO,
      avg: sumRange(entries, curStart, todayISO) / dayN,
      perLog: false
    }
    const previous: ComparePeriod = {
      startISO: prevStart,
      endISO: prevEnd,
      avg: sumRange(entries, prevStart, prevEnd) / dayN,
      perLog: false
    }
    return { current, previous, deltaPct: deltaOf(current.avg, previous.avg) }
  }

  const monthN = MONTH_WINDOWS[win]
  if (monthN != null) {
    const curStart = isoAddDays(isoAddMonths(todayISO, -monthN), 1)
    const prevEnd = isoAddMonths(todayISO, -monthN)
    const prevStart = isoAddDays(isoAddMonths(todayISO, -2 * monthN), 1)
    const curDays = daysBetween(curStart, todayISO) + 1
    const prevDays = daysBetween(prevStart, prevEnd) + 1
    const current: ComparePeriod = {
      startISO: curStart,
      endISO: todayISO,
      avg: sumRange(entries, curStart, todayISO) / curDays,
      perLog: false
    }
    const previous: ComparePeriod = {
      startISO: prevStart,
      endISO: prevEnd,
      avg: sumRange(entries, prevStart, prevEnd) / prevDays,
      perLog: false
    }
    return { current, previous, deltaPct: deltaOf(current.avg, previous.avg) }
  }

  const logN = LOG_WINDOWS[win] ?? 7
  const sorted = [...entries].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
  )
  const current = logGroup(sorted.slice(0, logN))
  const previous = logGroup(sorted.slice(logN, 2 * logN))
  return {
    current,
    previous,
    deltaPct:
      previous.startISO === null
        ? null
        : deltaOf(current.avg, previous.avg)
  }
}
```

Note: Task 1 deliberately does NOT define `mondayOf`/`monthStartOf` — Task 2 adds them alongside their first users (avoids unused-symbol lint noise). `weekdayOf` in the `@utils/date` import is also first used in Task 2 — import only `daysBetween` here and extend the import in Task 2.

- [ ] **Step 4: Run the test file to verify it passes**

Run: `yarn test src/features/trackers/calculators/__tests__/averageStats.test.ts`
Expected: PASS (all describes green).

- [ ] **Step 5: Full suite + tsc, then commit**

Run: `yarn test && yarn tsc`
Expected: PASS, clean.

```bash
git add src/features/trackers/calculators/averageStats.ts src/features/trackers/calculators/__tests__/averageStats.test.ts
git commit -m "feat(trackers): averageStats engine — isoAddMonths + compareWindows

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Engine part 2 — `averageBucketStats` + `averageBarSeries`

**Files:**
- Modify: `src/features/trackers/calculators/averageStats.ts`
- Test: `src/features/trackers/calculators/__tests__/averageStats.test.ts` (append)

**Interfaces:**
- Consumes: Task 1's file, plus `dayTotalsOf`, `isDueOn` and types `PeriodSessions`, `WeekBar` from `./habitStats` (`WeekBar = { startISO: string; count: number; partial: boolean }`; `PeriodSessions = { bars: WeekBar[]; goal: number; scaleMax: number; unit: 'day'|'week'|'month'|'year'; perDayTarget?: number }`).
- Produces:
  - `export type AverageBucketStats = { streak: number; metBuckets: number; dueBuckets: number; unit: 'day' | 'week' | 'month' }`
  - `export function averageBucketStats(tracker: Tracker, entries: Entry[], todayISO: string): AverageBucketStats`
  - `export function averageBarSeries(tracker: Tracker, entries: Entry[], todayISO: string): PeriodSessions`

- [ ] **Step 1: Write the failing tests**

Append to `averageStats.test.ts` (imports: add `averageBucketStats, averageBarSeries` to the existing import from `'../averageStats'`):

```ts
describe('averageBucketStats — daily', () => {
  const t0: Tracker = { ...avg, startDate: '2026-07-01' } // goal 8/day
  it('met day = summed total >= goal; streak counts back from today', () => {
    const entries = [
      e('2026-07-01', 8),
      e('2026-07-02', 3),
      e('2026-07-02', 5, '2026-07-02T20:00:00Z'), // same-day logs sum: 8
      e('2026-07-03', 2), // unmet
      e('2026-07-04', 9),
      e('2026-07-05', 10)
    ]
    const s = averageBucketStats(t0, entries, '2026-07-05')
    expect(s.unit).toBe('day')
    expect(s.dueBuckets).toBe(5) // 07-01..07-05
    expect(s.metBuckets).toBe(4)
    expect(s.streak).toBe(2) // 04 + 05; broken by 03
  })

  it('today unmet is neutral (extends nothing, breaks nothing)', () => {
    const entries = [e('2026-07-03', 8), e('2026-07-04', 8)]
    const s = averageBucketStats(t0, entries, '2026-07-05')
    expect(s.streak).toBe(2) // today (05) not logged → neutral
  })

  it('a past unmet due day breaks the streak even when today is met', () => {
    const entries = [e('2026-07-03', 8), e('2026-07-05', 8)] // 04 missed
    const s = averageBucketStats(t0, entries, '2026-07-05')
    expect(s.streak).toBe(1)
  })

  it('repeatDays: non-due days are skipped, not breaking', () => {
    // due Mon/Wed/Fri only. 2026-07-01 = Wed, 07-03 = Fri, 07-06 = Mon.
    const t1: Tracker = { ...t0, repeatDays: [1, 3, 5] }
    const entries = [e('2026-07-01', 8), e('2026-07-03', 8)]
    const s = averageBucketStats(t1, entries, '2026-07-05') // Sunday
    expect(s.dueBuckets).toBe(2) // Wed + Fri only
    expect(s.metBuckets).toBe(2)
    expect(s.streak).toBe(2) // Sat/Sun not due → skipped
  })

  it('goal null/0 → nothing is met', () => {
    const t1: Tracker = { ...t0, targetValue: null }
    const s = averageBucketStats(t1, [e('2026-07-05', 99)], '2026-07-05')
    expect(s.metBuckets).toBe(0)
    expect(s.streak).toBe(0)
    expect(s.dueBuckets).toBe(5)
  })

  it('startDate in the future → all zeros', () => {
    const t1: Tracker = { ...t0, startDate: '2026-08-01' }
    const s = averageBucketStats(t1, [], '2026-07-05')
    expect(s).toEqual({ streak: 0, metBuckets: 0, dueBuckets: 0, unit: 'day' })
  })
})

describe('averageBucketStats — weekly & monthly', () => {
  it('weekly: Monday buckets, current week neutral', () => {
    const t1: Tracker = {
      ...avg,
      period: 'weekly',
      targetValue: 10,
      startDate: '2026-06-22' // a Monday
    }
    const entries = [
      e('2026-06-24', 10), // week of 06-22: met
      e('2026-07-01', 4) // week of 06-29: unmet; current week (07-05 is Sun of 06-29 week)
    ]
    // today 2026-07-05 (Sunday) is still inside the 06-29 week → that week is
    // the current bucket → neutral even though unmet
    const s = averageBucketStats(t1, entries, '2026-07-05')
    expect(s.unit).toBe('week')
    expect(s.dueBuckets).toBe(2)
    expect(s.metBuckets).toBe(1)
    expect(s.streak).toBe(1)
  })

  it('monthly: calendar-month buckets', () => {
    const t1: Tracker = {
      ...avg,
      period: 'monthly',
      targetValue: 100,
      startDate: '2026-05-15'
    }
    const entries = [e('2026-05-20', 120), e('2026-06-10', 90), e('2026-07-01', 40)]
    const s = averageBucketStats(t1, entries, '2026-07-05')
    expect(s.unit).toBe('month')
    expect(s.dueBuckets).toBe(3) // May, Jun, Jul
    expect(s.metBuckets).toBe(1) // only May
    expect(s.streak).toBe(0) // Jun unmet breaks; Jul (current) neutral
  })
})

describe('averageBarSeries', () => {
  it('daily: one bar per day from startDate, summed values rounded to 1dp', () => {
    const t1: Tracker = { ...avg, startDate: '2026-07-01' }
    const entries = [
      e('2026-07-01', 2.25),
      e('2026-07-01', 1, '2026-07-01T20:00:00Z'),
      e('2026-07-03', 12)
    ]
    const s = averageBarSeries(t1, entries, '2026-07-05')
    expect(s.unit).toBe('day')
    expect(s.bars.map((b) => b.startISO)).toEqual([
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
      '2026-07-04',
      '2026-07-05'
    ])
    expect(s.bars[0].count).toBe(3.3) // 3.25 → 3.3
    expect(s.bars[1].count).toBe(0)
    expect(s.bars[4].partial).toBe(true)
    expect(s.goal).toBe(8)
    expect(s.perDayTarget).toBe(8)
    expect(s.scaleMax).toBe(12) // ceil(max(8, 12))
  })

  it('daily: capped at 180 bars for an old start date', () => {
    const t1: Tracker = { ...avg, startDate: '2020-01-01' }
    const s = averageBarSeries(t1, [], '2026-07-05')
    expect(s.bars).toHaveLength(180)
    expect(s.bars[179].startISO).toBe('2026-07-05')
  })

  it('weekly: 4 Monday-start bars, goal line = targetValue, no perDayTarget', () => {
    const t1: Tracker = { ...avg, period: 'weekly', targetValue: 10 }
    const entries = [e('2026-06-30', 7)] // week of 2026-06-29
    const s = averageBarSeries(t1, entries, '2026-07-05')
    expect(s.unit).toBe('week')
    expect(s.bars).toHaveLength(4)
    expect(s.bars[3].startISO).toBe('2026-06-29')
    expect(s.bars[3].count).toBe(7)
    expect(s.bars[3].partial).toBe(true)
    expect(s.perDayTarget).toBeUndefined()
    expect(s.scaleMax).toBe(10)
  })

  it('monthly: 3 calendar-month bars', () => {
    const t1: Tracker = { ...avg, period: 'monthly', targetValue: 100 }
    const entries = [e('2026-05-10', 50), e('2026-07-02', 20)]
    const s = averageBarSeries(t1, entries, '2026-07-05')
    expect(s.unit).toBe('month')
    expect(s.bars.map((b) => b.startISO)).toEqual([
      '2026-05-01',
      '2026-06-01',
      '2026-07-01'
    ])
    expect(s.bars[0].count).toBe(50)
    expect(s.bars[2].partial).toBe(true)
  })

  it('scaleMax is at least 1 with no data and no goal', () => {
    const t1: Tracker = { ...avg, targetValue: null, startDate: '2026-07-05' }
    const s = averageBarSeries(t1, [], '2026-07-05')
    expect(s.scaleMax).toBe(1)
    expect(s.goal).toBe(0)
    expect(s.perDayTarget).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run to verify the new describes fail**

Run: `yarn test src/features/trackers/calculators/__tests__/averageStats.test.ts`
Expected: FAIL — `averageBucketStats` / `averageBarSeries` not exported. Task 1 describes still pass.

- [ ] **Step 3: Implement**

Append to `src/features/trackers/calculators/averageStats.ts`. First adjust imports: extend the habitStats import to `import { dayTotalsOf, isDueOn, isoAddDays } from './habitStats'`, add `import type { PeriodSessions, WeekBar } from './habitStats'`, and extend the date import to `import { daysBetween, weekdayOf } from '@utils/date'`. Then append:

```ts
/** Monday (UTC) of the week containing `iso`. */
function mondayOf(iso: string): string {
  return isoAddDays(iso, -((weekdayOf(iso) + 6) % 7))
}

/** First day of the month containing `iso`. */
function monthStartOf(iso: string): string {
  return `${iso.slice(0, 7)}-01`
}

export type AverageBucketStats = {
  streak: number
  metBuckets: number
  dueBuckets: number
  unit: 'day' | 'week' | 'month'
}

function unitOf(tracker: Tracker): 'day' | 'week' | 'month' {
  if (tracker.period === 'monthly') return 'month'
  if (tracker.period === 'weekly') return 'week'
  return 'day'
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * Streak & success-rate over period buckets (days / Monday-weeks / calendar
 * months, per tracker.period). A bucket is met when its summed total ≥
 * targetValue. Daily buckets respect repeatDays (non-due days don't count and
 * don't break streaks). The current (in-progress) bucket is neutral: it
 * extends a streak when met but never breaks one — mirroring habit's
 * today-neutral rule.
 */
export function averageBucketStats(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string
): AverageBucketStats {
  const goal = tracker.targetValue ?? 0
  const unit = unitOf(tracker)
  if (daysBetween(tracker.startDate, todayISO) < 0) {
    return { streak: 0, metBuckets: 0, dueBuckets: 0, unit }
  }

  // Ordered due buckets (oldest first): key = bucket start, total = summed value.
  const buckets: { key: string; total: number }[] = []
  let currentKey: string
  if (unit === 'day') {
    const totals = dayTotalsOf(tracker, entries)
    currentKey = todayISO
    for (let d = tracker.startDate; d <= todayISO; d = isoAddDays(d, 1)) {
      if (!isDueOn(tracker, d)) continue
      buckets.push({ key: d, total: totals.get(d) ?? 0 })
    }
  } else if (unit === 'week') {
    currentKey = mondayOf(todayISO)
    for (let w = mondayOf(tracker.startDate); w <= todayISO; w = isoAddDays(w, 7)) {
      buckets.push({ key: w, total: sumRange(entries, w, isoAddDays(w, 6)) })
    }
  } else {
    currentKey = monthStartOf(todayISO)
    for (
      let m = monthStartOf(tracker.startDate);
      m <= todayISO;
      m = isoAddMonths(m, 1)
    ) {
      const end = isoAddDays(isoAddMonths(m, 1), -1)
      buckets.push({ key: m, total: sumRange(entries, m, end) })
    }
  }

  const met = (b: { total: number }) => goal > 0 && b.total >= goal
  const metBuckets = buckets.filter(met).length
  let streak = 0
  for (let i = buckets.length - 1; i >= 0; i--) {
    const b = buckets[i]
    if (met(b)) streak += 1
    else if (b.key === currentKey) continue // in-progress bucket is neutral
    else break
  }
  return { streak, metBuckets, dueBuckets: buckets.length, unit }
}

/** Cap on daily bars so a very old start date doesn't build a huge list. */
const DAILY_MAX_BARS = 180

/**
 * Value bar series for the detail chart, shaped as PeriodSessions so the
 * existing WeeklyChart renders it unchanged. Bars are bucket SUMS (not
 * counts), rounded to 1 decimal; perDayTarget drives the daily met-coloring
 * and is set only for daily trackers with a positive goal.
 */
export function averageBarSeries(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string
): PeriodSessions {
  const goal = tracker.targetValue ?? 0
  const unit = unitOf(tracker)
  const bars: WeekBar[] = []

  if (unit === 'day') {
    const totals = dayTotalsOf(tracker, entries)
    let start = tracker.startDate > todayISO ? todayISO : tracker.startDate
    const capStart = isoAddDays(todayISO, -(DAILY_MAX_BARS - 1))
    if (start < capStart) start = capStart
    for (let d = start; d <= todayISO; d = isoAddDays(d, 1)) {
      bars.push({
        startISO: d,
        count: round1(totals.get(d) ?? 0),
        partial: d === todayISO
      })
    }
  } else if (unit === 'week') {
    for (let i = 3; i >= 0; i--) {
      const w = isoAddDays(mondayOf(todayISO), -7 * i)
      bars.push({
        startISO: w,
        count: round1(sumRange(entries, w, isoAddDays(w, 6))),
        partial: i === 0
      })
    }
  } else {
    for (let i = 2; i >= 0; i--) {
      const m = isoAddMonths(monthStartOf(todayISO), -i)
      const end = isoAddDays(isoAddMonths(m, 1), -1)
      bars.push({
        startISO: m,
        count: round1(sumRange(entries, m, end)),
        partial: i === 0
      })
    }
  }

  const maxCount = bars.reduce((mx, b) => Math.max(mx, b.count), 0)
  const scaleMax = Math.max(1, Math.ceil(Math.max(goal, maxCount)))
  const base: PeriodSessions = { bars, goal, scaleMax, unit }
  return unit === 'day' && goal > 0 ? { ...base, perDayTarget: goal } : base
}
```

- [ ] **Step 4: Run the test file to verify it passes**

Run: `yarn test src/features/trackers/calculators/__tests__/averageStats.test.ts`
Expected: PASS (all describes).

- [ ] **Step 5: Full suite + tsc, then commit**

Run: `yarn test && yarn tsc`
Expected: PASS, clean.

```bash
git add src/features/trackers/calculators/averageStats.ts src/features/trackers/calculators/__tests__/averageStats.test.ts
git commit -m "feat(trackers): averageStats engine — bucket stats & bar series

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: i18n keys + `AverageComparisonCard` + `AverageStatsRow`

Component task — no unit tests (device-verified in Task 5); gated by tsc + lint + full suite.

**Files:**
- Modify: `src/i18n/locales/en.json` (`detail` object), `src/i18n/locales/vi.json` (`detail` object)
- Create: `src/features/trackers/components/AverageComparisonCard.tsx`
- Create: `src/features/trackers/components/AverageStatsRow.tsx`

**Interfaces:**
- Consumes: `CompareWindow`, `ComparePeriod`, `AverageBucketStats` from `@features/trackers/calculators/averageStats`; `fmtNum` from `@features/trackers/detailFormat`; HeroUI `BottomSheet`/`useBottomSheet`; `useThemeColors`; `Svg`/`Circle` from `react-native-svg`.
- Produces (Task 4 relies on):
  - `AverageComparisonCard({ window, onChangeWindow, current, previous, deltaPct }: { window: CompareWindow; onChangeWindow: (w: CompareWindow) => void; current: ComparePeriod; previous: ComparePeriod; deltaPct: number | null })`
  - `AverageStatsRow({ tracker, average, stats }: { tracker: Tracker; average: number; stats: AverageBucketStats })`

- [ ] **Step 1: Add the i18n keys**

`en.json` — add inside the `detail` object (e.g. after the `"chartIdeal"` line, comma-separated):

```json
    "avgChartTitle": "Average",
    "avgWin": { "d7": "7 days", "d14": "14 days", "d30": "30 days", "w4": "4 weeks", "m3": "3 months", "m6": "6 months", "m12": "12 months", "log7": "7 logs", "log30": "30 logs" },
    "avgPerDay": "avg/day", "avgPerLog": "avg/log",
    "avgUnder": "{{n}} under", "avgOver": "{{n}} over",
    "unitWeeks": "weeks", "unitMonths": "months",
    "valueBy": { "day": "Daily total", "week": "Total per week", "month": "Total per month" }
```

`vi.json` — same keys inside its `detail` object:

```json
    "avgChartTitle": "Trung bình",
    "avgWin": { "d7": "7 ngày", "d14": "14 ngày", "d30": "30 ngày", "w4": "4 tuần", "m3": "3 tháng", "m6": "6 tháng", "m12": "12 tháng", "log7": "7 log", "log30": "30 log" },
    "avgPerDay": "TB/ngày", "avgPerLog": "TB/log",
    "avgUnder": "thiếu {{n}}", "avgOver": "vượt {{n}}",
    "unitWeeks": "tuần", "unitMonths": "tháng",
    "valueBy": { "day": "Tổng theo ngày", "week": "Tổng theo tuần", "month": "Tổng theo tháng" }
```

- [ ] **Step 2: Create `AverageComparisonCard.tsx`**

```tsx
import { Pressable, View } from 'react-native'
import { BottomSheet, Typography, useBottomSheet } from 'heroui-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, ChevronDown } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import type {
  ComparePeriod,
  CompareWindow
} from '@features/trackers/calculators/averageStats'
import { fmtNum } from '@features/trackers/detailFormat'
import { useThemeColors } from '@hooks/useThemeColors'

const WINDOWS: CompareWindow[] = [
  '7d',
  '14d',
  '30d',
  '4w',
  '3m',
  '6m',
  '12m',
  '7logs',
  '30logs'
]

/** CompareWindow → i18n key under detail.avgWin (keys can't start with a digit). */
const WIN_KEY: Record<CompareWindow, string> = {
  '7d': 'd7',
  '14d': 'd14',
  '30d': 'd30',
  '4w': 'w4',
  '3m': 'm3',
  '6m': 'm6',
  '12m': 'm12',
  '7logs': 'log7',
  '30logs': 'log30'
}

/** "29 Jun – 5 Jul" (localized, UTC to avoid TZ drift); em dash when empty. */
function rangeLabel(p: ComparePeriod, lang: string): string {
  if (!p.startISO || !p.endISO) return '—'
  const f = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(lang, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC'
    })
  return `${f(p.startISO)} – ${f(p.endISO)}`
}

/** Option rows inside the sheet; own component so it can call useBottomSheet(). */
function WindowList({
  value,
  onChange
}: {
  value: CompareWindow
  onChange: (w: CompareWindow) => void
}) {
  const { t } = useTranslation()
  const c = useThemeColors()
  const { onOpenChange } = useBottomSheet()
  return (
    <View>
      {WINDOWS.map((w) => {
        const on = w === value
        return (
          <Pressable
            key={w}
            onPress={() => {
              onChange(w)
              onOpenChange(false)
            }}
            className={`flex-row items-center justify-between rounded-md-k px-s4 py-s3 active:opacity-80 ${
              on ? 'bg-surface-2' : ''
            }`}
          >
            <Typography
              className={`text-base ${on ? 'font-bold text-ink' : 'text-ink-2'}`}
            >
              {t(`detail.avgWin.${WIN_KEY[w]}`)}
            </Typography>
            {on ? <Check size={20} color={c.pace.on_track} /> : null}
          </Pressable>
        )
      })}
    </View>
  )
}

/**
 * Strides-style period-comparison card: header opens a BottomSheet window
 * picker; body shows the current period (green bar) vs the previous one (blue
 * bar) with proportional widths and an avg + delta line.
 */
export function AverageComparisonCard({
  window,
  onChangeWindow,
  current,
  previous,
  deltaPct
}: {
  window: CompareWindow
  onChangeWindow: (w: CompareWindow) => void
  current: ComparePeriod
  previous: ComparePeriod
  deltaPct: number | null
}) {
  const { t, i18n } = useTranslation()
  const c = useThemeColors()
  const insets = useSafeAreaInsets()
  const lang = i18n.language
  const perLabel = t(current.perLog ? 'detail.avgPerLog' : 'detail.avgPerDay')
  const maxAvg = Math.max(current.avg, previous.avg)
  // Bar width tracks the value but keeps room for the range label.
  const widthPct = (avg: number) =>
    maxAvg > 0 ? Math.max(38, Math.round((avg / maxAvg) * 100)) : 38

  const up = (deltaPct ?? 0) >= 0
  const deltaEl =
    deltaPct == null ? (
      <Typography className='text-sm font-bold text-ink-3'>—</Typography>
    ) : (
      <Typography
        className={`text-sm font-bold ${up ? 'text-pace-on' : 'text-pace-behind'}`}
      >
        {`${up ? '▲' : '▼'} ${fmtNum(Math.abs(deltaPct))}%`}
      </Typography>
    )

  return (
    <View className='m-s5 rounded-xl-k border border-line bg-surface p-s5'>
      <BottomSheet>
        <BottomSheet.Trigger asChild>
          <Pressable className='flex-row items-center justify-center gap-s1 pb-s4 active:opacity-80'>
            <Typography className='text-h3-k font-bold text-ink'>
              {t('detail.avgChartTitle')}
            </Typography>
            <Typography className='text-h3-k text-ink-2'>
              {`· ${t(`detail.avgWin.${WIN_KEY[window]}`)}`}
            </Typography>
            <ChevronDown size={18} color={c.ink3} />
          </Pressable>
        </BottomSheet.Trigger>
        <BottomSheet.Portal>
          {/* Explicit scrim — same rationale as SelectField */}
          <BottomSheet.Overlay className='bg-black/60' />
          <BottomSheet.Content>
            {/* runtime: safe-area inset */}
            <View className='px-s4' style={{ paddingBottom: insets.bottom + 12 }}>
              <BottomSheet.Title className='mb-s3 text-lg font-bold text-ink'>
                {t('detail.avgChartTitle')}
              </BottomSheet.Title>
              <WindowList value={window} onChange={onChangeWindow} />
            </View>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

      {/* current period */}
      <View className='gap-s2'>
        <View className='flex-row items-center gap-s2'>
          <Typography className='text-xl font-bold text-ink'>
            {fmtNum(current.avg)}
          </Typography>
          <Typography className='text-sm text-ink-2'>{perLabel}</Typography>
          {deltaEl}
        </View>
        <View
          className='h-[34px] justify-center rounded-md-k bg-pace-on px-s3'
          style={{ width: `${widthPct(current.avg)}%` }} // value-derived width
        >
          <Typography
            numberOfLines={1}
            className='text-sm font-bold text-on-accent'
          >
            {rangeLabel(current, lang)}
          </Typography>
        </View>
      </View>

      <View className='my-s4 h-[1px] bg-line' />

      {/* previous period */}
      <View className='gap-s2'>
        <View className='flex-row items-center gap-s2'>
          <Typography className='text-xl font-bold text-ink'>
            {fmtNum(previous.avg)}
          </Typography>
          <Typography className='text-sm text-ink-2'>{perLabel}</Typography>
        </View>
        <View
          className='h-[34px] justify-center rounded-md-k bg-brand px-s3'
          style={{ width: `${widthPct(previous.avg)}%` }} // value-derived width
        >
          <Typography
            numberOfLines={1}
            className='text-sm font-bold text-on-accent'
          >
            {rangeLabel(previous, lang)}
          </Typography>
        </View>
      </View>
    </View>
  )
}
```

- [ ] **Step 3: Create `AverageStatsRow.tsx`**

```tsx
import { View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type { Tracker } from '@features/trackers/types'
import type { AverageBucketStats } from '@features/trackers/calculators/averageStats'
import { fmtNum } from '@features/trackers/detailFormat'
import { useThemeColors } from '@hooks/useThemeColors'

const RING_SIZE = 104
const RING_STROKE = 8

/** Thin progress ring (-90° start), same construction as the Today card's. */
function Ring({ fraction, color }: { fraction: number; color: string }) {
  const c = useThemeColors()
  const r = (RING_SIZE - RING_STROKE) / 2
  const circumference = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, fraction))
  return (
    <Svg
      width={RING_SIZE}
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      // runtime: SVG transform, no className equivalent
      style={{ transform: [{ rotate: '-90deg' }] }}
    >
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={r}
        fill='none'
        stroke={c.line}
        strokeWidth={RING_STROKE}
      />
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={r}
        fill='none'
        stroke={color}
        strokeWidth={RING_STROKE}
        strokeLinecap='round'
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
      />
    </Svg>
  )
}

/**
 * Strides-style stats trio: current streak | average ring (official Ø vs goal,
 * with "X under/over") | success rate over period buckets.
 */
export function AverageStatsRow({
  tracker,
  average,
  stats
}: {
  tracker: Tracker
  average: number
  stats: AverageBucketStats
}) {
  const { t } = useTranslation()
  const c = useThemeColors()
  const goal = tracker.targetValue ?? 0
  const diff = goal - average
  const met = goal > 0 && average >= goal
  const unitLabel =
    stats.unit === 'day'
      ? t('detail.days')
      : stats.unit === 'week'
        ? t('detail.unitWeeks')
        : t('detail.unitMonths')
  const pct = stats.dueBuckets
    ? Math.round((stats.metBuckets / stats.dueBuckets) * 100)
    : 0

  return (
    <View className='m-s5 flex-row items-center rounded-xl-k border border-line bg-surface p-s5'>
      {/* current streak */}
      <View className='flex-1 items-center gap-s1'>
        <Typography className='text-center text-xs font-bold text-ink-2'>
          {t('detail.currentStreak')}
        </Typography>
        <Typography className='text-3xl font-bold text-ink'>
          {stats.streak}
        </Typography>
        <Typography className='text-xs text-ink-3'>{unitLabel}</Typography>
      </View>

      {/* average ring */}
      <View className='items-center justify-center'>
        <Ring
          fraction={goal > 0 ? average / goal : 0}
          color={met ? c.pace.on_track : c.brand}
        />
        <View className='absolute items-center'>
          <Typography className='text-xs font-bold text-ink-2'>
            {t('detail.avgChartTitle')}
          </Typography>
          <Typography
            className={`text-2xl font-bold ${met ? 'text-pace-on' : 'text-pace-behind'}`}
          >
            {fmtNum(average)}
          </Typography>
          {goal > 0 ? (
            <Typography className='text-xs text-ink-3'>
              {diff > 0
                ? t('detail.avgUnder', { n: fmtNum(diff) })
                : t('detail.avgOver', { n: fmtNum(-diff) })}
            </Typography>
          ) : null}
        </View>
      </View>

      {/* success rate */}
      <View className='flex-1 items-center gap-s1'>
        <Typography className='text-center text-xs font-bold text-ink-2'>
          {t('detail.successRate')}
        </Typography>
        <Typography className='text-3xl font-bold text-ink'>
          {`${pct}%`}
        </Typography>
        <Typography className='text-xs text-ink-3'>
          {`${stats.metBuckets}/${stats.dueBuckets} ${unitLabel}`}
        </Typography>
      </View>
    </View>
  )
}
```

Note: `useThemeColors` exposes `c.brand`, `c.line`, `c.ink3`, `c.onAccent`, `c.pace.on_track` (verified in `src/hooks/useThemeColors.ts`); `text-pace-on`/`text-pace-behind` classes are already generated (used in `PaceBar.tsx` and others).

- [ ] **Step 4: Gates + commit**

Run: `yarn test && yarn tsc && yarn lint`
Expected: suite PASS, tsc clean, lint baseline unchanged. (The two components are not yet imported anywhere — that's fine, tsc still type-checks them.)

```bash
git add src/i18n/locales/en.json src/i18n/locales/vi.json src/features/trackers/components/AverageComparisonCard.tsx src/features/trackers/components/AverageStatsRow.tsx
git commit -m "feat(trackers): average detail comparison & stats cards + i18n

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `AverageChartsTab` + `AverageDetailView` + screen wiring

**Files:**
- Create: `src/features/trackers/components/AverageChartsTab.tsx`
- Create: `src/features/trackers/components/AverageDetailView.tsx`
- Modify: `src/screens/trackers/TrackerDetailScreen.tsx` (add the `average` branch after the `target` branch, ~line 137)

**Interfaces:**
- Consumes: Task 1–3 exports; `WeeklyChart` (`{ data: PeriodSessions; formatLabel: (startISO: string) => string }`); `calculateAverage` from `@features/trackers/calculators/average`; `HabitDetailProvider`/`useHabitDetail`, `HabitTabBar`, `HabitHistoryTab`, `HabitNotesTab`; `Icons.Plus`; `toISODate` from `@utils/date`.
- Produces: `AverageDetailView({ tracker, entries, onAddLog, onEditEntry, onLogForDate })` — same prop shape as `TargetDetailView`.

- [ ] **Step 1: Create `AverageChartsTab.tsx`**

```tsx
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type { Tracker, Entry } from '@features/trackers/types'
import { calculateAverage } from '@features/trackers/calculators/average'
import {
  averageBarSeries,
  averageBucketStats,
  compareWindows
} from '@features/trackers/calculators/averageStats'
import type { CompareWindow } from '@features/trackers/calculators/averageStats'
import type { PeriodUnit } from '@features/trackers/calculators/habitStats'
import { Icons } from '@features/trackers/icons'
import { toISODate } from '@utils/date'
import { useThemeColors } from '@hooks/useThemeColors'
import { AverageComparisonCard } from './AverageComparisonCard'
import { AverageStatsRow } from './AverageStatsRow'
import { WeeklyChart } from './WeeklyChart'

/** X-axis label for a bucket start, adapted to the chart's unit. */
function barLabel(startISO: string, unit: PeriodUnit, lang: string): string {
  const d = new Date(`${startISO}T00:00:00Z`)
  if (unit === 'day') {
    return d.toLocaleDateString(lang, {
      day: 'numeric',
      month: 'numeric',
      timeZone: 'UTC'
    })
  }
  if (unit === 'month') {
    return d.toLocaleDateString(lang, { month: 'short', timeZone: 'UTC' })
  }
  return d.toLocaleDateString(lang, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  })
}

/**
 * Average Charts tab — Strides-style: period-comparison card (window picker),
 * streak/average/success stats row, and a value bar chart with the goal line.
 * The floating "Log today" opens the numeric log modal (adds a new record;
 * same-day logs sum, matching the Today screen).
 */
export function AverageChartsTab({
  tracker,
  entries,
  onAddLog
}: {
  tracker: Tracker
  entries: Entry[]
  onAddLog?: () => void
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const c = useThemeColors()
  const insets = useSafeAreaInsets()
  const today = toISODate(new Date())
  const [win, setWin] = useState<CompareWindow>('7d')

  const cmp = compareWindows(tracker, entries, today, win)
  const stats = averageBucketStats(tracker, entries, today)
  const series = averageBarSeries(tracker, entries, today)
  const average = calculateAverage(tracker, entries, today).current

  return (
    <View className='flex-1'>
      <ScrollView
        // Extra bottom room so the last card clears the floating "Log today"
        // button: safe-area + button height (52) + its top/bottom padding.
        contentContainerStyle={{ paddingBottom: insets.bottom + 88 }} // safe-area, runtime
        showsVerticalScrollIndicator={false}
      >
        <AverageComparisonCard
          window={win}
          onChangeWindow={setWin}
          current={cmp.current}
          previous={cmp.previous}
          deltaPct={cmp.deltaPct}
        />
        <AverageStatsRow tracker={tracker} average={average} stats={stats} />

        {/* value trend — adapts to the tracker's period */}
        <View className='m-s5 rounded-xl-k border border-line bg-surface p-s5'>
          <Typography className='mb-s4 text-h3-k font-bold text-ink'>
            {t(`detail.valueBy.${series.unit}`)}
          </Typography>
          <WeeklyChart
            data={series}
            formatLabel={(iso) => barLabel(iso, series.unit, lang)}
          />
        </View>
      </ScrollView>

      {/* Floating "Log today" — pinned above the scrolling content. */}
      <View
        className='absolute inset-x-0 bottom-0 px-s4 pt-s3'
        style={{ paddingBottom: insets.bottom + 8 }} // safe-area, runtime
        pointerEvents='box-none'
      >
        <Pressable
          onPress={() => onAddLog?.()}
          className='h-[52px] flex-row items-center justify-center gap-s2 rounded-md-k bg-brand active:opacity-90'
        >
          <Icons.Plus size={20} color={c.onAccent} />
          <Typography className='text-base font-bold text-on-accent'>
            {t('detail.logToday')}
          </Typography>
        </Pressable>
      </View>
    </View>
  )
}
```

Note on card margins: three cards each use `m-s5` like `HabitChartsTab` — vertical gaps double up between cards exactly as they do on the habit tab, keeping the two tabs visually consistent.

- [ ] **Step 2: Create `AverageDetailView.tsx`**

```tsx
import { StyleSheet } from 'react-native'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import type { Tracker, Entry } from '@features/trackers/types'
import { HabitHistoryTab } from './HabitHistoryTab'
import { HabitNotesTab } from './HabitNotesTab'
import { HabitDetailProvider, useHabitDetail } from './HabitDetailContext'
import { HabitTabBar } from './HabitTabBar'
import { AverageChartsTab } from './AverageChartsTab'

const Tab = createMaterialTopTabNavigator()

// Transparent scene so the screen's bg-bg shows through. Host prop, no className.
const styles = StyleSheet.create({
  scene: { backgroundColor: 'transparent' }
})

/** Charts screen — reads shared data + the add-log callback from context. */
function ChartsScreen() {
  const { tracker, entries, onAddLog } = useHabitDetail()
  return (
    <AverageChartsTab tracker={tracker} entries={entries} onAddLog={onAddLog} />
  )
}

/** History screen — reads shared data + callbacks from context. */
function HistoryScreen() {
  const { tracker, entries, onAddLog, onEditEntry, onLogForDate } =
    useHabitDetail()
  return (
    <HabitHistoryTab
      tracker={tracker}
      entries={entries}
      onAddLog={onAddLog}
      onEditEntry={onEditEntry}
      onLogForDate={onLogForDate}
    />
  )
}

/** Notes screen — reads tracker, entries, and the edit callback from context. */
function NotesScreen() {
  const { tracker, entries, onEditEntry } = useHabitDetail()
  return (
    <HabitNotesTab
      tracker={tracker}
      entries={entries}
      onEditEntry={onEditEntry}
    />
  )
}

/**
 * AverageDetailView — Average detail body as a 3-tab navigator (Charts /
 * History / Notes) reusing the Habit tab shell, custom pill tab bar, and
 * detail context. Tap-only (swipe disabled). History/Notes render the logged
 * numeric value because the tracker isn't a habit.
 */
export function AverageDetailView({
  tracker,
  entries,
  onAddLog,
  onEditEntry,
  onLogForDate
}: {
  tracker: Tracker
  entries: Entry[]
  onAddLog?: () => void
  onEditEntry?: (entry: Entry) => void
  onLogForDate?: (iso: string) => void
}) {
  return (
    <HabitDetailProvider
      value={{ tracker, entries, onAddLog, onEditEntry, onLogForDate }}
    >
      <Tab.Navigator
        tabBar={HabitTabBar}
        screenOptions={{
          swipeEnabled: false,
          lazy: true,
          sceneStyle: styles.scene
        }}
      >
        <Tab.Screen name='charts' component={ChartsScreen} />
        <Tab.Screen name='history' component={HistoryScreen} />
        <Tab.Screen name='notes' component={NotesScreen} />
      </Tab.Navigator>
    </HabitDetailProvider>
  )
}
```

- [ ] **Step 3: Wire the screen branch**

In `src/screens/trackers/TrackerDetailScreen.tsx`:

Add the import next to the other detail views:

```ts
import { AverageDetailView } from '@features/trackers/components/AverageDetailView'
```

After the `if (tracker.type === 'target') { … }` block, add:

```tsx
  if (tracker.type === 'average') {
    return (
      <View className='flex-1 bg-bg'>
        {appbar}
        <AverageDetailView
          tracker={tracker}
          entries={entries}
          onAddLog={openAddLog}
          onEditEntry={openEditLog}
          onLogForDate={openLogForDate}
        />
        {logModalEl}
      </View>
    )
  }
```

Leave the fallback block untouched (it now serves only `project`; its `tracker.type !== 'project'` guard around `LogTodayButton` simply never fires).

- [ ] **Step 4: Gates + commit**

Run: `yarn test && yarn tsc && yarn lint`
Expected: suite PASS, tsc clean, lint baseline unchanged.

```bash
git add src/features/trackers/components/AverageChartsTab.tsx src/features/trackers/components/AverageDetailView.tsx src/screens/trackers/TrackerDetailScreen.tsx
git commit -m "feat(trackers): average detail 3-tab view with Strides charts tab

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Simulator verification

JS-only change — reload Metro / relaunch the installed dev build (`yarn ios` if needed).

**Files:** none.

- [ ] **Step 1: Static gates** — `yarn test && yarn tsc && yarn lint` all green.
- [ ] **Step 2: Launch** — open an average tracker's detail from the Trackers tab.
- [ ] **Step 3: Manual checklist**
  1. Detail shows the 3 pill tabs (Charts / History / Notes); Charts is active by default; History and Notes behave exactly as on habit/target (numeric values, editable goal note).
  2. Card 1: header "Trung bình · 7 ngày ˅"; tapping opens the BottomSheet with 9 options and a check on the current one; picking "30 ngày" re-renders both rows with 30-day ranges; green bar = current period incl. today, blue = previous; widths proportional; delta arrow/％ correct sign (log something today to see it move); "—" when the previous period is empty.
  3. Card 2: streak, ring average (matches the Ø on the tracker card — respects Rolling/Since Start), "thiếu/vượt X", success rate m/n with the right unit for daily vs weekly trackers.
  4. Card 3: daily tracker → per-day bars with values (decimals shown to 1dp), goal line at targetValue, opens scrolled to today; weekly tracker → 4 bars; monthly → 3 bars.
  5. Floating "Log hôm nay" opens the numeric modal; saving updates all three cards instantly.
  6. Dark mode: all three cards legible (bars, ring, sheet).
  7. Language switch EN ↔ VI relabels everything on the tab.
- [ ] **Step 4:** Report deviations back into the plan before fixing.
