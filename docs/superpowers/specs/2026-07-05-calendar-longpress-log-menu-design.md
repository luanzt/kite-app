# Calendar longpress → log menu (BottomSheet) — Design

## Problem

On the Habit Detail → Charts calendar, a tap adds one "Yes" log to a due day.
There is no way from the calendar to log a "No", to delete a mistaken log, or to
log anything onto a rest (non-scheduled) day. Users want a longpress menu on a
day offering the relevant log actions.

## Goal

Longpress a past-or-today calendar day (including rest days) → open a HeroUI
`BottomSheet` titled with that date, offering **Log Yes** / **Log No**, plus
**Delete Last Log** when the day already has a log. Tap (single press) keeps its
current behavior: +1 Yes on a due day.

## Decisions (from brainstorming)

- **Overlay = HeroUI `BottomSheet`** sliding up from the bottom (project
  convention; mirrors `LogEntryModal`). Not a native context menu, not RN Modal.
- **Title** = the day, formatted like `July 2, 2026`
  (`toLocaleDateString(lang, { day:'numeric', month:'long', year:'numeric', timeZone:'UTC' })`).
- **Rows are state-dependent:**
  - day has **no** log → **Log Yes**, **Log No** only.
  - day **has** ≥1 log (Yes or No) → also **Delete Last Log** (destructive, red).
- **Log Yes** → add an entry `value: 1`. **Log No** → add an entry `value: 0`.
  **Delete Last Log** → delete the newest entry of that day (by `createdAt`).
- **Longpress opens the menu for ANY past-or-today day, including rest days** —
  this is the only way to log onto a rest day. Future days do not open the menu.
- **Tap is unchanged**: +1 Yes, and only on a due (not rest, not future),
  not-done, past-or-today day. So tap and longpress differ in scope: a rest day
  ignores a tap but opens the menu on longpress.
- **Rest-day display once logged:** a rest day that has at least one entry is
  rendered like a normal due day (Yes-below-goal → blue ring, No-only → red pill,
  meets goal → green pill). A rest day is shown as the muted grey "rest" pill
  ONLY when it has no log at all. (A rest day logged to goal already turns green
  today, because `done` is checked before `rest`.)

## Data / calculator — `habitStats.ts`

The only calculator change is the rest classification in `buildCalendarMonth`.
Current order:

```
if (done.has(iso)) status = 'done'
else if (!isDueOn(tracker, iso)) status = 'rest'
else if (iso === todayISO) status = 'today'
else if (iso > todayISO) status = 'future'
else status = 'none'
```

New order — `rest` only wins when the day is NOT scheduled AND has no log:

```
const hasEntry = (counts.get(iso) ?? 0) > 0
if (done.has(iso)) status = 'done'
else if (!isDueOn(tracker, iso) && !hasEntry) status = 'rest'
else if (iso === todayISO) status = 'today'
else if (iso > todayISO) status = 'future'
else status = 'none'
```

So a logged-but-not-done rest day becomes `status: 'none'`, and `DayCell`'s
existing value/hasEntry logic renders it (blue ring / red pill) exactly like a
due day. `hasEntry` is already on the cell; this reuses it. No new field.

Edge: a *future* rest day never gets logged (menu is past-or-today only), so the
`future` branch is unaffected. A rest day in the past with no entry stays `rest`.

## Component — `CalendarDayMenu.tsx` (new)

A controlled HeroUI `BottomSheet` (same overlay pattern as `LogEntryModal`):

```
type Props = {
  date: string | null            // ISO day; null = closed
  title: string                  // pre-formatted date, e.g. "July 2, 2026"
  hasEntry: boolean              // show Delete Last Log?
  onLogYes: () => void
  onLogNo: () => void
  onDeleteLast: () => void
  onClose: () => void
}
```

- `isOpen={!!date}`, `onOpenChange` → `onClose` when it closes.
- Title `Typography` = formatted date (formatter passed in as a prop `title:
  string` computed by the parent, to keep the component i18n/locale-free and
  pure — parent owns `lang`). So Props also carries `title: string`.
