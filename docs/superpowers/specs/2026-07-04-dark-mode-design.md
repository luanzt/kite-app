# Dark Mode — Design Spec

**Date:** 2026-07-04
**Status:** Approved for planning
**Scope:** Comprehensive (full app), designer-authored dark palette, 3-way theme selector (Light / Dark / System).

## Problem

Dark mode is scaffolded but not themed. The store (`themeMode`), `useTheme()`
(bridges to `Uniwind.setTheme`), and the Settings toggle all exist, but the
color tokens in `global.css` live under a single global `@theme {}` block — one
palette, not per-theme. So `Uniwind.setTheme('dark')` runs but every
`bg-surface` / `text-ink` class still resolves to the light value. On top of
that, ~116 hardcoded hex values and ~60 `color=` props across the app bypass the
token system entirely and would stay light even after the token layer is fixed.

## Goal

A polished dark mode across the whole app — every screen, including charts and
the pace-line — driven by a proper per-theme token set, with a Light / Dark /
System selector in Settings.

## Architecture — three layers, in order

### Layer 1 — Token layer (the foundation)

Move the **color** tokens in `global.css` out of the single global `@theme {}`
block and re-declare them under `@layer theme { :root { @variant light {…}
@variant dark {…} } }` — the mechanism the Uniwind/HeroUI Native theming docs
prescribe (the existing `--accent` override already uses this shape).

- **Color tokens** (surface/ink/brand/pace/line + `--accent`) → per-variant.
- **Non-color tokens** (radius `--radius-*-k`, spacing `--spacing-s*`, type
  `--text-*-k`, fonts `--font-*`) stay in `@theme {}` — they do not change
  between light and dark.

Once done, every class that reads a color token (`bg-surface`, `text-ink`,
`border-line`, `bg-pace-on`, `PACE_DOT_CLASS`, …) switches automatically with
the theme. This is the "fix once, benefit everywhere" step and must land first.

### Layer 2 — Hardcoded color layer

Audit the ~116 hex + ~60 `color=` sites that bypass Layer 1. Three groups:

- **Group A — icon `color='#…'` (ink/chrome).** Most of the 60 `color=` props
  (e.g. `<Icons.Moon color='#1b1e18' />`). Fix: read the color from the theme at
  runtime. HeroUI Native ships `useThemeColor('foreground')`; for Kite's own
  tokens (ink, pace) add a thin `useThemeColors()` hook returning the current
  hex set based on `isDark` (from `useTheme`). Icons then take
  `color={c.ink}` instead of a literal.
- **Group B — pace palette in `icons.ts`** (`PACE_COLOR` / `PACE_WEAK`, ~22
  hex). Imported widely; the soul of the app. Fix: make the constants
  theme-aware — keep the light table, add a dark table, expose the current one
  via a hook (`usePaceColors()` or folded into `useThemeColors()`). Sites that
  already use classes (`PACE_DOT_CLASS` → `bg-pace-on`) need **no change** —
  Layer 1 covers them.
- **Group C — hex inside charts** (`TargetTrajectoryChart` ~16, `HistoryChart`,
  `HabitChartsTab`, `AchievementHero`, …). `react-native-svg` does not accept
  `className`, so these must take runtime hex from `useThemeColors()`. Highest
  effort; do last and verify carefully on-device.

Also: the local `Switch` in `SettingsScreen` hardcodes `bg-[#e6e8df]` → token;
check `DateField` / `TimeField` / `SelectField` (third-party datepicker) color
props.

### Layer 3 — Theme selection (UX)

- **Store** (`useAppStore.ts`): widen `ThemeMode` from `'light'|'dark'` to
  `'light'|'dark'|'system'`; default changes from `'light'` → `'system'`. Remove
  `toggleTheme` (Settings moves to a segmented control calling `setThemeMode`
  directly).
- **`useTheme.ts`**: when `themeMode === 'system'`, resolve the real theme via RN
  `useColorScheme()`; call `Uniwind.setTheme(resolved)`. `isDark` reflects the
  resolved theme, not the raw store value. Factor the resolution into a pure
  helper (`resolveTheme(mode, systemScheme)`) so it can be unit-tested.
- **Settings**: replace the on/off `Switch` with `Segmented<ThemeMode>` (the
  existing primitive in `src/components/ui/`) offering Light / Dark / System.
  Add i18n keys `set.themeLight` / `set.themeDark` / `set.themeSystem` in **both**
  `en.json` and `vi.json`.
- **`App.tsx`**: confirm `useTheme()` runs early so the theme applies on launch.

## Dark palette (starting point — tuned on-device during impl)

Not-absolute-black background; inverted surface ladder (raised surfaces are
*lighter* than the base); text ~91% white; pace-line brightened for contrast on
dark; weak tints shift from "color mixed with white" to "color mixed into the
dark base".

| Token | Light (current) | Dark (proposed) |
|---|---|---|
| `bg` | `#eef1f6` | `#121417` |
| `surface` | `#ffffff` | `#1c1f24` |
| `surface-2` | `#eeefe9` | `#252932` |
| `surface-3` | `#e6e8df` | `#2e333d` |
| `line` | `#e3e5dc` | `#2c2f36` |
| `line-strong` | `#d2d5c8` | `#3a3e47` |
| `ink` | `#1b1e18` | `#e8eaed` |
| `ink-2` | `#565a4f` | `#a8adb5` |
| `ink-3` | `#8a8e80` | `#6f757e` |
| `on-accent` | `#ffffff` | `#ffffff` |
| `brand` | `#2456b5` | `#5b8def` |
| `brand-weak` | `#e6eefb` | `#1b2b47` |
| `brand-faint` | `#f0f5fd` | `#161f30` |
| `pace-on` | `#1f9d57` | `#3ec27a` |
| `pace-on-weak` | `#e3f3ea` | `#13291d` |
| `pace-behind` | `#e0564e` | `#f0736b` |
| `pace-behind-weak` | `#fbe7e5` | `#331917` |
| `pace-ahead` | `#2456b5` | `#5b8def` |
| `pace-ahead-weak` | `#e6eefb` | `#1b2b47` |
| `pace-none` | `#a3a8a0` | `#6f757e` |
| `pace-none-weak` | `#eceee8` | `#24272d` |

`--accent` (HeroUI) becomes `#5b8def` in dark to match `brand` (currently the
same `#2456b5` in both variants). `on-accent` stays white in both.

## Implementation order (risk-reducing)

1. **Layer 1** — token restructure in `global.css`. Verify class-driven screens
   auto-flip.
2. **Layer 3** — store + `useTheme` + Settings segmented. Now theme is
   togglable for visual testing.
3. **Layer 2** — Group A (icons) → Group B (pace) → Group C (charts). Verify each
   step on the simulator.

## Testing

- **Unit:** pure `resolveTheme(mode, systemScheme)` helper (mock `useColorScheme`).
  No automated visual-color test is feasible; existing pure logic stays covered.
- **Manual (primary):** run on simulator, cycle all three theme modes, sweep
  every screen — Today, Trackers list, Detail (habit / target / average /
  project), Form, Settings, and every overlay / BottomSheet (LogEntryModal,
  Dialog, Toast, datepickers).

## Out of scope (YAGNI)

- No additional custom themes beyond light/dark.
- No animated transition when the theme changes.
- No redesign of tab-icon SVG assets (they already swap active/inactive by
  state; only verified, not re-designed).
