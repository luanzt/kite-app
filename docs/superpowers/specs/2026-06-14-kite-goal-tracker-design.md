# Kite — Goal & Progress Tracker — Design Spec

**Date:** 2026-06-14
**Status:** Approved (brainstorming) — pending spec review before implementation plan
**Author:** luanzt

## 1. Overview

Kite is an offline-first goal & progress tracking mobile app, modeled on
[Strides](https://www.stridesapp.com/). Users define long-term goals and track
progress over time. The signature feature is the **pace line** (green/red
on-track indicator) borrowed from Strides.

Built on the `RnHeroUITemplate` React Native CLI template (copied into a
standalone project at `~/Documents/Kite`). No Expo, no backend, no login —
all data lives on-device.

### Goals
- Four tracker types: **Habit**, **Target**, **Average**, **Project**.
- Daily "Today" view that surfaces what needs logging now.
- Detailed reports per tracker: pace line, streaks, success rate, history chart.
- Bilingual UI: **English + Vietnamese**.

### Non-goals (MVP)
- Cloud sync / accounts / multi-device.
- Apple Health / Google Fit integration.
- Gantt-chart visualization for Projects (milestone list only for now).
- Sharing / social features.

## 2. Tech Stack

Inherited from template: React Native CLI 0.85 (no Expo), HeroUI Native v1.0,
Uniwind (Tailwind v4), Zustand + MMKV, TanStack Query, React Navigation v7,
react-hook-form + zod, react-native-svg.

**Added for Kite (all pure-native, no Expo):**

| Need | Package |
|---|---|
| Local database | `@op-engineering/op-sqlite` |
| History charts | `react-native-gifted-charts` (runs on existing `react-native-svg`) |
| Local reminders | `@notifee/react-native` |
| Detect OS locale | `react-native-localize` |
| i18n | `i18next` + `react-i18next` |
| Haptics (optional, nice-to-have) | `react-native-haptic-feedback` |

**Explicitly rejected:** Expo and all `expo-*` modules. App stays pure RN CLI.

## 3. Architecture

Offline-first, single source of truth in SQLite:

```
UI — HeroUI Native screens
        ↓
React Query hooks — TanStack Query as a reactive cache over local data
        ↓
Repository layer — TS functions: createTracker, logEntry, getReports, …
        ↓
SQLite (op-sqlite) — single source of truth, all data on-device
```

- TanStack Query (already in template) caches results of SQLite queries instead
  of API calls. Mutations (log entry, create tracker) `invalidate` the relevant
  query → UI refreshes automatically.
- Zustand + MMKV handle **only** app settings (theme, language) — never tracker
  data. (Per CLAUDE.md: do not use Zustand to cache app data.)
- Per-type progress math lives in pure-function "calculators" — testable in
  isolation, UI only consumes the resulting `TrackerProgress`.

## 4. Data Model (SQLite — 3 tables)

### `trackers` — shared definition for all 4 types

| column | type | notes |
|---|---|---|
| id | TEXT (uuid) | PK |
| name | TEXT | user-entered, NOT translated |
| type | TEXT | `habit` \| `target` \| `average` \| `project` |
| icon | TEXT | icon key |
| color | TEXT | color key |
| unit | TEXT | "kg", "$", "reps" — nullable |
| direction | TEXT | `good` \| `bad` (habit only) — nullable |
| target_value | REAL | goal value (target/average) — nullable |
| start_value | REAL | starting value (target — for pace line) — nullable |
| start_date | TEXT (ISO) | start date |
| deadline | TEXT (ISO) | due date (target/project) — nullable |
| period | TEXT | `daily`\|`weekly`\|`monthly`\|`yearly` (average/habit) — nullable |
| repeat_days | TEXT (JSON) | weekdays to repeat — drives Today filter — nullable |
| created_at | TEXT (ISO) | metadata |
| archived | INTEGER | 0/1 |

### `entries` — per-log records (Habit, Target, Average)

| column | type | notes |
|---|---|---|
| id | TEXT | PK |
| tracker_id | TEXT | FK → trackers |
| date | TEXT (ISO date) | log date |
| value | REAL | habit: 1/0; target/average: entered number |
| note | TEXT | nullable |

Index: `entries(tracker_id, date)` for fast aggregation.

### `milestones` — Project trackers only

| column | type | notes |
|---|---|---|
| id | TEXT | PK |
| tracker_id | TEXT | FK → trackers |
| title | TEXT | milestone name |
| due_date | TEXT (ISO) | milestone due date |
| progress | REAL | 0..1 (slider) |
| order_index | INTEGER | sort order |

**Design decisions:**
1. One shared `trackers` table for all 4 types (type-specific columns nullable),
   rather than 4 tables — types share most columns.
2. Separate `entries` / `milestones` + index → fast query/aggregate, especially
   for Average (AVG over period) and Project (join milestones).

## 5. Progress & Pace Line Logic

Every calculator returns a unified shape consumed by the UI:

```ts
type PaceStatus = 'on_track' | 'behind' | 'ahead' | 'none';

type TrackerProgress = {
  current: number;
  goal: number;
  percent: number;          // 0..1 — progress bar
  paceStatus: PaceStatus;   // green/red
  streak?: number;          // habit
  successRate?: number;     // 0..1
};
```

Calculators are pure functions in `src/features/trackers/calculators/`
(`calculateHabit`, `calculateTarget`, `calculateAverage`, `calculateProject`),
each unit-tested independently.

### 5.1 Habit — Yes/No + streak
- Each due day: `value = 1` (done) or no entry (not done).
- **Streak:** count of consecutive recent due days with an entry, respecting
  `repeat_days` (only count days the habit was supposed to happen).
- **Good vs bad:** good → "days kept"; bad → "days avoided" (inverted).
- `successRate` = days achieved / days due.
- `paceStatus = 'none'` (habits use streak + calendar, not a linear pace line).

### 5.2 Target — reach a value before a deadline ⭐ (pace line)
- e.g. "Save $2000" from `start_value=0` to `target_value=2000` by deadline.
- `current` = latest entry value (default; cumulative configurable later).
- **Pace line formula:**
  ```
  total_days     = deadline - start_date
  days_elapsed   = today - start_date
  expected_today = start_value + (target_value - start_value)
                   × (days_elapsed / total_days)

  current >= expected_today      → 'on_track' (green)
  current <  expected_today      → 'behind'   (red)
  current well above expected    → 'ahead'    (deep green)
  ```
- `percent = (current - start_value) / (target_value - start_value)`.

### 5.3 Average — average over a period
- e.g. "Average 8 glasses of water/day".
- `current` = `AVG(value)` of entries in the current period (daily/weekly/
  monthly/yearly) — computed via SQL aggregate.
- `goal = target_value`.
- `current >= target` → on_track (green), else behind (red).
- `percent = current / target` (capped at 1).

### 5.4 Project — milestones + overall progress
- Overall progress = average of milestone `progress` values (each a 0..1 slider).
- **Pace line** applied over time like Target: actual progress vs expected
  progress against the overall deadline.
- Each milestone has its own `due_date` → flag overdue milestones.
- MVP renders a milestone list + progress bar (no Gantt yet).

## 6. Screens & Navigation

Template's Auth flow is removed (Kite needs no login). Navigation:

```
RootNavigator (native-stack)
├── MainTabs (bottom-tabs)
│   ├── Today      → DailyGoalsScreen
│   ├── Trackers   → TrackerListScreen
│   └── Settings   → SettingsScreen
└── stack screens (pushed over tabs)
    ├── TrackerDetail    → reports + pace line + chart
    ├── TrackerForm      → create / edit (form varies by type)
    └── TrackerTypePicker → choose type before the form
```

### 6.1 DailyGoalsScreen (tab Today) — primary screen
- Filters trackers due **today** (via `repeat_days` / `period`).
- Compact card per item: name + icon + quick-log control.
  - Habit → tick (✓) toggle.
  - Target/Average → quick number input / +/−.
  - Project → opens detail to drag milestone slider.
- Header: today's date + summary ("3/5 done").
- Empty state when nothing is due.

### 6.2 TrackerListScreen (tab Trackers) — management
- List of all trackers (group/filter by type or tag).
- Each card shows mini-progress + pace status dot (green/red).
- **+** button → TrackerTypePicker → TrackerForm.
- Tap → TrackerDetail. Swipe/menu → edit / archive / delete.

### 6.3 TrackerDetailScreen (pushed) — Reports ⭐
- Pace-line progress bar (green/red) + "on track / behind by X".
- Streak, success rate, calendar (habit).
- History line chart (`react-native-gifted-charts`).
- Milestone list (project).
- Edit / log-entry actions.

### 6.4 TrackerFormScreen (pushed) — create/edit
- Dynamic form by `type` (react-hook-form + zod).
  - Common: name, icon, color, unit, repeat_days, reminder.
  - Target: start_value, target_value, deadline.
  - Average: target_value, period.
  - Project: add/edit milestone list.
- Per-type zod schemas in `utils/validators.ts`.

### 6.5 SettingsScreen (tab Settings)
- Dark/light toggle (existing `useAppStore`).
- Language select EN/VI (see §7).
- Export data (JSON) / Clear all data.

## 7. Internationalization (English + Vietnamese)

- **Libraries:** `i18next` + `react-i18next`; `react-native-localize` to read OS
  locale on first launch.
- **Structure:**
  ```
  src/i18n/
  ├── index.ts          # init i18next, detect OS locale on first launch
  └── locales/
      ├── en.json
      └── vi.json
  ```
- **Flow:**
  1. First launch → detect OS locale → `vi*` uses `vi`, otherwise `en`.
  2. Language choice persisted in MMKV via `useAppStore` (new `language` field
     alongside existing `themeMode`).
  3. Settings screen changes language → `i18n.changeLanguage()` → live UI update.
  4. Components use `const { t } = useTranslation()`.
- **UI strings** (buttons, labels, screen titles, the 4 type names, messages) are
  translated. **User-entered data** (tracker names, notes) is stored verbatim in
  SQLite, never translated.
- **Dates/numbers** in Reports formatted per active locale (`Intl.DateTimeFormat`
  / `Intl.NumberFormat`, available in Hermes). VN: "14 thg 6"; EN: "Jun 14".

## 8. Directory Structure

```
src/
├── features/trackers/
│   ├── calculators/      # pure functions (§5), unit-tested
│   ├── db/               # op-sqlite schema + repository
│   ├── queries/          # TanStack Query hooks
│   └── components/        # TrackerCard, PaceBar, MilestoneList, ...
├── screens/
│   ├── today/            # DailyGoalsScreen
│   ├── trackers/         # TrackerListScreen, TrackerDetailScreen, TrackerForm, TrackerTypePicker
│   └── settings/         # SettingsScreen
├── i18n/                 # i18next setup + locales
├── store/                # useAppStore (theme + language), drop auth store
├── navigation/           # RootNavigator + tabs (no Auth flow)
└── utils/                # storage, validators (zod schemas per type)
```

(Template's `api/`, auth store, auth screens, and Auth navigator are removed —
Kite is local-first with no API layer of that kind.)

## 9. AI Tooling

The `heroui-native` Agent Skill is bundled (`.agents/skills/heroui-native/`,
symlinked at `.claude/skills/heroui-native`) so AI assistants know the HeroUI
Native component APIs. See root `CLAUDE.md`.

## 10. Open Items / Future

- Cloud sync + accounts (post-MVP).
- Gantt chart for Projects.
- Apple Health / Google Fit.
- Tags & area-of-life filtering (schema-ready via future `tags` table).
- Tracker templates (Strides ships 150+).
