# Segmented Restyle + Info Tooltips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the `Segmented` control so the selected option uses `bg-brand` (white text) on a white container, and add a `?` info button + Popover tooltip beside the Mode, Direction (target) and Period (average) field labels.

**Architecture:** One styling change to the shared `Segmented` component (affects target Mode/Direction and average Period uniformly). One new reusable `InfoTooltip` component (a white circular `?` button that opens a HeroUI Native `Popover` with arrow + close). One new `FieldLabelRow` layout helper that places a `FieldLabel` and an optional trailing node on one row. Wire all three into `TrackerFormScreen`'s target + average branches. Tooltip copy added to i18n EN/VI.

**Tech Stack:** React Native CLI, TypeScript (strict), HeroUI Native (Popover) + Uniwind (Tailwind v4 `className`), lucide-react-native (HelpCircle), i18next.

## Global Constraints

- **Styling:** Tailwind `className` only — NEVER inline `style={{…}}` except runtime-dynamic values. NEVER interpolate a value into a class string (use complete literal classes / branch the whole class).
- **Text:** render `Typography` from `heroui-native`, NEVER `Text`.
- **Icons:** `lucide-react-native` only, sized via numeric `size` prop.
- **Overlays:** use HeroUI Native overlay components (`Popover`), NEVER react-native `Modal`.
- **i18n:** no hardcoded visible strings; `en.json` + `vi.json` key-for-key in sync.
- TypeScript strict — `yarn tsc` clean. Named exports only (components exported from `@components/ui`).
- Theme tokens: `bg-brand` (#2456b5), `text-on-accent` (#fff), `bg-surface` (#fff), `text-ink-2` (#565a4f), `border-line` (#e3e5dc).

---

## File Structure

- `src/components/ui/Segmented.tsx` — MODIFY: selected item `bg-brand` + `text-on-accent`; container `bg-surface`; unselected text `text-ink-2`.
- `src/components/ui/InfoTooltip.tsx` — CREATE: `?` circular button → Popover with title + description.
- `src/components/ui/FieldLabelRow.tsx` — CREATE: row wrapper placing label text + optional trailing node (the `?`), space-between.
- `src/components/ui/index.ts` — MODIFY: export `InfoTooltip`, `FieldLabelRow`.
- `src/i18n/locales/en.json` — MODIFY: add `form.modeHelp`, `form.directionHelp`, `form.periodHelp` (+ a generic `form.helpTitle`).
- `src/i18n/locales/vi.json` — MODIFY: same keys, Vietnamese.
- `src/screens/trackers/TrackerFormScreen.tsx` — MODIFY: replace the `FieldLabel` for Mode/Direction (target) and Period (average) with `FieldLabelRow` carrying an `InfoTooltip`.

---

## Task 1: Restyle Segmented (selected = bg-brand on white container)

**Files:**
- Modify: `src/components/ui/Segmented.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: same `Segmented<T>` public API (no prop changes) — only the className strings change.

This task has no Jest test (pure presentational RN component, no logic). Verified on simulator. Committed once.

- [ ] **Step 1: Apply the new classes**

In `src/components/ui/Segmented.tsx`, the container currently is `bg-surface-2` and the selected pill is `bg-surface shadow-sm` with text `text-ink`. Change to: container `bg-surface` with a hairline border, selected pill `bg-brand shadow-sm`, selected text `text-on-accent`, unselected text `text-ink-2`. Replace the whole `return (...)` body with:

```tsx
  return (
    <View className='flex-row gap-s1 rounded-md-k border border-line bg-surface p-s1'>
      {options.map((opt) => {
        const on = opt.value === value
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`h-10 flex-1 items-center justify-center rounded-sm-k ${
              on ? 'bg-brand shadow-sm' : ''
            }`}
          >
            <Typography
              className={`text-sm font-bold ${
                on ? 'text-on-accent' : 'text-ink-2'
              }`}
            >
              {opt.label}
            </Typography>
          </Pressable>
        )
      })}
    </View>
  )
