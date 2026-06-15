# Habit Form: Goal hint + Save validation

**Date:** 2026-06-15
**Scope:** `src/screens/trackers/TrackerFormScreen.tsx` (the `type === 'habit'` branch only) + `src/i18n/locales/{en,vi}.json`.

## Problem

On the New Habit form three issues exist:

1. The **Goal** field placeholder is `"1"` — it should hint `"5 times"` so the user
   understands it means a count.
2. Pressing **Save** with an empty Goal still creates the tracker. It must be blocked
   and the user told why.
3. Pressing **Save** with **no Due day** selected (the user deselected all weekday
   chips) also saves silently. It must be blocked and the user told why.

Other tracker types (target, average, project) are **out of scope** for this change.

## Design

### 1. Goal placeholder

Replace the hard-coded `placeholder="1"` on the habit Goal `FormInput` with
`placeholder={t('form.goalPh')}`.

New i18n key `form.goalPh`:
- en: `"5 times"`
- vi: `"5 lần"`

The field stays empty until the user types (placeholder only, not a default value).

### 2 & 3. Save validation via Toast

Use HeroUI Native's `Toast` (`useToast()` → `toast.show({...})`). The app is already
wrapped in `HeroUINativeProvider` (App.tsx), so the toast provider is present.

In `onSave`, **only when `type === 'habit'`**, validate before building/saving:

- **Goal invalid** when `target` is blank OR `Number(target)` is not a finite number `> 0`.
- **Due invalid** when `repeatDays.length === 0`.

If either is invalid, build a danger toast and `return` early (do not save):

```ts
const problems: string[] = [];
if (goalInvalid) problems.push(t('form.errGoal'));
if (dueInvalid) problems.push(t('form.errDue'));
if (problems.length) {
  toast.show({
    variant: 'danger',
    label: t('form.errTitle'),
    description: problems.join('\n'),
  });
  return;
}
```

New i18n keys under `form`:

| key        | en                                | vi                                |
| ---------- | --------------------------------- | --------------------------------- |
| `errTitle` | `Missing info`                    | `Thiếu thông tin`                 |
| `errGoal`  | `Please enter a goal greater than 0` | `Vui lòng nhập số lần lớn hơn 0`  |
| `errDue`   | `Please select at least one day`  | `Vui lòng chọn ít nhất một ngày`  |

### Why toast over inline field errors

The user explicitly asked for a HeroUI toast-style notification. `FormInput` and
`WeekdayPicker` have no error-state support today; a toast keeps those shared
components untouched and confines the change to the form screen + locale files.

## Out of scope / non-goals

- No validation for target / average / project types.
- No changes to `FormInput`, `WeekdayPicker`, or the validators.ts Zod schema.
- No default value pre-filled into Goal (placeholder only).

## Testing

Per project strategy, this is UI/screen code that depends on native modules
(toast, op-sqlite via the save mutation) and is verified on a simulator, not unit
tested. `yarn tsc` and `yarn lint` must be clean.

Manual verification on the New Habit screen:
1. Goal field shows `5 times` / `5 lần` as placeholder.
2. Save with empty Goal → danger toast, not saved.
3. Save with a Goal but all Due days deselected → danger toast, not saved.
4. Save with both missing → one toast listing both.
5. Save with a valid Goal and ≥1 Due day → saves as before.
