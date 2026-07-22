# Quick-start opens pre-filled form (quick-starts = featured templates)

## Problem

On the Trackers empty state, tapping a quick-start currently calls
`save.mutate(...)` and creates the tracker immediately. We want it to open
`TrackerForm` pre-filled (like templates) so the user can review/edit first.

Additionally, `src/features/trackers/quickStarts.ts` is a **parallel data source**
that duplicates `templates.ts` and drifts from the domain model — notably it
gives `average` quick-starts a `unit` (`water`="glasses", `sleep`="hours",
`steps`="steps"), but averages are unitless in this app (no average template
sets a unit, and the form has no average-unit field). There must be **one
standard data source**.

## Decision

Quick-starts become **curated featured templates** — no separate data. Delete
`quickStarts.ts` entirely (its `QuickStart` type and the 8 objects). The featured
set lives in `templates.ts` as a list of template keys plus a resolver. Tapping a
quick-start uses the existing `templateKey` prefill flow.

### Featured set (8 keys, mapping current intent → template semantics)

| Old quick-start | Template key | Type | Note |
|---|---|---|---|
| water (average+unit ❌) | `drinkWater` | habit | proper template, drops bogus unit |
| exercise | `exercise` | habit | unchanged |
| save | `saveMoney` | target | money category |
| read | `read` | habit | template `read` is a habit |
| sleep (average+unit ❌) | `sleep` | average (no unit) | fixes unit |
| meditate | `meditate` | habit | unchanged |
| steps (average+unit ❌) | `steps` | average (no unit) | fixes unit |
| weight | `weight` | target (kg) | targets legitimately have units |

Balance: 4 habit / 2 target / 2 average across 6 categories. No `project` (needs
milestones — unsuitable for one-tap). All 8 keys already exist in
`TEMPLATE_CATEGORIES`.

## Changes

1. **`src/features/trackers/templates.ts`** — add:
   ```ts
   export const QUICK_START_KEYS = [
     'drinkWater', 'exercise', 'saveMoney', 'read',
     'sleep', 'meditate', 'steps', 'weight'
   ] as const

   /** Featured templates for the empty Trackers state (one-tap starts). */
   export function quickStartTemplates(): Template[] {
     return QUICK_START_KEYS.map((k) => findTemplate(k)).filter(
       (t): t is Template => t != null
     )
   }
   ```

2. **Delete `src/features/trackers/quickStarts.ts`** (type + data + `findQuickStart`).

3. **`src/navigation/types.ts`** — remove `quickStartKey?: string` from the
   `TrackerForm` param (revert to `{ trackerId?; type; templateKey? }`).

4. **`src/screens/trackers/TrackerFormScreen.tsx`** — revert the `quickStartKey`
   machinery: drop the `findQuickStart` import and the `quickStartKey` destructure;
   restore the prefill source to `const template = templateKey ? findTemplate(templateKey) : undefined`
   and the name to `editing?.name ?? (template ? t(\`template.items.${template.key}\`) : '')`.
   (The `type Template` import may stay or go — keep imports minimal.)

5. **`src/screens/trackers/TrackerListScreen.tsx`** — render the empty-state grid
   from `quickStartTemplates()`; each tile's name is `t(\`template.items.${tpl.key}\`)`,
   icon is `iconEmoji(tpl.icon)`, tap → `nav.navigate('TrackerForm', { type: tpl.type, templateKey: tpl.key })`.
   Remove the `QUICK_STARTS`/`QuickStart` import.

6. **i18n** — remove the now-unused `quickStart` namespace (both `items` and the
   unused `heading`) from `src/i18n/locales/en.json` and `vi.json`. Names come
   from `template.items.*` (already present for all 8 keys). Keep the files
   key-for-key in sync.

## Testing

- Rewrite `src/features/trackers/__tests__/quickStarts.test.ts` to test
  `quickStartTemplates()`:
  - returns 8 templates, one per `QUICK_START_KEYS` entry, in order;
  - every featured key resolves to a real template (no `undefined` dropped);
  - every featured template has a `template.items.<key>` string in **both**
    en.json and vi.json;
  - **invariant: no featured `average` template carries a `unit`** (encodes the
    "averages are unitless" rule).
- `TrackerForm`/`TrackerListScreen` are screens (op-sqlite unavailable in Jest) —
  verify prefill + navigation on simulator.
- `yarn tsc`, `yarn lint`, `yarn test` clean.

## Out of scope

- Adding an average-unit field to the form (separate feature).
- Any `project`-type quick-start.
