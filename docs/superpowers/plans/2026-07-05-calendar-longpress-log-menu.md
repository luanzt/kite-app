# Calendar longpress → log menu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Longpress a past-or-today habit-calendar day (rest days included) to open a HeroUI BottomSheet with Log Yes / Log No / (when logged) Delete Last Log; tap still adds one Yes on due days.

**Architecture:** A one-line status-priority change in `buildCalendarMonth` makes a logged rest day render like a due day. A new `CalendarDayMenu` BottomSheet component holds the menu UI. `HabitCalendar`/`DayCell` add an `onLongPressDay` gesture on past-or-today cells. `HabitChartsTab` owns the open-day state and wires Log Yes/No/Delete to the existing `useLogEntry`/`useDeleteEntry` mutations.

**Tech Stack:** React Native, TypeScript (strict), HeroUI Native (`BottomSheet`), Uniwind/Tailwind v4, lucide-react-native, TanStack Query, i18next, Jest.

## Global Constraints

- Text: `<Typography>` from `heroui-native`, never `<Text>`.
- Style with Tailwind `className`; never interpolate a value into a class string. SVG/lucide colors come from `useThemeColors()`. lucide icons sized via the numeric `size` prop.
- Icons only from `lucide-react-native`. Overlays via HeroUI Native (`BottomSheet`), never RN `Modal`.
- Named exports only. `yarn tsc` must be clean before each commit.
- i18n: never hardcode visible strings; keep `en.json` and `vi.json` key-for-key in sync.
- TDD: write the failing test first for pure logic. RN host components / gestures are unavailable in Jest — do NOT unit-test component render/gesture; verify on simulator.
- `useDeleteEntry().mutate` takes `{ id: string; trackerId: string }` (both required — `trackerId` is used only for cache invalidation). `useLogEntry().mutate` takes a full `Entry`.
- Per-tracker identity colors are NOT theme chrome; menu chrome uses theme/status colors (`c.brand`, `text-pace-behind`).

---

### Task 1: Rest-day-with-entry classification in `buildCalendarMonth`

**Files:**
- Modify: `src/features/trackers/calculators/habitStats.ts`
- Test: `src/features/trackers/calculators/__tests__/habitStats.test.ts`

**Interfaces:**
- Consumes: existing `doneDatesOf`, `dayCountsOf`, `isDueOn`, `perDayGoal`, `CalendarCell`.
- Produces: `buildCalendarMonth` unchanged signature; a non-scheduled day now classifies as `'rest'` ONLY when it has no entry, else falls through (→ `'none'`/`'today'`).

- [ ] **Step 1: Write the failing tests**

Add to the existing `describe('buildCalendarMonth', ...)` block in `src/features/trackers/calculators/__tests__/habitStats.test.ts` (reuse the existing `base`/`log` helpers at the top of the file):

```ts
  test('a non-scheduled day with an entry is not rest', () => {
    // Mon/Wed/Fri schedule; 2026-06-06 is a Saturday (rest), but it has a "No" log.
    const mwf = { ...base, repeatDays: [1, 3, 5] }
    const m = buildCalendarMonth(mwf, [log('2026-06-06', 0)], 2026, 5, '2026-06-10')
    const cell = m.cells.find((c) => c.day === 6)!
    expect(cell.status).not.toBe('rest') // logged → rendered like a normal day
    expect(cell.hasEntry).toBe(true)
  })

  test('a non-scheduled day with no entry is still rest', () => {
    const mwf = { ...base, repeatDays: [1, 3, 5] }
    const m = buildCalendarMonth(mwf, [], 2026, 5, '2026-06-10')
    const cell = m.cells.find((c) => c.day === 6)! // Saturday, no log
    expect(cell.status).toBe('rest')
  })

  test('a non-scheduled day logged to goal is done', () => {
    // goal 1 (default habit); a Saturday with a Yes reaches goal → done beats rest.
    const mwf = { ...base, repeatDays: [1, 3, 5], targetValue: 1 }
    const m = buildCalendarMonth(mwf, [log('2026-06-06', 1)], 2026, 5, '2026-06-10')
    const cell = m.cells.find((c) => c.day === 6)!
    expect(cell.status).toBe('done')
  })
```

