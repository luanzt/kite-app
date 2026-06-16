import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'react-native-localize'
import en from './locales/en.json'
import vi from './locales/vi.json'
import { useAppStore } from '@store/useAppStore'

export type Language = 'en' | 'vi'

function detectInitialLanguage(): Language {
  const persisted = useAppStore.getState().language
  if (persisted) return persisted
  const best = getLocales()[0]?.languageCode
  return best === 'vi' ? 'vi' : 'en'
}

export function initI18n(): void {
  const lng = detectInitialLanguage()
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, vi: { translation: vi } },
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  })
}

export function changeLanguage(lang: Language): void {
  i18n.changeLanguage(lang)
  useAppStore.getState().setLanguage(lang)
}

export default i18n