```

- [ ] **Step 2: Type-check and lint**

Run: `yarn tsc && yarn lint`
Expected: clean (no NEW issues in Segmented.tsx; pre-existing warnings in other files unchanged).

- [ ] **Step 3: Run the test suite (no regressions)**

Run: `yarn test`
Expected: 81/81 pass (this is a presentational change; no test references Segmented internals).

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Segmented.tsx
git commit -m "style(ui): Segmented selected option uses bg-brand on white container

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: i18n keys for tooltip copy

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/vi.json`

**Interfaces:**
- Produces: under `form` — `helpTitle`, `modeHelp`, `directionHelp`, `periodHelp`. Consumed by Task 4's render.

- [ ] **Step 1: Add the EN keys**

In `src/i18n/locales/en.json`, inside the `"form"` object, add these keys (place them right after the existing `"goalDate"` line for grouping):

```json
    "helpTitle": "How it works",
    "modeHelp": "Accumulate adds up every log toward your goal (e.g. money saved). Latest value tracks only your most recent entry (e.g. current weight).",
    "directionHelp": "Higher is better when you want the number to grow (e.g. savings). Lower is better when you want it to drop (e.g. weight, debt).",
    "periodHelp": "Your goal is an average per period. Daily averages your logs each day, Weekly each week, Monthly each month (e.g. 8 glasses of water a day).",
```

- [ ] **Step 2: Add the VI keys**

In `src/i18n/locales/vi.json`, inside the `"form"` object, after the existing `"goalDate"` line:

```json
    "helpTitle": "Cách hoạt động",
    "modeHelp": "Tích lũy cộng dồn mọi lần ghi để tiến tới mục tiêu (vd. tiền tiết kiệm). Giá trị mới nhất chỉ theo dõi lần ghi gần nhất (vd. cân nặng hiện tại).",
    "directionHelp": "Càng cao càng tốt khi bạn muốn con số tăng lên (vd. tiết kiệm). Càng thấp càng tốt khi bạn muốn nó giảm xuống (vd. cân nặng, nợ).",
    "periodHelp": "Mục tiêu của bạn là trung bình theo chu kỳ. Hằng ngày tính trung bình mỗi ngày, Hằng tuần mỗi tuần, Hằng tháng mỗi tháng (vd. 8 ly nước mỗi ngày).",
```

- [ ] **Step 3: Verify JSON parses and keys match**

Run:
```bash
node -e "const en=require('./src/i18n/locales/en.json').form, vi=require('./src/i18n/locales/vi.json').form; const k=['helpTitle','modeHelp','directionHelp','periodHelp']; console.log('en missing', k.filter(x=>!(x in en))); console.log('vi missing', k.filter(x=>!(x in vi))); console.log('parsed OK')"
```
Expected: `en missing []`, `vi missing []`, `parsed OK`.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/vi.json
git commit -m "i18n: add Mode/Direction/Period tooltip help copy (en+vi)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: InfoTooltip + FieldLabelRow components

**Files:**
- Create: `src/components/ui/InfoTooltip.tsx`
- Create: `src/components/ui/FieldLabelRow.tsx`
- Modify: `src/components/ui/index.ts`

**Interfaces:**
- Produces:
  - `InfoTooltip({ title, description }: { title: string; description: string }): JSX.Element` — a circular white `?` button that opens a HeroUI `Popover` showing `title` + `description`.
  - `FieldLabelRow({ children, trailing }: { children: string; trailing?: React.ReactNode }): JSX.Element` — a `flex-row items-center justify-between` row with the bold label (same style as `FieldLabel`) on the left and `trailing` on the right.
- Consumes: `Popover` from `heroui-native`, `HelpCircle` from `lucide-react-native`, `Typography` from `heroui-native`.

This task has no Jest test (presentational, overlay behavior verified on simulator). Committed once.

- [ ] **Step 1: Create FieldLabelRow**

Create `src/components/ui/FieldLabelRow.tsx`:

