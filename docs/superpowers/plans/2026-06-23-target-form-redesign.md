# Target Tracker Form Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the Target tracker form to add Start Value, Start Date, Due (weekday picker), and Reminders, and rename Target value → Goal Value / Deadline → Goal Date, matching the Strides reference.

**Architecture:** Pure-function changes in `factory.ts` (let `startValue`/`repeatDays`/`reminderTime` apply to target), unit-tested with Jest. Then the `target` branch of `TrackerFormScreen.tsx` is re-laid-out and its `onSave` extended — verified on simulator since op-sqlite is mocked in Jest. i18n keys added EN/VI key-for-key.

**Tech Stack:** React Native CLI, TypeScript (strict), HeroUI Native + Uniwind (Tailwind v4 `className`), TanStack Query over op-sqlite, i18next, Jest.

## Global Constraints

- **Styling:** Tailwind `className` only — NEVER inline `style={{…}}` except runtime-dynamic values (safe-area, continuous dimensions); never interpolate a value into a class string (branch the whole literal class instead).
- **Text:** Render `Typography` from `heroui-native`, NEVER `Text`.
- **Icons:** `lucide-react-native` only, sized via numeric `size` prop.
- **Construct trackers ONLY via `buildTracker()`** in `factory.ts` — never hand-build.
- **i18n:** No hardcoded visible strings — use `t('key')`; keep `en.json` and `vi.json` key-for-key in sync.
- **Named exports** (no default exports except `App.tsx`).
- `yarn tsc` and `yarn lint` must be clean before each commit.
- op-sqlite is mocked in Jest → DB-touching code (the form save) is NOT unit-tested; verify on simulator.

---

## File Structure

- `src/features/trackers/factory.ts` — MODIFY: `BuildTrackerInput` gains `startValue`; `buildTracker` lets `startValue`/`repeatDays`/`reminderTime` apply to target.
- `src/features/trackers/__tests__/factory.test.ts` — CREATE: unit tests for the factory changes (no test file exists yet).
- `src/i18n/locales/en.json` — MODIFY: add `form.goalValue`, `form.goalDate`, `form.startValueLabel`, `form.startValuePh`, `form.goalValuePh`.
- `src/i18n/locales/vi.json` — MODIFY: same keys, Vietnamese.
- `src/screens/trackers/TrackerFormScreen.tsx` — MODIFY: new `startValue` state + hydration; re-laid-out `target` branch; extended `onSave` (startValue, user startDate, repeatDays, reminders, goal>0 validation).

---

## Task 1: Factory supports `startValue` and target schedule/reminder fields

**Files:**
- Modify: `src/features/trackers/factory.ts`
- Test: `src/features/trackers/__tests__/factory.test.ts` (create)

**Interfaces:**
- Consumes: `Tracker`, `TrackerType`, `Accumulation`, `Period`, `Routine` from `@features/trackers/types`; `toISODate` from `@utils/date`.
- Produces: `buildTracker(input: BuildTrackerInput): Tracker` where `BuildTrackerInput` now includes `startValue?: number | null`. For `type === 'target'`: `startValue` defaults to `0` when omitted; `repeatDays` defaults to `[0,1,2,3,4,5,6]` when omitted; `reminderTime` is `null` when omitted, else the passed value. `routine` stays `null` for non-habit.

- [ ] **Step 1: Write the failing test**

Create `src/features/trackers/__tests__/factory.test.ts`:

```ts
import { buildTracker } from '@features/trackers/factory'

describe('buildTracker — target startValue / schedule / reminders', () => {
  it('keeps an explicit startValue for a target', () => {
    const t = buildTracker({
      name: 'Save',
      type: 'target',
      targetValue: 2000,
      startValue: 500
    })
    expect(t.startValue).toBe(500)
  })

  it('defaults target startValue to 0 when omitted', () => {
    const t = buildTracker({ name: 'Save', type: 'target', targetValue: 2000 })
    expect(t.startValue).toBe(0)
  })

  it('keeps a startValue of 0 (not null) for a target', () => {
    const t = buildTracker({
      name: 'Save',
      type: 'target',
      targetValue: 2000,
      startValue: 0
    })
    expect(t.startValue).toBe(0)
  })

  it('applies repeatDays and reminderTime to a target', () => {
    const t = buildTracker({
      name: 'Save',
      type: 'target',
      targetValue: 2000,
      repeatDays: [1, 3, 5],
      reminderTime: '18:00'
    })
    expect(t.repeatDays).toEqual([1, 3, 5])
    expect(t.reminderTime).toBe('18:00')
  })

  it('defaults target repeatDays to every day when omitted', () => {
    const t = buildTracker({ name: 'Save', type: 'target', targetValue: 2000 })
    expect(t.repeatDays).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('leaves target reminderTime null and routine null when omitted', () => {
    const t = buildTracker({ name: 'Save', type: 'target', targetValue: 2000 })
    expect(t.reminderTime).toBeNull()
    expect(t.routine).toBeNull()
  })

  it('does not give a non-target/non-habit type a startValue or repeatDays', () => {
    const t = buildTracker({ name: 'Avg', type: 'average', targetValue: 8 })
    expect(t.startValue).toBeNull()
    expect(t.repeatDays).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn test src/features/trackers/__tests__/factory.test.ts`