- [ ] **Step 2: Run tests to verify the first fails**

Run: `yarn test src/features/trackers/calculators/__tests__/habitStats.test.ts`
Expected: FAIL — `'a non-scheduled day with an entry is not rest'` fails (currently returns `'rest'`). The other two pass already (regressions guarded).

- [ ] **Step 3: Change the rest guard**

In `src/features/trackers/calculators/habitStats.ts`, inside `buildCalendarMonth`'s day loop, replace the status-priority block. Current:

```ts
    const iso = `${year}-${pad2(month + 1)}-${pad2(d)}`
    let status: CalendarStatus
    if (done.has(iso)) status = 'done'
    else if (!isDueOn(tracker, iso)) status = 'rest'
    else if (iso === todayISO) status = 'today'
    else if (iso > todayISO) status = 'future'
    else status = 'none'
    cells.push({
      day: d,
      status,
      iso,
      value: totals.get(iso) ?? 0,
      goal,
      hasEntry: (counts.get(iso) ?? 0) > 0
    })
```

New (compute `hasEntry` first, and only treat an unscheduled day as `rest` when it has no log):

```ts
    const iso = `${year}-${pad2(month + 1)}-${pad2(d)}`
    const hasEntry = (counts.get(iso) ?? 0) > 0
    let status: CalendarStatus
    if (done.has(iso)) status = 'done'
    else if (!isDueOn(tracker, iso) && !hasEntry) status = 'rest'
    else if (iso === todayISO) status = 'today'
    else if (iso > todayISO) status = 'future'
    else status = 'none'
    cells.push({ day: d, status, iso, value: totals.get(iso) ?? 0, goal, hasEntry })
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `yarn test src/features/trackers/calculators/__tests__/habitStats.test.ts`
Expected: PASS (all prior tests + the 3 new ones).

- [ ] **Step 5: Typecheck**

Run: `yarn tsc`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/trackers/calculators/habitStats.ts src/features/trackers/calculators/__tests__/habitStats.test.ts
git commit -m "feat(habit-detail): a logged rest day renders like a normal day"
```

---

### Task 2: i18n keys for the menu

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/vi.json`

**Interfaces:**
- Produces: `t('detail.logYes')`, `t('detail.logNo')`, `t('detail.deleteLastLog')`.

- [ ] **Step 1: Add the keys to `en.json`**

In `src/i18n/locales/en.json`, inside the `detail` object (e.g. right after the `missed` key added earlier), add:

```json
"logYes": "Log Yes", "logNo": "Log No", "deleteLastLog": "Delete Last Log",
```

(Keep valid JSON — commas between siblings, no trailing comma if last.)

- [ ] **Step 2: Add the matching keys to `vi.json`**

In `src/i18n/locales/vi.json`, inside the `detail` object at the same spot:

```json
"logYes": "Ghi Có", "logNo": "Ghi Không", "deleteLastLog": "Xoá lượt gần nhất",
```

- [ ] **Step 3: Verify parse + sync**

Run: `node -e "const e=require('./src/i18n/locales/en.json'),v=require('./src/i18n/locales/vi.json'); for(const k of ['logYes','logNo','deleteLastLog']){ if(!e.detail[k]||!v.detail[k]) throw new Error('missing '+k) } if(Object.keys(e.detail).sort().join()!==Object.keys(v.detail).sort().join()) throw new Error('detail keys out of sync'); console.log('ok', e.detail.logYes, v.detail.logYes)"`
Expected: `ok Log Yes Ghi Có`

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/vi.json
git commit -m "i18n(detail): add logYes/logNo/deleteLastLog for calendar menu"
```

---

### Task 3: `CalendarDayMenu` BottomSheet component

**Files:**
- Create: `src/features/trackers/components/CalendarDayMenu.tsx`

**Interfaces:**
- Consumes: `BottomSheet`, `Typography` from `heroui-native`; `Check`, `X`, `Trash2` from `lucide-react-native`; `useThemeColors`; `useTranslation`.
- Produces: `export function CalendarDayMenu(props)` where
  ```ts
  type Props = {
    date: string | null
    title: string
    hasEntry: boolean
    onLogYes: () => void
    onLogNo: () => void
    onDeleteLast: () => void
    onClose: () => void
  }
  ```

