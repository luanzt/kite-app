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

After adding a native dependency, run `cd ios && pod install`. op-sqlite, notifee,
react-native-localize, and react-native-haptic-feedback all have native modules.

## Architecture — offline-first, SQLite is the source of truth

Data flows: **UI → TanStack Query hooks → repository functions → SQLite (op-sqlite)**.

- **SQLite (op-sqlite)** holds all tracker data. App runs fully offline.
- **TanStack Query** is reused as a *reactive cache over local SQLite* (not over an API). Query hooks call repository functions; mutations `invalidate` the relevant keys so the UI refreshes. See `src/features/trackers/queries/index.ts`.
- **Zustand + MMKV** hold ONLY app settings (theme, language). **Never** store tracker data in Zustand — it goes in SQLite.

Almost all domain code lives under **`src/features/trackers/`**:

- `types.ts` — the domain model: `Tracker`, `Entry`, `Milestone`, `TrackerProgress`, and the unions `TrackerType` (`habit|target|average|project`), `PaceStatus` (`on_track|behind|ahead|none`), `Accumulation` (`sum|latest`), `Period`.
- `db/schema.ts` — opens the DB and runs `migrate()` (3 tables: `trackers`, `entries`, `milestones` + index). `getDb()` is memoized and called once from `App.tsx` on launch.
- `db/repository.ts` — SQL wrapper + pure row-mapping functions (`trackerToRow`/`rowToTracker`). **op-sqlite v16 API:** use `executeSync()` (its `execute()` is async) and read `res.rows` as a plain array — there is NO `rows._array` wrapper.
- `calculators/` — pure functions, one per type (`calculateTarget`, `calculateHabit`, `calculateAverage`, `calculateProject`), each returning `TrackerProgress`. **This is the core engine and the most-tested code.** The pace-line math lives here; note `calculateTarget` handles decreasing goals (start > goal, e.g. weight loss) by comparing progress-toward-goal fraction vs. time fraction.
- `queries/index.ts` — TanStack Query hooks over the repository.
- `factory.ts` — `buildTracker(input)` is the single source of truth for constructing a `Tracker` (type-appropriate defaults + collision-resistant `uuid()`). Both the form and quick-starts use it; do not hand-build `Tracker` objects elsewhere.
- `components/` — `TrackerCard` (and the `progressFor()` dispatcher), `PaceBar`, `HistoryChart`, `MilestoneList`.
- `quickStarts.ts` — the 6–8 empty-state suggestions.

### Testing strategy

Pure logic is unit-tested (calculators, `date.ts`, repository row-mapping). **op-sqlite is unavailable in Jest** (native module), so it is mocked via `jest.config.js` `moduleNameMapper` → `jest/op-sqlite-mock.js`; DB-calling functions are NOT unit-tested — verify them on a device/simulator. Tests follow TDD: write the failing test first.

### Navigation

`src/navigation/`: `RootNavigator` (native-stack) wraps `MainNavigator` (bottom tabs: Today / Trackers / Settings) plus pushed stack screens (`TrackerDetail`, `TrackerForm`, `TrackerTypePicker`). There is no auth flow. Param types are in `navigation/types.ts`.

### i18n (English + Vietnamese)

`src/i18n/` uses i18next + react-i18next. On first launch the OS locale is detected via `react-native-localize` (`vi` → Vietnamese, else English); the choice persists in MMKV via `useAppStore` (`language` is nullable so "no choice yet" triggers OS detection). Use `const { t } = useTranslation()` and `t('key')` — never hardcode visible strings. Strings live in `locales/{en,vi}.json`; keep both files key-for-key in sync. **User-entered data (tracker names, notes) is stored verbatim, never translated.**

## Path Aliases

`@api/`, `@components/`, `@config/`, `@features/`, `@hooks/`, `@i18n/`, `@navigation/`, `@screens/`, `@store/`, `@theme/`, `@utils/`. Global types use `@app-types/` (not `@types/` — that conflicts with npm @types). Defined in `babel.config.js` and `tsconfig.json` — add new aliases to both.

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
   uses Uniwind (Tailwind v4 for RN). Use `className` for all styling — spacing,
   layout (flex/gap), colors, sizing, borders. For ScrollView/FlatList container
   styling use the Uniwind-mapped prop `contentContainerClassName`. Reserve inline
   `style` only for the rare truly-dynamic value Tailwind cannot express (e.g. a
   computed percentage width bound to runtime state); even then prefer a Tailwind
   class when a fixed scale fits.
   ```tsx
   // Good
   <View className="flex-1 p-4 gap-4">
   // Avoid
   <View style={{ flex: 1, padding: 16, gap: 16 }}>
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

## Environment

`.env.development`, `.env.staging`, `.env.production`. Access via `import Config from 'react-native-config'`. Never commit `.env.*` files with secrets.

## Conventions

- Named exports for components and hooks (no default exports except `App.tsx`).
- Screens in `screens/<feature>/` folders; domain logic in `features/trackers/`.
- Construct `Tracker` objects only via `buildTracker()` in `features/trackers/factory.ts`.
- Zod schemas in `utils/validators.ts`.
- TypeScript strict mode is enabled; `yarn tsc` must be clean before committing.

## Known follow-ups (deferred, see `docs/superpowers/plans/`)

Reminders (notifee installed, not wired), haptics, richer TrackerForm (deadline/period/accumulation/milestone editors), quick-log number entry on Today (currently logs value 1), dark-mode color tokens, and renaming the iOS/Android project from `RnHeroUITemplate` to `Kite` (bundle id is still the template's).
