# Multi-Reminder (habit/target/average) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single `reminderTime` with a `reminderTimes: string[]` list, edited via a new `ReminderField` (trigger row → BottomSheet with toggle, time list, trash buttons, "+1h" add button). New habit/target/average trackers default to one 18:00 reminder, ON.

**Architecture:** Clean field swap (`reminderTime: string | null` → `reminderTimes: string[]`, `[]` = off) through types → schema → repository → factory → notifications, then a self-contained `ReminderField` UI component wired into `TrackerFormScreen`. Pure add-time logic lives in a new `src/features/trackers/reminders.ts`, unit-tested first.

**Tech Stack:** React Native, TypeScript strict, HeroUI Native (BottomSheet), Uniwind/Tailwind classes, op-sqlite (mocked in Jest), notifee, TanStack Query, i18next, Jest.

**Spec:** `docs/superpowers/specs/2026-07-12-multi-reminder-design.md`

## Global Constraints

- No backward compat with `reminderTime` — the app has not shipped. Remove the field entirely; do NOT keep migration shims.
- `"HH:MM"` 24h strings everywhere (what SQLite stores); insertion order preserved.
- Cap: `MAX_REMINDERS = 6`. Default time: `'18:00'`.
- UI: `<Typography>` never `<Text>`; Tailwind `className` never inline `style` (exceptions: safe-area insets w/ comment); icons only from `lucide-react-native`; overlays only HeroUI `BottomSheet`/`Dialog`.
- All visible strings via `t('key')`; add every new key to BOTH `src/i18n/locales/en.json` and `vi.json`.
- op-sqlite v16: `executeSync()`, `res.rows` is a plain array.
- `yarn tsc` must be clean before every commit. Run tests with `yarn test <path>`.
- Package manager is yarn. Do not run `pod install` (no new native deps).

---

### Task 1: Pure reminder helpers (`reminders.ts`)

**Files:**
- Create: `src/features/trackers/reminders.ts`
- Test: `src/features/trackers/__tests__/reminders.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (used by Tasks 2–3):
  - `MAX_REMINDERS: number` (= 6)
  - `DEFAULT_REMINDER: string` (= `'18:00'`)
  - `nextReminderTime(times: string[]): string`
  - `reminderSummary(times: string[]): string`

- [ ] **Step 1: Write the failing test**

Create `src/features/trackers/__tests__/reminders.test.ts`:

```ts
import {
  nextReminderTime,
  reminderSummary,
  MAX_REMINDERS,
  DEFAULT_REMINDER
} from '../reminders'

describe('nextReminderTime', () => {
  it('returns the default time for an empty list', () => {
    expect(nextReminderTime([])).toBe('18:00')
  })

  it('adds one hour to the last reminder', () => {
    expect(nextReminderTime(['18:00'])).toBe('19:00')
  })

  it('preserves minutes', () => {
    expect(nextReminderTime(['08:30'])).toBe('09:30')
  })

  it('wraps past midnight', () => {
    expect(nextReminderTime(['23:30'])).toBe('00:30')
  })

  it('uses the LAST entry, not the latest time of day', () => {
    expect(nextReminderTime(['20:00', '08:00'])).toBe('09:00')
  })

  it('bumps a further hour while the slot is already taken', () => {
    // last = 18:00 → 19:00 is taken → 20:00
    expect(nextReminderTime(['19:00', '18:00'])).toBe('20:00')
  })

  it('falls back to the default when the last entry is malformed', () => {
    expect(nextReminderTime(['garbage'])).toBe('18:00')
  })
})

describe('reminderSummary', () => {
  it('is empty for no reminders', () => {
    expect(reminderSummary([])).toBe('')
  })

  it('shows a single time as-is', () => {
    expect(reminderSummary(['18:00'])).toBe('18:00')
  })

  it('shows "first +N" for multiple times', () => {
    expect(reminderSummary(['18:00', '19:00', '20:00'])).toBe('18:00 +2')
  })
})

