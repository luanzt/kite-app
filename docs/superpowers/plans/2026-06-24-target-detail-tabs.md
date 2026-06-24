# Target Detail 3-Tab Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Target detail screen the Habit-style 3-tab layout (Overview / History / Notes), with a numeric value log instead of Yes/No, reusing the existing tab shell and History/Notes components.

**Architecture:** A new `TargetDetailView` mirrors `HabitDetailView` (same `Tab.Navigator` + `HabitTabBar` + shared `HabitDetailContext`) but mounts a new `TargetOverviewTab` (current target detail lifted as-is) plus the existing History/Notes tabs. The History and Notes components gain a value-vs-Yes/No branch keyed on `tracker.type`. `LogEntryModal` branches: habit → Yes/No, non-habit → a numeric value input. i18n adds `log.value`/`log.valuePh`.

**Tech Stack:** React Native CLI, TypeScript (strict), HeroUI Native + Uniwind, `@react-navigation/material-top-tabs`, `@shopify/flash-list`, i18next.

## Global Constraints

- **Styling:** Tailwind `className` only — NEVER inline `style={{…}}` except runtime-dynamic values (safe-area, continuous dimensions). NEVER interpolate a value into a class string (branch the whole literal class).
- **Text:** render `Typography` from `heroui-native`, NEVER `Text`.
- **Icons:** `lucide-react-native` only, sized via numeric `size` prop.
- **Overlays:** HeroUI Native overlays only; `LogEntryModal` already uses `BottomSheet` — keep it. Scroll sheet content with `BottomSheetScrollView`; inputs use `BottomSheetTextInput`.
- Construct trackers/entries with the existing helpers (`uuid()`); never hand-build outside.
- **i18n:** no hardcoded visible strings; `en.json` + `vi.json` key-for-key in sync.
- TypeScript strict — `yarn tsc` clean. `yarn lint` — add NO new warnings (pre-existing ones in icons.ts/TrackerListScreen.tsx/uniwind.d.ts/habitStats.test.ts/factory.ts are out of scope). Named exports only.
- op-sqlite mocked in Jest → DB-touching paths (log save) verified on simulator, not Jest.
- Reuse `fmtVal(tracker, n)` from `@features/trackers/detailFormat` for value display.

---

## File Structure

- `src/i18n/locales/en.json`, `vi.json` — MODIFY: add `log.value`, `log.valuePh`.
- `src/features/trackers/components/LogEntryModal.tsx` — MODIFY: value-input branch for non-habit; save numeric value.
- `src/features/trackers/components/HabitHistoryTab.tsx` — MODIFY: status slot shows value (non-habit) vs Yes/No (habit).
- `src/features/trackers/components/HabitNotesTab.tsx` — MODIFY: badge/label shows value (non-habit) vs Yes/No (habit).
- `src/features/trackers/components/TargetOverviewTab.tsx` — CREATE: current target detail (Hero+StatGrid+Body) in a ScrollView.
- `src/features/trackers/components/TargetDetailView.tsx` — CREATE: 3-tab navigator for target.
- `src/screens/trackers/TrackerDetailScreen.tsx` — MODIFY: route `type === 'target'` to `TargetDetailView`.

---

## Task 1: i18n keys for the value log

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/vi.json`

**Interfaces:**
- Produces: under `log` — `value`, `valuePh`. Consumed by Task 2.

- [ ] **Step 1: Add EN keys**

In `src/i18n/locales/en.json`, inside the `"log"` object, after the existing `"no"` line, add:

```json
    "value": "Value",
    "valuePh": "0",
```

- [ ] **Step 2: Add VI keys**

In `src/i18n/locales/vi.json`, inside the `"log"` object, after the existing `"no"` line, add:

```json
    "value": "Giá trị",
    "valuePh": "0",
