# Calendar tap-to-log + per-day progress ring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user tap a due day in the Habit Detail calendar to add one log to that day, and show each day's progress as a ring (partial = blue arc, done = green pill), dropping the special "today" marker.

**Architecture:** `CalendarCell` gains `iso`/`value`/`goal`; a new pure `dayTotalsOf` helper is the single source of daily-total truth (used by both `doneDatesOf` and `buildCalendarMonth`). `HabitCalendar` renders a per-cell ring from `value/goal` using `react-native-svg`, and taps on due-not-done cells fire an `onLogDay(iso)` prop wired in `HabitChartsTab` to the existing `useLogEntry` mutation.

**Tech Stack:** React Native, TypeScript (strict), react-native-svg, HeroUI Native, Uniwind (Tailwind v4), TanStack Query, i18next, Jest.

## Global Constraints

- Text: use `<Typography>` from `heroui-native`, never `<Text>`.
- Style with Tailwind `className`; never interpolate a value into a class string. SVG stroke/fill + lucide `color` come from `useThemeColors()`.
- Icons only from `lucide-react-native`.
- Use `Typography`, `View`, `Pressable`, `react-native-svg` primitives — no react-native `Modal`.
- Named exports only. `yarn tsc` must be clean before each commit.
- i18n: never hardcode visible strings; keep `en.json` and `vi.json` key-for-key in sync.
- TDD: write the failing test first for pure logic. op-sqlite / RN host components are unavailable in Jest — do NOT unit-test component render/tap; verify on simulator.
- Per-tracker identity colors are NOT theme chrome. Ring chrome colors: track `c.line`, partial arc `c.brand`, done pill uses the `bg-pace-on` class.

---

### Task 1: `dayTotalsOf` helper + `CalendarCell` fields in `habitStats.ts`

**Files:**
- Modify: `src/features/trackers/calculators/habitStats.ts`
- Test: `src/features/trackers/calculators/__tests__/habitStats.test.ts`

**Interfaces:**
- Consumes: `Tracker`, `Entry` (from `@features/trackers/types`); existing `perDayGoal`, `isDueOn`, `weekdayOf`.
- Produces:
  - `dayTotalsOf(tracker: Tracker, entries: Entry[]): Map<string, number>` — iso(YYYY-MM-DD) → summed `value`.
  - Extended `CalendarCell = { day: number; status: CalendarStatus; iso: string; value: number; goal: number }`.
  - `buildCalendarMonth(...)` populates the new fields (signature unchanged).
  - `doneDatesOf` unchanged in behavior (now derived from `dayTotalsOf`).

- [ ] **Step 1: Write the failing tests**

Add to `src/features/trackers/calculators/__tests__/habitStats.test.ts` (import `dayTotalsOf` alongside the existing imports from `../habitStats`):

```ts
describe('dayTotalsOf', () => {
  const tracker = { targetValue: 5, period: 'daily', repeatDays: [] } as any
  it('sums multiple entries on the same day', () => {
    const entries = [
      { id: 'a', trackerId: 't', date: '2026-07-01', value: 2, note: null, createdAt: '2026-07-01T01:00:00Z' },
      { id: 'b', trackerId: 't', date: '2026-07-01', value: 3, note: null, createdAt: '2026-07-01T02:00:00Z' },
      { id: 'c', trackerId: 't', date: '2026-07-02', value: 1, note: null, createdAt: '2026-07-02T01:00:00Z' }
    ] as any
    const totals = dayTotalsOf(tracker, entries)
    expect(totals.get('2026-07-01')).toBe(5)
    expect(totals.get('2026-07-02')).toBe(1)
    expect(totals.get('2026-07-03')).toBeUndefined()
  })
})

describe('buildCalendarMonth cell progress fields', () => {
  const tracker = { startDate: '2026-07-01', targetValue: 5, period: 'daily', repeatDays: [] } as any
  const entries = [
    { id: 'a', trackerId: 't', date: '2026-07-01', value: 2, note: null, createdAt: '2026-07-01T01:00:00Z' }, // partial 2/5
    { id: 'b', trackerId: 't', date: '2026-07-02', value: 5, note: null, createdAt: '2026-07-02T01:00:00Z' }  // done 5/5
  ] as any
  const month = buildCalendarMonth(tracker, entries, 2026, 6, '2026-07-03') // month 6 = July

  it('carries iso, value and goal on each cell', () => {
    const d1 = month.cells.find((c) => c.day === 1)!
    expect(d1.iso).toBe('2026-07-01')
    expect(d1.value).toBe(2)
    expect(d1.goal).toBe(5)
  })
  it('a below-goal day is not "done"', () => {
    const d1 = month.cells.find((c) => c.day === 1)!
    expect(d1.status).not.toBe('done')
    expect(d1.value).toBeLessThan(d1.goal)
  })
  it('an at-or-above-goal day is "done"', () => {
    const d2 = month.cells.find((c) => c.day === 2)!
    expect(d2.status).toBe('done')
    expect(d2.value).toBeGreaterThanOrEqual(d2.goal)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test src/features/trackers/calculators/__tests__/habitStats.test.ts`