Expected: FAIL — the "explicit startValue" test fails because `buildTracker` currently hard-codes `startValue: type === 'target' ? 0 : null` (ignores `input.startValue`); the repeatDays/reminderTime-for-target tests fail because those are gated to habit.

- [ ] **Step 3: Implement the factory changes**

In `src/features/trackers/factory.ts`, add `startValue` to the input type. Find:

```ts
export type BuildTrackerInput = {
  name: string
  type: TrackerType
  icon?: string
  color?: string
  unit?: string | null
  targetValue?: number | null
  accumulation?: Accumulation | null
```

Add `startValue` right after `targetValue`:

```ts
export type BuildTrackerInput = {
  name: string
  type: TrackerType
  icon?: string
  color?: string
  unit?: string | null
  targetValue?: number | null
  startValue?: number | null
  accumulation?: Accumulation | null
```

Then in the returned object, find:

```ts
    startValue: type === 'target' ? 0 : null,
    accumulation: type === 'target' ? input.accumulation ?? 'sum' : null,
    startDate: input.startDate ?? toISODate(new Date()),
    deadline: null,
    period: input.period ?? (type === 'average' || isHabit ? 'daily' : null),
    repeatDays: input.repeatDays ?? (isHabit ? [0, 1, 2, 3, 4, 5, 6] : null),
    routine: isHabit ? input.routine ?? 'any' : null,
    reminderTime: isHabit ? input.reminderTime ?? null : null,
```

Replace the `startValue`, `repeatDays`, and `reminderTime` lines (leave `accumulation`, `startDate`, `deadline`, `period`, `routine` unchanged). The new block:

```ts
    startValue: type === 'target' ? input.startValue ?? 0 : null,
    accumulation: type === 'target' ? input.accumulation ?? 'sum' : null,
    startDate: input.startDate ?? toISODate(new Date()),
    deadline: null,
    period: input.period ?? (type === 'average' || isHabit ? 'daily' : null),
    repeatDays:
      input.repeatDays ??
      (isHabit || type === 'target' ? [0, 1, 2, 3, 4, 5, 6] : null),
    routine: isHabit ? input.routine ?? 'any' : null,
    reminderTime: input.reminderTime ?? null,
```

Note: `reminderTime` drops the `isHabit` gate — it is already `null` when the caller omits it, and the form only sends a non-null value for habit and target.

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn test src/features/trackers/__tests__/factory.test.ts`
Expected: PASS (all 7 tests).

- [ ] **Step 5: Type-check and lint**

Run: `yarn tsc && yarn lint`
Expected: clean (no errors).

- [ ] **Step 6: Commit**

```bash
git add src/features/trackers/factory.ts src/features/trackers/__tests__/factory.test.ts
git commit -m "feat(factory): let startValue/repeatDays/reminderTime apply to target

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: i18n keys for Goal Value / Goal Date / Start Value

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/vi.json`

**Interfaces:**
- Produces: under the `form` object — `goalValue`, `goalDate`, `startValueLabel`, `startValuePh`, `goalValuePh`. Consumed by Task 3's render.

- [ ] **Step 1: Add the EN keys**

In `src/i18n/locales/en.json`, inside the `"form"` object, find the `"startValue": "Start value",` line and add the new keys right after it:

```json
    "startValue": "Start value",
    "startValueLabel": "Start Value",
    "startValuePh": "0",
    "goalValue": "Goal Value",
    "goalValuePh": "2000",
    "goalDate": "Goal Date",
