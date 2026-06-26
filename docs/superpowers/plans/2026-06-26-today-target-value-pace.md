# Today Target/Average Value+Pace Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the +/− stepper on Today's `target`/`average` cards with a read-only value + colored pace line, change the sub-line to `Goal: 30K by 29 Nov 2026`, and open the existing numeric log sheet on tap.

**Architecture:** Add an `expected` field to `TrackerProgress`, populated by `calculateTarget` (linear timeline interpolation). Add a `fmtCompact` number helper. Rework `LogRow` in `DailyGoalsScreen` so target/average render a value+pace `Pressable` that calls back to a single shared `LogEntryModal` owned by the screen.

**Tech Stack:** React Native CLI, HeroUI Native (Typography), Uniwind (Tailwind className), TanStack Query hooks, Jest, i18next (en/vi).

## Global Constraints

- Use `<Typography>` from `heroui-native`, never `<Text>`.
- Style with Tailwind `className`, never inline `style={{…}}` (the only exception in touched code is the existing runtime tint `style={{ backgroundColor: hexA(...) }}` — leave it).
- Never interpolate a value into a class string. Branch whole literal classes; for pace color use a `Record<PaceStatus, string>` lookup of literal classes.
- Icons only from `lucide-react-native` (via `Icons.*`).
- Overlays use HeroUI `BottomSheet` — `LogEntryModal` already does; reuse it, do not build a new modal.
- Visible strings via `t('key')`; keep `en.json` and `vi.json` key-for-key.
- `yarn tsc` must be clean. op-sqlite is mocked in Jest — do NOT unit-test DB/hook code; only the pure calculator + formatter are unit-tested.
- TDD: failing test first for pure-logic tasks.

---

### Task 1: `fmtCompact` number formatter

**Files:**
- Modify: `src/features/trackers/detailFormat.ts`
- Test: `src/features/trackers/__tests__/detailFormat.test.ts` (create)

**Interfaces:**
- Consumes: existing `fmtNum` in the same file.
- Produces: `export function fmtCompact(n: number | null | undefined): string`
  — `<1000` → `fmtNum(n)`; `>=1000` → `{x}K`; `>=1_000_000` → `{x}M`; max one
  decimal, trailing `.0` stripped.

- [ ] **Step 1: Write the failing test**

Create `src/features/trackers/__tests__/detailFormat.test.ts`:

```ts
import { fmtCompact } from '../detailFormat'

describe('fmtCompact', () => {
  test('small numbers pass through', () => {
    expect(fmtCompact(0)).toBe('0')
    expect(fmtCompact(7.5)).toBe('7.5')
    expect(fmtCompact(850)).toBe('850')
  })
  test('thousands use K', () => {
    expect(fmtCompact(1000)).toBe('1K')
    expect(fmtCompact(30000)).toBe('30K')
    expect(fmtCompact(999000)).toBe('999K')
    expect(fmtCompact(1500)).toBe('1.5K')
  })
  test('millions use M', () => {
    expect(fmtCompact(1000000)).toBe('1M')
    expect(fmtCompact(3000000)).toBe('3M')
    expect(fmtCompact(1500000)).toBe('1.5M')
  })
  test('nullish → 0', () => {
    expect(fmtCompact(null)).toBe('0')
    expect(fmtCompact(undefined)).toBe('0')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/features/trackers/__tests__/detailFormat.test.ts`
Expected: FAIL — `fmtCompact is not a function` / not exported.

- [ ] **Step 3: Implement `fmtCompact`**

Append to `src/features/trackers/detailFormat.ts` (after `fmtNum`):

```ts
/** Compact number: 1000→1K, 30000→30K, 3_000_000→3M, 1_500_000→1.5M. */
export function fmtCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '0'
  const abs = Math.abs(n)
  if (abs < 1000) return fmtNum(n)
  const [div, suffix] = abs < 1_000_000 ? [1000, 'K'] : [1_000_000, 'M']
  const scaled = n / div
  const rounded = Math.round(scaled * 10) / 10
  // strip a trailing .0 (2.0 → "2"), keep one decimal otherwise (1.5 → "1.5")
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded)
  return `${text}${suffix}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/features/trackers/__tests__/detailFormat.test.ts`
Expected: PASS (all 4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/trackers/detailFormat.ts src/features/trackers/__tests__/detailFormat.test.ts
git commit -m "feat(format): fmtCompact (1K/30K/3M/1.5M) for Today value display"
```

