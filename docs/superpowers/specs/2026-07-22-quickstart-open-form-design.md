# Quick-start opens pre-filled form

## Problem

On the Trackers empty state, tapping a quick-start currently calls
`save.mutate(...)` and **creates the tracker immediately** with no chance to
review or tweak it. Templates, by contrast, open `TrackerForm` pre-filled so the
user can adjust before saving. We want quick-starts to behave the same way: tap →
open the create form pre-filled by type, then the user confirms/edits and saves.

## Decision

Keep the existing `QUICK_STARTS` definitions exactly as they are (their semantics
differ from same-named templates, e.g. quick-start `water` = average 8 glasses vs
template `drinkWater` = habit). Extend `TrackerForm` to accept a `quickStartKey`
prefill source, reusing the same prefill path templates already use.

This works because `Template` is a structural superset of `QuickStart`: both have
required `key/type/icon/color` and optional `unit/targetValue/accumulation/period`;
`Template` only adds further optional fields. So a `QuickStart` is assignable to
the `template` variable the form already reads, and every existing field mapping
(icon/color/unit/target/accumulation/period → defaults for the rest) works
unchanged. The only divergence is the display name's i18n namespace:
quick-starts live under `quickStart.items.*`, templates under `template.items.*`.

## Changes

1. **`src/navigation/types.ts`** — add `quickStartKey?: string` to the
   `TrackerForm` param:
   ```ts
   TrackerForm: { trackerId?: string; type: TrackerType; templateKey?: string; quickStartKey?: string }
   ```

2. **`src/features/trackers/quickStarts.ts`** — add
   `findQuickStart(key): QuickStart | undefined` (mirrors `findTemplate`).

3. **`src/screens/trackers/TrackerFormScreen.tsx`**
   - Read `quickStartKey` from `route.params`.
   - Broaden the prefill source:
     ```ts
     const template = templateKey
       ? findTemplate(templateKey)
       : quickStartKey
       ? findQuickStart(quickStartKey)
       : undefined
     ```
     All non-name field initialisers stay as they are.
   - Name initialiser resolves the correct namespace:
     ```ts
     editing?.name ??
       (quickStartKey
         ? t(`quickStart.items.${quickStartKey}`)
         : template
         ? t(`template.items.${template.key}`)
         : '')
     ```

4. **`src/screens/trackers/TrackerListScreen.tsx`** — replace `addQuickStart`'s
   direct save with navigation:
   ```ts
   const openQuickStart = (qs: QuickStart) =>
     nav.navigate('TrackerForm', { type: qs.type, quickStartKey: qs.key })
   ```
   Remove the now-unused `useSaveTracker` and `buildTracker` imports (used only
   here). The empty-state `Pressable` calls `openQuickStart(qs)`.

## Out of scope / unchanged

- The 8 `QUICK_STARTS` definitions, their i18n strings, and the empty-state UI.
- The template flow and any other tracker-creation entry point.
- No new analytics.

## Testing

- Unit test for `findQuickStart` (found key, missing key) in
  `src/features/trackers/__tests__/`.
- `TrackerForm` and `TrackerListScreen` are screens; the prefill + navigation is
  verified on simulator (per repo testing strategy — op-sqlite is unavailable in
  Jest, screens are not unit-tested).
- `yarn tsc` and `yarn lint` clean.