Expected: FAIL — `dayTotalsOf` is not exported; `iso`/`value`/`goal` missing on cells (TS/assertion errors).

- [ ] **Step 3: Add `dayTotalsOf`, refactor `doneDatesOf`, extend the type + `buildCalendarMonth`**

In `src/features/trackers/calculators/habitStats.ts`:

Add the helper (place it just above `doneDatesOf`):

```ts
/** Summed logged value per ISO day (YYYY-MM-DD). Single source of daily totals. */
export function dayTotalsOf(
  tracker: Tracker,
  entries: Entry[]
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const e of entries) {
    const day = e.date.slice(0, 10)
    totals.set(day, (totals.get(day) ?? 0) + e.value)
  }
  return totals
}
```

Rewrite `doneDatesOf` to reuse it:

```ts
/** The set of ISO dates whose summed logged value met the per-day goal. */
export function doneDatesOf(tracker: Tracker, entries: Entry[]): Set<string> {
  const goal = perDayGoal(tracker)
  const totals = dayTotalsOf(tracker, entries)
  return new Set(
    [...totals].filter(([, total]) => total >= goal).map(([day]) => day)
  )
}
```

Extend the `CalendarCell` type:

```ts
export type CalendarCell = {
  day: number
  status: CalendarStatus
  iso: string // full YYYY-MM-DD, for tap-to-log
  value: number // summed logged value that day
  goal: number // perDayGoal(tracker)
}
```

In `buildCalendarMonth`, compute totals + goal once and populate the cell. Replace the cell-building loop body so each cell carries the new fields:

```ts
export function buildCalendarMonth(
  tracker: Tracker,
  entries: Entry[],
  year: number,
  month: number,
  todayISO: string
): CalendarMonth {
  const done = doneDatesOf(tracker, entries)
  const totals = dayTotalsOf(tracker, entries)
  const goal = perDayGoal(tracker)
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const firstISO = `${year}-${pad2(month + 1)}-01`
  const firstWeekdayMon = (weekdayOf(firstISO) + 6) % 7

  const cells: CalendarCell[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${pad2(month + 1)}-${pad2(d)}`
    let status: CalendarStatus
    if (done.has(iso)) status = 'done'
    else if (iso === todayISO) status = 'today'
    else if (!isDueOn(tracker, iso)) status = 'rest'
    else if (iso > todayISO) status = 'future'
    else status = 'none'
    cells.push({ day: d, status, iso, value: totals.get(iso) ?? 0, goal })
  }
  return { year, month, daysInMonth, firstWeekdayMon, cells }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test src/features/trackers/calculators/__tests__/habitStats.test.ts`
Expected: PASS (all existing habitStats tests + the 4 new assertions).

- [ ] **Step 5: Typecheck**

Run: `yarn tsc`
Expected: clean (no output errors).

- [ ] **Step 6: Commit**

```bash
git add src/features/trackers/calculators/habitStats.ts src/features/trackers/calculators/__tests__/habitStats.test.ts
git commit -m "feat(habit-detail): calendar cells carry per-day value/goal/iso"
```

---

### Task 2: i18n `detail.inProgress` legend key

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/vi.json`