---

### Task 2: `expected` field on `TrackerProgress` + `calculateTarget`

**Files:**
- Modify: `src/features/trackers/types.ts:49-56` (add field)
- Modify: `src/features/trackers/calculators/target.ts`
- Test: `src/features/trackers/calculators/__tests__/target.test.ts`

**Interfaces:**
- Consumes: existing `calculateTarget(tracker, entries, todayISO)`.
- Produces: `TrackerProgress.expected?: number | null` — for target with a
  deadline, `start + span * timeFrac` (value you should have reached today);
  `null` when no deadline or `total <= 0`.

- [ ] **Step 1: Write the failing test**

Append to `src/features/trackers/calculators/__tests__/target.test.ts` (inside the `describe('calculateTarget', …)` block):

```ts
  test('expected = linear timeline interpolation (start 0, goal 2000, midpoint)', () => {
    // 2026-01-01 → 2026-12-31 is 364 days; 2026-07-02 ≈ day 182 (~half)
    const p = calculateTarget(base, [entry('2026-01-02', 100)], '2026-07-02')
    // expected ≈ 0 + 2000 * (182/364) = 1000 (allow ±20 for day rounding)
    expect(p.expected).not.toBeNull()
    expect(p.expected!).toBeGreaterThan(960)
    expect(p.expected!).toBeLessThan(1040)
  })

  test('expected respects startValue (non-zero start)', () => {
    const t = { ...base, startValue: 1000, targetValue: 2000 }
    const p = calculateTarget(t, [], '2026-07-02')
    // start 1000, span 1000, ~half → ~1500
    expect(p.expected!).toBeGreaterThan(1460)
    expect(p.expected!).toBeLessThan(1540)
  })

  test('expected is null with no deadline', () => {
    const t = { ...base, deadline: null }
    const p = calculateTarget(t, [entry('2026-01-02', 100)], '2026-01-03')
    expect(p.expected).toBeNull()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/features/trackers/calculators/__tests__/target.test.ts`
Expected: FAIL — `p.expected` is `undefined`, assertions fail.

- [ ] **Step 3: Add the field to the type**

In `src/features/trackers/types.ts`, extend `TrackerProgress`:

```ts
export type TrackerProgress = {
  current: number
  goal: number
  percent: number // 0..1
  paceStatus: PaceStatus
  streak?: number
  successRate?: number // 0..1
  expected?: number | null // value you should have reached by today (timeline)
}
```

- [ ] **Step 4: Compute `expected` in `calculateTarget`**

In `src/features/trackers/calculators/target.ts`, add an `expected` variable and
set it inside the deadline branch, then include it in the return:

```ts
  let paceStatus: TrackerProgress['paceStatus'] = 'none'
  let expected: number | null = null
  if (tracker.deadline) {
    const total = daysBetween(tracker.startDate, tracker.deadline)
    if (total <= 0) {
      paceStatus = 'none'
    } else {
      const elapsed = Math.max(
        0,
        Math.min(total, daysBetween(tracker.startDate, todayISO))
      )
      const timeFrac = elapsed / total
      expected = start + span * timeFrac
      const madeFrac = span === 0 ? 1 : (current - start) / span
      if (madeFrac >= timeFrac + AHEAD_MARGIN) paceStatus = 'ahead'
      else if (madeFrac >= timeFrac) paceStatus = 'on_track'
      else paceStatus = 'behind'
    }
  }

  return { current, goal, percent, paceStatus, expected }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn test src/features/trackers/calculators/__tests__/target.test.ts`
Expected: PASS (all existing + 3 new tests).

