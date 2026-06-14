# Kite Goal Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Kite, an offline-first goal & progress tracker (Strides-style) with 4 tracker types, a pace-line engine, history charts, and EN/VI i18n, on top of the RnHeroUITemplate RN CLI template.

**Architecture:** Offline-first. SQLite (op-sqlite) is the single source of truth. A repository layer wraps SQL; TanStack Query caches reads and invalidates on writes. Per-type progress math lives in pure-function calculators (unit-tested). Zustand+MMKV holds only app settings (theme, language). No Expo, no backend, no login.

**Tech Stack:** React Native CLI 0.85, HeroUI Native, Uniwind, op-sqlite, react-native-gifted-charts, @notifee/react-native, react-native-localize, i18next + react-i18next, react-hook-form + zod, TanStack Query, React Navigation v7.

> **op-sqlite API note (verified against installed v16.2.1):** the DB's `execute()` is **async** (`Promise<QueryResult>`); the **synchronous** method is `executeSync()`. `QueryResult.rows` is a **plain array** (`Array<Record<string, Scalar>>`) — there is NO `rows._array` wrapper. Phase 3 code below was written against an `_array` assumption; the repository/schema as built use `executeSync()` + `res.rows`. Treat the executeSync form as canonical.

**Reference spec:** `docs/superpowers/specs/2026-06-14-kite-goal-tracker-design.md`

---

## File Structure

**New directories/files:**
- `src/features/trackers/types.ts` — shared TS types (Tracker, Entry, Milestone, TrackerProgress, enums)
- `src/features/trackers/calculators/{habit,target,average,project}.ts` + `index.ts` — pure progress functions
- `src/features/trackers/calculators/__tests__/*.test.ts` — calculator unit tests
- `src/features/trackers/db/schema.ts` — CREATE TABLE statements + DB open/migrate
- `src/features/trackers/db/repository.ts` — CRUD functions over SQLite
- `src/features/trackers/db/__tests__/repository.test.ts` — repository tests (in-memory DB)
- `src/features/trackers/queries/index.ts` — TanStack Query hooks
- `src/features/trackers/components/{TrackerCard,PaceBar,QuickLog,MilestoneList,HistoryChart}.tsx`
- `src/features/trackers/quickStarts.ts` — 6–8 quick-start suggestion definitions
- `src/i18n/index.ts` + `src/i18n/locales/{en,vi}.json` — i18n setup + strings
- `src/screens/today/DailyGoalsScreen.tsx`
- `src/screens/trackers/{TrackerListScreen,TrackerDetailScreen,TrackerFormScreen,TrackerTypePickerScreen}.tsx`
- `src/screens/settings/SettingsScreen.tsx`
- `src/utils/date.ts` — date helpers (ISO day, diff in days, period bounds)
- `src/utils/date.__tests__` via `src/utils/__tests__/date.test.ts`

**Modified:**
- `package.json` — add deps
- `babel.config.js` / `tsconfig.json` — add `@features` and `@i18n` aliases
- `src/store/useAppStore.ts` — add `language`
- `src/navigation/{types,RootNavigator,MainNavigator}.tsx` — new screens, drop Auth
- `App.tsx` — init DB + i18n providers

**Removed (Kite has no login):**
- `src/navigation/AuthNavigator.tsx`, `src/screens/auth/*`, `src/store/useAuthStore.ts`,
  `src/screens/home/*`, `src/screens/profile/*`, `src/hooks/useAuth.ts`,
  `src/api/{client,queryClient kept}`, `src/api/endpoints/auth.ts`, `src/api/queries/auth.ts`, `src/api/types/auth.ts`
  (Keep `src/api/queryClient.ts` — TanStack Query is reused for local cache.)

---

## Phase 0 — Dependencies & Aliases

### Task 0.1: Install runtime dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install JS deps**

Run from `~/Documents/Kite`:
```bash
yarn add @op-engineering/op-sqlite react-native-gifted-charts @notifee/react-native react-native-localize i18next react-i18next react-native-haptic-feedback
```

- [ ] **Step 2: Install iOS pods**

```bash
cd ios && pod install && cd ..
```
Expected: pods for op-sqlite, notifee, react-native-localize, haptic-feedback installed. (gifted-charts is JS-only on existing react-native-svg.)

- [ ] **Step 3: Verify typecheck still passes**

Run: `yarn tsc`
Expected: no errors (deps ship their own types; gifted-charts has bundled types).

- [ ] **Step 4: Commit**

```bash
git add package.json yarn.lock ios/Podfile.lock
git commit -m "chore: add op-sqlite, gifted-charts, notifee, localize, i18next deps"
```

### Task 0.2: Add path aliases

**Files:**
- Modify: `babel.config.js`
- Modify: `tsconfig.json`

- [ ] **Step 1: Add `@features` and `@i18n` to babel alias map**

In `babel.config.js`, inside the `alias` object, add:
```js
          '@features': './src/features',
          '@i18n': './src/i18n',
```

- [ ] **Step 2: Add matching paths to tsconfig**

In `tsconfig.json` `compilerOptions.paths`, add:
```json
      "@features/*": ["src/features/*"],
      "@i18n/*": ["src/i18n/*"],
```

- [ ] **Step 3: Verify typecheck**

Run: `yarn tsc`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add babel.config.js tsconfig.json
git commit -m "chore: add @features and @i18n path aliases"
```

---

## Phase 1 — Shared Types & Date Utilities

### Task 1.1: Shared tracker types

**Files:**
- Create: `src/features/trackers/types.ts`

- [ ] **Step 1: Write the types**

```ts
export type TrackerType = 'habit' | 'target' | 'average' | 'project';
export type HabitDirection = 'good' | 'bad';
export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type Accumulation = 'sum' | 'latest';
export type PaceStatus = 'on_track' | 'behind' | 'ahead' | 'none';

export type Tracker = {
  id: string;
  name: string;
  type: TrackerType;
  icon: string;
  color: string;
  unit: string | null;
  direction: HabitDirection | null;
  targetValue: number | null;
  startValue: number | null;
  accumulation: Accumulation | null;
  startDate: string; // ISO date
  deadline: string | null; // ISO date
  period: Period | null;
  repeatDays: number[] | null; // 0=Sun..6=Sat
  createdAt: string; // ISO datetime
  archived: boolean;
};

export type Entry = {
  id: string;
  trackerId: string;
  date: string; // ISO date
  value: number;
  note: string | null;
};

export type Milestone = {
  id: string;
  trackerId: string;
  title: string;
  dueDate: string | null; // ISO date
  progress: number; // 0..1
  orderIndex: number;
};

export type TrackerProgress = {
  current: number;
  goal: number;
  percent: number; // 0..1
  paceStatus: PaceStatus;
  streak?: number;
  successRate?: number; // 0..1
};
```

- [ ] **Step 2: Verify typecheck**

Run: `yarn tsc`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/trackers/types.ts
git commit -m "feat: add shared tracker types"
```

### Task 1.2: Date utilities (TDD)

**Files:**
- Create: `src/utils/date.ts`
- Test: `src/utils/__tests__/date.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { toISODate, daysBetween, isSameISODate, weekdayOf } from '@utils/date';

describe('date utils', () => {
  test('toISODate strips time', () => {
    expect(toISODate(new Date('2026-06-14T09:30:00Z'))).toBe('2026-06-14');
  });

  test('daysBetween counts whole days', () => {
    expect(daysBetween('2026-06-01', '2026-06-14')).toBe(13);
  });

  test('daysBetween is zero for same day', () => {
    expect(daysBetween('2026-06-14', '2026-06-14')).toBe(0);
  });

  test('isSameISODate compares date portion', () => {
    expect(isSameISODate('2026-06-14', '2026-06-14')).toBe(true);
    expect(isSameISODate('2026-06-14', '2026-06-15')).toBe(false);
  });

  test('weekdayOf returns 0..6 (Sun..Sat)', () => {
    expect(weekdayOf('2026-06-14')).toBe(0); // Sunday
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/utils/__tests__/date.test.ts`
Expected: FAIL — cannot find module `@utils/date`.

