# Repository Guidelines

## Project Overview & Structure

Kite is an offline-first goal and progress tracker built with React Native CLI,
TypeScript, and HeroUI Native. There is no backend or authentication; tracker
data lives on-device in SQLite.

- `src/screens/` and `src/navigation/`: screens, stacks, and bottom tabs.
- `src/features/trackers/`: domain types, calculators, database code, queries,
  notifications, sync, templates, and feature components.
- `src/components/ui/`: shared HeroUI-based form and UI primitives. Reuse these
  before creating a new control.
- `src/hooks/`, `src/store/`, `src/i18n/`, `src/utils/`: shared application code.
- `src/assets/` and `assets/`: images, SVGs, fonts, and bootsplash resources.
- `ios/` and `android/`: native projects; `patches/`: `patch-package` fixes.
- `docs/superpowers/`: design specifications and implementation plans.
- Tests live near their source in `__tests__/` directories.

Read `CLAUDE.md` for the detailed architecture and component API reference. Keep
this file and `CLAUDE.md` synchronized; when they differ, follow the stricter
project-specific rule until both are corrected.

## Architecture & Data Invariants

The data flow is **UI → TanStack Query hooks → repository → SQLite**. SQLite via
`op-sqlite` is the source of truth. TanStack Query is only a reactive cache over
local data; mutations must invalidate every affected query key. Zustand and MMKV
store application settings only (theme, language, and sync state). Never put
trackers, entries, or milestones in Zustand.

- Construct trackers only with `buildTracker()` from
  `src/features/trackers/factory.ts`.
- Add database columns to the relevant `TableSpec` in `db/schema.ts`. New
  columns must be nullable or have a default; do not write manual migrations.
- With op-sqlite v16, use `executeSync()` and read `result.rows` as an array;
  there is no `rows._array`.
- Persist tracker icons as ASCII keys, never raw emoji, because op-sqlite can
  corrupt non-BMP bound strings. Resolve display glyphs at render time.
- Saving and deleting trackers must preserve reminder scheduling and query
  invalidation behavior.
- iCloud sync is iOS-only. It uses last-write-wins snapshots, tombstones for
  deletion, cascade removal of deleted tracker children, and query invalidation
  after replacement. Preserve timestamps and tombstones when changing writes.

Calculator functions are the core progress engine. Keep them pure and maintain
support for all tracker types: `habit`, `target`, `average`, and `project`.
Projects calculate from milestones, while other types calculate from entries.

Firebase Analytics and Crashlytics are observability-only dependencies, not a
backend or source of truth. Collection is enabled only in release builds. Never
send tracker names, notes, values, dates, or local record IDs; custom analytics
events may include only non-sensitive categories such as tracker type. Native
Firebase app configuration files are intentionally gitignored.

## Build, Test, and Development Commands

Use Yarn and Node 22.11 or newer.

- `yarn install`: install packages and apply repository patches.
- `yarn start` / `yarn start:reset`: start Metro, optionally clearing its cache.
- `yarn ios` / `yarn android`: run using `.env.development`.
- `yarn ios:staging`, `yarn android:staging`, and `:prod`: run another environment.
- `yarn tsc`: run strict TypeScript checks with no output.
- `yarn lint`: run ESLint and Prettier validation.
- `yarn test`: run Jest; append a test path to run one file.
- `yarn build:android:staging` / `yarn build:android:prod`: build a release APK.
- `yarn install-pod`: install iOS pods through Bundler.

After adding or changing a native dependency, run `yarn install`, install pods
when applicable, and rebuild the native app. A Metro reload cannot load new
native code.

## Coding Style & Naming Conventions

Prettier uses two spaces, single quotes (including JSX), no semicolons, trailing
commas disabled, and an 80-column width. Use `PascalCase` for components and
screens, `camelCase` for functions and values, and `useX` for hooks. Components
and hooks use named exports; only `App.tsx` may default-export.

Prefer configured aliases such as `@features/`, `@components/`, and `@utils/`
over deep relative paths. Use `@app-types/`, not `@types/`. Add or change aliases
in both `babel.config.js` and `tsconfig.json`.

## UI, Styling & Theme Rules

These rules are mandatory:

- Render visible text with HeroUI Native `Typography`, never React Native or
  HeroUI `Text`.
- Style with static Uniwind/Tailwind `className` literals. Never interpolate a
  value into a class name. Select among complete literal classes for finite
  states such as booleans and enums.
- Use inline styles only for genuinely runtime-computed values or components
  that do not accept `className`. Put unavoidable static styles in a module-level
  `StyleSheet.create()`. A dynamic inline style should include a short reason.
- Use icons only from `lucide-react-native`. Size them with `size` and color them
  with `color`; do not introduce another icon library or use emoji as UI icons.
- Use HeroUI `BottomSheet`, `Dialog`, or `Popover` for overlays, never React
  Native `Modal`. Inside a bottom sheet, use `BottomSheetScrollView` and
  `BottomSheetTextInput` where appropriate.
- Use the bundled `heroui-native` skill when creating or changing HeroUI UI.
- Prefer primitives exported by `src/components/ui/`, including `FormInput`,
  `Segmented`, `SelectField`, `DateField`, `TimeField`, `WeekdayPicker`, `Toggle`,
  labels, tooltips, and `useAlert()`.

HeroUI uses compound component APIs: compose `TextField` with `Label`, `Input`,
and `FieldError`; show button loading with `isDisabled` plus `Spinner`; provide
`Slider.Track`, `Slider.Fill`, and `Slider.Thumb`; use `Alert`'s `status` prop.

Design tokens live in root `global.css`, not `src/theme/`. Use semantic tokens so
light and dark modes update automatically. For SVG/lucide colors that cannot use
CSS classes, use `useThemeColors()`. Keep its light/dark maps synchronized with
`global.css`. Tracker identity colors are domain colors and must not be replaced
with theme chrome colors.

## Internationalization

Never hardcode visible application strings. Use `useTranslation()` and `t()`.
Keep `src/i18n/locales/en.json` and `vi.json` key-for-key synchronized. Language
selection persists in MMKV; user-entered tracker names and notes remain verbatim
and must never be translated.

## Testing Guidelines

Follow TDD: write the failing test first. Name tests `*.test.ts` or `*.test.tsx`
inside a nearby `__tests__/` directory. Prioritize pure calculators, habit stats,
formatters, date helpers, factories, icon mappings, snapshot merging, validators,
and repository row mappings.

Jest uses the React Native preset and maps native SQLite and cloud-storage
modules to mocks. Do not treat mocked tests as proof that native database,
notification, iCloud, or UI integration works; verify those paths on a simulator
or device. Before opening a PR, run `yarn test`, `yarn lint`, and `yarn tsc`.

## Security & Configuration

Environment scripts select `.env.development`, `.env.staging`, or
`.env.production` through `react-native-config`. Never commit credentials or
secret-filled environment files. Preserve iOS entitlements, Android package
configuration, and the `com.kite.app` application identity when editing native
projects.

## Commit & Pull Request Guidelines

History follows Conventional Commits, commonly `feat(scope):`, `fix(scope):`,
and `docs:`. Write focused, imperative commits. Pull requests should explain the
behavior and risk, link an issue or design document, list verification performed,
and include screenshots or recordings for UI changes. Explicitly call out schema,
sync, native, environment, notification, or translation changes.
