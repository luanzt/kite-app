# Language detection: persist on first launch + hide selector on non-Vietnamese devices

Date: 2026-07-12
Status: approved

## Problem

On first launch the app detects the OS locale and sets the i18next language, but
never persists it — `useAppStore.language` stays `null` until the user manually
picks a language. So a Vietnamese-device user opens Settings and sees no
selection reflected. Also, the EN | VI selector is shown to everyone, but for
non-Vietnamese devices the app should just always be English.

## Behavior

1. **First launch** (persisted `language` is `null`): detect the OS locale as
   today (`getLocales()[0].languageCode === 'vi'` → `vi`, else `en`), and
   **persist the result to the store** so Settings reflects it immediately.
2. **Settings language row (EN | VI) visibility** — show when ANY of:
   - `__DEV__` (dev builds always show it), or
   - the device locale is Vietnamese, or
   - the persisted language is `vi` (safety net: anyone currently in Vietnamese
     can always switch back).
   Otherwise (production, non-Vietnamese device, language en/null): hide the
   row; the app is always English.

## Changes

- `src/i18n/index.ts`
  - `initI18n()`: when the store has no persisted language, persist the
    detected one via `setLanguage()`.
  - New pure function `showLanguageSetting(isDev, deviceCode, persisted)` and
    wrapper `shouldShowLanguageSetting()` that feeds it `__DEV__`,
    `getLocales()`, and the store value.
- `src/screens/settings/SettingsScreen.tsx`: render the language section only
  when `shouldShowLanguageSetting()` is true.

No store/schema changes. Existing users with `language = null` get the
detect-and-persist path on next launch.

## Testing

Unit tests (TDD) for the pure logic:

- `showLanguageSetting`: dev → true; vi device → true; en device + persisted
  `vi` → true; en device + persisted `en`/`null` (prod) → false.
- Detect-and-persist: `null` store + vi device persists `vi`; `null` store +
  non-vi device persists `en`; already-persisted value wins and is not
  overwritten.