```

- [ ] **Step 3: Verify**

Run:
```bash
node -e "const en=require('./src/i18n/locales/en.json').log, vi=require('./src/i18n/locales/vi.json').log; const k=['value','valuePh']; console.log('en missing', k.filter(x=>!(x in en))); console.log('vi missing', k.filter(x=>!(x in vi))); console.log('OK')"
```
Expected: `en missing []`, `vi missing []`, `OK`.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/vi.json
git commit -m "i18n: add log.value/valuePh for numeric value log (en+vi)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: LogEntryModal — numeric value branch for non-habit

**Files:**
- Modify: `src/features/trackers/components/LogEntryModal.tsx`

**Interfaces:**
- Consumes: `i18n` `log.value`, `log.valuePh`; `tracker.type`, `tracker.unit`.
- Produces: same `LogEntryModal` props (no signature change). For `tracker.type !== 'habit'`, the sheet shows a value input and saves the entered number as `entry.value`; for habit, unchanged Yes/No → 1/0.

No Jest test (DB-touching, op-sqlite mocked). Verified on simulator. Committed once.

- [ ] **Step 1: Add value state + init**

In `LogEntryModal.tsx`, alongside the existing `done`/`note`/`dateISO`/`timeHHMM` state, add a `value` string state:

```tsx
  const [done, setDone] = useState(true)
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
```

In the reset `useEffect` (the one keyed on `[visible, entry, defaultDate]`), after `setDone(...)`, add value init from the editing entry:

```tsx
    setDone(entry ? entry.value > 0 : true)
    setValue(entry ? String(entry.value) : '')
```

- [ ] **Step 2: Save the right value by type**

In `handleSave`, replace the `value: done ? 1 : 0,` line with a type-branch:

```tsx
      value:
        tracker.type === 'habit' ? (done ? 1 : 0) : Number(value) || 0,
```

- [ ] **Step 3: Add `value` to the footer's deps**

The `renderFooter` `useCallback` deps array closes over the save inputs. Add `value` so Save never fires stale. Change:

```tsx
    [insets.bottom, done, note, dateISO, timeHHMM, entry, defaultDate, t]
```

to:

```tsx
    [insets.bottom, done, value, note, dateISO, timeHHMM, entry, defaultDate, t]
```

- [ ] **Step 4: Branch the prompt block (Yes/No vs value input)**

In the `BottomSheetScrollView`, the first child is the `{/* did you do it */}` block containing the prompt + Yes/No pressables. Wrap it so it renders ONLY for habit, and render the value input otherwise. Replace the entire `{/* did you do it */}` `<View>…</View>` block with:

```tsx
            {/* habit: Yes/No · others: numeric value */}
            {tracker.type === 'habit' ? (
              <View>
                <Typography className='mt-s4 text-center text-h3-k font-bold text-ink'>
                  {t('log.prompt')}
                </Typography>
                <View className='mt-s4 flex-row gap-s3'>
                  <Pressable
                    onPress={() => setDone(true)}
                    className={`h-[88px] flex-1 items-center justify-center gap-s2 rounded-lg-k border-2 ${
                      done ? 'border-brand bg-brand' : 'border-line bg-surface'
                    }`}
                  >
                    <Icons.Check
                      size={28}
                      color={done ? '#ffffff' : '#8a8e80'}
                    />
                    <Typography
                      className={`text-body-k font-bold ${
                        done ? 'text-on-accent' : 'text-ink-2'
                      }`}
                    >
                      {t('log.yes')}
                    </Typography>
                  </Pressable>
                  <Pressable
                    onPress={() => setDone(false)}
                    className={`h-[88px] flex-1 items-center justify-center gap-s2 rounded-lg-k border-2 ${
                      !done
                        ? 'border-pace-behind bg-pace-behind-weak'
                        : 'border-line bg-surface'
                    }`}
                  >
                    <Icons.Close
                      size={28}
                      color={!done ? '#e0564e' : '#8a8e80'}
                    />
                    <Typography
                      className={`text-body-k font-bold ${
                        !done ? 'text-pace-behind' : 'text-ink-2'
                      }`}
                    >
                      {t('log.no')}
                    </Typography>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View className='mt-s4 overflow-hidden rounded-xl-k border border-line bg-surface'>
                <Typography className='px-s5 pt-s4 text-xs-k font-bold uppercase text-ink-3'>
                  {tracker.unit
                    ? `${t('log.value')} (${tracker.unit})`
                    : t('log.value')}
                </Typography>
                <BottomSheetTextInput
                  value={value}
                  onChangeText={setValue}
                  placeholder={t('log.valuePh')}
                  placeholderTextColor='#8a8e80'
                  keyboardType='decimal-pad'
                  className='px-s5 pb-s5 pt-s2 text-h2-k font-bold text-ink'
                />
              </View>
            )}