```

(Keep the existing `"startValue"` key — other code/tests may reference it.)

- [ ] **Step 2: Add the VI keys**

In `src/i18n/locales/vi.json`, inside the `"form"` object, find the `"startValue": "Giá trị bắt đầu",` line and add the matching keys right after it:

```json
    "startValue": "Giá trị bắt đầu",
    "startValueLabel": "Giá trị bắt đầu",
    "startValuePh": "0",
    "goalValue": "Giá trị mục tiêu",
    "goalValuePh": "2000",
    "goalDate": "Ngày mục tiêu",
```

- [ ] **Step 3: Verify the JSON parses and keys match**

Run:
```bash
node -e "const en=require('./src/i18n/locales/en.json').form, vi=require('./src/i18n/locales/vi.json').form; const k=['goalValue','goalDate','startValueLabel','startValuePh','goalValuePh']; console.log('en', k.filter(x=>!(x in en))); console.log('vi', k.filter(x=>!(x in vi))); console.log('parsed OK')"
```
Expected: `en []`, `vi []`, `parsed OK` (no missing keys; both files valid JSON).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/vi.json
git commit -m "i18n: add Goal Value/Goal Date/Start Value keys (en+vi)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Redesign the target branch of TrackerFormScreen

**Files:**
- Modify: `src/screens/trackers/TrackerFormScreen.tsx`

**Interfaces:**
- Consumes: `buildTracker` (now accepting `startValue`), the i18n keys from Task 2, and existing UI components `FormInput`, `Segmented`, `DateField`, `WeekdayPicker`, `Toggle`, `TimeField`, `FieldLabel`, `Icons.Bell` (all already imported in this file).
- Produces: no new exported interface — this is the screen's internal render + save logic.

This task has no Jest test (op-sqlite is mocked → form save is verified on simulator). It is one cohesive change to the target branch, committed once.

- [ ] **Step 1: Add `startValue` state**

In `src/screens/trackers/TrackerFormScreen.tsx`, find the `target` state declaration:

```ts
  const [target, setTarget] = useState(
    editing?.targetValue != null ? String(editing.targetValue) : ''
  )
```

Add a `startValue` state immediately after it:

```ts
  const [target, setTarget] = useState(
    editing?.targetValue != null ? String(editing.targetValue) : ''
  )
  const [startValue, setStartValue] = useState(
    editing?.startValue != null ? String(editing.startValue) : ''
  )
```

- [ ] **Step 2: Hydrate `startValue` from the editing tracker**

In the `useEffect` hydration block, find:

```ts
    setTarget(editing.targetValue != null ? String(editing.targetValue) : '')
```

Add the `startValue` hydration right after it:

```ts
    setTarget(editing.targetValue != null ? String(editing.targetValue) : '')
    setStartValue(editing.startValue != null ? String(editing.startValue) : '')
```

- [ ] **Step 3: Replace the target branch render**

Find the entire target branch (starts at `{type === 'target' ? (` and ends at the matching `) : null}` before `{/* average-specific */}`). Replace the whole block with:

```tsx
        {/* target-specific */}
        {type === 'target' ? (
          <>
            <View className='flex-row gap-s3'>
              <View className='flex-1 gap-s2'>
                <FieldLabel>{t('form.startValueLabel')}</FieldLabel>
                <FormInput
                  value={startValue}
                  onChangeText={setStartValue}
                  placeholder={t('form.startValuePh')}
                  keyboardType='decimal-pad'
                />
              </View>
              <View className='flex-1 gap-s2'>
                <FieldLabel>{t('form.goalValue')}</FieldLabel>
                <FormInput
                  value={target}
                  onChangeText={setTarget}
                  placeholder={t('form.goalValuePh')}
                  keyboardType='decimal-pad'
                />
              </View>
            </View>
            <View className='gap-s2'>
              <FieldLabel>{t('form.unit')}</FieldLabel>
              <FormInput
                value={unit}
                onChangeText={setUnit}
                placeholder={t('form.unitPh')}
              />
            </View>
            <View className='gap-s2'>
              <FieldLabel>{t('form.mode')}</FieldLabel>
              <Segmented<Accumulation>
                value={accum}
                onChange={setAccum}
                options={[
                  { value: 'sum', label: t('form.sum') },
                  { value: 'latest', label: t('form.latest') }
                ]}
              />
            </View>
            <View className='gap-s2'>
              <FieldLabel>{t('form.direction')}</FieldLabel>
              <Segmented<HabitDirection>
                value={dir}
                onChange={setDir}
                options={[
                  { value: 'good', label: t('form.higher') },
                  { value: 'bad', label: t('form.lower') }
                ]}
              />
            </View>
            <View className='flex-row gap-s3'>
              <View className='flex-1 gap-s2'>
                <FieldLabel>{t('form.startDate')}</FieldLabel>
                <DateField value={startDate} onChange={setStartDate} />
              </View>
              <View className='flex-1 gap-s2'>
                <FieldLabel>{t('form.goalDate')}</FieldLabel>
                <DateField value={deadline} onChange={setDeadline} />
              </View>
            </View>
            <View className='gap-s2'>
              <FieldLabel>{t('form.due')}</FieldLabel>
              <WeekdayPicker
                value={repeatDays}
                onChange={setRepeatDays}
                labels={{
                  mon: t('form.wd.mon'),
                  tue: t('form.wd.tue'),
                  wed: t('form.wd.wed'),
                  thu: t('form.wd.thu'),
                  fri: t('form.wd.fri'),
                  sat: t('form.wd.sat'),
                  sun: t('form.wd.sun')
                }}
              />
            </View>
            <View className='gap-s2'>
              <View className='flex-row items-center justify-between'>
                <View className='flex-row items-center gap-s2'>
                  <Icons.Bell size={18} color={TYPE_COLOR.target} />
                  <FieldLabel>{t('form.reminders')}</FieldLabel>
                </View>
                <Toggle value={reminderOn} onChange={setReminderOn} />
              </View>
              {reminderOn ? (
                <View className='gap-s2'>
                  <FieldLabel>{t('form.alert')}</FieldLabel>
                  <TimeField
                    value={reminderTime}
                    onChange={setReminderTime}
                    placeholder='18:00'
                  />
                </View>
              ) : null}
            </View>
          </>
        ) : null}
