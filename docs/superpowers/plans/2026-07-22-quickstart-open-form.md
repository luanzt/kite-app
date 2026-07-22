# Quick-start opens pre-filled form — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tapping a quick-start on the Trackers empty state opens `TrackerForm` pre-filled (like templates) instead of creating the tracker immediately.

**Architecture:** Reuse the form's existing template-prefill path. `QuickStart` is structurally assignable to the `template` variable the form already reads, so only the display-name i18n namespace needs special handling. Add a `quickStartKey` nav param, a `findQuickStart` lookup, and switch the empty-state tap from `save.mutate` to `navigation.navigate`.

**Tech Stack:** React Native, TypeScript (strict), React Navigation native-stack, i18next, Jest.

## Global Constraints

- Package manager is **yarn**. `yarn tsc` and `yarn lint` must be clean.
- Use `Typography` not `Text`; style with Tailwind `className` not inline `style`. (No new UI is added here, but any touched JSX must comply.)
- Construct `Tracker` objects only via `buildTracker()` — not relevant after this change since the empty-state tap stops building trackers.
- TDD: write the failing test first for pure logic. Screens are not unit-tested (op-sqlite unavailable in Jest) — verify on simulator.
- i18n keys `quickStart.items.<key>` and `template.items.<key>` already exist for every key in scope; do not add or rename strings.

---

### Task 1: `findQuickStart` lookup helper

**Files:**
- Modify: `src/features/trackers/quickStarts.ts`
- Test: `src/features/trackers/__tests__/quickStarts.test.ts` (create)

**Interfaces:**
- Consumes: `QUICK_STARTS`, `QuickStart` (already exported from `quickStarts.ts`).
- Produces: `findQuickStart(key: string): QuickStart | undefined`.

- [ ] **Step 1: Write the failing test**

Create `src/features/trackers/__tests__/quickStarts.test.ts`:

```ts
import { QUICK_STARTS, findQuickStart } from '../quickStarts'

describe('findQuickStart', () => {
  it('returns the quick-start for a known key', () => {
    const qs = findQuickStart('water')
    expect(qs).toBeDefined()
    expect(qs?.key).toBe('water')
    expect(qs?.type).toBe('average')
  })

  it('returns undefined for an unknown key', () => {
    expect(findQuickStart('nope')).toBeUndefined()
  })

  it('finds every key listed in QUICK_STARTS', () => {
    for (const qs of QUICK_STARTS) {
      expect(findQuickStart(qs.key)).toBe(qs)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test src/features/trackers/__tests__/quickStarts.test.ts`
Expected: FAIL — `findQuickStart` is not exported / not a function.

- [ ] **Step 3: Add the helper**

Append to `src/features/trackers/quickStarts.ts` (after the `QUICK_STARTS` array):

```ts
export function findQuickStart(key: string): QuickStart | undefined {
  return QUICK_STARTS.find((qs) => qs.key === key)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test src/features/trackers/__tests__/quickStarts.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/trackers/quickStarts.ts src/features/trackers/__tests__/quickStarts.test.ts
git commit -m "feat(quickstart): add findQuickStart lookup helper"
```

---

### Task 2: Accept `quickStartKey` nav param

**Files:**
- Modify: `src/navigation/types.ts:15`

**Interfaces:**
- Consumes: existing `RootStackParamList.TrackerForm`.
- Produces: `TrackerForm` param now includes `quickStartKey?: string`.

- [ ] **Step 1: Add the param**

In `src/navigation/types.ts`, change line 15 from:

```ts
  TrackerForm: { trackerId?: string; type: TrackerType; templateKey?: string }
```

to:

```ts
  TrackerForm: { trackerId?: string; type: TrackerType; templateKey?: string; quickStartKey?: string }
```

- [ ] **Step 2: Verify types still compile**

Run: `yarn tsc`
Expected: clean (no errors). The new optional field breaks no existing caller.

- [ ] **Step 3: Commit**

```bash
git add src/navigation/types.ts
git commit -m "feat(quickstart): add quickStartKey param to TrackerForm route"
```

---

### Task 3: Form pre-fills from `quickStartKey`

**Files:**
- Modify: `src/screens/trackers/TrackerFormScreen.tsx:23,86,98,114`

**Interfaces:**
- Consumes: `findQuickStart` (Task 1), `quickStartKey` param (Task 2), existing `findTemplate`.
- Produces: no new exports; behavioral change to the form.

- [ ] **Step 1: Import `findQuickStart`**

In `src/screens/trackers/TrackerFormScreen.tsx`, change the import on line 23 from:

```ts
import { findTemplate, templateDirection } from '@features/trackers/templates'
```

Leave that line as-is and add below it:

```ts
import { findQuickStart } from '@features/trackers/quickStarts'
```

- [ ] **Step 2: Destructure `quickStartKey`**

Change line 86 from:

```ts
  const { type, trackerId, templateKey } = route.params
```

to:

```ts
  const { type, trackerId, templateKey, quickStartKey } = route.params
```

- [ ] **Step 3: Broaden the prefill source**

Change line 98 from:

```ts
  const template = templateKey ? findTemplate(templateKey) : undefined
```

to:

```ts
  // Prefill source (create mode): a Template, or a QuickStart (structurally a
  // subset of Template — same required key/type/icon/color, fewer optionals).
  // Lookup is synchronous, so it seeds the useState initialisers directly.
  const template = templateKey
    ? findTemplate(templateKey)
    : quickStartKey
    ? findQuickStart(quickStartKey)
    : undefined
```

- [ ] **Step 4: Resolve the name from the correct i18n namespace**

Change the name initialiser (line 113-115) from:

```ts
  const [name, setName] = useState(
    editing?.name ?? (template ? t(`template.items.${template.key}`) : '')
  )
```

to:

```ts
  const [name, setName] = useState(
    editing?.name ??
      (quickStartKey
        ? t(`quickStart.items.${quickStartKey}`)
        : template
        ? t(`template.items.${template.key}`)
        : '')
  )
```

- [ ] **Step 5: Verify types compile**

Run: `yarn tsc`
Expected: clean. `findQuickStart` returns `QuickStart | undefined`, assignable to the `template` variable because `QuickStart`'s required fields (`key/type/icon/color`) and optional fields are a subset of `Template`'s.

- [ ] **Step 6: Commit**

```bash
git add src/screens/trackers/TrackerFormScreen.tsx
git commit -m "feat(quickstart): pre-fill TrackerForm from quickStartKey"
```

---

### Task 4: Empty-state tap opens the form

**Files:**
- Modify: `src/screens/trackers/TrackerListScreen.tsx:9,15,27,40-53,95`

**Interfaces:**
- Consumes: `quickStartKey` param (Task 2), the form prefill (Task 3).
- Produces: no exports; empty-state quick-start tap now navigates instead of saving.

- [ ] **Step 1: Replace `addQuickStart` with navigation**

In `src/screens/trackers/TrackerListScreen.tsx`, replace the `addQuickStart` block (lines 40-53):

```ts
  const addQuickStart = (qs: QuickStart) => {
    save.mutate(
      buildTracker({
        name: t(`quickStart.items.${qs.key}`),
        type: qs.type,
        icon: qs.icon,
        color: qs.color,
        unit: qs.unit ?? null,
        targetValue: qs.targetValue ?? null,
        accumulation: qs.accumulation ?? null,
        period: qs.period ?? null
      })
    )
  }
```

with:

```ts
  const openQuickStart = (qs: QuickStart) =>
    nav.navigate('TrackerForm', { type: qs.type, quickStartKey: qs.key })
```

- [ ] **Step 2: Update the Pressable onPress**

Change line 95 from:

```ts
                onPress={() => addQuickStart(qs)}
```

to:

```ts
                onPress={() => openQuickStart(qs)}
```

- [ ] **Step 3: Remove now-unused imports and hook**

Delete line 27 (`const save = useSaveTracker()`), inside the component body.

Change the import on line 9 from:

```ts
import { useTrackers, useSaveTracker } from '@features/trackers/queries'
```

to:

```ts
import { useTrackers } from '@features/trackers/queries'
```

Delete line 15:

```ts
import { buildTracker } from '@features/trackers/factory'
```

- [ ] **Step 4: Verify types and lint are clean**

Run: `yarn tsc && yarn lint`
Expected: clean — no unused-variable/import errors for `save`, `useSaveTracker`, `buildTracker`.

- [ ] **Step 5: Commit**

```bash
git add src/screens/trackers/TrackerListScreen.tsx
git commit -m "feat(quickstart): open pre-filled form from empty-state tap"
```

---

### Task 5: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `yarn test`
Expected: PASS (including the new `quickStarts.test.ts`).

- [ ] **Step 2: Type check and lint**

Run: `yarn tsc && yarn lint`
Expected: both clean.

- [ ] **Step 3: Simulator smoke check (manual)**

Run: `yarn ios` (or `yarn android`). With no trackers:
- Tap each quick-start on the Trackers empty state → `TrackerForm` opens pre-filled: name from `quickStart.items.<key>`, plus icon/color/unit/target/accumulation/period matching the `QUICK_STARTS` entry (e.g. `water` → average, 8, glasses, daily; `save` → target, 1000, $, sum).
- Confirm Save creates the tracker and returns to the populated list; Back cancels with nothing created.

No commit (verification only).