```

- [ ] **Step 5: Type-check, lint, test**

Run: `yarn tsc && yarn lint && yarn test`
Expected: tsc clean; no new lint in LogEntryModal.tsx; 81/81 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/trackers/components/LogEntryModal.tsx
git commit -m "feat(log): numeric value input for non-habit logs (replaces Yes/No)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: History + Notes show value for non-habit

**Files:**
- Modify: `src/features/trackers/components/HabitHistoryTab.tsx`
- Modify: `src/features/trackers/components/HabitNotesTab.tsx`

**Interfaces:**
- Consumes: `fmtVal` from `@features/trackers/detailFormat`; `tracker.type`.
- Produces: both components, when `tracker.type !== 'habit'`, render the entry's numeric value (via `fmtVal`) where habit shows Yes/No. No prop-signature change (both already receive `tracker`).

No Jest test (presentational). Verified on simulator. Committed once.

### HabitHistoryTab

- [ ] **Step 1: Import fmtVal**

At the top of `HabitHistoryTab.tsx`, add:

```tsx
import { fmtVal } from '@features/trackers/detailFormat'
```

- [ ] **Step 2: Pass `tracker` into RecordRow and branch its status**

`RecordRow` currently takes `entry, isFirst, isLast, lang, t, onPress`. Add `tracker` to its props and render a value pill for non-habit. Replace the whole `RecordRow` function with:

```tsx
/** Status pill for a logged record: Yes/No (habit) or the numeric value. */
function RecordRow({
  tracker,
  entry,
  isFirst,
  isLast,
  lang,
  t,
  onPress
}: {
  tracker: Tracker
  entry: Entry
  isFirst: boolean
  isLast: boolean
  lang: string
  t: (k: string) => string
  onPress: () => void
}) {
  const yes = entry.value > 0
  const wk = weekdayLabel(entry.date, lang)
  const time = timeLabel(entry.createdAt, lang)
  const base = time ? `${wk} · ${time}` : wk
  const meta = entry.note && entry.note.trim() ? entry.note : base
  const isHabit = tracker.type === 'habit'
  return (
    <RowShell
      iso={entry.date}
      meta={meta}
      tileDone={isHabit ? yes : true}
      isFirst={isFirst}
      isLast={isLast}
      lang={lang}
      onPress={onPress}
      status={
        isHabit ? (
          yes ? (
            <View className='min-w-[72px] flex-row items-center justify-center gap-s1 rounded-full bg-brand-weak px-s3 py-s1'>
              <Icons.Check size={12} color='#2456b5' />
              <Typography className='text-xs-k font-bold text-brand-ink'>
                {t('log.yes')}
              </Typography>
            </View>
          ) : (
            <View className='min-w-[72px] flex-row items-center justify-center gap-s1 rounded-full bg-pace-behind-weak px-s3 py-s1'>
              <Icons.Close size={12} color='#e0564e' />
              <Typography className='text-xs-k font-bold text-pace-behind'>
                {t('log.no')}
              </Typography>
            </View>
          )
        ) : (
          <View className='min-w-[72px] items-center justify-center rounded-full bg-brand-weak px-s3 py-s1'>
            <Typography className='text-xs-k font-bold text-brand-ink'>
              {fmtVal(tracker, entry.value)}
            </Typography>
          </View>
        )
      }
    />
  )
}
```

- [ ] **Step 3: Pass `tracker` at the RecordRow call site**

In the `FlashList` `renderItem`, the `RecordRow` is rendered for `item.kind === 'record'`. Add the `tracker` prop:

```tsx
        return item.kind === 'record' ? (
          <RecordRow
            tracker={tracker}
            entry={item.entry}
            isFirst={isFirst}
            isLast={isLast}
            lang={lang}
            t={t}
            onPress={() => onEditEntry?.(item.entry)}
          />
        ) : (
```

### HabitNotesTab

- [ ] **Step 4: Import fmtVal**

At the top of `HabitNotesTab.tsx`, add:

```tsx
import { fmtVal } from '@features/trackers/detailFormat'
```

- [ ] **Step 5: Branch LogNoteCard badge + status label by type**

`LogNoteCard` currently takes `entry, done, lang, onPress`. Add `tracker` and branch. Replace the whole `LogNoteCard` function with:

```tsx
/** One log note: status badge + date + value/Yes-No + the note text. Tap to edit. */
function LogNoteCard({
  tracker,
  entry,
  done,
  lang,
  onPress
}: {
  tracker: Tracker
  entry: Entry
  done: boolean
  lang: string
  onPress?: () => void
}) {
  const { t } = useTranslation()
  const isHabit = tracker.type === 'habit'
  return (
    <Pressable
      onPress={onPress}
      className='flex-row items-start gap-s4 rounded-lg-k border border-line bg-surface p-s4'
    >
      <View
        className={`h-[30px] w-[30px] items-center justify-center rounded-full ${
          isHabit && !done ? 'bg-pace-behind-weak' : 'bg-brand-weak'
        }`}
      >
        {isHabit ? (
          done ? (
            <Icons.Check size={16} color='#2456b5' />
          ) : (
            <Icons.Close size={16} color='#e0564e' />
          )
        ) : (
          <Icons.Edit size={14} color='#2456b5' />
        )}
      </View>
      <View className='flex-1'>
        <View className='flex-row items-baseline gap-s2'>
          <Typography className='text-sm font-bold text-ink-2'>
            {entryDate(entry.date, lang)}
          </Typography>
          <Typography className='text-sm font-bold text-ink-3'>--</Typography>
          <Typography
            className={`text-sm font-bold ${
              isHabit && !done ? 'text-pace-behind' : 'text-brand'
            }`}
          >
            {isHabit
              ? done
                ? t('log.yes')
                : t('log.no')
              : fmtVal(tracker, entry.value)}
          </Typography>
        </View>
        <Typography className='mt-s1 text-body-k text-ink'>
          {entry.note}
        </Typography>
      </View>
    </Pressable>
  )
}
```

- [ ] **Step 6: Pass `tracker` at the LogNoteCard call site**

In `HabitNotesTab`'s `noted.map(...)`, add the `tracker` prop:

```tsx
              {noted.map((e) => (
                <LogNoteCard
                  key={e.id}
                  tracker={tracker}
                  entry={e}
                  done={e.value > 0}
                  lang={lang}
                  onPress={onEditEntry ? () => onEditEntry(e) : undefined}
                />
              ))}
```

- [ ] **Step 7: Type-check, lint, test**

Run: `yarn tsc && yarn lint && yarn test`
Expected: tsc clean; no new lint in the two files; 81/81 tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/features/trackers/components/HabitHistoryTab.tsx src/features/trackers/components/HabitNotesTab.tsx
git commit -m "feat(detail): History/Notes show numeric value for non-habit trackers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: TargetOverviewTab + TargetDetailView, wire the screen

**Files:**
- Create: `src/features/trackers/components/TargetOverviewTab.tsx`
- Create: `src/features/trackers/components/TargetDetailView.tsx`
- Modify: `src/screens/trackers/TrackerDetailScreen.tsx`

**Interfaces:**
- Consumes: `DetailHero`, `DetailStatGrid`, `DetailBody`, `progressFor` (from `TrackerCard`), `HabitTabBar`, `HabitDetailProvider`/`useHabitDetail`, `useMilestones`.
- Produces:
  - `TargetOverviewTab({ tracker, entries }: { tracker: Tracker; entries: Entry[] })` — scrollable Hero+StatGrid+Body.
  - `TargetDetailView({ tracker, entries, onAddLog, onEditEntry, onLogForDate }: same shape as HabitDetailView)` — the 3-tab navigator for target.

No Jest test (UI + DB-touching). Verified on simulator. Committed once.

- [ ] **Step 1: Create TargetOverviewTab**

Create `src/features/trackers/components/TargetOverviewTab.tsx`. It mirrors the current non-habit branch's Hero+StatGrid+Body (minus LogTodayButton), and owns its own bottom safe-area. It needs milestones for the StatGrid/Body — fetch via `useMilestones` (same hook the screen uses):

```tsx
import { ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Tracker, Entry } from '@features/trackers/types'
import { useMilestones } from '@features/trackers/queries'
import { progressFor } from '@features/trackers/components/TrackerCard'
import { DetailHero } from './DetailHero'
import { DetailStatGrid } from './DetailStatGrid'
import { DetailBody } from './DetailBody'

/**
 * Target Overview tab — the current target detail (pace hero, stat grid, body
 * with pace line / chart / milestones) lifted into the first tab. Logging is
 * done from the History tab, so there's no Log-today button here.
 */
export function TargetOverviewTab({
  tracker,
  entries
}: {
  tracker: Tracker
  entries: Entry[]
}) {
  const insets = useSafeAreaInsets()
  const { data: milestones = [] } = useMilestones(tracker.id)
  const p = progressFor(tracker, entries, milestones)
  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} // safe-area, runtime
      showsVerticalScrollIndicator={false}
    >
      <DetailHero tracker={tracker} progress={p} />
      <DetailStatGrid tracker={tracker} progress={p} milestones={milestones} />
      <DetailBody
        tracker={tracker}
        entries={entries}
        milestones={milestones}
        paceStatus={p.paceStatus}
      />
    </ScrollView>
  )
}
```

- [ ] **Step 2: Create TargetDetailView**

Create `src/features/trackers/components/TargetDetailView.tsx`, mirroring `HabitDetailView` but mounting `TargetOverviewTab` as the first tab and reusing the History/Notes tabs + `HabitTabBar` + `HabitDetailContext`:

```tsx
import { StyleSheet } from 'react-native'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import type { Tracker, Entry } from '@features/trackers/types'
import { HabitHistoryTab } from './HabitHistoryTab'
import { HabitNotesTab } from './HabitNotesTab'
import { HabitDetailProvider, useHabitDetail } from './HabitDetailContext'
import { HabitTabBar } from './HabitTabBar'
import { TargetOverviewTab } from './TargetOverviewTab'

