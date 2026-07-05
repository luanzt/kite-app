# Calendar tap-to-log + per-day progress ring — Design

## Problem

On the Habit Detail → Charts tab, the monthly calendar is read-only. It marks
done days (solid pill), today (bordered ring), and rest days, but:

1. You cannot log from the calendar — you must use the floating "Log today"
   button (today only) or the History tab (to back-fill).
2. A day with partial progress (e.g. 2 of a 5×/day goal) looks identical to a
   day with zero progress. There is no per-day progress indication.
3. Today is specially marked, which the user finds unnecessary.

## Goal

Make each calendar day show its own progress as a ring, let the user tap a due
day (today or past) to add one log to that day, and drop the special "today"
marker.

## Decisions (from brainstorming)

- **Tap = +1 log immediately** — no modal. Reuses the existing `useLogEntry`
  mutation with `value: 1`, `date: <that day's ISO>`.
- **Loggable days: today + past due days only.** Future days and rest days
  (not scheduled) do not respond to taps.
- **A day already at/above goal (done) does NOT respond to taps** — it is a
  stable state; to change it, use the History tab. (No modal here to decrement.)
- **Per-day display:**
  - `value >= goal` → solid **green** pill (goal met). White day number.
  - `0 < value < goal` (partial) → **blue arc ring** swept to `value / goal`,
    over a faint track. Day number centered.
  - `value === 0`, due, today-or-past → faint **empty track ring** (signals
    "tappable"). Day number centered.
  - rest day → muted grey pill (unchanged).
  - future day → muted number, no ring (unchanged).
- **No special "today" marker.** Today is just a normal due day. Legend drops
  "Today" and adds "In progress" (the blue ring).
- The floating **"Log today"** button stays (fast path for today).

## Data model — `habitStats.ts`

`CalendarCell` gains the fields the ring + tap need:

```ts
export type CalendarCell = {
  day: number
  status: CalendarStatus // done | today | rest | future | none (unchanged union)
  iso: string   // NEW — full YYYY-MM-DD, so a tap knows which day to log
  value: number // NEW — summed logged value that day
  goal: number  // NEW — perDayGoal(tracker) (e.g. 5)
}
```

- `status` keeps its existing priority (done > today > rest > future > none) and
  meaning. "Partial" is NOT a new status — it is derived at render time from
  `value` and `goal` (`0 < value < goal`), because the ring needs the numeric
  fraction, not just an enum. `today` status is retained on the type (other
  code/tests may reference it) but the component no longer renders a special
  today marker.
- Single source of truth for daily totals: extract
  `dayTotalsOf(tracker, entries): Map<string, number>` (iso → summed value).
  Both `doneDatesOf` and `buildCalendarMonth` use it, so "how much was logged on
  a day" is computed in exactly one place.
  - `doneDatesOf` = the set of days whose total `>= perDayGoal`, derived from
    `dayTotalsOf` (behavior unchanged).
  - `buildCalendarMonth` reads each day's total from `dayTotalsOf` to populate
    `value`, and sets `goal = perDayGoal(tracker)` on every cell.

## Component — `HabitCalendar.tsx`

Adds a per-cell `DayCell` that renders one of: green pill (done), blue arc ring
(partial), empty track ring (due, zero), muted pill (rest), muted number
(future). The ring is a small `react-native-svg` `<Svg><Circle/><Circle/></Svg>`
mirroring `AchievementHero`'s two-circle pattern (track circle + dashoffset arc),
sized to the existing 34px cell.

SVG stroke/fill colors cannot come from Tailwind classes, so they are read from
`useThemeColors()`:
- track = `c.line`
- partial arc = `c.brand`
- done fill = `c.pace.on_track` (green) — done stays a filled pill, not a ring,
  but its green must match the pace green, so it uses the `bg-pace-on` class
  (already the token) — no SVG needed for done.

Day-number text color per render-state (Tailwind classes, unchanged approach):
done → `text-on-accent`; partial/empty-ring → `text-ink`; rest → `text-ink-3`;
future → `text-ink-3 opacity-50`.

**Tap:** each due, not-yet-done cell (today or past) is a `Pressable` calling
`onLogDay(cell.iso)`. Rest/future/done cells are plain `View`s (no press).
`HabitCalendar` gains prop `onLogDay?: (iso: string) => void`. The guard
(due & past-or-today & not done) lives in `HabitCalendar`, so the parent's
handler is unconditional.

Legend: replace the "Today" item with an "In progress" item (blue ring dot);
keep "Completed" (green) and "Rest day".

## Wiring — `HabitChartsTab.tsx`

Add `onLogDay`:

```ts
const onLogDay = (iso: string) =>
  log.mutate(
    { id: uuid(), trackerId: tracker.id, date: iso, value: 1, note: null,
      createdAt: new Date().toISOString() },
    { onSuccess: () => showLogSuccess(toast, t('toast.logSuccess')) }
  )
```

Pass `onLogDay={onLogDay}` to `<HabitCalendar>`. The existing `onLogToday`
(floating button) is unchanged — it is just `onLogDay(today)` in effect, but
kept separate to avoid churn. `useLogEntry` already invalidates the entries +
date query subtrees, so the calendar, ring, streak, and bar chart all refresh
after a tap.

## i18n

Add `detail.inProgress` — EN `"In progress"`, VI `"Đang làm"` — to both
`src/i18n/locales/en.json` and `vi.json` (keep key-for-key sync). Legend uses it.

## Testing

- `habitStats.test.ts` (pure, TDD):
  - `dayTotalsOf` sums multiple entries on the same day.
  - `doneDatesOf` still returns days meeting the goal (regression).
  - `buildCalendarMonth` cells carry correct `iso`, `value`, `goal`; a day with
    value below goal has `status !== 'done'`; a day with value ≥ goal has
    `status === 'done'`.
- Component render + tap behavior: verify on simulator (op-sqlite / RN host
  components are unavailable in Jest). Manual check: tap a past due day adds a
  log and its ring advances; a done day ignores taps; future/rest days ignore
  taps; today is not specially outlined.

## Out of scope

- No decrement/edit from the calendar (use History).
- No change to `WeeklyChart`, `AchievementHero`, or non-habit calendars.
- No `LogEntryModal` involvement here.