```tsx
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { Typography } from 'heroui-native'

/**
 * A field label row: the bold label (matching `FieldLabel`) on the left and an
 * optional trailing node (e.g. an `InfoTooltip`) pinned to the right.
 */
export function FieldLabelRow({
  children,
  trailing
}: {
  children: string
  trailing?: ReactNode
}) {
  return (
    <View className='flex-row items-center justify-between'>
      <Typography className='text-sm font-bold text-ink'>
        {children}
      </Typography>
      {trailing ?? null}
    </View>
  )
}
```

- [ ] **Step 2: Create InfoTooltip**

Create `src/components/ui/InfoTooltip.tsx`. The trigger is a 24px white circular button with a thin border and a lucide `HelpCircle`; tapping opens a `Popover` (arrow + close + title + description). Per HeroUI docs, when using `Popover.Arrow` the `Popover.Content` needs a border.

```tsx
import { Pressable, View } from 'react-native'
import { Popover, Typography } from 'heroui-native'
import { HelpCircle } from 'lucide-react-native'

/**
 * A circular "?" button that opens a Popover explaining a field. Used beside
 * `FieldLabelRow` labels (Mode / Direction / Period). Tap outside or the close
 * button to dismiss.
 */
export function InfoTooltip({
  title,
  description
}: {
  title: string
  description: string
}) {
  return (
    <Popover>
      <Popover.Trigger>
        <View className='h-6 w-6 items-center justify-center rounded-full border border-line bg-surface active:opacity-70'>
          <HelpCircle size={15} color='#8a8e80' />
        </View>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Overlay />
        <Popover.Content
          presentation='popover'
          placement='top'
          width={280}
          className='border border-line'
        >
          <Popover.Arrow />
          <Popover.Close />
          <Popover.Title>{title}</Popover.Title>
          <Popover.Description>{description}</Popover.Description>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  )
}
```

Note: `Popover.Trigger` wraps a child with press handlers (per HeroUI anatomy: "Wraps any child element with press handlers"), so a plain `View` child is fine — do not nest a `Pressable` inside it. If `yarn tsc` reports `Popover.Trigger` requires a pressable/`asChild` prop, switch the child to `<Popover.Trigger asChild>` over a `<Pressable>`; resolve based on the actual type error (see Step 4). The `Pressable` import stays only if you take that path — otherwise remove it to avoid an unused-import lint error.

- [ ] **Step 3: Export from the ui barrel**

In `src/components/ui/index.ts`, add (keeping alphabetical-ish grouping with the existing exports):

```ts
export { FieldLabelRow } from './FieldLabelRow'
export { InfoTooltip } from './InfoTooltip'
```

- [ ] **Step 4: Type-check and lint**

Run: `yarn tsc && yarn lint`
Expected: clean. If `tsc` flags the `Popover.Trigger` child contract, adjust per the note in Step 2 (use `asChild` + `Pressable`) and re-run until clean. Remove the unused `Pressable`/`View` import if the chosen path doesn't use it.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/InfoTooltip.tsx src/components/ui/FieldLabelRow.tsx src/components/ui/index.ts
git commit -m "feat(ui): add InfoTooltip (?-button Popover) and FieldLabelRow

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Wire tooltips into the form (Mode, Direction, Period)

**Files:**
- Modify: `src/screens/trackers/TrackerFormScreen.tsx`

**Interfaces:**
- Consumes: `FieldLabelRow`, `InfoTooltip` (Task 3); i18n keys `form.helpTitle`, `form.modeHelp`, `form.directionHelp`, `form.periodHelp` (Task 2).
- Produces: no new exported interface.

No Jest test (DB-touching screen, op-sqlite mocked). Verified on simulator. Committed once.

- [ ] **Step 1: Import the new components**