describe('constants', () => {
  it('caps at 6 and defaults to 18:00', () => {
    expect(MAX_REMINDERS).toBe(6)
    expect(DEFAULT_REMINDER).toBe('18:00')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/features/trackers/__tests__/reminders.test.ts`
Expected: FAIL — `Cannot find module '../reminders'`

- [ ] **Step 3: Write the implementation**

Create `src/features/trackers/reminders.ts`:

```ts
/**
 * Pure helpers for the multi-reminder list ("HH:MM" 24h strings, insertion
 * order). `[]` means reminders are off. Cap chosen to stay well under iOS's
 * 64-pending-notification limit (6 times × 7 weekdays = 42 triggers worst
 * case for one tracker).
 */

export const MAX_REMINDERS = 6
export const DEFAULT_REMINDER = '18:00'

/** "HH:MM" → minutes since midnight, or null if malformed. */
function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

function toHHMM(totalMinutes: number): string {
  const m = ((totalMinutes % 1440) + 1440) % 1440
  const h = String(Math.floor(m / 60)).padStart(2, '0')
  const min = String(m % 60).padStart(2, '0')
  return `${h}:${min}`
}

/**
 * The time a tapped "Add reminder" creates: last entry + 1h, wrapping past
 * midnight, bumping a further +1h while that slot is already in the list.
 */
export function nextReminderTime(times: string[]): string {
  const last = times.length ? toMinutes(times[times.length - 1]) : null
  if (last == null) return DEFAULT_REMINDER
  const taken = new Set(times.map(toMinutes))
  let candidate = (last + 60) % 1440
  for (let i = 0; i < 24 && taken.has(candidate); i++) {
    candidate = (candidate + 60) % 1440
  }
  return toHHMM(candidate)
}

/** Trigger-row summary: '' | '18:00' | '18:00 +2'. Off-state text is the caller's job. */
export function reminderSummary(times: string[]): string {
  if (times.length === 0) return ''
  if (times.length === 1) return times[0]
  return `${times[0]} +${times.length - 1}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/features/trackers/__tests__/reminders.test.ts`
Expected: PASS (all 11 tests)

- [ ] **Step 5: Typecheck and commit**

```bash
yarn tsc
git add src/features/trackers/reminders.ts src/features/trackers/__tests__/reminders.test.ts
git commit -m "feat(reminders): pure multi-reminder helpers (+1h add, summary)"
```

---

### Task 2: `ReminderField` UI component + i18n keys

**Files:**
- Create: `src/components/ui/ReminderField.tsx`
- Modify: `src/components/ui/index.ts` (barrel export)
- Modify: `src/i18n/locales/en.json`, `src/i18n/locales/vi.json` (`form` namespace)

**Interfaces:**
- Consumes: `MAX_REMINDERS`, `nextReminderTime`, `reminderSummary` from `@features/trackers/reminders` (Task 1); `Toggle` from `./Toggle`; `toHHMM`, `fromHHMM` from `@utils/date`; `useThemeColors`.
- Produces (used by Task 3):
  ```ts
  export function ReminderField(props: {
    enabled: boolean
    onEnabledChange: (v: boolean) => void
    times: string[]              // "HH:MM", insertion order, never empty while enabled
    onTimesChange: (times: string[]) => void
    accentColor: string          // hex for the Bell icon (TYPE_COLOR[type])
  }): JSX.Element
  ```

No unit test (pure UI over a native BottomSheet — verified on simulator in Task 4). This task compiles standalone; nothing renders it yet.

- [ ] **Step 1: Add i18n keys**

In `src/i18n/locales/en.json`, inside the existing `"form"` object (next to `"reminders": "Reminders"`), add:

```json
"addReminder": "Add reminder",
"reminderOff": "Off",
"remindersOffHint": "Turn on to get reminded on due days."
```

In `src/i18n/locales/vi.json`, same place:

```json
"addReminder": "Thêm giờ nhắc",
"reminderOff": "Tắt",
"remindersOffHint": "Bật để được nhắc vào những ngày cần thực hiện."
```

- [ ] **Step 2: Create the component**

Create `src/components/ui/ReminderField.tsx`. Two sheet views swap inside ONE `BottomSheet.Content` (never a nested BottomSheet): the list view (toggle + rows + add) and the wheel view (time picker for one row). The wheel logic mirrors `TimeField`'s `TimeSheet` (draft state, spurious-mount-callback guard) but commits via callbacks instead of `useBottomSheet()`.

```tsx
import { useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Typography, BottomSheet, Button } from 'heroui-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Trash2
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import DateTimePicker, {
  useDefaultStyles,
  type DateType
} from 'react-native-ui-datepicker'
import { toHHMM, fromHHMM } from '@utils/date'
import { useThemeColors } from '@hooks/useThemeColors'
import {
  MAX_REMINDERS,
  nextReminderTime,
  reminderSummary
} from '@features/trackers/reminders'
import { Toggle } from './Toggle'

/**
 * The form's multi-reminder editor. The trigger is an input-look row (Bell +
 * label + summary); tapping it opens ONE BottomSheet whose content swaps
 * between a list view (on/off toggle, per-time rows with trash, "Add
 * reminder" = last time + 1h via nextReminderTime) and a wheel view editing a
 * single row — swapping views avoids nesting a second BottomSheet (portal /
 * gesture conflicts). `times` stays in state while disabled so re-enabling
 * restores it; persisting `[]` when off is the caller's job.
 */
export function ReminderField({
  enabled,
  onEnabledChange,
  times,
  onTimesChange,
  accentColor
}: {
  enabled: boolean
  onEnabledChange: (v: boolean) => void
  times: string[]
  onTimesChange: (times: string[]) => void
  accentColor: string
}) {
  const { t } = useTranslation()
  const c = useThemeColors()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)
  // null = list view; a number = wheel view editing that index.
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const summary = enabled ? reminderSummary(times) : t('form.reminderOff')

  return (
    <BottomSheet
      isOpen={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setEditingIndex(null)
      }}
    >
      <BottomSheet.Trigger asChild>
        <Pressable className='h-[52px] flex-row items-center justify-between rounded-md-k border border-line bg-surface px-s4 active:opacity-80'>
          <View className='flex-row items-center gap-s2'>
            <Bell size={18} color={accentColor} />
            <Typography className='text-base text-ink'>
              {t('form.reminders')}
            </Typography>
          </View>
          <View className='flex-row items-center gap-s1'>
            <Typography
              className={`text-base ${enabled ? 'text-ink' : 'text-ink-3'}`}
            >
              {summary}
            </Typography>
            <ChevronRight size={20} color={c.ink3} />
          </View>
        </Pressable>
      </BottomSheet.Trigger>
      <BottomSheet.Portal>
        {/* Explicit scrim — see SelectField for why the token override didn't work. */}
        <BottomSheet.Overlay className='bg-black/60' />
        <BottomSheet.Content>
          {/* runtime: safe-area inset + static offset */}
          <View className='px-s4' style={{ paddingBottom: insets.bottom + 12 }}>
            {editingIndex != null && times[editingIndex] != null ? (
              <WheelView
                // Remount per row/value so the draft seeds from the current time.
                key={`${editingIndex}-${times[editingIndex]}`}
                value={times[editingIndex]}
                onBack={() => setEditingIndex(null)}
                onSave={(hhmm) => {
                  onTimesChange(
                    times.map((tm, i) => (i === editingIndex ? hhmm : tm))
                  )
                  setEditingIndex(null)
                }}
              />
            ) : (
              <ListView
                enabled={enabled}
                onEnabledChange={onEnabledChange}
                times={times}
                onTimesChange={onTimesChange}
                onEditRow={setEditingIndex}
              />
            )}
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  )
}

/** List view: header (title + on/off toggle), one row per time, add button. */
function ListView({
  enabled,
  onEnabledChange,
  times,
  onTimesChange,
  onEditRow
}: {
  enabled: boolean
  onEnabledChange: (v: boolean) => void
  times: string[]
  onTimesChange: (times: string[]) => void
  onEditRow: (index: number) => void
}) {
  const { t } = useTranslation()
  const c = useThemeColors()
  return (
    <View className='gap-s3'>
      <View className='flex-row items-center justify-between'>
        <BottomSheet.Title className='text-lg font-bold text-ink'>
          {t('form.reminders')}
        </BottomSheet.Title>
        <Toggle value={enabled} onChange={onEnabledChange} />
      </View>
      {enabled ? (
        <>
          {times.map((tm, i) => (
            <View key={`${i}-${tm}`} className='flex-row items-center gap-s2'>
              <Pressable
                onPress={() => onEditRow(i)}
                className='h-[52px] flex-1 flex-row items-center justify-between rounded-md-k border border-line bg-surface px-s4 active:opacity-80'
              >
                <Typography className='text-base text-ink'>{tm}</Typography>
                <Clock size={20} color={c.ink3} />
              </Pressable>
              {times.length > 1 ? (
                <Pressable
                  onPress={() =>
                    onTimesChange(times.filter((_, j) => j !== i))
                  }
                  className='h-[52px] w-[52px] items-center justify-center rounded-md-k bg-pace-behind-weak active:opacity-80'
                >
                  <Trash2 size={20} color={c.pace.behind} />
                </Pressable>
              ) : null}
            </View>
          ))}
          {times.length < MAX_REMINDERS ? (
            <Pressable
              onPress={() =>
                onTimesChange([...times, nextReminderTime(times)])
              }
              className='h-[52px] flex-row items-center justify-center gap-s2 rounded-md-k border border-dashed border-line active:opacity-80'
            >
              <Plus size={20} color={c.brand} />
              <Typography className='text-base font-bold text-brand'>
                {t('form.addReminder')}
              </Typography>
            </Pressable>
          ) : null}
        </>
      ) : (
        <Typography className='text-sm text-ink-3'>
          {t('form.remindersOffHint')}
        </Typography>
      )}
    </View>
  )
}

/**
 * Wheel view: edits one time. Same draft + spurious-mount-callback guard as
 * TimeField's TimeSheet; Save/back swap the sheet back to the list view.
 */
function WheelView({
  value,
  onSave,
  onBack
}: {
  value: string
  onSave: (hhmm: string) => void
  onBack: () => void
}) {
  const { t } = useTranslation()
  const c = useThemeColors()
  const defaultStyles = useDefaultStyles(c.isDark ? 'dark' : 'light')
  const [draft, setDraft] = useState<Date>(() => fromHHMM(value))
  // react-native-ui-datepicker fires a spurious onChange on mount with the
  // time reset to midnight — drop that first callback (see TimeField).
  const ready = useRef(false)

  return (
    <View className='gap-s3'>
      <View className='flex-row items-center gap-s2'>
        <Pressable
          onPress={onBack}
          className='h-10 w-10 items-center justify-center rounded-md-k border border-line bg-surface active:opacity-80'
        >
          <ChevronLeft size={20} color={c.ink} />
        </Pressable>
        <BottomSheet.Title className='text-lg font-bold text-ink'>
          {t('form.alert')}
        </BottomSheet.Title>
      </View>
      <DateTimePicker
        mode='single'
        date={draft}
        onChange={({ date }: { date: DateType }) => {
          if (!ready.current) {
            ready.current = true
            return
          }
          if (date instanceof Date) setDraft(date)
        }}
        timePicker
        initialView='time'
        hideHeader
        styles={{
          ...defaultStyles,
          selected: { backgroundColor: c.brand },
          selected_label: { color: c.onAccent }
        }}
      />
      <Button
        variant='primary'
        feedbackVariant='none'
        onPress={() => onSave(toHHMM(draft))}
      >
        <Button.Label>{t('common.save')}</Button.Label>
      </Button>
    </View>
  )
}
```

- [ ] **Step 3: Barrel export**

In `src/components/ui/index.ts`, add (alphabetical, after `InfoTooltip`... keep the existing order — insert between `InfoTooltip` and `Segmented`):

```ts
export { ReminderField } from './ReminderField'
```

- [ ] **Step 4: Verify it compiles and lints**

Run: `yarn tsc && yarn lint`
Expected: clean (component is not rendered anywhere yet — that's fine).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ReminderField.tsx src/components/ui/index.ts src/i18n/locales/en.json src/i18n/locales/vi.json
git commit -m "feat(ui): ReminderField — multi-reminder editor in a single swapping BottomSheet"
```

---

### Task 3: Domain swap `reminderTime` → `reminderTimes` + form wiring

This is one atomic task: the field rename breaks types/schema/repo/factory/notifications/form together, and `yarn tsc` must be green at the commit. Tests are updated FIRST so the red → green cycle drives the swap.

**Files:**
- Modify: `src/features/trackers/types.ts:31`
- Modify: `src/features/trackers/db/schema.ts:55`
- Modify: `src/features/trackers/db/repository.ts:28,57,69-70`
- Modify: `src/features/trackers/factory.ts:35,70`
- Modify: `src/features/trackers/notifications.ts:22-24,81-91,106-157`
- Modify: `src/screens/trackers/TrackerFormScreen.tsx` (state 120-123, hydrate 157-158, save 222-225, three reminder JSX blocks, imports)
- Test (modify): `src/features/trackers/__tests__/factory.test.ts`, `src/features/trackers/db/__tests__/repository.test.ts`, `src/features/trackers/db/__tests__/schema.test.ts`, plus fixture-only updates in `src/features/trackers/calculators/__tests__/{habit,target,targetTrajectory,project,average,averageStats,habitStats}.test.ts` and `src/features/trackers/sync/__tests__/{merge,countPending,snapshot}.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_REMINDER` from `@features/trackers/reminders` (Task 1); `ReminderField` from `@components/ui` (Task 2).
- Produces: `Tracker.reminderTimes: string[]`; `BuildTrackerInput.reminderTimes?: string[]`; DB column `reminder_times TEXT` (JSON array, NULL when empty); notification ids `rem-<trackerId>-<day>-<index>`.

- [ ] **Step 1: Update the fixture-only tests (mechanical)**

Every test fixture declaring `reminderTime: null,` becomes `reminderTimes: [],`:

```bash
cd /Users/luan/Documents/Kite
grep -rl 'reminderTime: null' src --include='*.test.ts' | xargs sed -i '' 's/reminderTime: null,/reminderTimes: [],/'
```

Affected: the 7 calculator test files, `repository.test.ts` (2 fixtures), and the 3 sync test files. Verify with `grep -rn 'reminderTime' src --include='*.test.ts'` — only `factory.test.ts` hits should remain (handled next).

- [ ] **Step 2: Rewrite the reminder-specific tests**

In `src/features/trackers/__tests__/factory.test.ts`, replace the two reminder tests (lines 29–50) with:

```ts
  it('applies repeatDays and reminderTimes to a target', () => {
    const t = buildTracker({
      name: 'Save',
      type: 'target',
      targetValue: 2000,
      repeatDays: [1, 3, 5],
      reminderTimes: ['08:00', '18:00']
    })
    expect(t.repeatDays).toEqual([1, 3, 5])
    expect(t.reminderTimes).toEqual(['08:00', '18:00'])
  })

  it("defaults reminderTimes to ['18:00'] for habit/target/average", () => {
    const habit = buildTracker({ name: 'Meditate', type: 'habit' })
    const target = buildTracker({ name: 'Save', type: 'target', targetValue: 1 })
    const avg = buildTracker({ name: 'Water', type: 'average', targetValue: 8 })
    expect(habit.reminderTimes).toEqual(['18:00'])
    expect(target.reminderTimes).toEqual(['18:00'])
    expect(avg.reminderTimes).toEqual(['18:00'])
    expect(target.routine).toBeNull()
  })

  it('gives a project no reminders by default', () => {
    expect(buildTracker({ name: 'Ship', type: 'project' }).reminderTimes).toEqual([])
  })

  it('keeps an explicit empty reminderTimes (reminders switched off)', () => {
    const t = buildTracker({ name: 'Meditate', type: 'habit', reminderTimes: [] })
    expect(t.reminderTimes).toEqual([])
  })
```

In `src/features/trackers/db/__tests__/repository.test.ts`, add inside `describe('tracker row mapping')`:

```ts
  test('trackerToRow serializes reminderTimes as JSON, empty as NULL', () => {
    const row = trackerToRow({ ...tracker, reminderTimes: ['08:00', '18:00'] })
    expect(row.reminder_times).toBe('["08:00","18:00"]')
    expect(trackerToRow(tracker).reminder_times).toBeNull()
  })

  test('rowToTracker round-trips reminderTimes and defaults missing to []', () => {
    const withTimes = { ...tracker, reminderTimes: ['08:00'] }
    expect(rowToTracker(trackerToRow(withTimes))).toEqual(withTimes)
    const row = trackerToRow(tracker)
    delete row.reminder_times
    expect(rowToTracker(row).reminderTimes).toEqual([])
  })
```

In `src/features/trackers/db/__tests__/schema.test.ts` line 33, replace:

```ts
      { name: 'reminder_time', decl: 'reminder_time TEXT' },
```

with:

```ts
      { name: 'reminder_times', decl: 'reminder_times TEXT' },
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `yarn test src/features/trackers`
Expected: FAIL — TypeScript errors (`reminderTimes` does not exist on `Tracker` / `BuildTrackerInput`) across the updated suites.

- [ ] **Step 4: Swap the domain field**

`src/features/trackers/types.ts` line 31, replace:

```ts
  reminderTime: string | null // "HH:MM" 24h, null = reminders off
```

with:

```ts
  reminderTimes: string[] // "HH:MM" 24h, insertion order; [] = reminders off
```

`src/features/trackers/db/schema.ts` line 55, replace:

```ts
  { name: 'reminder_time', decl: 'reminder_time TEXT' },
```

with:

```ts
  { name: 'reminder_times', decl: 'reminder_times TEXT' },
```

(Dev DBs keep an orphaned `reminder_time` column — harmless; `missingColumns` ignores extras and ADDs the new one.)

`src/features/trackers/db/repository.ts`:
- Line 28 `reminder_time: t.reminderTime,` →

```ts
    reminder_times: t.reminderTimes.length
      ? JSON.stringify(t.reminderTimes)
      : null,
```

- Line 57 `reminderTime: r.reminder_time ?? null,` →

```ts
    reminderTimes: r.reminder_times ? JSON.parse(r.reminder_times) : [],
```

- In the `COLS` string (line 69–70), replace `reminder_time` with `reminder_times`.

`src/features/trackers/factory.ts`:
- Add import: `import { DEFAULT_REMINDER } from '@features/trackers/reminders'`
- In `BuildTrackerInput`, replace `reminderTime?: string | null` with `reminderTimes?: string[]`
- In `buildTracker`, replace `reminderTime: input.reminderTime ?? null,` with:

```ts
    reminderTimes:
      input.reminderTimes ??
      (isHabit || type === 'target' || isAverage ? [DEFAULT_REMINDER] : []),
```

(`??` keeps an explicit `[]` — reminders off — from being replaced by the default. Quick-starts flow through `buildTracker`, so they get the default 18:00 reminder too, which is the intended "on by default".)

- [ ] **Step 5: Update notifications for multiple times**

In `src/features/trackers/notifications.ts`:

Replace `reminderId` (lines 21–24) with:

```ts
/** Stable per-tracker, per-weekday, per-time notification id. */
function reminderId(trackerId: string, day: number, index: number): string {
  return `rem-${trackerId}-${day}-${index}`
}
```

Replace `cancelTrackerReminders` (lines 80–91) with:

```ts
/** Cancel every reminder previously scheduled for this tracker. Looks up the
 *  live trigger ids so it never depends on how many times/days the previous
 *  version of the tracker had. */
export async function cancelTrackerReminders(trackerId: string): Promise<void> {
  try {
    const ids = await notifee.getTriggerNotificationIds()
    const mine = ids.filter((id) => id.startsWith(`rem-${trackerId}-`))
    await Promise.all(
      mine.map((id) => notifee.cancelTriggerNotification(id))
    )
  } catch {
    // ignore
  }
}
```

In `scheduleTrackerReminders`, replace the body after `await cancelTrackerReminders(tracker.id)` (lines 112–156) with:

```ts
  const reminds =
    tracker.type === 'habit' ||
    tracker.type === 'target' ||
    tracker.type === 'average'
  if (!reminds || tracker.reminderTimes.length === 0) return

  const days =
    tracker.repeatDays && tracker.repeatDays.length > 0
      ? tracker.repeatDays
      : ALL_DAYS

  await ensureReminderChannel()
  try {
    await Promise.all(
      tracker.reminderTimes.flatMap((time, index) => {
        const parsed = parseTime(time)
        if (!parsed) return [] // skip malformed times individually
        const [hours, minutes] = parsed
        return days.map((day) => {
          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: nextOccurrence(day, hours, minutes).getTime(),
            repeatFrequency: RepeatFrequency.WEEKLY
          }
          return notifee.createTriggerNotification(
            {
              id: reminderId(tracker.id, day, index),
              title: tracker.name,
              body,
              android: { channelId: CHANNEL_ID, pressAction: { id: 'default' } },
              // Show the reminder even when the app is open (foreground) on iOS.
              ios: {
                foregroundPresentationOptions: {
                  banner: true,
                  list: true,
                  sound: true
                }
              }
            },
            trigger
          )
        })
      })
    )
  } catch {
    // ignore — scheduling is best-effort
  }
}
```

Also update the doc comment above `scheduleTrackerReminders` to say "one weekly-repeating notification per (reminder time × due weekday)". The docstring at the top of the file (lines 11–16) similarly: "one per selected `repeatDay` at each of the tracker's `reminderTimes`".

- [ ] **Step 6: Wire the form**

In `src/screens/trackers/TrackerFormScreen.tsx`:

State (lines 120–123), replace with:

```ts
  // Create defaults to one active 18:00 reminder; edit hydrates from the row.
  const [reminderOn, setReminderOn] = useState(
    editing ? editing.reminderTimes.length > 0 : true
  )
  const [reminderTimes, setReminderTimes] = useState<string[]>(
    editing && editing.reminderTimes.length > 0
      ? editing.reminderTimes
      : [DEFAULT_REMINDER]
  )
```

Hydrate effect (lines 157–158), replace with:

```ts
    setReminderOn(editing.reminderTimes.length > 0)
    setReminderTimes(
      editing.reminderTimes.length > 0
        ? editing.reminderTimes
        : [DEFAULT_REMINDER]
    )
```

Save (lines 222–225 in the `buildTracker` call), replace with:

```ts
      reminderTimes:
        (isHabit || isTarget || isAverage) && reminderOn ? reminderTimes : [],
```

Replace ALL THREE reminder JSX blocks — target (lines 466–484), average (lines 563–582), habit (lines 778–797) — each `<View className='gap-s2'>…Toggle…TimeField…</View>` block becomes one line (only the `TYPE_COLOR` key differs: `target` / `average` / `habit`):

```tsx
            {/* reminders */}
            <ReminderField
              enabled={reminderOn}
              onEnabledChange={setReminderOn}
              times={reminderTimes}
              onTimesChange={setReminderTimes}
              accentColor={TYPE_COLOR.target}
            />
```

Imports: in the `@components/ui` import, add `ReminderField` and REMOVE `TimeField` (no longer used here; `Toggle` stays — the bad-habit switch uses it). Add:

```ts
import { DEFAULT_REMINDER } from '@features/trackers/reminders'
```

Check whether `Icons.Bell` is still referenced elsewhere in the file (it was only in the three removed blocks) — if not, `Icons` is still used for `Icons.Back`/`Icons.Trash`, so keep the import as-is.

- [ ] **Step 7: Full verification**

```bash
yarn tsc
yarn lint
yarn test
```

Expected: all clean/green. If `grep -rn 'reminderTime\b' src` (word boundary, excluding `reminderTimes`) still hits anything outside comments, fix it.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(reminders): multi-reminder times per tracker — schema, notifications, ReminderField form wiring"
```

---

### Task 4: Docs + on-device verification

**Files:**
- Modify: `CLAUDE.md` (domain-model line + notifications line)

- [ ] **Step 1: Update CLAUDE.md**

In the `types.ts` bullet, change `reminderTime ("HH:MM" | null)` to `reminderTimes (string[] "HH:MM", [] = off)`. In the `notifications.ts` bullet, change "one per due weekday at `reminderTime`, habits only" to "one per (reminder time × due weekday)". In the `trackers` table column count, 19 stays 19 (one column swapped, none added).

- [ ] **Step 2: Simulator verification (notifee + BottomSheet are native — Jest can't cover this)**

Run: `yarn ios`

Checklist:
1. Create a new habit → the Reminders row shows `18:00` (on by default).
2. Tap the row → sheet opens: toggle ON, one `18:00` row, no trash button (single row), "Add reminder" button visible.
3. Tap "Add reminder" twice → rows `19:00`, `20:00` appear instantly; trash buttons now visible.
4. Tap a row → wheel view opens seeded with that time; pick a new time → Save → back to list with the row updated; back button returns without changes.
5. Add until 6 rows → "Add reminder" disappears.
6. Trash a middle row → it disappears; remaining order preserved.
7. Toggle OFF → list replaced by hint text; close sheet → trigger row shows "Off"/"Tắt". Toggle back ON → times restored.
8. Save the tracker; reopen its edit form → same times come back (SQLite round-trip).
9. Set a reminder 2 minutes ahead on today's weekday, save, background the app → notification fires. (Repeat with two times 1 minute apart → both fire.)
10. Turn reminders off and save → (dev menu or re-save) previously scheduled notifications no longer fire.
11. Switch language to VI in Settings → row/sheet strings show Vietnamese.
12. Dark mode: sheet, rows, wheel all legible.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: reminderTimes in CLAUDE.md domain model"
```

---

## Self-review notes

- Spec coverage: data model (Task 3), notifications incl. prefix-based cancel (Task 3 Step 5), ReminderField trigger/summary/modal/toggle/trash/add/cap/wheel-swap (Task 2), form defaults & save mapping (Task 3 Step 6), pure helpers + TDD (Task 1), i18n (Task 2 Step 1), out-of-scope items untouched. ✓
- `reminderSummary` off-state is rendered by ReminderField via `t('form.reminderOff')` — matches spec ("Off handled by the caller"). ✓
- Type consistency: `nextReminderTime(times: string[]): string`, `DEFAULT_REMINDER`, `MAX_REMINDERS` names match across Tasks 1–3; notification id `rem-<id>-<day>-<index>` consistent between `reminderId` and the cancel prefix `rem-<id>-`. ✓
- `notifee.getTriggerNotificationIds()` exists in @notifee/react-native v7+ (project uses it); wrapped in try/catch like every other notifee call. ✓