- [ ] **Step 1: Create the component**

Create `src/features/trackers/components/CalendarDayMenu.tsx` with exactly this content. It mirrors the `BottomSheet` shell used by `LogEntryModal` (Portal > Overlay > Content) but uses dynamic sizing (short auto-height menu). Each row runs its callback then closes.

```tsx
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BottomSheet, Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { Check, X, Trash2 } from 'lucide-react-native'
import { useThemeColors } from '@hooks/useThemeColors'

type Props = {
  date: string | null
  title: string
  hasEntry: boolean
  onLogYes: () => void
  onLogNo: () => void
  onDeleteLast: () => void
  onClose: () => void
}

/**
 * CalendarDayMenu — a HeroUI BottomSheet of log actions for one calendar day.
 * Opened by longpressing a past-or-today habit-calendar day. Shows Log Yes /
 * Log No, plus Delete Last Log when the day already has a record. Each row runs
 * its action then closes the sheet.
 */
export function CalendarDayMenu({
  date,
  title,
  hasEntry,
  onLogYes,
  onLogNo,
  onDeleteLast,
  onClose
}: Props) {
  const { t } = useTranslation()
  const c = useThemeColors()
  const insets = useSafeAreaInsets()

  const run = (fn: () => void) => {
    fn()
    onClose()
  }

  return (
    <BottomSheet isOpen={!!date} onOpenChange={(open) => !open && onClose()}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          enableDynamicSizing
          backgroundClassName='bg-bg rounded-t-[27px]'
        >
          <View
            className='px-s5 pt-s4'
            style={{ paddingBottom: insets.bottom + 12 }} // safe-area, runtime
          >
            <Typography className='mb-s3 text-center text-sm font-bold text-ink-3'>
              {title}
            </Typography>

            <Pressable
              onPress={() => run(onLogYes)}
              className='h-[56px] flex-row items-center justify-between border-t border-line active:opacity-70'
            >
              <Typography className='text-base font-bold text-ink'>
                {t('detail.logYes')}
              </Typography>
              <Check size={22} color={c.pace.on_track} />
            </Pressable>

            <Pressable
              onPress={() => run(onLogNo)}
              className='h-[56px] flex-row items-center justify-between border-t border-line active:opacity-70'
            >
              <Typography className='text-base font-bold text-ink'>
                {t('detail.logNo')}
              </Typography>
              <X size={22} color={c.ink2} />
            </Pressable>

            {hasEntry ? (
              <Pressable
                onPress={() => run(onDeleteLast)}
                className='h-[56px] flex-row items-center justify-between border-t border-line active:opacity-70'
              >
                <Typography className='text-base font-bold text-pace-behind'>
                  {t('detail.deleteLastLog')}
                </Typography>
                <Trash2 size={22} color={c.pace.behind} />
              </Pressable>
            ) : null}
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `yarn tsc`
Expected: clean. (This component is not yet imported anywhere — that's Task 5.)

- [ ] **Step 3: Lint**

Run: `yarn lint src/features/trackers/components/CalendarDayMenu.tsx`
Expected: clean (no `no-inline-styles` beyond the commented safe-area one, no `Text` import). If the safe-area inline object trips `no-inline-styles`, that is the documented dynamic-value exception used elsewhere (`HabitChartsTab` uses the same `insets.bottom + N` inline with a why-comment) — leave it.

- [ ] **Step 4: Commit**

```bash
git add src/features/trackers/components/CalendarDayMenu.tsx
git commit -m "feat(habit-detail): CalendarDayMenu bottom-sheet (Log Yes/No/Delete)"
```

---

### Task 4: `onLongPressDay` gesture in `HabitCalendar` / `DayCell`

**Files:**
- Modify: `src/features/trackers/components/HabitCalendar.tsx`

**Interfaces:**
- Consumes: existing `CalendarCell`, `useThemeColors`.
- Produces: `HabitCalendar` and `DayCell` gain `onLongPressDay?: (iso: string) => void`. A cell is longpressable when `isPastOrToday && !isFuture` (rest included); tap (+1 Yes) stays guarded to `tappable` (due, not-done). A cell that is longpressable but not tappable still renders a `Pressable` (no-op press, working longpress).

- [ ] **Step 1: Add the prop to `DayCell` and wrap the gesture**

In `src/features/trackers/components/HabitCalendar.tsx`:

Extend `DayCell`'s props and derived booleans. Change the props destructure/type:

```tsx
function DayCell({
  cell,
  todayISO,
  onLogDay,
  onLongPressDay
}: {
  cell: CalendarCell
  todayISO: string
  onLogDay?: (iso: string) => void
  onLongPressDay?: (iso: string) => void
}) {
```

After the existing `const tappable = due && !done && !!onLogDay` line, add:

```tsx
  // longpress opens the day menu for any past-or-today day (rest included)
  const longPressable = isPastOrToday && !isFuture && !!onLongPressDay
```

Then replace the component's return (the `if (tappable) { … } return ( … )` block at the end of `DayCell`) with a single wrapper that handles both gestures:

```tsx
  if (tappable || longPressable) {
    return (
      <View className='aspect-square flex-1 items-center justify-center'>
        <Pressable
          onPress={() => tappable && onLogDay?.(cell.iso)}
          onLongPress={() => longPressable && onLongPressDay?.(cell.iso)}
          delayLongPress={300}
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
```

- [ ] **Step 2: Thread the prop through `HabitCalendar`**

Change `HabitCalendar`'s signature to accept and pass `onLongPressDay`:

```tsx
export function HabitCalendar({
  month,
  todayISO,
  onLogDay,
  onLongPressDay
}: {
  month: CalendarMonth
  todayISO: string
  onLogDay?: (iso: string) => void
  onLongPressDay?: (iso: string) => void
}) {
```

And in the `weeks.map(...)` render, pass it to `DayCell`:

```tsx
              <DayCell
                key={cell.day}
                cell={cell}
                todayISO={todayISO}
                onLogDay={onLogDay}
                onLongPressDay={onLongPressDay}
              />
```

- [ ] **Step 3: Typecheck**

Run: `yarn tsc`
Expected: clean (the `HabitChartsTab` caller doesn't pass `onLongPressDay` yet — it's optional, so no error).

- [ ] **Step 4: Lint**

Run: `yarn lint src/features/trackers/components/HabitCalendar.tsx`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/trackers/components/HabitCalendar.tsx
git commit -m "feat(habit-detail): longpress a calendar day (rest incl.) fires onLongPressDay"
```

---

### Task 5: Wire the menu in `HabitChartsTab`

**Files:**
- Modify: `src/features/trackers/components/HabitChartsTab.tsx`

**Interfaces:**
- Consumes: `CalendarDayMenu` (Task 3), `HabitCalendar`'s new `onLongPressDay` (Task 4), existing `useLogEntry` (`log`), `uuid`, `tracker`, `entries`, `toast`, `showLogSuccess`, `t`, `lang`; adds `useDeleteEntry`.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Add imports and the delete mutation**

In `src/features/trackers/components/HabitChartsTab.tsx`:

Add to the queries import (it currently imports `useLogEntry`):

```tsx
import { useLogEntry, useDeleteEntry } from '@features/trackers/queries'
```

Add the new-component import next to the other component imports (e.g. after `import { WeeklyChart } from './WeeklyChart'`):

```tsx
import { CalendarDayMenu } from './CalendarDayMenu'
```

Inside the component body, near `const log = useLogEntry()`, add:

```tsx
  const del = useDeleteEntry()
  const [menuDate, setMenuDate] = useState<string | null>(null)
```

(`useState` is already imported at the top of the file.)

- [ ] **Step 2: Add the menu-derived values and handlers**

After the existing `onLogDay` handler, add:

```tsx
  const onLongPressDay = (iso: string) => setMenuDate(iso)

  // format the menu title as e.g. "July 2, 2026" (UTC to avoid TZ drift)
  const menuTitle = menuDate
    ? new Date(`${menuDate}T00:00:00Z`).toLocaleDateString(lang, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      })
    : ''

  const menuEntries = menuDate
    ? entries.filter((e) => e.date.slice(0, 10) === menuDate)
    : []
  const menuHasEntry = menuEntries.length > 0

  const logValue = (value: number) => {
    if (!menuDate) return
    log.mutate(
      {
        id: uuid(),
        trackerId: tracker.id,
        date: menuDate,
        value,
        note: null,
        createdAt: new Date().toISOString()
      },
      { onSuccess: () => showLogSuccess(toast, t('toast.logSuccess')) }
    )
  }

  const onDeleteLast = () => {
    // newest record of the day, by createdAt (fallback to date)
    const last = [...menuEntries].sort((a, b) =>
      (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
    )[0]
    if (last) del.mutate({ id: last.id, trackerId: tracker.id })
  }
```

- [ ] **Step 3: Pass `onLongPressDay` to `HabitCalendar` and render the menu**

Update the `<HabitCalendar>` call to also pass the longpress handler:

```tsx
          <HabitCalendar
            month={calendar}
            todayISO={today}
            onLogDay={onLogDay}
            onLongPressDay={onLongPressDay}
          />
```

Render the menu once, at the end of the component's returned tree — just before the closing `</View>` of the outer `<View className='flex-1'>` (after the floating "Log today" block):

```tsx
      <CalendarDayMenu
        date={menuDate}
        title={menuTitle}
        hasEntry={menuHasEntry}
        onLogYes={() => logValue(1)}
        onLogNo={() => logValue(0)}
        onDeleteLast={onDeleteLast}
        onClose={() => setMenuDate(null)}
      />
```

- [ ] **Step 4: Typecheck**

Run: `yarn tsc`
Expected: clean.

- [ ] **Step 5: Lint**

Run: `yarn lint src/features/trackers/components/HabitChartsTab.tsx`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/trackers/components/HabitChartsTab.tsx
git commit -m "feat(habit-detail): wire calendar longpress menu (Log Yes/No, Delete)"
```

---

### Task 6: Full sweep + simulator verification

**Files:** none (verification).

- [ ] **Step 1: Full test + typecheck + lint sweep**

Run: `yarn test && yarn tsc && yarn lint`
Expected: tests all pass, tsc clean. `yarn lint` may report ONLY pre-existing warnings/errors in files this feature never touched (`uniwind.d.ts`, `factory.ts`, `icons.ts`, `TrackerListScreen.tsx`, and the pre-existing `no-shadow` warning in `habitStats.test.ts`) — those are not introduced here. Any error in a touched file (`habitStats.ts`, `CalendarDayMenu.tsx`, `HabitCalendar.tsx`, `HabitChartsTab.tsx`, the two locale files) must be fixed.

- [ ] **Step 2: Reload the app**

The app runs in the iOS simulator; changes are JS-only (no native module added), so a Metro reload suffices:
Run: `curl -s http://localhost:8081/reload -o /dev/null -w "reload HTTP %{http_code}\n"`
Expected: `reload HTTP 200`. (If Metro isn't running, start it with `yarn ios`.)

- [ ] **Step 3: Verify on-device**

On a habit with a per-day goal (e.g. Mon/Wed/Fri or "5 Times a Day"):
- Longpress a past due day with NO log → sheet titled like "July 2, 2026" with **Log Yes** and **Log No** only.
- Tap **Log No** → sheet closes, that day becomes a **red** pill.
- Longpress the same day again → now shows **Delete Last Log** (red). Tap it → the log is removed (day returns to empty / no ring).
- Longpress a **rest** (weekend / non-scheduled) day → menu opens; **Log Yes** enough to meet goal turns it **green**; **Log No** shows it as a **red** day (no longer grey rest).
- A rest day with NO log still shows the grey rest pill and (via longpress) still opens the menu.
- Single **tap** on a due day still adds +1 Yes (ring advances) and does NOT open the menu.
- Longpress a **future** day → nothing happens.

- [ ] **Step 4: Report results**

State plainly whether each check passed, with any deviation.