const Tab = createMaterialTopTabNavigator()

// Transparent scene so the screen's bg-bg shows through. Host prop, no className.
const styles = StyleSheet.create({
  scene: { backgroundColor: 'transparent' }
})

/** Overview screen — reads shared data from context. */
function OverviewScreen() {
  const { tracker, entries } = useHabitDetail()
  return <TargetOverviewTab tracker={tracker} entries={entries} />
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
    <HabitNotesTab tracker={tracker} entries={entries} onEditEntry={onEditEntry} />
  )
}

/**
 * TargetDetailView — Target detail body as a 3-tab navigator (Overview /
 * History / Notes) reusing the Habit tab shell, custom pill tab bar, and
 * detail context. Tap-only (swipe disabled). The History/Notes tabs render the
 * logged numeric value (not Yes/No) because the tracker isn't a habit.
 */
export function TargetDetailView({
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
        <Tab.Screen name='charts' component={OverviewScreen} />
        <Tab.Screen name='history' component={HistoryScreen} />
        <Tab.Screen name='notes' component={NotesScreen} />
      </Tab.Navigator>
    </HabitDetailProvider>
  )
}
```

Note: the first tab keeps the route name `charts` so `HabitTabBar`'s `TAB_META` (which maps `charts`→`detail.tabCharts` "Charts" + Charts icon) renders without change. The tab label stays "Charts" — acceptable for now (the Overview content lives under it). Do NOT rename the route, or the tab bar will render nothing for an unknown key.

- [ ] **Step 3: Wire TargetDetailView into the screen**

In `src/screens/trackers/TrackerDetailScreen.tsx`, add the import (next to the `HabitDetailView` import):

```tsx
import { HabitDetailView } from '@features/trackers/components/HabitDetailView'
import { TargetDetailView } from '@features/trackers/components/TargetDetailView'
```

Then add a `target` branch right after the existing `if (tracker.type === 'habit')` block (before the final non-habit `return`):

```tsx
  if (tracker.type === 'target') {
    return (
      <View className='flex-1 bg-bg'>
        {appbar}
        <TargetDetailView
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

(The existing `progressFor`/`DetailHero`/etc. non-habit return stays for average/project. The `p` const and `onLogToday` remain used by that branch — no removal.)

- [ ] **Step 4: Type-check, lint, test**

Run: `yarn tsc && yarn lint && yarn test`
Expected: tsc clean; no new lint in the new/changed files; 81/81 tests pass. Confirm no unused-variable warning (the non-habit branch still uses `p` and `onLogToday`).

- [ ] **Step 5: Verify on simulator**

Reload JS on a booted simulator. Then:
1. Trackers → open the "Save Money" target. Confirm a 3-tab pill bar (Charts / History / Notes) like habit, with the current target detail (pace hero, stats, pace line) under the first tab.
2. **History tab:** confirm rows for due days from start→today, newest first; the existing logged value(s) show as a numeric value pill (e.g. "$500"), NOT Yes/No; unlogged days show the dashed "Log" pill.
3. Tap **Add Log** (or an empty "Log" row): the sheet shows a **Value** input (label "Value ($)" given the $ unit) instead of Yes/No. Enter a number + a note, pick date/time, Save. Confirm a success toast and the new row appears with the value.
4. **Notes tab:** the logged entry with a note appears, showing its numeric value (not Yes/No) and the note; tapping it reopens the value log sheet with the value pre-filled.
5. Edit an existing log: value pre-fills, changing + saving updates the row.
6. Sanity: open a **habit** tracker — its History/Notes still show Yes/No (unchanged), and its log sheet still shows the Yes/No pressables.

- [ ] **Step 6: Commit**

```bash
git add src/features/trackers/components/TargetOverviewTab.tsx src/features/trackers/components/TargetDetailView.tsx src/screens/trackers/TrackerDetailScreen.tsx
git commit -m "feat(detail): Target detail as 3-tab view (Overview/History/Notes)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Tab 1 = current target detail lifted as-is (no Log-today button) → Task 4 `TargetOverviewTab`. ✅
- Tab 2 = History, value instead of Yes/No, unlogged days show "Log", per-record rows, scope = due days → Task 3 (HistoryTab value branch) + reuse `buildHistoryRows`. ✅
- Tab 3 = Notes, value instead of Yes/No → Task 3 (NotesTab value branch). ✅
- Log sheet: one shared modal, branch by type, value input with unit label, save numeric → Task 1 (i18n) + Task 2. ✅
- 3 tabs like habit, reuse shell → Task 4 `TargetDetailView`. ✅
- Habit behavior unchanged → Task 2/3 branch on `type === 'habit'`, keeping the habit path identical; Task 4 adds a parallel view without touching `HabitDetailView`. ✅
- Out of scope (average/project detail, pace math, buildHistoryRows, Log-today) untouched. ✅

**Placeholder scan:** No TBD/TODO; full code in every code step. The Task 2 Step 4 note on `cadenceLabel` was resolved during planning (it handles target → "Every day"/"N times a week"), so the header needs no change and isn't a plan step. ✅

**Type consistency:** `RecordRow` and `LogNoteCard` gain a `tracker: Tracker` prop, passed at both call sites (Task 3 Steps 3 & 6). `TargetOverviewTab({tracker, entries})` and `TargetDetailView({tracker, entries, onAddLog, onEditEntry, onLogForDate})` signatures match their call sites in Task 4. `fmtVal(tracker, entry.value)` matches its `detailFormat` signature. Route name `charts` kept to satisfy `HabitTabBar.TAB_META`. ✅