**Interfaces:**
- Produces: `t('detail.inProgress')` → EN `"In progress"`, VI `"Đang làm"`.

- [ ] **Step 1: Add the key to `en.json`**

In `src/i18n/locales/en.json`, inside the `detail` object, next to `completed`/`restDay`, add:

```json
"inProgress": "In progress",
```

(Keep valid JSON — a comma after the preceding sibling, no trailing comma if it becomes the last key.)

- [ ] **Step 2: Add the matching key to `vi.json`**

In `src/i18n/locales/vi.json`, inside the `detail` object at the same position:

```json
"inProgress": "Đang làm",
```

- [ ] **Step 3: Verify both files parse and stay in sync**

Run: `node -e "const e=require('./src/i18n/locales/en.json'),v=require('./src/i18n/locales/vi.json'); if(!e.detail.inProgress||!v.detail.inProgress) throw new Error('missing inProgress'); console.log('ok', e.detail.inProgress, '/', v.detail.inProgress)"`
Expected: `ok In progress / Đang làm`

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/vi.json
git commit -m "i18n(detail): add inProgress legend label (en, vi)"
```

---

### Task 3: `HabitCalendar` per-day ring + tap-to-log

**Files:**
- Modify: `src/features/trackers/components/HabitCalendar.tsx`

**Interfaces:**
- Consumes: `CalendarCell` (now with `iso`/`value`/`goal`), `CalendarMonth` from `@features/trackers/calculators/habitStats`; `useThemeColors` from `@hooks/useThemeColors`; `react-native-svg`.
- Produces: `HabitCalendar` gains prop `onLogDay?: (iso: string) => void`. It fires `onLogDay(cell.iso)` ONLY for due, past-or-today, not-done cells.

- [ ] **Step 1: Rewrite `HabitCalendar.tsx`**

Replace the whole file with the version below. `DayCell` picks its render-state from `status` + `value`/`goal`; the SVG ring mirrors `AchievementHero`'s two-circle pattern sized to the 34px cell. Only due (not rest/future) and not-done cells are pressable; today gets no special outline.

```tsx
import { Pressable, View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import Svg, { Circle } from 'react-native-svg'
import type {
  CalendarCell,
  CalendarMonth
} from '@features/trackers/calculators/habitStats'
import { useThemeColors } from '@hooks/useThemeColors'

const CELL = 34
const STROKE = 3
const R = (CELL - STROKE) / 2
const CIRC = 2 * Math.PI * R

/**
 * One calendar day. Render-state derives from status + value/goal:
 *  done (value>=goal)  → filled green pill, white number
 *  partial (0<value<goal, due, today-or-past) → blue arc ring, number
 *  empty (value===0, due, today-or-past)      → faint track ring, number
 *  rest → muted grey pill; future → muted number (no ring)
 * A due, not-done, today-or-past cell is tappable (adds one log to its day).
 */
function DayCell({
  cell,
  todayISO,
  onLogDay
}: {
  cell: CalendarCell
  todayISO: string
  onLogDay?: (iso: string) => void
}) {
  const c = useThemeColors()
  const done = cell.status === 'done'
  const isRest = cell.status === 'rest'
  const isFuture = cell.status === 'future'
  const isPastOrToday = cell.iso <= todayISO
  const due = !isRest && !isFuture && isPastOrToday
  const frac = cell.goal > 0 ? Math.min(1, cell.value / cell.goal) : 0
  const tappable = due && !done && !!onLogDay

  const numberClass = done
    ? 'text-on-accent'
    : isRest
      ? 'text-ink-3'
      : isFuture
        ? 'text-ink-3 opacity-50'
        : 'text-ink'

  const inner = done ? (
    // goal met → filled green pill
    <View className='h-[34px] w-[34px] items-center justify-center rounded-full bg-pace-on'>
      <Typography className={`text-sm font-bold ${numberClass}`}>
        {cell.day}
      </Typography>
    </View>
  ) : isRest ? (
    // not scheduled → muted pill
    <View className='h-[34px] w-[34px] items-center justify-center rounded-full bg-surface-2'>
      <Typography className={`text-sm font-bold ${numberClass}`}>
        {cell.day}
      </Typography>
    </View>
  ) : isFuture ? (
    // future → plain muted number, no ring
    <View className='h-[34px] w-[34px] items-center justify-center'>
      <Typography className={`text-sm font-bold ${numberClass}`}>
        {cell.day}
      </Typography>
    </View>
  ) : (
    // due, today-or-past, not done → track ring + (partial) blue arc
    <View className='h-[34px] w-[34px] items-center justify-center'>
      <Svg width={CELL} height={CELL}>
        <Circle
          cx={CELL / 2}
          cy={CELL / 2}
          r={R}
          stroke={c.line}
          strokeWidth={STROKE}
          fill='none'
        />
        {frac > 0 ? (
          <Circle
            cx={CELL / 2}
            cy={CELL / 2}
            r={R}
            stroke={c.brand}
            strokeWidth={STROKE}
            strokeLinecap='round'
            fill='none'
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - frac)}
            rotation={-90}
            originX={CELL / 2}
            originY={CELL / 2}
          />
        ) : null}
      </Svg>
      <View className='absolute inset-0 items-center justify-center'>
        <Typography className={`text-sm font-bold ${numberClass}`}>
          {cell.day}
        </Typography>
      </View>
    </View>
  )

  if (tappable) {
    return (
      <View className='aspect-square flex-1 items-center justify-center'>
        <Pressable
          onPress={() => onLogDay?.(cell.iso)}
          hitSlop={4}
          className='active:opacity-70'
        >
          {inner}
        </Pressable>
      </View>
    )
  }

  return (
    <View className='aspect-square flex-1 items-center justify-center'>
      {inner}
    </View>
  )
}

