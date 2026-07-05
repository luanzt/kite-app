# Average Tracker Detail — 3-tab Strides-style screen

**Date:** 2026-07-05
**Type:** Feature (new detail view for `average` trackers)
**Depends on:** the average-form branch (`averageWindow`/`rollingDays`/`doneRule`/`progressBasis` fields, PR #30)

## Goal

Give `average` trackers the same 3-tab detail experience habit and target
already have (Charts / History / Notes), with a Charts tab matching the
Strides reference: a period-comparison card with a window picker, a
three-stat card (streak / average ring / success rate), and a value bar
chart with a goal line. History and Notes reuse the existing shared tabs
unchanged.

## Architecture (mirrors TargetDetailView exactly)

- **`AverageDetailView.tsx`** (new, `src/features/trackers/components/`) —
  copy of `TargetDetailView`'s shell: `createMaterialTopTabNavigator` with
  screens `charts` / `history` / `notes`, `tabBar={HabitTabBar}`,
  `swipeEnabled: false`, `lazy: true`, transparent `sceneStyle`, everything
  passed through `HabitDetailProvider` (`{tracker, entries, onAddLog,
  onEditEntry, onLogForDate}`). `history` → `HabitHistoryTab`, `notes` →
  `HabitNotesTab` (both reused as-is; they already render numeric values for
  non-habit trackers). `charts` → `AverageChartsTab`.
- **`TrackerDetailScreen.tsx`** — add an `average` branch (same shape as the
  `target` branch) rendering `DetailAppbar` + `AverageDetailView` +
  `logModalEl`. The fallback inline layout (`DetailHero`/`DetailStatGrid`/
  `DetailBody`) now serves only `project`; the `LogTodayButton`/`onLogToday`
  path there becomes project-only dead code for average (the
  `tracker.type !== 'project'` guard can stay — average never reaches it).
- **`AverageChartsTab.tsx`** (new) — `ScrollView` with three cards + the
  floating "Log today" button (same layout/classes as `TargetOverviewTab`'s
  floating button). The button always calls `onAddLog?.()` (opens the numeric
  `LogEntryModal` to ADD a log — multiple same-day logs sum, matching the
  Today screen; no edit-today special case).

All three cards use the existing card convention:
`m-s5 rounded-xl-k border border-line bg-surface p-s5` (top card `mb-0`-style
spacing may collapse; follow HabitChartsTab's `m-s5` per card).

## Card 1 — Period comparison (`AverageComparisonCard`, new component)

**Header:** centered `Trung bình · <window> ˅` — a `Pressable` opening a
HeroUI **BottomSheet** listing the nine windows (Kite overlay convention; NOT
a pushed screen). Selected row shows a check icon. Choice lives in
`AverageChartsTab` local state, default `'7d'`; not persisted (YAGNI).

**Windows** (`CompareWindow` union):
`'7d' | '14d' | '30d' | '4w' | '3m' | '6m' | '12m' | '7logs' | '30logs'`

Semantics:
- **Day windows** (`7d`=7, `14d`=14, `30d`=30, `4w`=28 days): current window =
  the N calendar days ending today (inclusive); previous = the N days
  immediately before it. Row value = **sum of entry values in the window ÷ N**
  ("avg/day", fixed divisor even if the tracker is younger than the window).
- **Month windows** (`3m`/`6m`/`12m` = N calendar months): current =
  `(isoAddMonths(today, -N), today]`, previous = the N months before that.
  `isoAddMonths` clamps the day (Mar 31 − 1m → Feb 28). Value = sum ÷ days in
  that window ("avg/day"; divisor = actual day count of the window).
- **Log windows** (`7logs`/`30logs`): current = the N most recent entries
  (ordered by `date`, then `createdAt`), previous = the N entries before
  those. Value = **mean of entry values** ("avg/log"). Range label = first→last
  entry date of the group. A group with no entries: value 0, range label null
  (render an em dash).

**Body:** two rows exactly like the reference —
1. Current period: `<avg> avg/day` + delta vs previous (`▲ 12%` pace-green /
   `▼ 8%` pace-red; previous avg 0 or missing → "—"), below it a **green**
   rounded bar containing the white range label ("28 Jun – 4 Jul").
2. Previous period: `<avg> avg/day`, **blue** (brand) rounded bar with its
   range label.

Bar widths are proportional: `width % = value / max(current, previous)` with
a minimum width so the label always fits — runtime-continuous value → inline
`style={{ width: pct }}` is the legitimate exception per project styling
rules. Values formatted with `fmtNum`. Date ranges via `toLocaleDateString`
(day + short month, honoring the app language) like existing detail labels.

## Card 2 — Stats row (`AverageStatsRow`, new component)

Three columns, mirroring the reference layout:
- **Left — Current streak:** consecutive **met period-buckets** ending at the
  current bucket; the current (incomplete) bucket is neutral — it extends the
  streak if already met but never breaks it (mirrors habit's today-neutral
  rule). Label uses the bucket unit (days / weeks / months).
- **Center — Average ring:** big number = the tracker's **official average**
  from `calculateAverage(tracker, entries, today).current` (so it respects
  the Rolling/Since-Start setting), inside a thin circular ring (SVG, like
  the Today card's `Ring`; neutral track color). Below: `X under` / `X over`
  = `|goal − avg|` vs `targetValue` (under → pace-behind red, over/met →
  pace-on green, formatted with fmtNum).
- **Right — Success rate:** `metBuckets/dueBuckets` since `startDate`, shown
  as a big percentage + `m/n <unit>` underneath.

**Bucket semantics (used by streak & success rate; card 3 renders ALL
buckets and reuses only the met-threshold for bar coloring):** buckets follow
`tracker.period` — daily → calendar days (only days due
per `repeatDays` count, and a day is met when its summed total ≥
`targetValue`); weekly → Monday-start weeks (met when week total ≥ goal);
monthly → calendar months (met when month total ≥ goal). Weekly/monthly
buckets ignore `repeatDays` (the goal is already per-period). `targetValue`
null/0 → nothing is ever "met"; streak 0, success 0/n.

## Card 3 — Value bar chart (reuses `WeeklyChart` unchanged)

A new pure builder produces a `PeriodSessions`-shaped object so the existing
`WeeklyChart` renders it with zero component changes:
- daily period → `unit: 'day'`, one bar per day from `startDate` → today
  (capped at 180 like `DAILY_MAX_BARS`), `count` = that day's summed value;
  `perDayTarget = targetValue` (drives the green met-coloring + goal line).
- weekly → `unit: 'week'`, 4 bars; monthly → `unit: 'month'`, 3 bars
  (mirroring `BARS_PER_UNIT`), `count` = bucket sum.
- `goal = targetValue ?? 0`, `scaleMax = max(goal, max bar, 1)`. Bar values
  rounded to 1 decimal in the builder (WeeklyChart prints `count` raw).
- Card title: reuse the period-adapted heading pattern
  (`detail.sessionsBy.*` equivalents for values — new keys, see i18n).

## New pure engine — `calculators/averageStats.ts` (TDD, DB-free)

```ts
export type CompareWindow =
  | '7d' | '14d' | '30d' | '4w' | '3m' | '6m' | '12m' | '7logs' | '30logs'

export type ComparePeriod = {
  startISO: string | null // null for an empty log-window group
  endISO: string | null
  avg: number
  perLog: boolean // true for log windows → "avg/log" label
}

export function isoAddMonths(iso: string, n: number): string // day-clamped

export function compareWindows(
  tracker: Tracker, entries: Entry[], todayISO: string, win: CompareWindow
): { current: ComparePeriod; previous: ComparePeriod; deltaPct: number | null }

export type AverageBucketStats = {
  streak: number
  metBuckets: number
  dueBuckets: number
  unit: 'day' | 'week' | 'month' // from tracker.period
}
export function averageBucketStats(
  tracker: Tracker, entries: Entry[], todayISO: string
): AverageBucketStats

export function averageBarSeries(
  tracker: Tracker, entries: Entry[], todayISO: string
): PeriodSessions // plugs straight into WeeklyChart
```

Reuses `dayTotalsOf`, `isoAddDays`, `isDueOn`, `weekStartOf`-equivalents from
`habitStats` where exported; new date helpers live in `averageStats.ts`.

`deltaPct = (current.avg − previous.avg) / previous.avg × 100`, null when
`previous.avg === 0`.

## i18n (en + vi, key-for-key)

New `detail.*` keys (exact strings finalized in the plan):
- `avgWin`: object with `d7, d14, d30, w4, m3, m6, m12, log7, log30`
  ("7 days" … "30 logs" / "7 ngày" … "30 log")
- `avgChartTitle` ("Average" / "Trung bình") — card-1 header prefix & sheet title
- `avgPerDay` ("avg/day" / "TB/ngày"), `avgPerLog` ("avg/log" / "TB/log")
- `avgUnder` ("{{n}} under" / "thiếu {{n}}"), `avgOver` ("{{n}} over" / "vượt {{n}}")
- `unitWeeks` ("weeks" / "tuần"), `unitMonths` ("months" / "tháng") — streak/
  success units (days reuses existing `detail.days`)
- `metOfDue` ("{{met}}/{{due}}") composed with the unit label
- `valueBy`: `{ day, week, month }` — card-3 titles ("Daily total",
  "Total per week", "Total per month" / VI equivalents)
- Existing reused: `detail.currentStreak`, `detail.successRate`,
  `detail.logToday`, `detail.goal`.

## Files touched

- New: `components/AverageDetailView.tsx`, `components/AverageChartsTab.tsx`,
  `components/AverageComparisonCard.tsx`, `components/AverageStatsRow.tsx`,
  `calculators/averageStats.ts` + `calculators/__tests__/averageStats.test.ts`
- Modified: `screens/trackers/TrackerDetailScreen.tsx` (average branch),
  `src/i18n/locales/{en,vi}.json`

## Testing

- `averageStats.test.ts` (TDD): day-window boundaries & fixed divisor;
  4w=28d; month windows incl. day-clamping (Jan 31 → Feb 28) and divisor =
  actual window length; log-window grouping, ordering (date+createdAt), empty
  groups; deltaPct sign/null; bucket stats for all three periods (streak
  neutrality of current bucket, repeatDays only affecting daily, goal 0 →
  never met); bar series shapes (caps, scaleMax, rounding, perDayTarget only
  for daily).
- Components/screen: device-verified on simulator (per project strategy).

## Out of scope

- Persisting the selected compare window (view state only, resets per visit).
- Any change to habit/target/project detail views, HistoryTab, NotesTab,
  WeeklyChart, or the Settings tab idea from the Strides screenshots (Kite
  edits via the existing form screen instead).
- Sparkline/period rows beyond current + previous (Strides may list more
  history; v1 shows exactly two rows).