- Rows, each a full-width `Pressable` that fires its callback then closes:
  - **Log Yes** — lucide `Check`, brand/green accent.
  - **Log No** — lucide `X`.
  - **Delete Last Log** — lucide `Trash2`, red text (`text-pace-behind`), only
    when `hasEntry`.
- Icons via `lucide-react-native` sized with `size`, colored via
  `useThemeColors()` where a status color is needed. Layout via `className`.
- Named export `CalendarDayMenu`.

## Component — `HabitCalendar.tsx` / `DayCell`

- `HabitCalendar` and `DayCell` gain `onLongPressDay?: (iso: string) => void`.
- In `DayCell`, the day is **longpressable** when it is past-or-today and NOT
  future — i.e. `isPastOrToday && !isFuture` (rest included). Wrap the cell in a
  `Pressable` whenever it is tappable OR longpressable, wiring `onPress`
  (existing tap = +1 Yes guard: only when `tappable`) and `onLongPress` (fires
  `onLongPressDay(cell.iso)` when longpressable). A cell that is only
  longpressable (e.g. a rest day) still gets a `Pressable` with a no-op `onPress`
  guard so the tap does nothing but the longpress works.
- `DayCell`'s render branches are unchanged; because the calculator now yields
  `none` for logged rest days, the existing ring/red/done branches already cover
  them.

## Wiring — `HabitChartsTab.tsx`

- Local state `const [menuDate, setMenuDate] = useState<string | null>(null)`.
- `onLongPressDay = (iso) => setMenuDate(iso)` passed to `HabitCalendar`.
- Derive from `entries` + `calendar`:
  - `menuHasEntry` = whether `menuDate` has ≥1 entry (count entries with
    `e.date.slice(0,10) === menuDate`).
  - `menuTitle` = formatted `menuDate` via `toLocaleDateString(lang, …)`.
- Handlers (reuse existing mutations):
  - `onLogYes` = `log.mutate({ …, date: menuDate, value: 1, … })` + success toast.
  - `onLogNo` = same with `value: 0`.
  - `onDeleteLast` = find the newest entry for `menuDate`
    (`entries.filter(day===menuDate).sort(byCreatedAtDesc)[0]`) and
    `del.mutate(entry.id)` where `del = useDeleteEntry()`. No-op if none.
  - each closes the menu (`setMenuDate(null)`).
- Render `<CalendarDayMenu date={menuDate} title={menuTitle}
  hasEntry={menuHasEntry} onLogYes onLogNo onDeleteLast onClose />` at the tab
  root. Mutations already invalidate the entries/date query subtrees, so the
  calendar, ring, streak, and bar chart refresh after any action.

## i18n

Add to both `en.json` and `vi.json` under `detail` (key-for-key in sync):
- `logYes` — EN "Log Yes" / VI "Ghi Có"
- `logNo` — EN "Log No" / VI "Ghi Không"
- `deleteLastLog` — EN "Delete Last Log" / VI "Xoá lượt gần nhất"

## Testing

- `habitStats.test.ts` (pure, TDD):
  - a non-scheduled day WITH an entry (value 0) → `status !== 'rest'` (is `none`).
  - a non-scheduled day with NO entry → `status === 'rest'` (regression).
  - a non-scheduled day logged to goal → `status === 'done'` (regression;
    `done` still beats the new rest guard).
- `CalendarDayMenu` render + `HabitCalendar` longpress gesture + wiring:
  verify on simulator (RN host components / gestures unavailable in Jest). Manual
  checks: longpress a due day → menu with 2 rows (no log yet) or 3 rows (has
  log); Log No adds a red day; Delete Last Log removes newest; longpress a rest
  day works and its logged state renders; tap still +1 Yes on due days; future
  days ignore longpress.

## Out of scope

- No "Skip" or "Edit Log/Note" actions (present in the reference mockup, dropped).
- No numeric/quantity editing here (habits are Yes/No).
- No change to `LogEntryModal`, `WeeklyChart`, or non-habit calendars.
