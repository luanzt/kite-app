# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Kite

Kite is an **offline-first goal & progress tracker** (inspired by Strides), built on React Native CLI with the HeroUI Native UI library. Users create long-term goals across four tracker types and track progress over time. The signature feature is the **pace line** — a green/red indicator showing whether a time-based goal is on track or behind. There is **no backend and no login**; all data lives on-device in SQLite.

## AI Tooling — HeroUI Native Agent Skill

This project bundles HeroUI's official `heroui-native` Agent Skill so AI
assistants know the HeroUI Native component APIs. Installed via
`npx skills add heroui-inc/heroui` (the web `heroui-react` and `heroui-migration`
skills it also installs were removed — this is a React Native–only project).

- Source files: `.agents/skills/heroui-native/`
- Claude Code discovers it via symlink `.claude/skills/heroui-native` → `../../.agents/skills/heroui-native`
- Use the `heroui-native` skill (or `/heroui-native`) when building HeroUI UIs.
- Skill scripts (run with node) fetch live docs:
  `node .agents/skills/heroui-native/scripts/list_components.mjs`,
  `get_component_docs.mjs`, `get_theme.mjs`, `get_docs.mjs`.

Reinstall after cloning if symlinks break: re-run the `npx skills add` command,
or recreate `.claude/skills/*` symlinks pointing at `.agents/skills/*`.

## Commands

Package manager is **yarn**. Scripts take an `ENVFILE` so each command targets an environment.

```bash
yarn ios                  # Run iOS (dev env: .env.development)
yarn android              # Run Android (dev env)
yarn ios:staging          # Run against .env.staging  (also :prod)
yarn start                # Start Metro
yarn start:reset          # Start Metro with cache reset
yarn tsc                  # Type check (tsc --noEmit)
yarn lint                 # ESLint
yarn test                 # Run all Jest tests
yarn test src/features/trackers/calculators/__tests__/target.test.ts   # Single test file
yarn build:android:prod   # Release APK (also :staging)
```

After adding a native dependency, run `cd ios && pod install`. op-sqlite, notifee
(reminders), react-native-mmkv, react-native-svg, react-native-bootsplash, and
react-native-localize all have native modules — a JS-only Metro reload won't pick
up a native change (an "Unimplemented component …" error means a stale native
build; rebuild with `yarn ios`/`yarn android`).

Some native modules are patched via **patch-package** (`patches/` dir, run on
`postinstall`): a `heroui-native+1.0.4.patch` (fixes a `SelectField` BottomSheet
snap bug) and a gradle-plugin patch. Re-run `yarn install` after cloning so the
patches apply.

## Architecture — offline-first, SQLite is the source of truth

Data flows: **UI → TanStack Query hooks → repository functions → SQLite (op-sqlite)**.

- **SQLite (op-sqlite)** holds all tracker data. App runs fully offline.
- **TanStack Query** is reused as a *reactive cache over local SQLite* (not over an API). Query hooks call repository functions; mutations `invalidate` the relevant keys so the UI refreshes. See `src/features/trackers/queries/index.ts`.
- **Zustand + MMKV** hold ONLY app settings (theme, language, and sync state — `icloudSyncEnabled`/`lastSyncedAt` are settings-level, not tracker data). **Never** store tracker data in Zustand — it goes in SQLite.

Almost all domain code lives under **`src/features/trackers/`**:

- `types.ts` — the domain model. `Tracker` carries: `id, name, type, icon, color, unit, direction, targetValue, startValue, accumulation, startDate, deadline, period, repeatDays (number[] 0=Sun..6=Sat), routine, reminderTime ("HH:MM" | null), goalNote, createdAt, archived`. `Entry` = `{ id, trackerId, date (YYYY-MM-DD), value, note, createdAt }` — `createdAt` orders multiple logs on the same day. `Milestone` = `{ id, trackerId, title, dueDate, progress (0..1), orderIndex }`. `TrackerProgress` = `{ current, goal, percent (0..1), paceStatus, streak?, successRate?, expected? }` where `expected` is the timeline value you should have reached by today. Unions: `TrackerType` (`habit|target|average|project`), `HabitDirection` (`good|bad`), `Period` (`daily|weekly|monthly|yearly`), `Accumulation` (`sum|latest`), `PaceStatus` (`on_track|behind|ahead|none`), `Routine` (`any|morning|afternoon|evening`, time-of-day grouping for habits).
- `db/schema.ts` — **self-describing, auto-migrating schema.** Tables are declared as `TableSpec { name, columns: ColumnSpec[], extras? }` (3 tables: `trackers` (19 cols), `entries` (+ `idx_entries_tracker_date` index), `milestones`). `migrateTable()` runs `CREATE TABLE IF NOT EXISTS`, then diffs live columns (`PRAGMA table_info`) against the spec via `missingColumns()` and `ALTER TABLE … ADD COLUMN` for each missing one — so a DB from an older app version picks up later-added columns automatically. **To add a column, just append a `ColumnSpec` to the right array** (it must be nullable or carry a DEFAULT — SQLite can't ADD a bare `NOT NULL`); do not hand-write migration steps. `getDb()` is memoized and called once from `App.tsx` on launch; `setDb()` injects a test DB.
- `db/repository.ts` — SQL wrapper + pure row-mapping (`trackerToRow`/`rowToTracker`, `entryToRow`/`rowToEntry`; `repeatDays` is JSON-stringified, `archived` ↔ 0/1). `listTrackers()` filters `archived = 0`; `deleteTracker()` cascades entries + milestones. **op-sqlite v16 API:** use `executeSync()` (its `execute()` is async) and read `res.rows` as a plain array — there is NO `rows._array` wrapper.
- `calculators/` — pure functions, one per type (`calculateTarget`, `calculateHabit`, `calculateAverage`, `calculateProject`; barreled in `index.ts`), each returning `TrackerProgress`. **This is the core engine and the most-tested code.** The pace-line math lives here; `calculateTarget` handles decreasing goals (start > goal, e.g. weight loss) by comparing progress-toward-goal fraction vs. time fraction, and populates `expected`. Note `calculateProject` takes `milestones[]` (not entries) — see `progressFor()` in `TrackerCard.tsx` for the type→calculator dispatch.
- `calculators/habitStats.ts` — the **habit-detail engine**: pure, DB-free, unit-tested helpers feeding the Habit Detail screen and the Today card. Key exports: `perDayGoal`, `isDueOn`, `doneDatesOf`, `bestStreak`, `buildCalendarMonth`, `weeklyGoalOf`, `buildHistoryRows`, `habitStreakStatus` (motivational Today copy), `classifyTodayRow` (which Today section a tracker belongs to: `due|missed|completed`), `periodSessions` (cadence-adapted bar series). `calculateHabit` imports `isDueOn`/`doneDatesOf`/`isoAddDays` from here so the "done/due" rule has a single source of truth.
- `queries/index.ts` — TanStack Query hooks over the repository. Queries: `useTrackers`, `useTracker(id)`, `useEntries(id)`, `useEntriesForDate(date)`, `useMilestones(id)`. Mutations: `useSaveTracker` / `useDeleteTracker` (these also (re)schedule / cancel reminders via `notifications.ts`), `useLogEntry`, `useDeleteEntry`, `useSaveMilestone`. Mutations invalidate the relevant keys — including the whole `['entries','date']` subtree — so both the detail and Today screens refresh.
- `factory.ts` — `buildTracker(input)` is the single source of truth for constructing a `Tracker` (type-appropriate defaults + collision-resistant `uuid()`). Both the form and quick-starts use it; do not hand-build `Tracker` objects elsewhere.
- `icons.ts` — the visual single-source-of-truth: `PACE_COLOR`/`PACE_WEAK`/`PACE_DOT_CLASS` (pace palette), `Icons` (lucide chrome-icon map), `TAB_ICON` (bottom-tab SVGs), `TYPE_ICON`/`TYPE_COLOR` (per tracker type), and the icon/color resolvers `iconEmoji(key)`, `iconKey(value)`, `colorHex(color)`, `hexA(hex, alpha)`. **A tracker's `icon` is persisted as an ASCII keyword (e.g. `"lotus"`, `"drop"`), NEVER a raw emoji** — op-sqlite v16 corrupts non-BMP (surrogate-pair) string bind params on write, so the emoji glyph exists only at render time via `iconEmoji()`. `iconSets.ts` holds `ICONSET` (the per-type keyword lists shown in the form picker) + `defaultIcon(type)`.
- `notifications.ts` — on-device notifee reminder scheduling (fully offline: local weekly-repeating triggers, one per due weekday at `reminderTime`, habits only). `initNotifications()` runs at launch; `scheduleTrackerReminders`/`cancelTrackerReminders` are called from the save/delete mutations. All functions swallow errors so a denied permission never crashes a save.
- `sync/` — iOS-only manual iCloud Sync & Backup (Settings → Sync & Backup).
  `snapshot.ts` (pure, unit-tested): the `/kite-backup.json` format
  (`SNAPSHOT_VERSION`), `mergeSnapshots` (per-record last-write-wins on
  `updatedAt`, deletes win via `tombstones`, children of a deleted tracker are
  cascade-dropped) and `countPending`. `icloud.ts`: thin
  `react-native-cloud-storage` wrapper (AppData scope — survives uninstall).
  `syncService.ts`: `runSync(qc)` = read cloud → merge → `replaceAllData`
  (transaction) → write cloud → set `lastSyncedAt` (MMKV) → invalidate all
  queries. Every save stamps `updatedAt`; deletes write a tombstone row.
  Requires the iCloud Documents capability (`iCloud.com.kite.app`) in Xcode.
- `detailFormat.ts` — number/value formatters: `fmtNum`, `fmtVal` (`$` prefix / unit suffix), `fmtCompact` (1K/30K/3M/1.5M), `fmtValCompact`, plus timeline helpers `pacePercent`/`daysLeft`.
- `habitLabels.ts` — `cadenceLabel(tracker, t)` → human cadence string ("Every day", "5 times a week", …) via i18n.
- `components/` — the shared `TrackerCard` (+ `progressFor()` dispatcher), `PaceBar`/`PaceChip`, `HistoryChart`, `MilestoneList`, `Stat`, plus the **tracker-detail subsystem** — see below.
- `quickStarts.ts` — `QUICK_STARTS`, the empty-state one-tap suggestions (fed through `buildTracker`).

### Tracker-detail architecture

`TrackerDetailScreen` (`src/screens/trackers/`) is the orchestrator: it loads
tracker/entries/milestones, shows `DetailLoading` while resolving, renders the
shared `DetailAppbar`, and **delegates the body by type**:

- **habit → `HabitDetailView`** and **target → `TargetDetailView`** — both a
  3-tab `@react-navigation/material-top-tabs` navigator (Charts/Overview,
  History, Notes) with a custom `HabitTabBar`. Because material-top-tabs renders
  its own screens, shared props are passed via `HabitDetailContext`
  (`HabitDetailProvider` / `useHabitDetail()`), not React props. Habit tab 1 is
  `HabitChartsTab` (`AchievementHero` + `HabitCalendar` + `WeeklyChart`); target
  tab 1 is `TargetOverviewTab`. History (`HabitHistoryTab`, a FlashList off
  `buildHistoryRows`) and Notes (`HabitNotesTab`, editable `goalNote`) are shared.
- **average / project → inline** `ScrollView` of `DetailHero` + `DetailStatGrid`
  + `DetailBody` (projects → `MilestoneList`, else → `HistoryChart`), plus a
  `LogTodayButton` for average.

Logging goes through `LogEntryModal` (a HeroUI `BottomSheet`; habit = Yes/No →
value 1/0, non-habit = numeric input), with a `LogSuccessToast` / `showLogSuccess`
confirmation. `NoData` and `KiteLogo` are the empty-state / branding visuals.

### Testing strategy

Pure logic is unit-tested (calculators incl. `habitStats`, `detailFormat`,
`date.ts`, factory, icon mapping, repository row-mapping). **op-sqlite is
unavailable in Jest** (native module), so it is mocked via `jest.config.js`
`moduleNameMapper` → `jest/op-sqlite-mock.js`; DB-calling functions are NOT
unit-tested — verify them on a device/simulator. Tests follow TDD: write the
failing test first. Run one file with e.g.
`yarn test src/features/trackers/calculators/__tests__/habitStats.test.ts`.

### Navigation

`src/navigation/`: `RootNavigator` (native-stack, all `headerShown: false`) wraps `MainNavigator` (bottom tabs: Today → `DailyGoalsScreen`, Trackers → `TrackerListScreen`, Settings → `SettingsScreen`; tab icons from `TAB_ICON`, labels i18n'd) plus pushed stack screens: `TrackerDetail { trackerId }`, `TrackerForm { trackerId?; type }` (`trackerId` present = edit, absent = create), `TrackerTypePicker`. There is no auth flow. Param types (`RootStackParamList`, `MainTabParamList`) are in `navigation/types.ts`.

### i18n (English + Vietnamese)

`src/i18n/` uses i18next + react-i18next (`initI18n()` runs at module load in `App.tsx`). On first launch the OS locale is detected via `react-native-localize` (`vi` → Vietnamese, else English); the choice persists in MMKV via `useAppStore` (`language` is nullable so "no choice yet" triggers OS detection). `changeLanguage(lang)` updates both i18next and the store. Use `const { t } = useTranslation()` and `t('key')` — never hardcode visible strings. Strings live in `src/i18n/locales/{en,vi}.json`, organized under top-level namespaces (`common, tabs, today, list, detail, form, log, toast, quickStart, settings, set, type, types`); **keep both files key-for-key in sync.** **User-entered data (tracker names, notes) is stored verbatim, never translated.**

## Path Aliases

`@api/`, `@assets/`, `@components/`, `@config/`, `@features/`, `@hooks/`, `@i18n/`, `@navigation/`, `@screens/`, `@store/`, `@theme/`, `@utils/`. Global types use `@app-types/` (not `@types/` — that conflicts with npm @types). Defined in `babel.config.js` and `tsconfig.json` — add new aliases to both.

## Styling & Text Conventions (MANDATORY)

These rules are non-negotiable for all UI code in this project:

1. **Use `<Typography>`, NEVER `<Text>`.** HeroUI Native's `Text` export is a
   deprecated alias of `Typography` and will be removed in a future major
   version. Always import and render `Typography` from `heroui-native`. Do not
   import `Text` from `heroui-native` or from `react-native` for displaying text.
   ```tsx
   import { Typography } from 'heroui-native';
   <Typography className="text-xl font-bold">{title}</Typography>
   ```

2. **Style with Tailwind `className`, NEVER inline `style={{…}}`.** This project
   uses Uniwind (Tailwind v4 for RN). Use `className` for ALL styling — spacing,
   layout (flex/gap), colors, **sizing (width/height)**, borders. For
   ScrollView/FlatList container styling use the Uniwind-mapped prop
   `contentContainerClassName`. A fixed value that isn't on the spacing scale is
   NOT an excuse for inline `style` — use a Tailwind **arbitrary value**:
   `h-[52px]`, `w-[38px]`, `p-[3px]`, `ml-[20px]`.

   **`className` updates styles at runtime — VERIFIED on-device.** When the
   `className` string changes between renders, Uniwind re-applies the new styles
   (confirmed for `bg-*`, `text-*`, and arbitrary values like `w-[Npx]` — a
   side-by-side probe against inline `style` tracked identically). So a value
   that depends on a boolean/enum is **NOT** a reason to use `style` — **branch
   the whole class** instead. Both branches are written as literals, so Tailwind
   generates the CSS for each at build time:
   ```tsx
   // Good — branch the class on state (this re-renders correctly at runtime)
   className={`rounded-full p-[3px] ${on ? 'bg-brand ml-[20px]' : 'bg-surface-2 ml-0'}`}
   className={`text-sm font-bold ${PACE_TEXT_CLASS[paceStatus]}`}  // enum → lookup of literal classes
   ```

   **THE ONE REAL LIMIT — never interpolate a value INTO a class string.**
   Tailwind scans source files **as plain text** and only generates CSS for
   classes it finds as **complete, statically-detectable literals** — it cannot
   follow string concatenation or interpolation (official docs:
   "Detecting classes in source files → Dynamic class names"). A class assembled
   from a variable is silently absent from the CSS and renders **unstyled**.
   VERIFIED on-device: `` `w-[${px}px]` `` never resized (bar stayed put while a
   literal `w-[120px]` and inline `style` both grew), and `` `bg-[${hex}]` ``
   showed no fill. This is the only case that legitimately forces `style`:
   ```tsx
   // BROKEN — these classes don't exist in the generated CSS, render unstyled:
   className={`w-[${px}px]`}            // ✗ computed arbitrary value
   className={`bg-[${hex}]`}            // ✗ interpolated arbitrary color
   className={`bg-${color}-500`}        // ✗ interpolated scale color
   // Fix A — enumerate the literal classes and pick one (if the set is finite & known):
   const W = { sm: 'w-[40px]', md: 'w-[140px]', lg: 'w-[260px]' }; className={W[size]}
   // Fix B — truly continuous/computed value → inline style is correct here:
   <View style={{ width: pct }} />      // e.g. a progress bar width bound to live %
   ```
   **Do NOT rely on the partial exception.** Interpolating a *named* theme token
   (`` `bg-${token}` ``) sometimes appears to work — Tailwind v4 may have already
   generated that utility because the literal exists elsewhere (the token name
   shows up as plain text, or another file uses the full class). This is
   incidental, not guaranteed: the moment the literal isn't present, it silently
   breaks, and a typo in the token never errors. Treat ALL interpolation into a
   class string as forbidden regardless of whether it happens to render today.
   ```tsx
   // Good
   <View className="flex-1 p-4 gap-4">
   <Pressable className="h-[52px] w-[52px] rounded-full" />
   // Avoid
   <View style={{ flex: 1, padding: 16, gap: 16 }}>
   <Pressable style={{ height: 52, width: 52 }} />   // use h-[52px] w-[52px]
   ```
   **The `style` prop is allowed ONLY when truly unavoidable:**
   - A value computed at runtime that no finite set of literal classes can
     express — safe-area insets (`paddingBottom: insets.bottom + 12`), or a
     continuous/percentage dimension bound to live state (a progress-bar width).
     A boolean/enum is NOT this — it has finitely many outcomes, so branch the
     class (see above).
   - A third-party/native host component that doesn't accept `className` (e.g.
     `GestureHandlerRootView style={{ flex: 1 }}` in `App.tsx`). Note most HeroUI
     Native and Uniwind-patched components DO accept `className` — try it first.

   When you must use `style`, **define it via `StyleSheet.create()`, NEVER as an
   inline object literal `style={{…}}`** — inline objects allocate a new object
   every render and trip `react-native/no-inline-styles`. Put a module-level
   `const styles = StyleSheet.create({ … })` and reference `style={styles.x}`.
   The only inline-object exception is a value that is genuinely per-render
   dynamic (it changes with state/props each render, e.g. `insets.bottom + 12`);
   in that case leave a one-line comment saying why.
   ```tsx
   // Good — unavoidable static style via StyleSheet
   const styles = StyleSheet.create({ root: { flex: 1 } });
   <GestureHandlerRootView style={styles.root}>
   // Good — genuinely dynamic, inline with a why-comment
   <View style={{ paddingBottom: insets.bottom + 12 }}>  // safe-area, runtime
   // Avoid — static inline object literal
   <GestureHandlerRootView style={{ flex: 1 }}>
   ```

3. **Use icons ONLY from `lucide-react-native`.** Do not install or use any other
   icon set (no react-native-vector-icons, no emoji as UI icons). Import the
   specific PascalCase icon component and size/color it via the `size` and
   `color` props (icons extend `SvgProps`). Prefer theme/status colors for
   `color`; size with the numeric `size` prop, not `className`.
   ```tsx
   import { Droplet, Check } from 'lucide-react-native';
   <Droplet size={20} color="#22c55e" />
   <Check size={24} />
   ```
   `lucide-react-native` runs on the already-installed `react-native-svg` (no
   extra native setup). A tracker's `icon` field is a string key — map it to a
   lucide component (e.g. via a small `icon`-name → component lookup) rather than
   rendering arbitrary strings.

4. **For overlays use HeroUI Native, NEVER react-native `Modal`.** When you need
   a sheet, modal, dialog, or popover, reach for HeroUI Native's overlay
   components — they ship backdrop, swipe-to-dismiss, animation, theming, and
   safe-area handling for free, and keep the app HeroUI-first.
   - **`BottomSheet`** — a sheet sliding up from the bottom (the default choice
     for a full task like logging/editing). Controlled via `isOpen`/
     `onOpenChange`; compose `BottomSheet.Portal` > `BottomSheet.Overlay` +
     `BottomSheet.Content`. Scroll its content with `BottomSheetScrollView` (NOT
     react-native `ScrollView`, or the sheet steals the scroll gesture) and use
     `BottomSheetTextInput` + `keyboardBehavior="extend"` for inputs so the
     keyboard doesn't cover them.
   - **`Dialog`** — a small centered popup / confirm.
   - **`Popover`** — anchored transient content.
   ```tsx
   import { BottomSheet } from 'heroui-native';
   <BottomSheet isOpen={open} onOpenChange={setOpen}>
     <BottomSheet.Portal>
       <BottomSheet.Overlay />
       <BottomSheet.Content snapPoints={['92%']} enableDynamicSizing={false}>
         …
       </BottomSheet.Content>
     </BottomSheet.Portal>
   </BottomSheet>
   ```
   This is the overlay-specific exception to the general rule that bare
   react-native primitives (`View`, `Pressable`, `ScrollView`, `TextInput`,
   `FlatList`) are fine — those have no HeroUI equivalent and are used
   project-wide; `Modal` does have one, so use it.

## HeroUI Native — Compound Component Patterns

HeroUI Native uses compound components, NOT flat props. This is critical:

### TextField (Input + Label + Error)
```tsx
<TextField isInvalid={!!error}>
  <Label><Label.Text>Email</Label.Text></Label>
  <Input placeholder="you@example.com" value={val} onChangeText={setVal} />
  {error && <FieldError>{error}</FieldError>}
</TextField>
```
- `Input` does NOT have `label`, `errorMessage`, or `isInvalid` props
- `isInvalid` goes on `TextField` wrapper
- `Label` and `FieldError` are separate components

### Button (no isLoading)
```tsx
<Button variant="primary" isDisabled={loading} onPress={fn}>
  {loading ? <Spinner /> : <Button.Label>Submit</Button.Label>}
</Button>
```
- NO `isLoading` prop — use `isDisabled` + conditional `<Spinner />`
- Variants: primary, secondary, tertiary, outline, ghost, danger, danger-soft

### Slider (compound)
```tsx
<Slider value={v} minValue={0} maxValue={1} step={0.05} onChange={onChange}>
  <Slider.Track><Slider.Fill /><Slider.Thumb /></Slider.Track>
</Slider>
```
- A bare `<Slider/>` renders nothing — the `Track/Fill/Thumb` children are required
- `onChange` arg is `SliderValue = number | number[]` — narrow it

### Alert (uses status, not variant)
```tsx
<Alert status="danger">
  <Alert.Indicator />
  <Alert.Content>
    <Alert.Title>Error</Alert.Title>
    <Alert.Description>Something went wrong</Alert.Description>
  </Alert.Content>
</Alert>
```
- Prop is `status` not `variant`: default, accent, success, warning, danger

### Card
```tsx
<Card>
  <Card.Header>
    <Card.Title>Title</Card.Title>
    <Card.Description>Subtitle</Card.Description>
  </Card.Header>
  <Card.Body>...</Card.Body>
  <Card.Footer>...</Card.Footer>
</Card>
```

## Shared UI primitives (`src/components/ui/`)

Reusable form/UI primitives built on HeroUI Native (barreled in `index.ts`) —
**reach for these before hand-rolling form controls**, especially in
`TrackerFormScreen`:

- `FormInput` — styled bordered text field (`keyboardType` `default`|`decimal-pad`).
- `Segmented<T>` — 2–3 option segmented control; `SelectField<T>` — trigger →
  BottomSheet option list (for 4+ options).
- `DateField` / `TimeField` — trigger → BottomSheet calendar / time-wheel
  (react-native-ui-datepicker); values are `YYYY-MM-DD` / `HH:mm` strings.
- `WeekdayPicker` — Mon-first weekday chips storing JS day numbers (0=Sun..6=Sat).
- `Toggle` — on/off switch; `FieldLabel` / `FieldLabelRow` — form labels;
  `InfoTooltip` — "?" → Popover.
- `AlertProvider` + `useAlert()` — **imperative alert/confirm** built on HeroUI
  `Dialog`. `AlertProvider` is mounted once in the root provider tree; call
  `const alert = useAlert()` then `alert({ title, message?, variant, onConfirm })`.
  Prefer this over react-native `Alert`.

## Theme & design tokens

Design tokens live in **`global.css`** at the repo root (Tailwind v4 `@theme`
block, imported first in `App.tsx`) — NOT in `src/theme/`. That's where the
surface/ink/brand/pace color tokens, radius scale (`rounded-lg-k`), and spacing
scale (`p-s5`) come from; HeroUI's `--accent` is overridden there to Kite blue.
`src/theme/index.ts` only exports `makeHeroUIConfig(topInset)` (HeroUI runtime
config: toast placement, font-scaling caps). `global.css` also `@source`s
`heroui-native/lib` so Tailwind generates the classes HeroUI's overlay components
reference — without it, Dialog/Toast render unstyled.

**Dark mode is implemented (light + dark).** Color tokens live under
`@layer theme { :root { @variant light {…} @variant dark {…} } }` in `global.css`
(surface/ink/brand/pace + `--accent`), so every `bg-*`/`text-*`/`border-*` class
flips with the theme automatically; non-color tokens (radius/spacing/type/font)
stay in the theme-agnostic `@theme {}` block. The store's `themeMode` is
`'light' | 'dark' | 'system'` (default `'system'`); `useTheme()` resolves
`system` via RN `useColorScheme()` through the pure `resolveTheme()` helper
(`src/hooks/resolveTheme.ts`) and applies it with `Uniwind.setTheme`. `App.tsx`'s
`AppShell` calls `useTheme()` so the theme applies on launch. Settings shows a
Light/Dark/System `Segmented` selector. For colors a Tailwind class can't reach
— react-native-svg `fill`/`stroke` and lucide `color=` props — use
**`useThemeColors()`** (`src/hooks/useThemeColors.ts`), which returns concrete
hex for the active theme (its `LIGHT`/`DARK` maps intentionally MIRROR the
`global.css` tokens — svg can't read CSS vars — so keep the two in sync when a
token changes). Rule of thumb for white elements: white on a brand/accent/gradient
background → `c.onAccent` (stays white in dark); white on a card `bg-surface` →
`c.surface` (goes dark). Per-tracker identity colors (`TYPE_COLOR`,
`colorHex(tracker.color)`, `hexA`) are NOT theme chrome — never route them
through `useThemeColors`.

## Environment

`.env.development`, `.env.staging`, `.env.production`. Access via `import Config from 'react-native-config'`. Never commit `.env.*` files with secrets.

## Conventions

- Named exports for components and hooks (no default exports except `App.tsx`).
- Screens in `screens/<feature>/` folders; domain logic in `features/trackers/`.
- Construct `Tracker` objects only via `buildTracker()` in `features/trackers/factory.ts`.
- Zod lives in `utils/validators.ts` but is currently minimal (`trackerBaseSchema` = name + type). The `TrackerForm` does its real validation inline via `useAlert`, not Zod — grow the schema if you add shared validation.
- TypeScript strict mode is enabled; `yarn tsc` must be clean before committing.

## Known follow-ups (deferred)

**Haptics**, a **milestone editor** in the TrackerForm (projects can't yet edit
milestones from the form), and wiring the Settings **Data → Export / Clear** rows
(currently presentational). One dark-mode nuance remains: the
`react-native-ui-datepicker` (DateField/TimeField) follows the app theme via
`useDefaultStyles(c.isDark ? 'dark' : 'light')`, but its internal neutral palette
(day/weekday labels, borders) isn't swappable for Kite's tokens without overriding
~25 style keys — deferred. Note that several items the old docs listed here are
now DONE: **dark mode** is implemented (see Theme above), reminders are wired
(`notifications.ts` + save/delete mutations), the TrackerForm has
deadline/period/accumulation/weekday/reminder editors, and Today logs real
numeric values for target/average via `LogEntryModal`.

The iOS/Android project has been renamed from `RnHeroUITemplate` to **Kite**: RN/AppRegistry name is `Kite`, the iOS target/scheme/folder is `Kite` (`ios/Kite/`, `Kite.xcodeproj`, `Kite.xcworkspace`), the Android Java package is `com.kite.app`, and the bundle id / `applicationId` is **`com.kite.app`** on both platforms.