- [ ] **Step 3: Write minimal implementation**

```ts
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const ms = Date.parse(`${toISO}T00:00:00Z`) - Date.parse(`${fromISO}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function isSameISODate(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

export function weekdayOf(iso: string): number {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).getUTCDay();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/utils/__tests__/date.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/date.ts src/utils/__tests__/date.test.ts
git commit -m "feat: add date utilities with tests"
```

---

## Phase 2 — Progress Calculators (TDD, the core engine)

### Task 2.1: Target calculator (sum + latest, pace line)

**Files:**
- Create: `src/features/trackers/calculators/target.ts`
- Test: `src/features/trackers/calculators/__tests__/target.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { calculateTarget } from '../target';
import type { Tracker, Entry } from '@features/trackers/types';

const base: Tracker = {
  id: 't1', name: 'Save', type: 'target', icon: 'piggy', color: 'green',
  unit: '$', direction: null, targetValue: 2000, startValue: 0,
  accumulation: 'sum', startDate: '2026-01-01', deadline: '2026-12-31',
  period: null, repeatDays: null, createdAt: '2026-01-01T00:00:00Z', archived: false,
};
const entry = (date: string, value: number): Entry =>
  ({ id: date, trackerId: 't1', date, value, note: null });

describe('calculateTarget', () => {
  test('sum mode adds entries to start', () => {
    const p = calculateTarget(base, [entry('2026-01-02', 100), entry('2026-01-03', 50)], '2026-01-03');
    expect(p.current).toBe(150);
    expect(p.goal).toBe(2000);
    expect(p.percent).toBeCloseTo(150 / 2000);
  });

  test('latest mode uses last entry value', () => {
    const t = { ...base, accumulation: 'latest' as const, startValue: 80, targetValue: 65 };
    const p = calculateTarget(t, [entry('2026-01-02', 78), entry('2026-01-05', 74)], '2026-01-05');
    expect(p.current).toBe(74);
  });

  test('behind when current below expected pace', () => {
    // half the year elapsed, expected ~1000, only 100 logged
    const p = calculateTarget(base, [entry('2026-07-01', 100)], '2026-07-02');
    expect(p.paceStatus).toBe('behind');
  });

  test('on_track when current meets expected pace', () => {
    const p = calculateTarget(base, [entry('2026-07-01', 1100)], '2026-07-02');
    expect(['on_track', 'ahead']).toContain(p.paceStatus);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/features/trackers/calculators/__tests__/target.test.ts`
Expected: FAIL — cannot find module `../target`.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Tracker, Entry, TrackerProgress } from '@features/trackers/types';
import { daysBetween } from '@utils/date';

const AHEAD_MARGIN = 0.05; // 5% above expected counts as "ahead"

export function calculateTarget(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string,
): TrackerProgress {
  const start = tracker.startValue ?? 0;
  const goal = tracker.targetValue ?? 0;

  const current =
    tracker.accumulation === 'latest'
      ? entries.length
        ? [...entries].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!.value
        : start
      : start + entries.reduce((sum, e) => sum + e.value, 0);

  const span = goal - start;
  const percent = span === 0 ? 0 : Math.max(0, Math.min(1, (current - start) / span));

  let paceStatus: TrackerProgress['paceStatus'] = 'none';
  if (tracker.deadline) {
    const total = daysBetween(tracker.startDate, tracker.deadline);
    const elapsed = Math.max(0, Math.min(total, daysBetween(tracker.startDate, todayISO)));
    const frac = total === 0 ? 1 : elapsed / total;
    const expected = start + span * frac;
    if (current >= expected + Math.abs(span) * AHEAD_MARGIN) paceStatus = 'ahead';
    else if (current >= expected) paceStatus = 'on_track';
    else paceStatus = 'behind';
  }

  return { current, goal, percent, paceStatus };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/features/trackers/calculators/__tests__/target.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/trackers/calculators/target.ts src/features/trackers/calculators/__tests__/target.test.ts
git commit -m "feat: add target calculator with pace line (sum/latest)"
```

### Task 2.2: Habit calculator (streak + success rate)

**Files:**
- Create: `src/features/trackers/calculators/habit.ts`
- Test: `src/features/trackers/calculators/__tests__/habit.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { calculateHabit } from '../habit';
import type { Tracker, Entry } from '@features/trackers/types';

const habit: Tracker = {
  id: 'h1', name: 'Meditate', type: 'habit', icon: 'lotus', color: 'blue',
  unit: null, direction: 'good', targetValue: null, startValue: null,
  accumulation: null, startDate: '2026-06-01', deadline: null,
  period: 'daily', repeatDays: [0,1,2,3,4,5,6],
  createdAt: '2026-06-01T00:00:00Z', archived: false,
};
const done = (date: string): Entry => ({ id: date, trackerId: 'h1', date, value: 1, note: null });

describe('calculateHabit', () => {
  test('counts consecutive recent days as streak', () => {
    const p = calculateHabit(habit, [done('2026-06-12'), done('2026-06-13'), done('2026-06-14')], '2026-06-14');
    expect(p.streak).toBe(3);
  });

  test('streak breaks on a missed due day', () => {
    const p = calculateHabit(habit, [done('2026-06-12'), done('2026-06-14')], '2026-06-14');
    expect(p.streak).toBe(1);
  });

  test('success rate = done days / due days', () => {
    const p = calculateHabit(habit, [done('2026-06-12'), done('2026-06-14')], '2026-06-14');
    // due days from 06-01..06-14 = 14, done = 2
    expect(p.successRate).toBeCloseTo(2 / 14);
  });

  test('pace status is none for habits', () => {
    const p = calculateHabit(habit, [done('2026-06-14')], '2026-06-14');
    expect(p.paceStatus).toBe('none');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/features/trackers/calculators/__tests__/habit.test.ts`
Expected: FAIL — cannot find module `../habit`.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Tracker, Entry, TrackerProgress } from '@features/trackers/types';
import { daysBetween, toISODate, weekdayOf } from '@utils/date';

function isDueOn(tracker: Tracker, iso: string): boolean {
  if (!tracker.repeatDays || tracker.repeatDays.length === 0) return true;
  return tracker.repeatDays.includes(weekdayOf(iso));
}

function isoMinusDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return toISODate(d);
}

export function calculateHabit(
  tracker: Tracker,
  entries: Entry[],
  todayISO: string,
): TrackerProgress {
  const doneDates = new Set(entries.filter(e => e.value > 0).map(e => e.date.slice(0, 10)));

  // streak: walk backward from today over DUE days only
  let streak = 0;
  let cursor = todayISO;
  while (true) {
    if (isDueOn(tracker, cursor)) {
      if (doneDates.has(cursor)) streak += 1;
      else break;
    }
    cursor = isoMinusDays(cursor, 1);
    if (daysBetween(tracker.startDate, cursor) < 0) break;
  }

  // success rate over due days in [startDate, today]
  const totalDays = daysBetween(tracker.startDate, todayISO);
  let dueCount = 0;
  let doneCount = 0;
  for (let i = 0; i <= totalDays; i++) {
    const day = isoMinusDays(todayISO, i);
    if (isDueOn(tracker, day)) {
      dueCount += 1;
      if (doneDates.has(day)) doneCount += 1;
    }
  }
  const successRate = dueCount === 0 ? 0 : doneCount / dueCount;

  return { current: doneCount, goal: dueCount, percent: successRate, paceStatus: 'none', streak, successRate };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/features/trackers/calculators/__tests__/habit.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/trackers/calculators/habit.ts src/features/trackers/calculators/__tests__/habit.test.ts
git commit -m "feat: add habit calculator with streak and success rate"
```

### Task 2.3: Average calculator

**Files:**
- Create: `src/features/trackers/calculators/average.ts`
- Test: `src/features/trackers/calculators/__tests__/average.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { calculateAverage } from '../average';
import type { Tracker, Entry } from '@features/trackers/types';

const avg: Tracker = {
  id: 'a1', name: 'Water', type: 'average', icon: 'drop', color: 'cyan',
  unit: 'glasses', direction: null, targetValue: 8, startValue: null,
  accumulation: null, startDate: '2026-06-01', deadline: null,
  period: 'daily', repeatDays: null, createdAt: '2026-06-01T00:00:00Z', archived: false,
};
const e = (date: string, value: number): Entry => ({ id: date, trackerId: 'a1', date, value, note: null });

describe('calculateAverage', () => {
  test('current is the mean of entry values', () => {
    const p = calculateAverage(avg, [e('2026-06-12', 6), e('2026-06-13', 10)], '2026-06-13');
    expect(p.current).toBe(8);
    expect(p.goal).toBe(8);
  });

  test('on_track when average meets target', () => {
    const p = calculateAverage(avg, [e('2026-06-12', 8), e('2026-06-13', 9)], '2026-06-13');
    expect(p.paceStatus).toBe('on_track');
  });

  test('behind when average below target', () => {
    const p = calculateAverage(avg, [e('2026-06-12', 3)], '2026-06-13');
    expect(p.paceStatus).toBe('behind');
  });

  test('no entries → current 0, behind', () => {
    const p = calculateAverage(avg, [], '2026-06-13');
    expect(p.current).toBe(0);
    expect(p.paceStatus).toBe('behind');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/features/trackers/calculators/__tests__/average.test.ts`
Expected: FAIL — cannot find module `../average`.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Tracker, Entry, TrackerProgress } from '@features/trackers/types';

export function calculateAverage(
  tracker: Tracker,
  entries: Entry[],
  _todayISO: string,
): TrackerProgress {
  const goal = tracker.targetValue ?? 0;
  const current = entries.length
    ? entries.reduce((sum, e) => sum + e.value, 0) / entries.length
    : 0;
  const percent = goal === 0 ? 0 : Math.max(0, Math.min(1, current / goal));
  const paceStatus = current >= goal && goal > 0 ? 'on_track' : 'behind';
  return { current, goal, percent, paceStatus };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/features/trackers/calculators/__tests__/average.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/trackers/calculators/average.ts src/features/trackers/calculators/__tests__/average.test.ts
git commit -m "feat: add average calculator"
```

### Task 2.4: Project calculator (milestones + pace)

**Files:**
- Create: `src/features/trackers/calculators/project.ts`
- Test: `src/features/trackers/calculators/__tests__/project.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { calculateProject } from '../project';
import type { Tracker, Milestone } from '@features/trackers/types';

const proj: Tracker = {
  id: 'p1', name: 'Launch app', type: 'project', icon: 'rocket', color: 'purple',
  unit: null, direction: null, targetValue: null, startValue: null,
  accumulation: null, startDate: '2026-01-01', deadline: '2026-12-31',
  period: null, repeatDays: null, createdAt: '2026-01-01T00:00:00Z', archived: false,
};
const m = (id: string, progress: number): Milestone =>
  ({ id, trackerId: 'p1', title: id, dueDate: null, progress, orderIndex: 0 });

describe('calculateProject', () => {
  test('overall progress is mean of milestone progress', () => {
    const p = calculateProject(proj, [m('a', 1), m('b', 0)], '2026-06-30');
    expect(p.percent).toBe(0.5);
  });

  test('no milestones → 0 percent', () => {
    const p = calculateProject(proj, [], '2026-06-30');
    expect(p.percent).toBe(0);
  });

  test('behind when progress below time pace', () => {
    // half the year elapsed but only 10% done
    const p = calculateProject(proj, [m('a', 0.1)], '2026-07-02');
    expect(p.paceStatus).toBe('behind');
  });

  test('on_track when progress meets time pace', () => {
    const p = calculateProject(proj, [m('a', 0.6)], '2026-07-02');
    expect(['on_track', 'ahead']).toContain(p.paceStatus);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/features/trackers/calculators/__tests__/project.test.ts`
Expected: FAIL — cannot find module `../project`.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Tracker, Milestone, TrackerProgress } from '@features/trackers/types';
import { daysBetween } from '@utils/date';

const AHEAD_MARGIN = 0.05;

export function calculateProject(
  tracker: Tracker,
  milestones: Milestone[],
  todayISO: string,
): TrackerProgress {
  const percent = milestones.length
    ? milestones.reduce((sum, ms) => sum + ms.progress, 0) / milestones.length
    : 0;

  let paceStatus: TrackerProgress['paceStatus'] = 'none';
  if (tracker.deadline) {
    const total = daysBetween(tracker.startDate, tracker.deadline);
    const elapsed = Math.max(0, Math.min(total, daysBetween(tracker.startDate, todayISO)));
    const expected = total === 0 ? 1 : elapsed / total;
    if (percent >= expected + AHEAD_MARGIN) paceStatus = 'ahead';
    else if (percent >= expected) paceStatus = 'on_track';
    else paceStatus = 'behind';
  }

  return { current: percent, goal: 1, percent, paceStatus };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/features/trackers/calculators/__tests__/project.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/trackers/calculators/project.ts src/features/trackers/calculators/__tests__/project.test.ts
git commit -m "feat: add project calculator with milestone pace"
```

### Task 2.5: Calculator barrel export

**Files:**
- Create: `src/features/trackers/calculators/index.ts`

- [ ] **Step 1: Write the barrel**

```ts
export { calculateHabit } from './habit';
export { calculateTarget } from './target';
export { calculateAverage } from './average';
export { calculateProject } from './project';
```

- [ ] **Step 2: Verify all calculator tests still pass**

Run: `yarn test src/features/trackers/calculators`
Expected: PASS (all 16 tests).

- [ ] **Step 3: Commit**

```bash
git add src/features/trackers/calculators/index.ts
git commit -m "feat: add calculator barrel export"
```

---

## Phase 3 — SQLite Schema & Repository

### Task 3.1: Schema + DB open

**Files:**
- Create: `src/features/trackers/db/schema.ts`

- [ ] **Step 1: Write the schema module**

```ts
import { open, type DB } from '@op-engineering/op-sqlite';

export const DB_NAME = 'kite.sqlite';

let db: DB | null = null;

export function getDb(): DB {
  if (!db) {
    db = open({ name: DB_NAME });
    migrate(db);
  }
  return db;
}

// For tests: allow injecting an in-memory DB
export function setDb(injected: DB): void {
  db = injected;
  migrate(db);
}

export function migrate(database: DB): void {
  database.execute(`
    CREATE TABLE IF NOT EXISTS trackers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      unit TEXT,
      direction TEXT,
      target_value REAL,
      start_value REAL,
      accumulation TEXT,
      start_date TEXT NOT NULL,
      deadline TEXT,
      period TEXT,
      repeat_days TEXT,
      created_at TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0
    );
  `);
  database.execute(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      tracker_id TEXT NOT NULL,
      date TEXT NOT NULL,
      value REAL NOT NULL,
      note TEXT
    );
  `);
  database.execute(`CREATE INDEX IF NOT EXISTS idx_entries_tracker_date ON entries(tracker_id, date);`);
  database.execute(`
    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      tracker_id TEXT NOT NULL,
      title TEXT NOT NULL,
      due_date TEXT,
      progress REAL NOT NULL DEFAULT 0,
      order_index INTEGER NOT NULL DEFAULT 0
    );
  `);
}
```

- [ ] **Step 2: Verify typecheck**

Run: `yarn tsc`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/trackers/db/schema.ts
git commit -m "feat: add sqlite schema and db open/migrate"
```

### Task 3.2: Repository — row mapping + tracker CRUD (TDD)

**Files:**
- Create: `src/features/trackers/db/repository.ts`
- Test: `src/features/trackers/db/__tests__/repository.test.ts`

> **Test strategy:** op-sqlite is a native module unavailable in Jest. Mock it
> with an in-memory JS fake that implements `execute(sql, params)` returning
> `{ rows: { _array: [...] } }`. The repository must only use `execute`. Define
> the fake in the test file. The mapping functions (row ⇄ domain) are the real
> logic under test.

- [ ] **Step 1: Write the failing test**

```ts
import { rowToTracker, trackerToRow } from '../repository';
import type { Tracker } from '@features/trackers/types';

const tracker: Tracker = {
  id: 't1', name: 'Save', type: 'target', icon: 'piggy', color: 'green',
  unit: '$', direction: null, targetValue: 2000, startValue: 0, accumulation: 'sum',
  startDate: '2026-01-01', deadline: '2026-12-31', period: null,
  repeatDays: [1, 3, 5], createdAt: '2026-01-01T00:00:00Z', archived: false,
};

describe('tracker row mapping', () => {
  test('trackerToRow serializes repeatDays as JSON and archived as 0/1', () => {
    const row = trackerToRow(tracker);
    expect(row.repeat_days).toBe('[1,3,5]');
    expect(row.archived).toBe(0);
    expect(row.target_value).toBe(2000);
  });

  test('rowToTracker round-trips', () => {
    const row = trackerToRow(tracker);
    const back = rowToTracker(row);
    expect(back).toEqual(tracker);
  });

  test('rowToTracker handles null repeat_days', () => {
    const row = { ...trackerToRow(tracker), repeat_days: null };
    expect(rowToTracker(row).repeatDays).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/features/trackers/db/__tests__/repository.test.ts`
Expected: FAIL — cannot find module `../repository`.

- [ ] **Step 3: Write the repository with mapping + CRUD**

```ts
import { getDb } from './schema';
import type { Tracker, Entry, Milestone } from '@features/trackers/types';

type Row = Record<string, any>;

export function trackerToRow(t: Tracker): Row {
  return {
    id: t.id, name: t.name, type: t.type, icon: t.icon, color: t.color,
    unit: t.unit, direction: t.direction, target_value: t.targetValue,
    start_value: t.startValue, accumulation: t.accumulation, start_date: t.startDate,
    deadline: t.deadline, period: t.period,
    repeat_days: t.repeatDays ? JSON.stringify(t.repeatDays) : null,
    created_at: t.createdAt, archived: t.archived ? 1 : 0,
  };
}

export function rowToTracker(r: Row): Tracker {
  return {
    id: r.id, name: r.name, type: r.type, icon: r.icon, color: r.color,
    unit: r.unit ?? null, direction: r.direction ?? null,
    targetValue: r.target_value ?? null, startValue: r.start_value ?? null,
    accumulation: r.accumulation ?? null, startDate: r.start_date,
    deadline: r.deadline ?? null, period: r.period ?? null,
    repeatDays: r.repeat_days ? JSON.parse(r.repeat_days) : null,
    createdAt: r.created_at, archived: r.archived === 1,
  };
}

const COLS = 'id,name,type,icon,color,unit,direction,target_value,start_value,accumulation,start_date,deadline,period,repeat_days,created_at,archived';
const PLACEHOLDERS = COLS.split(',').map(() => '?').join(',');

export function insertTracker(t: Tracker): void {
  const r = trackerToRow(t);
  getDb().execute(
    `INSERT OR REPLACE INTO trackers (${COLS}) VALUES (${PLACEHOLDERS})`,
    COLS.split(',').map(c => r[c]),
  );
}

export function listTrackers(): Tracker[] {
  const res = getDb().execute(`SELECT ${COLS} FROM trackers WHERE archived = 0 ORDER BY created_at DESC`);
  return (res.rows?._array ?? []).map(rowToTracker);
}

export function getTracker(id: string): Tracker | null {
  const res = getDb().execute(`SELECT ${COLS} FROM trackers WHERE id = ?`, [id]);
  const row = res.rows?._array?.[0];
  return row ? rowToTracker(row) : null;
}

export function deleteTracker(id: string): void {
  const db = getDb();
  db.execute(`DELETE FROM entries WHERE tracker_id = ?`, [id]);
  db.execute(`DELETE FROM milestones WHERE tracker_id = ?`, [id]);
  db.execute(`DELETE FROM trackers WHERE id = ?`, [id]);
}

// Entries
export function insertEntry(e: Entry): void {
  getDb().execute(
    `INSERT OR REPLACE INTO entries (id,tracker_id,date,value,note) VALUES (?,?,?,?,?)`,
    [e.id, e.trackerId, e.date, e.value, e.note],
  );
}

export function listEntries(trackerId: string): Entry[] {
  const res = getDb().execute(
    `SELECT id,tracker_id,date,value,note FROM entries WHERE tracker_id = ? ORDER BY date ASC`,
    [trackerId],
  );
  return (res.rows?._array ?? []).map((r: Row) => ({
    id: r.id, trackerId: r.tracker_id, date: r.date, value: r.value, note: r.note ?? null,
  }));
}

// Milestones
export function listMilestones(trackerId: string): Milestone[] {
  const res = getDb().execute(
    `SELECT id,tracker_id,title,due_date,progress,order_index FROM milestones WHERE tracker_id = ? ORDER BY order_index ASC`,
    [trackerId],
  );
  return (res.rows?._array ?? []).map((r: Row) => ({
    id: r.id, trackerId: r.tracker_id, title: r.title, dueDate: r.due_date ?? null,
    progress: r.progress, orderIndex: r.order_index,
  }));
}

export function upsertMilestone(m: Milestone): void {
  getDb().execute(
    `INSERT OR REPLACE INTO milestones (id,tracker_id,title,due_date,progress,order_index) VALUES (?,?,?,?,?,?)`,
    [m.id, m.trackerId, m.title, m.dueDate, m.progress, m.orderIndex],
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/features/trackers/db/__tests__/repository.test.ts`
Expected: PASS (3 tests). (Mapping functions are pure — no native module needed.)

- [ ] **Step 5: Commit**

```bash
git add src/features/trackers/db/repository.ts src/features/trackers/db/__tests__/repository.test.ts
git commit -m "feat: add tracker repository with row mapping and CRUD"
```

---

## Phase 4 — i18n (EN/VI)

### Task 4.1: i18n setup with OS-locale detection

**Files:**
- Create: `src/i18n/locales/en.json`
- Create: `src/i18n/locales/vi.json`
- Create: `src/i18n/index.ts`
- Modify: `src/store/useAppStore.ts`

- [ ] **Step 1: Create `en.json`**

```json
{
  "tabs": { "today": "Today", "trackers": "Trackers", "settings": "Settings" },
  "today": { "title": "Today", "summary": "{{done}}/{{total}} done", "empty": "Nothing due today" },
  "quickStart": { "heading": "Start with a goal" },
  "types": { "habit": "Habit", "target": "Target", "average": "Average", "project": "Project" },
  "form": {
    "name": "Name", "unit": "Unit", "targetValue": "Target value",
    "startValue": "Start value", "deadline": "Deadline", "period": "Period",
    "accumulation": "Each log is", "accSum": "Added to total", "accLatest": "Current value",
    "save": "Save", "create": "Create tracker"
  },
  "detail": { "onTrack": "On track", "behind": "Behind", "ahead": "Ahead", "streak": "Streak", "successRate": "Success rate", "history": "History" },
  "settings": { "theme": "Theme", "language": "Language", "export": "Export data", "clear": "Clear all data", "english": "English", "vietnamese": "Tiếng Việt" }
}
```

- [ ] **Step 2: Create `vi.json`**

```json
{
  "tabs": { "today": "Hôm nay", "trackers": "Mục tiêu", "settings": "Cài đặt" },
  "today": { "title": "Hôm nay", "summary": "Đã xong {{done}}/{{total}}", "empty": "Hôm nay chưa có gì" },
  "quickStart": { "heading": "Bắt đầu với một mục tiêu" },
  "types": { "habit": "Thói quen", "target": "Mục tiêu", "average": "Trung bình", "project": "Dự án" },
  "form": {
    "name": "Tên", "unit": "Đơn vị", "targetValue": "Giá trị mục tiêu",
    "startValue": "Giá trị bắt đầu", "deadline": "Hạn chót", "period": "Chu kỳ",
    "accumulation": "Mỗi lần ghi là", "accSum": "Cộng vào tổng", "accLatest": "Giá trị hiện tại",
    "save": "Lưu", "create": "Tạo mục tiêu"
  },
  "detail": { "onTrack": "Đúng nhịp", "behind": "Đang trễ", "ahead": "Vượt tiến độ", "streak": "Chuỗi ngày", "successRate": "Tỉ lệ thành công", "history": "Lịch sử" },
  "settings": { "theme": "Giao diện", "language": "Ngôn ngữ", "export": "Xuất dữ liệu", "clear": "Xóa toàn bộ dữ liệu", "english": "English", "vietnamese": "Tiếng Việt" }
}
```

- [ ] **Step 3: Add `language` to `useAppStore`**

In `src/store/useAppStore.ts`, extend the state. Replace the `AppState` type and store body:
```ts
type ThemeMode = 'light' | 'dark';
type Language = 'en' | 'vi';

type AppState = {
  themeMode: ThemeMode;
  language: Language;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
};
```
Inside the `persist` initializer add:
```ts
      language: 'en',
      setLanguage: (lang: Language) => set({ language: lang }),
```

- [ ] **Step 4: Create `src/i18n/index.ts`**

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';
import en from './locales/en.json';
import vi from './locales/vi.json';
import { useAppStore } from '@store/useAppStore';

export type Language = 'en' | 'vi';

function detectInitialLanguage(): Language {
  const persisted = useAppStore.getState().language;
  if (persisted) return persisted;
  const best = getLocales()[0]?.languageCode;
  return best === 'vi' ? 'vi' : 'en';
}

export function initI18n(): void {
  const lng = detectInitialLanguage();
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, vi: { translation: vi } },
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

export function changeLanguage(lang: Language): void {
  i18n.changeLanguage(lang);
  useAppStore.getState().setLanguage(lang);
}

export default i18n;
```

- [ ] **Step 5: Verify typecheck**

Run: `yarn tsc`
Expected: no errors. (Ensure `resolveJsonModule` is on; `@react-native/typescript-config` enables it. If not, add `"resolveJsonModule": true` to tsconfig.)

- [ ] **Step 6: Commit**

```bash
git add src/i18n src/store/useAppStore.ts
git commit -m "feat: add EN/VI i18n with OS-locale detection"
```

---

## Phase 5 — Cleanup template auth + wire providers

### Task 5.1: Remove auth/template scaffolding

**Files:**
- Remove: see list below

- [ ] **Step 1: Delete unused template files**

```bash
cd ~/Documents/Kite
git rm -r src/screens/auth src/screens/home src/screens/profile \
  src/navigation/AuthNavigator.tsx src/store/useAuthStore.ts \
  src/hooks/useAuth.ts src/api/client.ts src/api/endpoints src/api/queries src/api/types
```

- [ ] **Step 2: Remove auth references in validators**

Replace `src/utils/validators.ts` entire content with:
```ts
import { z } from 'zod';

export const trackerBaseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['habit', 'target', 'average', 'project']),
});

export type TrackerFormData = z.infer<typeof trackerBaseSchema>;
```

- [ ] **Step 3: Verify typecheck fails only where expected**

Run: `yarn tsc`
Expected: errors in `RootNavigator.tsx`, `MainNavigator.tsx`, `navigation/types.ts`, `types/index.ts` (reference deleted auth). These are fixed in Task 5.2.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove template auth/home/profile scaffolding"
```

### Task 5.2: Rewire navigation (no auth, new screens)

**Files:**
- Modify: `src/navigation/types.ts`
- Modify: `src/navigation/RootNavigator.tsx`
- Modify: `src/navigation/MainNavigator.tsx`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Replace `src/navigation/types.ts`**

```ts
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { TrackerType } from '@features/trackers/types';

export type MainTabParamList = {
  Today: undefined;
  Trackers: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  TrackerDetail: { trackerId: string };
  TrackerForm: { trackerId?: string; type: TrackerType };
  TrackerTypePicker: undefined;
};

export type MainTabProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;
export type RootStackProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
```

- [ ] **Step 2: Replace `src/navigation/MainNavigator.tsx`**

```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import type { MainTabParamList } from '@navigation/types';
import { DailyGoalsScreen } from '@screens/today/DailyGoalsScreen';
import { TrackerListScreen } from '@screens/trackers/TrackerListScreen';
import { SettingsScreen } from '@screens/settings/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainNavigator() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Today" component={DailyGoalsScreen} options={{ title: t('tabs.today') }} />
      <Tab.Screen name="Trackers" component={TrackerListScreen} options={{ title: t('tabs.trackers') }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t('tabs.settings') }} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 3: Replace `src/navigation/RootNavigator.tsx`**

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { MainNavigator } from '@navigation/MainNavigator';
import { TrackerDetailScreen } from '@screens/trackers/TrackerDetailScreen';
import { TrackerFormScreen } from '@screens/trackers/TrackerFormScreen';
import { TrackerTypePickerScreen } from '@screens/trackers/TrackerTypePickerScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="MainTabs" component={MainNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="TrackerDetail" component={TrackerDetailScreen} />
        <Stack.Screen name="TrackerForm" component={TrackerFormScreen} />
        <Stack.Screen name="TrackerTypePicker" component={TrackerTypePickerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 4: Clean `src/types/index.ts`**

Replace its content with (remove `User` auth type):
```ts
export type {};
```

- [ ] **Step 5: Wire DB + i18n init in `App.tsx`**

Replace `App.tsx`:
```tsx
import './global.css';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { HeroUINativeProvider } from 'heroui-native';
import { heroUIConfig } from '@theme/index';
import { queryClient } from '@api/queryClient';
import { RootNavigator } from '@navigation/RootNavigator';
import { getDb } from '@features/trackers/db/schema';
import { initI18n } from '@i18n/index';
import { StyleSheet } from 'react-native';

initI18n();

export default function App() {
  useEffect(() => {
    getDb(); // open + migrate on launch
  }, []);
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <HeroUINativeProvider config={heroUIConfig}>
          <RootNavigator />
        </HeroUINativeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
```

- [ ] **Step 6: Verify typecheck**

Run: `yarn tsc`
Expected: errors now only about the not-yet-created screen modules (`@screens/today/...`, etc.). These are created in Phase 6.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: rewire navigation for tracker app, init DB + i18n"
```

---

## Phase 6 — Query hooks, quick-starts, and screens

### Task 6.1: TanStack Query hooks over the repository

**Files:**
- Create: `src/features/trackers/queries/index.ts`

- [ ] **Step 1: Write the hooks**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as repo from '@features/trackers/db/repository';
import type { Tracker, Entry, Milestone } from '@features/trackers/types';

const keys = {
  trackers: ['trackers'] as const,
  tracker: (id: string) => ['tracker', id] as const,
  entries: (id: string) => ['entries', id] as const,
  milestones: (id: string) => ['milestones', id] as const,
};

export function useTrackers() {
  return useQuery({ queryKey: keys.trackers, queryFn: () => repo.listTrackers() });
}
export function useTracker(id: string) {
  return useQuery({ queryKey: keys.tracker(id), queryFn: () => repo.getTracker(id) });
}
export function useEntries(id: string) {
  return useQuery({ queryKey: keys.entries(id), queryFn: () => repo.listEntries(id) });
}
export function useMilestones(id: string) {
  return useQuery({ queryKey: keys.milestones(id), queryFn: () => repo.listMilestones(id) });
}

export function useSaveTracker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Tracker) => repo.insertTracker(t),
    onSuccess: (_d, t) => {
      qc.invalidateQueries({ queryKey: keys.trackers });
      qc.invalidateQueries({ queryKey: keys.tracker(t.id) });
    },
  });
}
export function useDeleteTracker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => repo.deleteTracker(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.trackers }),
  });
}
export function useLogEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: Entry) => repo.insertEntry(e),
    onSuccess: (_d, e) => {
      qc.invalidateQueries({ queryKey: keys.entries(e.trackerId) });
      qc.invalidateQueries({ queryKey: keys.trackers });
    },
  });
}
export function useSaveMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Milestone) => repo.upsertMilestone(m),
    onSuccess: (_d, m) => qc.invalidateQueries({ queryKey: keys.milestones(m.trackerId) }),
  });
}
```

- [ ] **Step 2: Verify typecheck**

Run: `yarn tsc`
Expected: same screen-module errors as before; no new errors in this file.

- [ ] **Step 3: Commit**

```bash
git add src/features/trackers/queries/index.ts
git commit -m "feat: add tanstack query hooks over repository"
```

### Task 6.2: Quick-start suggestions

**Files:**
- Create: `src/features/trackers/quickStarts.ts`

- [ ] **Step 1: Write the suggestions**

```ts
import type { TrackerType, Accumulation, Period } from '@features/trackers/types';

export type QuickStart = {
  key: string;        // i18n key under quickStart.items
  type: TrackerType;
  icon: string;
  color: string;
  unit?: string;
  targetValue?: number;
  accumulation?: Accumulation;
  period?: Period;
};

export const QUICK_STARTS: QuickStart[] = [
  { key: 'water', type: 'average', icon: 'drop', color: 'cyan', unit: 'glasses', targetValue: 8, period: 'daily' },
  { key: 'exercise', type: 'habit', icon: 'dumbbell', color: 'orange', period: 'daily' },
  { key: 'save', type: 'target', icon: 'piggy', color: 'green', unit: '$', targetValue: 1000, accumulation: 'sum' },
  { key: 'read', type: 'target', icon: 'book', color: 'purple', unit: 'books', targetValue: 12, accumulation: 'sum' },
  { key: 'sleep', type: 'average', icon: 'moon', color: 'indigo', unit: 'hours', targetValue: 8, period: 'daily' },
  { key: 'meditate', type: 'habit', icon: 'lotus', color: 'blue', period: 'daily' },
  { key: 'steps', type: 'average', icon: 'walk', color: 'teal', unit: 'steps', targetValue: 10000, period: 'daily' },
  { key: 'weight', type: 'target', icon: 'scale', color: 'pink', unit: 'kg', accumulation: 'latest' },
];
```

- [ ] **Step 2: Add quick-start item labels to locales**

In `en.json` add under `quickStart`: `"items": { "water": "Drink water", "exercise": "Exercise", "save": "Save money", "read": "Read books", "sleep": "Sleep well", "meditate": "Meditate", "steps": "Walk", "weight": "Track weight" }`.
In `vi.json` add: `"items": { "water": "Uống nước", "exercise": "Tập thể dục", "save": "Tiết kiệm tiền", "read": "Đọc sách", "sleep": "Ngủ đủ giấc", "meditate": "Thiền", "steps": "Đi bộ", "weight": "Theo dõi cân nặng" }`.

- [ ] **Step 3: Verify typecheck**

Run: `yarn tsc`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/trackers/quickStarts.ts src/i18n/locales
git commit -m "feat: add quick-start suggestions and labels"
```

### Task 6.3: Reusable components — PaceBar, TrackerCard, HistoryChart, MilestoneList

**Files:**
- Create: `src/features/trackers/components/PaceBar.tsx`
- Create: `src/features/trackers/components/TrackerCard.tsx`
- Create: `src/features/trackers/components/HistoryChart.tsx`
- Create: `src/features/trackers/components/MilestoneList.tsx`

> These are visual components. Build with HeroUI Native primitives. Use the
> `heroui-native` skill (`/heroui-native`) for exact component APIs — note the
> compound-component patterns in CLAUDE.md (Button has no isLoading, Card uses
> Card.Header/Body, etc.).

- [ ] **Step 1: `PaceBar.tsx`** — progress bar colored by `paceStatus`

```tsx
import { View } from 'react-native';
import { Text } from 'heroui-native';
import type { PaceStatus } from '@features/trackers/types';

const COLOR: Record<PaceStatus, string> = {
  on_track: '#22c55e', ahead: '#16a34a', behind: '#ef4444', none: '#3b82f6',
};

export function PaceBar({ percent, paceStatus, label }: { percent: number; paceStatus: PaceStatus; label?: string }) {
  const pct = Math.max(0, Math.min(1, percent));
  return (
    <View>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: COLOR[paceStatus] }} />
      </View>
      {label ? <Text className="text-xs mt-1">{label}</Text> : null}
    </View>
  );
}
```

- [ ] **Step 2: `TrackerCard.tsx`** — name + mini progress + pace dot; uses a calculator

```tsx
import { Pressable, View } from 'react-native';
import { Card, Text } from 'heroui-native';
import type { Tracker, Entry, Milestone } from '@features/trackers/types';
import { calculateHabit, calculateTarget, calculateAverage, calculateProject } from '@features/trackers/calculators';
import { toISODate } from '@utils/date';
import { PaceBar } from './PaceBar';

export function progressFor(t: Tracker, entries: Entry[], milestones: Milestone[]) {
  const today = toISODate(new Date());
  switch (t.type) {
    case 'habit': return calculateHabit(t, entries, today);
    case 'target': return calculateTarget(t, entries, today);
    case 'average': return calculateAverage(t, entries, today);
    case 'project': return calculateProject(t, milestones, today);
  }
}

export function TrackerCard({ tracker, entries, milestones, onPress }: {
  tracker: Tracker; entries: Entry[]; milestones: Milestone[]; onPress: () => void;
}) {
  const p = progressFor(tracker, entries, milestones);
  return (
    <Pressable onPress={onPress}>
      <Card>
        <Card.Body>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text>{tracker.name}</Text>
            <Text className="text-xs">{Math.round(p.percent * 100)}%</Text>
          </View>
          <PaceBar percent={p.percent} paceStatus={p.paceStatus} />
        </Card.Body>
      </Card>
    </Pressable>
  );
}
```

- [ ] **Step 3: `HistoryChart.tsx`** — line chart of entries over time

```tsx
import { LineChart } from 'react-native-gifted-charts';
import type { Entry } from '@features/trackers/types';

export function HistoryChart({ entries }: { entries: Entry[] }) {
  const data = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => ({ value: e.value, label: e.date.slice(5) }));
  if (data.length === 0) return null;
  return <LineChart data={data} areaChart curved thickness={2} hideRules />;
}
```

- [ ] **Step 4: `MilestoneList.tsx`** — milestones with progress sliders

```tsx
import { View } from 'react-native';
import { Text, Slider } from 'heroui-native';
import type { Milestone } from '@features/trackers/types';

export function MilestoneList({ milestones, onChange }: {
  milestones: Milestone[]; onChange: (m: Milestone, value: number) => void;
}) {
  return (
    <View>
      {milestones.map(m => (
        <View key={m.id} style={{ marginVertical: 8 }}>
          <Text>{m.title}</Text>
          <Slider value={m.progress} minValue={0} maxValue={1} step={0.05}
            onChange={(v: number) => onChange(m, v)} />
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 5: Verify typecheck**

Run: `yarn tsc`
Expected: no new errors in these files. (If `Slider` prop names differ, confirm via `/heroui-native` skill and adjust.)

- [ ] **Step 6: Commit**

```bash
git add src/features/trackers/components
git commit -m "feat: add PaceBar, TrackerCard, HistoryChart, MilestoneList"
```

### Task 6.4: TrackerTypePicker + TrackerForm screens

**Files:**
- Create: `src/screens/trackers/TrackerTypePickerScreen.tsx`
- Create: `src/screens/trackers/TrackerFormScreen.tsx`

- [ ] **Step 1: `TrackerTypePickerScreen.tsx`** — pick one of 4 types → navigate to form

```tsx
import { View } from 'react-native';
import { Button } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import type { RootStackProps } from '@navigation/types';
import type { TrackerType } from '@features/trackers/types';

const TYPES: TrackerType[] = ['habit', 'target', 'average', 'project'];

export function TrackerTypePickerScreen({ navigation }: RootStackProps<'TrackerTypePicker'>) {
  const { t } = useTranslation();
  return (
    <View style={{ padding: 16, gap: 12 }}>
      {TYPES.map(type => (
        <Button key={type} variant="secondary" onPress={() => navigation.replace('TrackerForm', { type })}>
          <Button.Label>{t(`types.${type}`)}</Button.Label>
        </Button>
      ))}
    </View>
  );
}
```

- [ ] **Step 2: `TrackerFormScreen.tsx`** — dynamic form per type, save via hook

```tsx
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, TextField, Label, Input } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import type { RootStackProps } from '@navigation/types';
import type { Tracker } from '@features/trackers/types';
import { useSaveTracker } from '@features/trackers/queries';
import { toISODate } from '@utils/date';

function uuid(): string {
  return 'xxxxxxxxyxxxx'.replace(/[xy]/g, c => {
    const r = (Date.now() + Math.floor(Math.random() * 1e9)) % 16;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  }) + Date.now().toString(16);
}

export function TrackerFormScreen({ route, navigation }: RootStackProps<'TrackerForm'>) {
  const { type } = route.params;
  const { t } = useTranslation();
  const save = useSaveTracker();
  const [name, setName] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');

  const onSave = () => {
    const tracker: Tracker = {
      id: uuid(), name: name.trim() || t(`types.${type}`), type,
      icon: 'star', color: 'blue', unit: unit || null, direction: type === 'habit' ? 'good' : null,
      targetValue: targetValue ? Number(targetValue) : null,
      startValue: type === 'target' ? 0 : null,
      accumulation: type === 'target' ? 'sum' : null,
      startDate: toISODate(new Date()), deadline: null,
      period: type === 'average' || type === 'habit' ? 'daily' : null,
      repeatDays: type === 'habit' ? [0,1,2,3,4,5,6] : null,
      createdAt: new Date().toISOString(), archived: false,
    };
    save.mutate(tracker, { onSuccess: () => navigation.navigate('MainTabs') });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <TextField>
        <Label><Label.Text>{t('form.name')}</Label.Text></Label>
        <Input value={name} onChangeText={setName} placeholder={t(`types.${type}`)} />
      </TextField>
      {(type === 'target' || type === 'average') && (
        <>
          <TextField>
            <Label><Label.Text>{t('form.targetValue')}</Label.Text></Label>
            <Input value={targetValue} onChangeText={setTargetValue} keyboardType="numeric" />
          </TextField>
          <TextField>
            <Label><Label.Text>{t('form.unit')}</Label.Text></Label>
            <Input value={unit} onChangeText={setUnit} />
          </TextField>
        </>
      )}
      <Button variant="primary" isDisabled={save.isPending} onPress={onSave}>
        <Button.Label>{t('form.save')}</Button.Label>
      </Button>
    </ScrollView>
  );
}
```

> NOTE: Full per-type fields (deadline picker, accumulation toggle, period
> select, milestone editor) are layered in once the basic save flow runs. This
> task delivers a working create flow for all 4 types; richer fields are a
> follow-up task tracked in §Open Items.

- [ ] **Step 3: Verify typecheck**

Run: `yarn tsc`
Expected: no new errors in these two files.

- [ ] **Step 4: Commit**

```bash
git add src/screens/trackers/TrackerTypePickerScreen.tsx src/screens/trackers/TrackerFormScreen.tsx
git commit -m "feat: add tracker type picker and create form"
```

### Task 6.5: DailyGoals, TrackerList, TrackerDetail, Settings screens

**Files:**
- Create: `src/screens/today/DailyGoalsScreen.tsx`
- Create: `src/screens/trackers/TrackerListScreen.tsx`
- Create: `src/screens/trackers/TrackerDetailScreen.tsx`
- Create: `src/screens/settings/SettingsScreen.tsx`

- [ ] **Step 1: `TrackerListScreen.tsx`** — list all trackers, FAB → type picker, empty → quick-starts

```tsx
import { FlatList, Pressable, View } from 'react-native';
import { Button, Text } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { useTrackers, useSaveTracker } from '@features/trackers/queries';
import { QUICK_STARTS } from '@features/trackers/quickStarts';
import { TrackerCard } from '@features/trackers/components/TrackerCard';
import { toISODate } from '@utils/date';
import type { Tracker } from '@features/trackers/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TrackerListScreen() {
  const nav = useNavigation<Nav>();
  const { t } = useTranslation();
  const { data: trackers = [] } = useTrackers();
  const save = useSaveTracker();

  const addQuickStart = (qs: typeof QUICK_STARTS[number]) => {
    const tr: Tracker = {
      id: `${qs.key}-${Date.now()}`, name: t(`quickStart.items.${qs.key}`), type: qs.type,
      icon: qs.icon, color: qs.color, unit: qs.unit ?? null, direction: qs.type === 'habit' ? 'good' : null,
      targetValue: qs.targetValue ?? null, startValue: qs.type === 'target' ? 0 : null,
      accumulation: qs.accumulation ?? (qs.type === 'target' ? 'sum' : null),
      startDate: toISODate(new Date()), deadline: null, period: qs.period ?? null,
      repeatDays: qs.type === 'habit' ? [0,1,2,3,4,5,6] : null,
      createdAt: new Date().toISOString(), archived: false,
    };
    save.mutate(tr);
  };

  if (trackers.length === 0) {
    return (
      <View style={{ padding: 16, gap: 12 }}>
        <Text className="text-lg font-semibold">{t('quickStart.heading')}</Text>
        {QUICK_STARTS.map(qs => (
          <Button key={qs.key} variant="secondary" onPress={() => addQuickStart(qs)}>
            <Button.Label>{t(`quickStart.items.${qs.key}`)}</Button.Label>
          </Button>
        ))}
        <Button variant="primary" onPress={() => nav.navigate('TrackerTypePicker')}>
          <Button.Label>{t('form.create')}</Button.Label>
        </Button>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={trackers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TrackerCard tracker={item} entries={[]} milestones={[]}
            onPress={() => nav.navigate('TrackerDetail', { trackerId: item.id })} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
      <Button variant="primary" onPress={() => nav.navigate('TrackerTypePicker')}>
        <Button.Label>{t('form.create')}</Button.Label>
      </Button>
    </View>
  );
}
```

- [ ] **Step 2: `DailyGoalsScreen.tsx`** — trackers due today + quick log

```tsx
import { FlatList, View } from 'react-native';
import { Text, Button } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import { useTrackers, useLogEntry } from '@features/trackers/queries';
import { toISODate, weekdayOf } from '@utils/date';
import type { Tracker } from '@features/trackers/types';

function isDueToday(t: Tracker, todayISO: string): boolean {
  if (t.type === 'habit' && t.repeatDays && t.repeatDays.length) {
    return t.repeatDays.includes(weekdayOf(todayISO));
  }
  return true;
}

export function DailyGoalsScreen() {
  const { t } = useTranslation();
  const today = toISODate(new Date());
  const { data: trackers = [] } = useTrackers();
  const log = useLogEntry();
  const due = trackers.filter(tr => isDueToday(tr, today));

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text className="text-xl font-bold">{t('today.title')}</Text>
      {due.length === 0 ? (
        <Text className="mt-4">{t('today.empty')}</Text>
      ) : (
        <FlatList
          data={due}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text>{item.name}</Text>
              <Button variant="secondary"
                onPress={() => log.mutate({ id: `${item.id}-${today}`, trackerId: item.id, date: today, value: 1, note: null })}>
                <Button.Label>✓</Button.Label>
              </Button>
            </View>
          )}
        />
      )}
    </View>
  );
}
```

- [ ] **Step 3: `TrackerDetailScreen.tsx`** — pace bar + stats + history chart

```tsx
import { ScrollView, View } from 'react-native';
import { Text } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import type { RootStackProps } from '@navigation/types';
import { useTracker, useEntries, useMilestones } from '@features/trackers/queries';
import { progressFor } from '@features/trackers/components/TrackerCard';
import { PaceBar } from '@features/trackers/components/PaceBar';
import { HistoryChart } from '@features/trackers/components/HistoryChart';

export function TrackerDetailScreen({ route }: RootStackProps<'TrackerDetail'>) {
  const { trackerId } = route.params;
  const { t } = useTranslation();
  const { data: tracker } = useTracker(trackerId);
  const { data: entries = [] } = useEntries(trackerId);
  const { data: milestones = [] } = useMilestones(trackerId);
  if (!tracker) return null;
  const p = progressFor(tracker, entries, milestones);
  const paceLabel =
    p.paceStatus === 'behind' ? t('detail.behind')
    : p.paceStatus === 'ahead' ? t('detail.ahead')
    : p.paceStatus === 'on_track' ? t('detail.onTrack') : '';

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text className="text-xl font-bold">{tracker.name}</Text>
      <PaceBar percent={p.percent} paceStatus={p.paceStatus} label={paceLabel} />
      {p.streak !== undefined && <Text>{t('detail.streak')}: {p.streak}</Text>}
      {p.successRate !== undefined && <Text>{t('detail.successRate')}: {Math.round(p.successRate * 100)}%</Text>}
      <Text className="font-semibold">{t('detail.history')}</Text>
      <HistoryChart entries={entries} />
    </ScrollView>
  );
}
```

- [ ] **Step 4: `SettingsScreen.tsx`** — theme + language + clear data

```tsx
import { View } from 'react-native';
import { Button, Text } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@store/useAppStore';
import { changeLanguage } from '@i18n/index';

export function SettingsScreen() {
  const { t } = useTranslation();
  const themeMode = useAppStore(s => s.themeMode);
  const toggleTheme = useAppStore(s => s.toggleTheme);
  const language = useAppStore(s => s.language);

  return (
    <View style={{ padding: 16, gap: 16 }}>
      <Text className="text-xl font-bold">{t('tabs.settings')}</Text>
      <View style={{ gap: 8 }}>
        <Text>{t('settings.theme')}: {themeMode}</Text>
        <Button variant="secondary" onPress={toggleTheme}><Button.Label>{t('settings.theme')}</Button.Label></Button>
      </View>
      <View style={{ gap: 8 }}>
        <Text>{t('settings.language')}: {language}</Text>
        <Button variant={language === 'en' ? 'primary' : 'secondary'} onPress={() => changeLanguage('en')}>
          <Button.Label>{t('settings.english')}</Button.Label>
        </Button>
        <Button variant={language === 'vi' ? 'primary' : 'secondary'} onPress={() => changeLanguage('vi')}>
          <Button.Label>{t('settings.vietnamese')}</Button.Label>
        </Button>
      </View>
    </View>
  );
}
```

- [ ] **Step 5: Verify full typecheck passes**

Run: `yarn tsc`
Expected: NO errors (all referenced modules now exist).

- [ ] **Step 6: Run all tests**

Run: `yarn test`
Expected: PASS — calculator (16), date (5), repository (3) suites green.

- [ ] **Step 7: Commit**

```bash
git add src/screens
git commit -m "feat: add Today, Trackers list, Detail, and Settings screens"
```

---

## Phase 7 — Run on device & smoke test

### Task 7.1: Build & launch

- [ ] **Step 1: Start Metro**

Run: `yarn start:reset`

- [ ] **Step 2: Run iOS**

Run: `yarn ios`
Expected: app launches to the Trackers tab showing quick-start suggestions (empty state).

- [ ] **Step 3: Smoke test the core flow**

Manually verify:
1. Tap a quick-start (e.g. "Drink water") → tracker appears in the list.
2. Open Today tab → tracker shows; tap ✓ → no crash.
3. Open the tracker → detail shows pace bar + history.
4. Settings → switch language to Tiếng Việt → tab labels and titles change live.
5. Settings → toggle theme.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: device smoke-test adjustments"
```

---

## Open Items (post-MVP follow-ups, tracked but out of this plan)

- Richer TrackerForm: deadline date picker, accumulation sum/latest toggle UI,
  period select, repeat-day picker, milestone editor for Project.
- Quick-log number input for target/average on Today (currently ✓ logs value 1).
- Reminders via `@notifee/react-native` (schedule per-tracker notifications).
- Haptic feedback on habit tick (`react-native-haptic-feedback`).
- Export/clear data actions in Settings.
- Calendar heatmap for habits; Gantt for projects.
- Dark-mode color tokens for PaceBar via Uniwind theme variables (currently hardcoded hex; `#e5e7eb` track looks wrong in dark mode).
- Wire MilestoneList + useSaveMilestone into TrackerDetail (component built but not yet reachable).
- Move `progressFor` out of components/TrackerCard.tsx into a domain module (e.g. calculators) — currently screens import a pure dispatcher from a component file.
- Loading/error states for queries (TrackerDetail returns null on missing tracker; a real DB read failure is currently invisible).
- TrackerList cards compute progress from empty entries/milestones (show 0% until opened) — load real per-tracker data or precompute progress in the list query.

---

## Self-Review Notes

- **Spec coverage:** types ✓, 4 calculators with pace line ✓ (Tasks 2.1–2.4),
  SQLite 3-table schema ✓ (3.1), repository ✓ (3.2), TanStack-Query-over-SQLite
  ✓ (6.1), i18n EN/VI + OS detection + MMKV persistence ✓ (4.1), all 5 screen
  groups ✓ (6.4–6.5), quick-start empty state ✓ (6.2/6.5), Target accumulation
  sum/latest ✓ (2.1 logic; full UI toggle deferred to Open Items), no-auth
  cleanup ✓ (5.1–5.2). Reminders/haptics intentionally deferred (Open Items) —
  spec lists them in stack but they are not MVP-blocking; flagged explicitly.
- **Type consistency:** `TrackerProgress`, `Tracker`, `Entry`, `Milestone`,
  `PaceStatus`, `Accumulation` used consistently across calculators, repository,
  queries, components, screens. Calculator names match the barrel.
- **No silent caps:** deferred items are listed in Open Items, not hidden.
