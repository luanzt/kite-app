# Habit Notes Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build out the Habit Detail **Notes** tab — a pinned, editable Goal note plus an enriched, tappable list of per-entry Log notes — to match the `Kite/Habit Notes.html` design.

**Architecture:** Add a nullable `goalNote` field to the `Tracker` model (type → schema column → repository mapping → factory default), persist it through the existing `useSaveTracker` upsert, and rewrite `HabitNotesTab.tsx` into two sections (Goal note + Log notes). Yes/No badges reuse the existing `doneDatesOf` helper; tapping a log note opens the existing `LogEntryModal` via `onEditEntry`.

**Tech Stack:** React Native CLI, TypeScript (strict), op-sqlite, TanStack Query, HeroUI Native (Typography), Uniwind (Tailwind v4 `className`), lucide-react-native, i18next.

## Global Constraints

- **Text:** Use `<Typography>` from `heroui-native`, NEVER `<Text>`.
- **Styling:** Tailwind `className` only — no inline `style={{…}}` except a genuinely runtime-dynamic value (the existing `paddingBottom: insets.bottom + 24` on the ScrollView is the only allowed one here). Use Kite tokens: `bg-surface`, `border-line`, `text-ink`/`text-ink-2`/`text-ink-3`, `text-brand-ink`, `bg-brand-weak`, `bg-pace-behind-weak`/`text-pace-behind`, `rounded-xl-k`/`rounded-lg-k`, spacing `p-s4`/`m-s5`/`gap-s3` etc.
- **Icons:** Only `lucide-react-native` via the `Icons` map (`Icons.Notes`, `Icons.Edit`, `Icons.Check`, `Icons.Close`). Size with the numeric `size` prop.
- **i18n:** `t('key')` for all visible strings; never hardcode. Keep `en.json` and `vi.json` key-for-key in sync. User-entered note text is stored verbatim, never translated.
- **Colors:** Use the app's own theme tokens, NOT the mockup's standalone blue/`#c8385a` palette.
- **Data:** SQLite is the source of truth (UI → Query hooks → repository → SQLite). Never store tracker data in Zustand. Construct `Tracker` objects only via `buildTracker()`.
- **Migration:** New column must be nullable (SQLite can't `ADD COLUMN` a bare `NOT NULL` to a populated table). The data-driven `migrateTable` handles both fresh + existing DBs.
- **TypeScript:** strict mode; `yarn tsc` must be clean. Adding a required field to `Tracker` breaks every full `Tracker` literal — fix all of them (factory + test fixtures).
- **Tests:** TDD — write the failing test first. op-sqlite is mocked in Jest; DB-calling functions are NOT unit-tested (verify on device). Run a single file with `yarn test <path>`.

---

## File Structure

- `src/features/trackers/types.ts` — add `goalNote: string | null` to `Tracker`.
- `src/features/trackers/db/schema.ts` — add `goal_note` ColumnSpec to `TRACKER_COLUMNS`.
- `src/features/trackers/db/repository.ts` — map `goal_note` ↔ `goalNote`, add to `COLS`.
- `src/features/trackers/db/__tests__/repository.test.ts` — extend fixtures + round-trip coverage for `goalNote`.
- `src/features/trackers/factory.ts` — default `goalNote: null` in `buildTracker`.
- `src/i18n/locales/en.json` & `vi.json` — add `detail.goalNote`, `detail.goalNoteHint`, `detail.goalNotePlaceholder`, `detail.logNotes`, `detail.notesCount`. (Yes/No labels REUSE existing `log.yes`/`log.no`.)
- `src/features/trackers/components/HabitDetailView.tsx` — pass `tracker` + `onEditEntry` into `HabitNotesTab` from context.
- `src/features/trackers/components/HabitNotesTab.tsx` — rewrite into Goal note + Log notes sections.

---

## Task 1: Add `goalNote` to the data model (type, schema, repository, factory)

This is one task because the type change cascades: adding the field to `Tracker` breaks `tsc` everywhere a full `Tracker` is built or asserted, so the type, schema column, repo mapping, factory default, and test fixtures must all land together to keep the tree green.

**Files:**
- Modify: `src/features/trackers/types.ts:9-28` (`Tracker` type)
- Modify: `src/features/trackers/db/schema.ts:39-58` (`TRACKER_COLUMNS`)
- Modify: `src/features/trackers/db/repository.ts:6-53` (`trackerToRow`, `rowToTracker`, `COLS`)
- Modify: `src/features/trackers/factory.ts:39-62` (`buildTracker`)
- Test: `src/features/trackers/db/__tests__/repository.test.ts`

**Interfaces:**
- Produces: `Tracker.goalNote: string | null`; repository round-trips it via the `goal_note` TEXT column; `buildTracker` defaults it to `null`.

- [ ] **Step 1: Write the failing test**

In `src/features/trackers/db/__tests__/repository.test.ts`, first add `goalNote` to BOTH existing fixtures so they stay valid `Tracker` literals. Add to the top-level `tracker` object (after `archived: false` → make it `archived: false,` and add the field; simplest is to insert it before `archived`):

In the `tracker` fixture (lines 9-28), add after `createdAt: '2026-01-01T00:00:00Z',`:
```ts
  goalNote: 'Build an emergency fund',
  archived: false
```
(i.e. replace the trailing `archived: false` line so `goalNote` precedes it.)

In the `habit` fixture inside the "all nullable fields null" test (lines 50-69), add before `archived: false`:
```ts
      goalNote: null,
      archived: false
```

Then add a dedicated round-trip test inside `describe('tracker row mapping', ...)`:
```ts
  test('trackerToRow maps goalNote to goal_note column', () => {
    expect(trackerToRow(tracker).goal_note).toBe('Build an emergency fund')
  })

  test('rowToTracker handles null goal_note', () => {
    const row = { ...trackerToRow(tracker), goal_note: null }
    expect(rowToTracker(row).goalNote).toBeNull()
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test src/features/trackers/db/__tests__/repository.test.ts`
Expected: FAIL — `trackerToRow(...).goal_note` is `undefined` (column not mapped yet), and `tsc`/the runner flags `goalNote` as an unknown property on `Tracker`.

- [ ] **Step 3: Add the field to the `Tracker` type**

In `src/features/trackers/types.ts`, inside the `Tracker` type, add the field after `reminderTime`:
```ts
  reminderTime: string | null // "HH:MM" 24h, null = reminders off
  goalNote: string | null // free-text motivation note pinned to the goal (habit Notes tab)
  createdAt: string // ISO datetime
```

- [ ] **Step 4: Add the schema column**

In `src/features/trackers/db/schema.ts`, in `TRACKER_COLUMNS`, add after the `reminder_time` entry (line 55) and before `created_at`:
```ts
  { name: 'reminder_time', decl: 'reminder_time TEXT' },
  { name: 'goal_note', decl: 'goal_note TEXT' },
  { name: 'created_at', decl: "created_at TEXT NOT NULL DEFAULT ''" },
```

- [ ] **Step 5: Map the column in the repository**

In `src/features/trackers/db/repository.ts`:

In `trackerToRow` (add after `reminder_time: t.reminderTime,`):
```ts
    reminder_time: t.reminderTime,
    goal_note: t.goalNote,
    created_at: t.createdAt,
```

In `rowToTracker` (add after `reminderTime: r.reminder_time ?? null,`):
```ts
    reminderTime: r.reminder_time ?? null,
    goalNote: r.goal_note ?? null,
    createdAt: r.created_at,
```

In the `COLS` constant (line 52-53), add `goal_note` right before `created_at`:
```ts
const COLS =
  'id,name,type,icon,color,unit,direction,target_value,start_value,accumulation,start_date,deadline,period,repeat_days,routine,reminder_time,goal_note,created_at,archived'
```

- [ ] **Step 6: Default the field in the factory**

In `src/features/trackers/factory.ts`, in `buildTracker`'s returned object, add after the `reminderTime` line:
```ts
    reminderTime: isHabit ? input.reminderTime ?? null : null,
    goalNote: null,
    createdAt: new Date().toISOString(),
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `yarn test src/features/trackers/db/__tests__/repository.test.ts`
Expected: PASS (all tracker + entry row-mapping tests, including the two new ones).

- [ ] **Step 8: Type-check the whole project**

Run: `yarn tsc`
Expected: clean (no errors). If any other full `Tracker` literal exists (e.g. another test or seed), add `goalNote: null` there too — `tsc` will name the file and line.

- [ ] **Step 9: Run the full test suite**

Run: `yarn test`
Expected: PASS — no existing test regresses.

- [ ] **Step 10: Commit**

```bash
git add src/features/trackers/types.ts src/features/trackers/db/schema.ts src/features/trackers/db/repository.ts src/features/trackers/db/__tests__/repository.test.ts src/features/trackers/factory.ts
git commit -m "feat(habit-notes): add goalNote field to Tracker (type, schema, repo, factory)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Add i18n strings for the Notes tab

**Files:**
- Modify: `src/i18n/locales/en.json` (the `detail` object, around line 80)
- Modify: `src/i18n/locales/vi.json` (the `detail` object, around line 80)

**Interfaces:**
- Produces: `detail.goalNote`, `detail.goalNoteHint`, `detail.goalNotePlaceholder`, `detail.logNotes`, `detail.notesCount` in both locales. The Yes/No status labels REUSE existing `log.yes` / `log.no` (already "Yes"/"No" and "Có"/"Không") — no new keys for those.

- [ ] **Step 1: Add the English keys**

In `src/i18n/locales/en.json`, replace the existing `noNotes` line (line 80) with the existing keys plus the new ones:
```json
    "noNotes": "No notes yet", "noNotesHint": "Notes you add when logging will show up here.",
    "goalNote": "Goal note", "goalNoteHint": "Tap to edit · pinned to this goal",
    "goalNotePlaceholder": "Why does this habit matter to you? Write a note to keep you motivated…",
    "logNotes": "Log notes", "notesCount": "{{count}} notes",
```

- [ ] **Step 2: Add the Vietnamese keys**

In `src/i18n/locales/vi.json`, replace the existing `noNotes` line (line 80) with:
```json
    "noNotes": "Chưa có ghi chú", "noNotesHint": "Ghi chú bạn thêm khi ghi nhận sẽ hiện ở đây.",
    "goalNote": "Ghi chú mục tiêu", "goalNoteHint": "Chạm để sửa · ghim vào mục tiêu này",
    "goalNotePlaceholder": "Vì sao thói quen này quan trọng với bạn? Viết một ghi chú để giữ động lực…",
    "logNotes": "Ghi chú nhật ký", "notesCount": "{{count}} ghi chú",
```

- [ ] **Step 3: Verify the JSON parses**

Run: `node -e "require('./src/i18n/locales/en.json'); require('./src/i18n/locales/vi.json'); console.log('OK')"`
Expected: prints `OK` (no JSON syntax error from trailing commas / quotes).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/vi.json
git commit -m "i18n(habit-notes): add Notes tab strings (en + vi)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Pass `tracker` + `onEditEntry` into the Notes tab

**Files:**
- Modify: `src/features/trackers/components/HabitDetailView.tsx:44-48` (`NotesScreen`)

**Interfaces:**
- Consumes: `HabitDetailContext` already exposes `tracker`, `entries`, `onEditEntry` (used by the History screen).
- Produces: `<HabitNotesTab tracker entries onEditEntry />` — the prop shape Task 4 implements.

- [ ] **Step 1: Update `NotesScreen` to forward the props**

In `src/features/trackers/components/HabitDetailView.tsx`, replace the `NotesScreen` function (lines 44-48):
```tsx
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
```

- [ ] **Step 2: Type-check**

Run: `yarn tsc`
Expected: FAIL — `HabitNotesTab` does not yet accept `tracker`/`onEditEntry` (its current props are `{ entries }`). This is expected; Task 4 changes the component's props to match. (If you implement Task 4 first, this step passes — either order is fine, but commit them together if so.)

- [ ] **Step 3: Commit (with Task 4)**

Do not commit this task alone — it leaves `tsc` red. Commit it together with Task 4 (the matching commit is in Task 4, Step 11).

---

## Task 4: Rewrite `HabitNotesTab` — Goal note + Log notes sections

**Files:**
- Modify (full rewrite): `src/features/trackers/components/HabitNotesTab.tsx`

**Interfaces:**
- Consumes: `Tracker` (with `goalNote`), `Entry[]`, `onEditEntry?: (entry: Entry) => void` (from Task 3); `doneDatesOf` from `@features/trackers/calculators/habitStats`; `useSaveTracker` from `@features/trackers/queries`; `Icons` from `@features/trackers/icons`.
- Produces: `<HabitNotesTab tracker entries onEditEntry />`.

**Behavior contract:**
- **Goal note card:** a controlled multiline `TextInput` seeded from `tracker.goalNote ?? ''`. Local draft state. On blur, if `draft.trim() !== (tracker.goalNote ?? '')`, call `saveTracker.mutate({ ...tracker, goalNote: draft.trim() === '' ? null : draft.trim() })`. Decorative quote glyph top-right. Footer: pencil icon + `t('detail.goalNoteHint')`. Placeholder = `t('detail.goalNotePlaceholder')` when empty.
- **Log notes:** entries with a non-empty `note`, sorted newest-first by `date`. Each is a `Pressable` calling `onEditEntry?.(entry)`. Badge: `doneDatesOf(tracker, entries).has(entry.date.slice(0,10))` → Yes (green-check on `bg-brand-weak`, `text-brand-ink`) else No (X on `bg-pace-behind-weak`, `text-pace-behind`). Status label: `t('log.yes')` / `t('log.no')`. Section header shows `t('detail.notesCount', { count })`.
- **Empty state:** when no entry has a note, the Log notes section shows the existing dashed empty-state card (`detail.noNotes` / `detail.noNotesHint`).

- [ ] **Step 1: Write the full component**

Replace the entire contents of `src/features/trackers/components/HabitNotesTab.tsx`:
```tsx
import { useState } from 'react'
import { Pressable, ScrollView, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type { Tracker, Entry } from '@features/trackers/types'
import { doneDatesOf } from '@features/trackers/calculators/habitStats'
import { useSaveTracker } from '@features/trackers/queries'
import { Icons } from '@features/trackers/icons'

/** Format an entry date ("18 Jun 2026"), UTC. */
function entryDate(iso: string, lang: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(lang, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  })
}

/** Editable motivation note pinned to the habit; saves on blur if changed. */
function GoalNoteCard({ tracker }: { tracker: Tracker }) {
  const { t } = useTranslation()
  const saveTracker = useSaveTracker()
  const [draft, setDraft] = useState(tracker.goalNote ?? '')

  const onBlur = () => {
    const next = draft.trim() === '' ? null : draft.trim()
    if (next !== (tracker.goalNote ?? null)) {
      saveTracker.mutate({ ...tracker, goalNote: next })
    }
  }

  return (
    <View>
      <View className='mb-s3 flex-row items-center justify-between px-s2'>
        <Typography className='text-xs font-bold uppercase text-ink-3'>
          {t('detail.goalNote')}
        </Typography>
      </View>
      <View className='rounded-xl-k border border-line bg-surface p-s5'>
        <Typography className='absolute right-s4 top-s2 text-5xl font-bold text-brand-weak'>
          ”
        </Typography>
        <TextInput
          multiline
          value={draft}
          onChangeText={setDraft}
          onBlur={onBlur}
          placeholder={t('detail.goalNotePlaceholder')}
          placeholderTextColor='#8a8e80'
          className='min-h-[72px] text-h3-k font-medium text-ink'
        />
        <View className='mt-s3 flex-row items-center gap-s2'>
          <Icons.Edit size={14} color='#8a8e80' />
          <Typography className='text-xs font-medium text-ink-3'>
            {t('detail.goalNoteHint')}
          </Typography>
        </View>
      </View>
    </View>
  )
}

/** One log note: Yes/No badge + date + status + the note text. Tap to edit. */
function LogNoteCard({
  entry,
  done,
  lang,
  onPress
}: {
  entry: Entry
  done: boolean
  lang: string
  onPress?: () => void
}) {
  const { t } = useTranslation()
  return (
    <Pressable
      onPress={onPress}
      className='flex-row items-start gap-s4 rounded-lg-k border border-line bg-surface p-s4'
    >
      <View
        className={`h-[30px] w-[30px] items-center justify-center rounded-full ${
          done ? 'bg-brand-weak' : 'bg-pace-behind-weak'
        }`}
      >
        {done ? (
          <Icons.Check size={16} color='#2456b5' />
        ) : (
          <Icons.Close size={16} color='#e0564e' />
        )}
      </View>
      <View className='flex-1'>
        <View className='flex-row items-baseline gap-s2'>
          <Typography className='text-sm font-bold text-brand-ink'>
            {entryDate(entry.date, lang)}
          </Typography>
          <Typography
            className={`text-xs font-bold uppercase ${
              done ? 'text-brand' : 'text-pace-behind'
            }`}
          >
            {done ? t('log.yes') : t('log.no')}
          </Typography>
        </View>
        <Typography className='mt-s1 text-body-k text-ink'>
          {entry.note}
        </Typography>
      </View>
    </Pressable>
  )
}

/**
 * Notes tab — a pinned editable Goal note plus the list of logged entries that
 * carry a note (newest first), each with a Yes/No completion badge and tappable
 * to edit the underlying log. Empty state when no entry has a note yet.
 */
export function HabitNotesTab({
  tracker,
  entries,
  onEditEntry
}: {
  tracker: Tracker
  entries: Entry[]
  onEditEntry?: (entry: Entry) => void
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const insets = useSafeAreaInsets()

  const done = doneDatesOf(tracker, entries)
  const noted = entries
    .filter((e) => e.note && e.note.trim().length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} // safe-area, runtime
      showsVerticalScrollIndicator={false}
    >
      <View className='m-s5 gap-s6'>
        <GoalNoteCard tracker={tracker} />

        <View>
          <View className='mb-s3 flex-row items-center justify-between px-s2'>
            <Typography className='text-xs font-bold uppercase text-ink-3'>
              {t('detail.logNotes')}
            </Typography>
            {noted.length > 0 ? (
              <Typography className='text-xs font-bold text-ink-3'>
                {t('detail.notesCount', { count: noted.length })}
              </Typography>
            ) : null}
          </View>

          {noted.length === 0 ? (
            <View className='items-center rounded-lg-k border border-dashed border-line-strong p-s7'>
              <Icons.Notes size={28} color='#8a8e80' />
              <Typography className='mt-s3 text-sm font-medium text-ink-2'>
                {t('detail.noNotes')}
              </Typography>
              <Typography className='mt-s1 text-center text-xs text-ink-3'>
                {t('detail.noNotesHint')}
              </Typography>
            </View>
          ) : (
            <View className='gap-s3'>
              {noted.map((e) => (
                <LogNoteCard
                  key={e.id}
                  entry={e}
                  done={done.has(e.date.slice(0, 10))}
                  lang={lang}
                  onPress={onEditEntry ? () => onEditEntry(e) : undefined}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `yarn tsc`
Expected: clean — `HabitNotesTab`'s new props match what `NotesScreen` (Task 3) passes, and all imports resolve.

- [ ] **Step 3: Lint**

Run: `yarn lint`
Expected: clean. In particular, no `no-inline-styles` error (the only inline style is the documented runtime `paddingBottom`), and no `<Text>` import.

- [ ] **Step 4: Run the full test suite**

Run: `yarn test`
Expected: PASS — no regressions (this task adds no unit tests; the component is verified on device).

- [ ] **Step 5: Commit**

```bash
git add src/features/trackers/components/HabitNotesTab.tsx src/features/trackers/components/HabitDetailView.tsx
git commit -m "feat(habit-notes): Notes tab with editable goal note + tappable log notes

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: On-device verification

**Files:** none (manual verification on simulator/device).

op-sqlite is unavailable in Jest, so the DB-backed behavior is verified here.

- [ ] **Step 1: Launch the app**

Run: `yarn ios` (or `yarn android`). If the schema column doesn't appear, the migration runs on first `getDb()` — a fresh launch is enough; no manual DB reset needed because `ADD COLUMN` is applied to existing DBs.

- [ ] **Step 2: Verify the Goal note**

Open a habit → Notes tab. Type a goal note, tap elsewhere to blur. Navigate away and back (or relaunch the app) → the note persists. Clear it and blur → it saves as empty and shows the placeholder again.

- [ ] **Step 3: Verify Log notes**

Log a session with a note on a day that meets the per-day goal → it appears under "Log notes" with a green check + "Yes". Log a note on a day that falls short (e.g. a 2×/day habit with one log) → red X + "No". The count header reads the right number. The badge colors match the calendar's done days.

- [ ] **Step 4: Verify tap-to-edit**

Tap a log note → the `LogEntryModal` opens for that entry. Edit the note/value and save → the list reflects the change. Delete the entry → it disappears from the list.

- [ ] **Step 5: Verify empty state**

Open a habit with no noted entries → the dashed "No notes yet" card shows under Log notes (the Goal note section is still present and editable).

- [ ] **Step 6: Mark complete**

No commit (verification only). If any defect is found, fix it in the relevant task's file and re-run `yarn tsc` / `yarn lint` / `yarn test` before re-verifying.

---

## Notes for the implementer

- **Why reuse `useSaveTracker` for the goal note:** `repo.insertTracker` is `INSERT OR REPLACE` (a full upsert), and `useSaveTracker` already invalidates both the `trackers` list and the `tracker(id)` query, so the detail screen re-renders with the saved note. It also reschedules reminders — harmless, since the reminder config is unchanged.
- **Why Yes = blue and No = red:** matches the mockup (blue check for completed, red X for not) while using Kite's own tokens (`brand-weak`/`brand-ink` and `pace-behind-weak`/`pace-behind`) rather than the design file's standalone palette.
- **The `”` quote glyph and hardcoded icon colors** (`#2456b5`, `#e0564e`, `#8a8e80`) are the resolved hex of Kite tokens (`--color-brand`, `--color-pace-behind`, `--color-ink-3`); lucide icons take a `color` string prop, not a className, so the hex is unavoidable there — keep them in sync with `global.css` if the tokens ever change.