```

- [ ] **Step 4: Extend `onSave` — validation, startValue, startDate, repeatDays, reminders**

In `onSave`, the goal-validation is currently habit-only. Find:

```ts
  const onSave = () => {
    const isHabit = type === 'habit'

    // Habit-only required fields: a goal count > 0 and at least one Due day.
    if (isHabit) {
      const goalNum = Number(target)
      const problems: string[] = []
      if (!target.trim() || !Number.isFinite(goalNum) || goalNum <= 0)
        problems.push(t('form.errGoal'))
      if (repeatDays.length === 0) problems.push(t('form.errDue'))
      if (problems.length) {
        alert({
          title: t('form.errTitle'),
          message: problems.join('\n'),
          variant: 'danger'
        })
        return
      }
    }
```

Replace that validation block with one that also requires a positive Goal Value for
target (but does NOT require Due days for target — a target can be open-ended):

```ts
  const onSave = () => {
    const isHabit = type === 'habit'
    const isTarget = type === 'target'

    // Required fields: habit & target both need a goal > 0; habit also needs a Due day.
    if (isHabit || isTarget) {
      const goalNum = Number(target)
      const problems: string[] = []
      if (!target.trim() || !Number.isFinite(goalNum) || goalNum <= 0)
        problems.push(t('form.errGoal'))
      if (isHabit && repeatDays.length === 0) problems.push(t('form.errDue'))
      if (problems.length) {
        alert({
          title: t('form.errTitle'),
          message: problems.join('\n'),
          variant: 'danger'
        })
        return
      }
    }
```

- [ ] **Step 5: Pass the new target inputs into `buildTracker`**

Still in `onSave`, find the `buildTracker` call:

```ts
    const base = buildTracker({
      name: name.trim() || t(`type.${type}`),
      type,
      icon,
      color,
      unit: unit.trim() || null,
      targetValue: target ? Number(target) : null,
      accumulation: type === 'target' ? accum : undefined,
      period: type === 'average' || isHabit ? period : undefined,
      startDate: isHabit ? startDate.trim() || undefined : undefined,
      repeatDays: isHabit ? repeatDays : undefined,
      routine: isHabit ? routine : undefined,
      reminderTime: isHabit && reminderOn ? reminderTime.trim() || null : null
    })
```

Replace it with (adds `startValue`; lets `startDate`/`repeatDays`/`reminderTime` apply to target via `isHabit || isTarget`):

```ts
    const base = buildTracker({
      name: name.trim() || t(`type.${type}`),
      type,
      icon,
      color,
      unit: unit.trim() || null,
      targetValue: target ? Number(target) : null,
      startValue: isTarget ? Number(startValue) || 0 : undefined,
      accumulation: isTarget ? accum : undefined,
      period: type === 'average' || isHabit ? period : undefined,
      startDate: isHabit || isTarget ? startDate.trim() || undefined : undefined,
      repeatDays: isHabit || isTarget ? repeatDays : undefined,
      routine: isHabit ? routine : undefined,
      reminderTime:
        (isHabit || isTarget) && reminderOn
          ? reminderTime.trim() || null
          : null
    })
```

- [ ] **Step 6: Use the user-picked startDate for target in the final tracker object**

Still in `onSave`, find the final tracker object's `startDate` resolution:

```ts
    const tracker: Tracker = {
      ...base,
      // Preserve identity, origin date & goal note when editing.
      id: editing?.id ?? base.id,
      createdAt: editing?.createdAt ?? base.createdAt,
      goalNote: editing?.goalNote ?? base.goalNote,
      startDate: isHabit
        ? base.startDate
        : editing?.startDate ?? base.startDate,
      direction: type === 'target' || isHabit ? dir : base.direction,
      deadline: deadline.trim() ? deadline.trim() : null
    }
```

Change the `startDate` line so target (like habit) uses the picked value in `base.startDate`:

```ts
    const tracker: Tracker = {
      ...base,
      // Preserve identity, origin date & goal note when editing.
      id: editing?.id ?? base.id,
      createdAt: editing?.createdAt ?? base.createdAt,
      goalNote: editing?.goalNote ?? base.goalNote,
      startDate:
        isHabit || isTarget
          ? base.startDate
          : editing?.startDate ?? base.startDate,
      direction: type === 'target' || isHabit ? dir : base.direction,
      deadline: deadline.trim() ? deadline.trim() : null
    }
```

- [ ] **Step 7: Type-check and lint**

Run: `yarn tsc && yarn lint`
Expected: clean (no errors). In particular, confirm no unused-variable warning — `isTarget` is now used in multiple places.

- [ ] **Step 8: Run the full test suite (no regressions)**

Run: `yarn test`
Expected: PASS (factory tests from Task 1 + all existing tests green).

- [ ] **Step 9: Verify on simulator**

Run: `yarn ios` (or use a running simulator). Then:
1. Trackers tab → add → pick **Target** type.
2. Confirm the form shows, in order: Name, Icon, Color, **Start Value | Goal Value**, **Unit**, **Mode**, **Direction**, **Start Date | Goal Date**, **Due** (all 7 weekday chips filled by default), **Reminders** toggle.
3. Enter Start Value `500`, Goal Value `2000`, unit `$`, pick a Start Date and a Goal Date, deselect a couple of Due days, toggle Reminders on and set a time. Save.
4. Re-open the tracker for edit → confirm every field is hydrated with what you entered (Start Value 500, Goal Value 2000, the dates, the Due selection, the reminder time).
5. Try saving a target with an empty/0 Goal Value → confirm the "Missing info" alert with the goal message appears and the save is blocked.

- [ ] **Step 10: Commit**

```bash
git add src/screens/trackers/TrackerFormScreen.tsx
git commit -m "feat(form): redesign target form — Start Value/Date, Goal Date, Due, Reminders

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Add Start Value + Start Date → Task 1 (factory `startValue`), Task 3 Steps 1-3, 5-6. ✅
- Rename Target value → Goal Value, Deadline → Goal Date → Task 2 keys + Task 3 Step 3 render. ✅
- Add Due + Reminders to target → Task 1 (repeatDays/reminderTime for target) + Task 3 Step 3 render + Step 5 save. ✅
- Keep Direction toggle → Task 3 Step 3 (Direction `Segmented` retained). ✅
- Add to Total stays as Mode `Segmented` → Task 3 Step 3 (Mode retained). ✅
- Due via WeekdayPicker default all days → Task 1 (default `[0..6]`) + Task 3 render. ✅
- Unit layout Row1 Start|Goal, Row2 Unit → Task 3 Step 3. ✅
- Validation goal > 0 for target, Due not required → Task 3 Step 4. ✅
- i18n EN/VI key-for-key → Task 2. ✅
- Nothing removed → confirmed (rename + add only). ✅
- Out of scope (notifee wiring, Tags, other type branches, calculator) → untouched. ✅

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✅

**Type consistency:** `startValue` (camelCase) used consistently in `BuildTrackerInput`, state, hydration, and save; `isTarget` defined once in `onSave` and reused; `Accumulation`/`HabitDirection`/`Period`/`Routine` already imported in the screen; `TYPE_COLOR.target` exists (used in the appbar already). ✅