- [ ] **Step 6: Run tsc**

Run: `yarn tsc`
Expected: clean (no errors).

- [ ] **Step 7: Commit**

```bash
git add src/features/trackers/types.ts src/features/trackers/calculators/target.ts src/features/trackers/calculators/__tests__/target.test.ts
git commit -m "feat(target): add expected (timeline value) to TrackerProgress"
```

---

### Task 3: i18n keys for value/pace card

**Files:**
- Modify: `src/i18n/locales/en.json` (under `today`)
- Modify: `src/i18n/locales/vi.json` (under `today`)

**Interfaces:**
- Produces: i18n keys `today.goalBy`, `today.goal`, `today.pace`, `today.avg`,
  `today.targetIs`, each with `{{value}}` (and `{{date}}` for `goalBy`).

- [ ] **Step 1: Add keys to en.json**

In `src/i18n/locales/en.json`, inside the `"today"` object (e.g. after `"missedDays"`), add:

```json
    "goalBy": "Goal: {{value}} by {{date}}",
    "goal": "Goal: {{value}}",
    "pace": "Pace: {{value}}",
    "avg": "Avg: {{value}}",
    "targetIs": "Target: {{value}}"
```

- [ ] **Step 2: Add the same keys to vi.json**

In `src/i18n/locales/vi.json`, inside the `"today"` object at the matching place, add:

```json
    "goalBy": "Mục tiêu: {{value}} trước {{date}}",
    "goal": "Mục tiêu: {{value}}",
    "pace": "Nhịp: {{value}}",
    "avg": "TB: {{value}}",
    "targetIs": "Mục tiêu: {{value}}"
```

- [ ] **Step 3: Verify JSON parses & keys are in sync**

Run:
```bash
node -e "const e=require('./src/i18n/locales/en.json'),v=require('./src/i18n/locales/vi.json');const k=['goalBy','goal','pace','avg','targetIs'];for(const x of k){if(!e.today[x]||!v.today[x])throw new Error('missing '+x);}console.log('ok')"
```
Expected: prints `ok`.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/vi.json
git commit -m "i18n: Today goal/pace/avg lines for target & average cards (en+vi)"
```

---

### Task 4: Today — value+pace card replaces stepper, shared log sheet

**Files:**
- Modify: `src/screens/today/DailyGoalsScreen.tsx`

**Interfaces:**
- Consumes: `fmtCompact` (Task 1), `TrackerProgress.expected` (Task 2), i18n keys
  (Task 3), existing `calculateTarget`/`calculateAverage`, `LogEntryModal`,
  `useEntries`, `useLogEntry`, `PaceBar`'s color tokens (`text-pace-*`).
- Produces: `LogRow` renders a value+pace `Pressable` for target/average and calls
  `onQuickLog(tracker)`; `DailyGoalsScreen` owns one `LogEntryModal` driven by
  `logTarget` state.

Note: this task is UI wired to mocked native modules → not unit-tested. Verify with
`yarn tsc` + on-device per CLAUDE.md.

- [ ] **Step 1: Add imports**

At the top of `src/screens/today/DailyGoalsScreen.tsx`, add the calculator,
formatter, pace color lookup, and modal imports. Update the existing import lines:

```tsx
import { calculateTarget } from '@features/trackers/calculators/target'
import { calculateAverage } from '@features/trackers/calculators/average'
import { fmtCompact } from '@features/trackers/detailFormat'
import { LogEntryModal } from '@features/trackers/components/LogEntryModal'
import type { PaceStatus, TrackerProgress } from '@features/trackers/types'
```

(Keep existing `Tracker, Entry` type import; merge `PaceStatus, TrackerProgress`
into it or add a second `import type` line — both compile.)

- [ ] **Step 2: Add pace color lookup + deadline formatter (module scope)**

Below the existing `STREAK_KEY` map (module scope, before `type Row`), add:

```tsx
// Pace line color by status (literal classes — never interpolate).
const PACE_TEXT_CLASS: Record<PaceStatus, string> = {
  on_track: 'text-pace-on',
  behind: 'text-pace-behind',
  ahead: 'text-pace-ahead',
  none: 'text-ink-2'
}