/**
 * HabitCalendar — a month grid (Mon-first) painting each day's progress ring,
 * plus a legend. Tapping a due, not-done, today-or-past day fires onLogDay.
 */
export function HabitCalendar({
  month,
  todayISO,
  onLogDay
}: {
  month: CalendarMonth
  todayISO: string
  onLogDay?: (iso: string) => void
}) {
  const { t } = useTranslation()
  const dow = t('detail.dow', { returnObjects: true }) as string[]

  // Fixed 7-column rows (flex-1 per cell) — see the note in the original file
  // about why we build explicit weeks instead of flex-wrap.
  const slots: (CalendarCell | null)[] = [
    ...Array.from({ length: month.firstWeekdayMon }, () => null),
    ...month.cells
  ]
  while (slots.length % 7 !== 0) slots.push(null)
  const weeks: (CalendarCell | null)[][] = []
  for (let i = 0; i < slots.length; i += 7) weeks.push(slots.slice(i, i + 7))

  return (
    <>
      <View className='flex-row'>
        {dow.map((d) => (
          <View
            key={d}
            className='aspect-square flex-1 items-center justify-center'
          >
            <Typography className='text-[11px] font-bold uppercase text-ink-3'>
              {d}
            </Typography>
          </View>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={`w-${wi}`} className='flex-row'>
          {week.map((cell, di) =>
            cell ? (
              <DayCell
                key={cell.day}
                cell={cell}
                todayISO={todayISO}
                onLogDay={onLogDay}
              />
            ) : (
              <View key={`pad-${wi}-${di}`} className='aspect-square flex-1' />
            )
          )}
        </View>
      ))}

      <View className='mt-s4 flex-row gap-s4 border-t border-line pt-s4'>
        <LegendItem dotClass='bg-pace-on' label={t('detail.completed')} />
        <LegendItem
          dotClass='border-2 border-brand'
          label={t('detail.inProgress')}
        />
        <LegendItem
          dotClass='bg-surface-2 border border-line-strong'
          label={t('detail.restDay')}
        />
      </View>
    </>
  )
}

