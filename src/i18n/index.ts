import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'react-native-localize'
import en from './locales/en.json'
import vi from './locales/vi.json'
import { useAppStore } from '@store/useAppStore'
import {
  detectLanguage,
  showLanguageSetting,
  type Language
} from './languageRules'

export type { Language }

function deviceLanguageCode(): string | undefined {
  return getLocales()[0]?.languageCode
}

export function initI18n(): void {
  const persisted = useAppStore.getState().language
  const lng = detectLanguage(persisted, deviceLanguageCode())
  if (!persisted) useAppStore.getState().setLanguage(lng)
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, vi: { translation: vi } },
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  })
}

export function shouldShowLanguageSetting(): boolean {
  return showLanguageSetting(
    __DEV__,
    deviceLanguageCode(),
    useAppStore.getState().language
  )
}

export function changeLanguage(lang: Language): void {
  i18n.changeLanguage(lang)
  useAppStore.getState().setLanguage(lang)
}

export default i18n