/** Deadline as "29 Nov 2026" in the active locale. */
function fmtDeadline(iso: string, lang: string): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}
```

- [ ] **Step 3: Give `LogRow` an `onQuickLog` prop and use `i18n`**

Change `LogRow`'s signature and pull `i18n` from `useTranslation`:

```tsx
function LogRow({
  row,
  today,
  onLog,
  onOpen,
  onQuickLog
}: {
  row: Row
  today: string
  onLog: (e: Entry) => void
  onOpen: (id: string) => void
  onQuickLog: (tracker: Tracker) => void
}) {
  const { t, i18n } = useTranslation()
```

- [ ] **Step 4: Compute progress + rewrite the target/average sub-line**

Inside `LogRow`, after `const entryId = ...`, compute progress for value-typed
trackers (reuse the already-fetched `allEntries`):

```tsx
  const progress: TrackerProgress | null =
    tracker.type === 'target'
      ? calculateTarget(tracker, allEntries, today)
      : tracker.type === 'average'
      ? calculateAverage(tracker, allEntries, today)
      : null
```

Then replace the sub-line block for `target`/`average`. Find the existing
`else if (tracker.type === 'average')` / `else` branches that build `subText` and
replace the whole non-habit portion with:

```tsx
  // Sub-line text per type.
  let subText: string
  if (tracker.type === 'habit') {
    const period = tracker.period ?? 'daily'
    subText = period.charAt(0).toUpperCase() + period.slice(1)
  } else if (tracker.type === 'average') {
    const u = tracker.unit ? ` ${tracker.unit}` : ''
    subText = t('today.targetIs', {
      value: `${fmtCompact(tracker.targetValue ?? 0)}${u}`
    })
  } else {
    // target
    const u = tracker.unit ? ` ${tracker.unit}` : ''
    const goalVal = `${fmtCompact(tracker.targetValue ?? 0)}${u}`
    subText = tracker.deadline
      ? t('today.goalBy', {
          value: goalVal,
          date: fmtDeadline(tracker.deadline, i18n.language)
        })
      : t('today.goal', { value: goalVal })
  }
```

(`project` falls into the `else` too, but project rows show the chevron and their
sub-line is unchanged in practice — projects keep showing the goal line, which is
acceptable. If a project has no targetValue it reads `Goal: 0`. Leave as-is per spec
scope; only target/average were in scope and project already used the numeric
`subText` before.)

- [ ] **Step 5: Replace the stepper with the value+pace block**

In `renderControl()`, replace the entire `// target / average → stepper` section
(the `const step = quickStep(tracker)` through the closing `</View>` stepper JSX)
with a value+pace `Pressable`:

```tsx
    // target / average → read-only value + pace, tap opens the log sheet
    const isAverage = tracker.type === 'average'
    const bigValue = isAverage
      ? fmtCompact(todayLog) // average shows today's logged value
      : fmtCompact(progress?.current ?? 0) // target shows accumulated current
    const paceStatus: PaceStatus = progress?.paceStatus ?? 'none'
    // average → "Avg: <cumulative avg>"; target → "Pace: <expected>" (hidden if none)
    const paceLine = isAverage
      ? t('today.avg', { value: fmtCompact(progress?.current ?? 0) })
      : progress?.expected != null
      ? t('today.pace', { value: fmtCompact(progress.expected) })
      : null
    return (
      <Pressable
        onPress={() => onQuickLog(tracker)}
        className='items-end min-w-[78px] py-s1'
      >
        <Typography className='text-2xl font-extrabold text-brand-ink'>
          {bigValue}
        </Typography>
        {paceLine ? (
          <Typography className={`text-sm font-semibold ${PACE_TEXT_CLASS[paceStatus]}`}>
            {paceLine}
          </Typography>
        ) : null}
      </Pressable>
    )
```

Then delete the now-unused `quickStep` function (module scope, ~lines 44-50) and
the local `fmtNum` ONLY IF it's no longer referenced — the habit ring still uses
`fmtNum(todayLog)` in the stepper-less control? No: the habit branch uses
`{n}/{goal}` (plain), and the stepper used `fmtNum`. After removing the stepper,
search for remaining `fmtNum(` usages in this file:

Run: `grep -n "fmtNum\|quickStep" src/screens/today/DailyGoalsScreen.tsx`

If `fmtNum` has zero remaining uses, delete its definition; if `quickStep` has zero
uses, delete it. (Expected: both become unused → delete both.)

- [ ] **Step 6: Add shared log-sheet state + render the modal in `DailyGoalsScreen`**

At the top of `DailyGoalsScreen`, add state (import `useState` from `react`):

```tsx
  const [logTarget, setLogTarget] = useState<Tracker | null>(null)
```

Pass `onQuickLog={setLogTarget}` to every `<LogRow .../>` (all three sections:
dueRows, missed, completed).

Render one `LogEntryModal` just before the final closing `</View>` of the returned
tree (after `</ScrollView>`):

```tsx
      {logTarget ? (
        <LogEntryModal
          tracker={logTarget}
          defaultDate={today}
          visible={!!logTarget}
          onClose={() => setLogTarget(null)}
          onSave={(e) => {
            onLog(e)
            setLogTarget(null)
          }}
        />
      ) : null}
```

- [ ] **Step 7: Type check**

Run: `yarn tsc`
Expected: clean. (If `PaceStatus`/`TrackerProgress` import is duplicated, dedupe.)

- [ ] **Step 8: Lint the touched file**

Run: `yarn lint src/screens/today/DailyGoalsScreen.tsx`
Expected: no errors (no `no-inline-styles`, no unused vars — confirms `quickStep`/`fmtNum` removed if unused).

- [ ] **Step 9: Commit**

```bash
git add src/screens/today/DailyGoalsScreen.tsx
git commit -m "feat(today): target/average show value+pace, tap opens log sheet"
```

---

### Task 5: Manual verification on simulator

**Files:** none (verification only).

- [ ] **Step 1: Run the app**

Run: `yarn ios`
Expected: builds and launches.

- [ ] **Step 2: Verify on Today**

Confirm:
- A target (e.g. "Save Money") shows sub-line `Goal: 100K by 28 Mar 2027` and a
  right-aligned big value with a `Pace: …` line colored green/red (red when behind).
- A target with no deadline shows `Goal: <value>` and NO pace line.
- An average (e.g. "Sleep") shows `Target: <value>` sub-line, big value = today's
  log, and `Avg: <number>` line colored by status.
- Tapping the value+pace block opens the numeric log BottomSheet; saving a value
  updates the card (current/avg/pace recompute).
- Habit ring and project chevron are unchanged.
- Switch language to Vietnamese in Settings → lines read `Mục tiêu:`, `Nhịp:`, `TB:`.

- [ ] **Step 3: Final full test + tsc**

Run: `yarn test && yarn tsc`
Expected: all tests pass, tsc clean.

---

## Self-Review Notes

- **Spec coverage:** fmtCompact (Task 1) ✓; `expected` field + calculateTarget (Task 2) ✓; sub-line `Goal: … by …` / `Goal: …` / average `Target: …` (Task 4 step 4) ✓; value+pace block, tap-to-log, hide pace when `none`, average `Avg:` line (Task 4 step 5) ✓; shared LogEntryModal (Task 4 step 6) ✓; i18n en/vi (Task 3) ✓.
- **Placeholder scan:** all steps contain real code/commands.
- **Type consistency:** `fmtCompact`, `expected?: number | null`, `onQuickLog(tracker: Tracker)`, `PACE_TEXT_CLASS: Record<PaceStatus,string>`, `logTarget: Tracker | null` consistent across tasks.
- **Note on `text-pace-*` tokens:** verified used in `PaceBar.tsx` (`text-pace-on`/`text-pace-behind`/`text-pace-ahead`) — literal classes exist in generated CSS.