function LegendItem({ dotClass, label }: { dotClass: string; label: string }) {
  return (
    <View className='flex-row items-center gap-s2'>
      <View className={`h-[14px] w-[14px] rounded-full ${dotClass}`} />
      <Typography className='text-xs font-bold text-ink-2'>{label}</Typography>
    </View>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `yarn tsc`
Expected: clean. (It will fail if `HabitChartsTab` still calls `<HabitCalendar month={...} />` without `todayISO` — that is fixed in Task 4. If running Task 3 in isolation, expect a single error at the `HabitCalendar` call site in `HabitChartsTab.tsx`, resolved in Task 4.)

- [ ] **Step 3: Lint**

Run: `yarn lint src/features/trackers/components/HabitCalendar.tsx`
Expected: clean (no `no-inline-styles`, no `Text` import).

- [ ] **Step 4: Commit**

```bash
git add src/features/trackers/components/HabitCalendar.tsx
git commit -m "feat(habit-detail): per-day progress ring + tap-to-log in calendar"
```

---

### Task 4: Wire `onLogDay` in `HabitChartsTab`

**Files:**
- Modify: `src/features/trackers/components/HabitChartsTab.tsx`

**Interfaces:**
- Consumes: `HabitCalendar` (now needs `todayISO`, optional `onLogDay`); existing `log` (`useLogEntry`), `uuid`, `today`, `toast`, `showLogSuccess`, `t`.
- Produces: passes `todayISO={today}` and `onLogDay={onLogDay}` to `<HabitCalendar>`.

- [ ] **Step 1: Add the `onLogDay` handler**

In `src/features/trackers/components/HabitChartsTab.tsx`, just after the existing `onLogToday` definition (around line 116), add:

```ts
  const onLogDay = (iso: string) =>
    log.mutate(
      {
        id: uuid(),
        trackerId: tracker.id,
        date: iso,
        value: 1,
        note: null,
        createdAt: new Date().toISOString()
      },
      {
        onSuccess: () => showLogSuccess(toast, t('toast.logSuccess'))
      }
    )
```

- [ ] **Step 2: Pass the new props to `HabitCalendar`**

Replace the existing call:

```tsx
          <HabitCalendar month={calendar} />
```

with:

```tsx
          <HabitCalendar
            month={calendar}
            todayISO={today}
            onLogDay={onLogDay}
          />
```

- [ ] **Step 3: Typecheck**

Run: `yarn tsc`
Expected: clean.

- [ ] **Step 4: Lint**

Run: `yarn lint src/features/trackers/components/HabitChartsTab.tsx`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/trackers/components/HabitChartsTab.tsx
git commit -m "feat(habit-detail): wire calendar tap-to-log to useLogEntry"
```

---

### Task 5: Simulator verification

**Files:** none (manual verification).

- [ ] **Step 1: Full test + typecheck + lint sweep**

Run: `yarn test && yarn tsc && yarn lint`
Expected: all pass, clean.

- [ ] **Step 2: Run the app and verify on-device**

Run: `yarn ios`

Verify on a habit with a per-day goal > 1 (e.g. "5 Times a Day") and a few past days logged:
- A past day with partial logs shows a blue arc ring proportional to `value/goal`; its number is centered.
- A day at/above goal shows a solid green pill.
- Tapping a past due day with room adds one log — its ring advances and a success toast shows.
- Tapping a day already at goal does nothing.
- Tapping a future day or a rest day does nothing.
- Today is NOT specially outlined (looks like any other due day).
- Legend reads Completed / In progress / Rest day.
- The floating "Log today" button still logs today.

- [ ] **Step 3: Report results**

State plainly whether each check passed, with any deviation.