In `src/screens/trackers/TrackerFormScreen.tsx`, the existing import from `@components/ui` lists `DateField, FieldLabel, FormInput, Segmented, SelectField, TimeField, Toggle, useAlert, WeekdayPicker`. Add `FieldLabelRow` and `InfoTooltip` to that import (keep `FieldLabel` — it's still used by the other fields):

```tsx
import {
  DateField,
  FieldLabel,
  FieldLabelRow,
  FormInput,
  InfoTooltip,
  Segmented,
  SelectField,
  TimeField,
  Toggle,
  useAlert,
  WeekdayPicker
} from '@components/ui'
```

- [ ] **Step 2: Replace the Mode label (target)**

Find (around lines 343-344):

```tsx
            <View className='gap-s2'>
              <FieldLabel>{t('form.mode')}</FieldLabel>
              <Segmented<Accumulation>
```

Replace the `<FieldLabel>` line with a `FieldLabelRow` carrying the tooltip:

```tsx
            <View className='gap-s2'>
              <FieldLabelRow
                trailing={
                  <InfoTooltip
                    title={t('form.helpTitle')}
                    description={t('form.modeHelp')}
                  />
                }
              >
                {t('form.mode')}
              </FieldLabelRow>
              <Segmented<Accumulation>
```

- [ ] **Step 3: Replace the Direction label (target)**

Find (around lines 354-355):

```tsx
            <View className='gap-s2'>
              <FieldLabel>{t('form.direction')}</FieldLabel>
              <Segmented<HabitDirection>
```

Replace the `<FieldLabel>` line:

```tsx
            <View className='gap-s2'>
              <FieldLabelRow
                trailing={
                  <InfoTooltip
                    title={t('form.helpTitle')}
                    description={t('form.directionHelp')}
                  />
                }
              >
                {t('form.direction')}
              </FieldLabelRow>
              <Segmented<HabitDirection>
```

- [ ] **Step 4: Replace the Period label (average)**

Find (around lines 437-438):

```tsx
            <View className='gap-s2'>
              <FieldLabel>{t('form.period')}</FieldLabel>
              <Segmented<Period>
```

Replace the `<FieldLabel>` line:

```tsx
            <View className='gap-s2'>
              <FieldLabelRow
                trailing={
                  <InfoTooltip
                    title={t('form.helpTitle')}
                    description={t('form.periodHelp')}
                  />
                }
              >
                {t('form.period')}
              </FieldLabelRow>
              <Segmented<Period>
```

- [ ] **Step 5: Type-check and lint**

Run: `yarn tsc && yarn lint`
Expected: clean. `FieldLabel` is still imported and used elsewhere (Start Value, Goal Value, Unit, dates, Due, reminders) — confirm no unused-import warning for it.

- [ ] **Step 6: Run the test suite**

Run: `yarn test`
Expected: 81/81 pass.

- [ ] **Step 7: Verify on simulator**

Run on a booted simulator (reload JS). Then:
1. Trackers → add → **Target**. Confirm Mode and Direction each show a white circular `?` button to the right of the label.
2. Confirm the selected segment (e.g. "Accumulate", "Higher is better") now renders with a **blue (`bg-brand`) background and white text**, on a white container.
3. Tap the `?` next to Mode → a Popover appears with title "How it works" and the Mode explanation; tap outside / close → it dismisses. Repeat for Direction.
4. Back out, add → **Average**. Confirm Period shows the `?` and its Popover shows the Period explanation, and the selected Period segment is blue.

- [ ] **Step 8: Commit**

```bash
git add src/screens/trackers/TrackerFormScreen.tsx
git commit -m "feat(form): add ?-tooltips beside Mode/Direction/Period labels

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Selected segment uses bg-brand, container white → Task 1. ✅
- `?` circular white button beside Mode + Direction + Period → Task 3 (InfoTooltip) + Task 4 (wiring). ✅
- Click shows tooltip explaining how it works, language defined per type → Task 2 (copy EN/VI) + Task 3 (Popover). ✅
- HeroUI overlay (Popover), lucide icon, Typography, className-only, i18n in sync → enforced in Global Constraints, used in Tasks 1-4. ✅

**Placeholder scan:** No TBD/TODO; full code in every step. The Task 3 Step 2 note about `Popover.Trigger`'s child contract is a real API-resolution instruction (the docs state Trigger "wraps any child with press handlers"), not a placeholder — it gives the exact fallback and how to choose. ✅

**Type consistency:** `InfoTooltip({title, description})` and `FieldLabelRow({children, trailing})` signatures match between their definitions (Task 3) and all call sites (Task 4). `FieldLabel` retained for non-tooltip fields. ✅
