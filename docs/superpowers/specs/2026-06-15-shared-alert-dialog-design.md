# Shared AlertDialog (imperative `useAlert`)

**Date:** 2026-06-15
**Supersedes:** the toast-based error display from
`2026-06-15-habit-form-validation-design.md`. The HeroUI Native `Toast`
collapsed to a tiny box in the top-left on iOS (its `absolute left-0 right-0`
container resolved against a zero-width `FullWindowOverlay` window); disabling
the overlay did not fix it. We switch to a reusable Dialog instead.

## Goal

A single reusable alert/confirm dialog usable from anywhere via an imperative
hook, replacing the broken validation toast on the habit form and serving future
needs (e.g. "Delete tracker?" confirmation).

## API

```ts
const alert = useAlert();
alert({
  title: string,
  message?: string,
  variant?: 'default' | 'danger',   // default 'default'; danger → red confirm button
  confirmLabel?: string,            // default t('common.ok')
  onConfirm?: () => void,
  cancelLabel?: string,             // if provided → two-button confirm dialog
  onCancel?: () => void,
});
```

- **One button** (info / validation): pass only title/message (+ optional
  `confirmLabel`/`onConfirm`).
- **Two buttons** (confirm): also pass `cancelLabel`. Confirm runs `onConfirm`
  then closes; Cancel runs `onCancel` then closes.

## Components / files

- `src/components/ui/AlertDialog.tsx` — exports `AlertProvider` and `useAlert`.
  - Module-level React context holds `alert(config)`.
  - `AlertProvider` keeps `useState<AlertConfig | null>` + open flag. Renders ONE
    controlled HeroUI `Dialog` (`isOpen` / `onOpenChange`).
  - `Dialog.Portal` uses `disableFullWindowOverlay` to avoid the same iOS
    overlay-window sizing problem that collapsed the toast. The dialog is a
    centered modal and nothing native renders over it, so there is no downside.
  - Anatomy: `Dialog.Portal` → `Dialog.Overlay` (dim scrim, `bg-black/60` to match
    `SelectField`'s explicit scrim) → `Dialog.Content` → Title, Description,
    footer buttons.
  - Footer: HeroUI `Button`. Confirm button `variant` = `danger` when
    `variant === 'danger'`, else `primary`. Cancel = `ghost`.
  - `useAlert()` reads context; throws if used outside `AlertProvider`
    (mirrors `useToast`).
- `src/components/ui/index.ts` — export `AlertProvider`, `useAlert`.
- `App.tsx` — mount `<AlertProvider>` INSIDE `HeroUINativeProvider` (needs HeroUI
  context) wrapping `RootNavigator`, so every screen can call `useAlert()`.

## Wiring the habit form

`TrackerFormScreen.onSave`:
- Remove the debug custom-component toast and the `useToast` import.
- On validation failure call:
  ```ts
  alert({ title: t('form.errTitle'), message: problems.join('\n'), variant: 'danger' });
  return;
  ```

## i18n

- Reuse existing `form.errTitle`, `form.errGoal`, `form.errDue`.
- Add `common.ok` → en `"OK"`, vi `"OK"` (used as default confirm label). Keep
  both locale files key-for-key in sync.

## Cleanup

- Revert the `disableFullWindowOverlay: true` added to `theme/index.ts`'s `toast`
  config (no longer using toast for this). Leave the rest of the `toast` block.

## Out of scope

- No migration of other call sites yet (delete-confirm, etc.) — the API supports
  them, but wiring is a follow-up.
- No changes to `FormInput` / `WeekdayPicker` / validators.ts.

## Testing

UI/native-dependent (Dialog uses native overlay + reanimated) → verified on
simulator, not unit-tested. `yarn tsc` and `yarn lint` must be clean. Manual:
1. Save habit with empty Goal → danger alert dialog, not saved.
2. Save with all Due days deselected → danger alert dialog, not saved.
3. Both missing → one dialog listing both lines.
4. Valid Goal + ≥1 Due day → saves.
5. Dialog is centered, full-width-appropriate, dismissable via OK / overlay tap.
