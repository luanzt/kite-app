import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { mmkvZustandStorage } from '@utils/storage'
import type { Language } from '@i18n/index'
import type { ThemeMode } from '@hooks/resolveTheme'

type AppState = {
  themeMode: ThemeMode
  language: Language | null
  notifyEnabled: boolean
  permissionAsked: boolean
  setThemeMode: (mode: ThemeMode) => void
  setLanguage: (lang: Language) => void
  setNotifyEnabled: (v: boolean) => void
  markPermissionAsked: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      setThemeMode: (mode: ThemeMode) => set({ themeMode: mode }),
      language: null,
      setLanguage: (lang: Language) => set({ language: lang }),
      notifyEnabled: false,
      permissionAsked: false,
      setNotifyEnabled: (v: boolean) => set({ notifyEnabled: v }),
      markPermissionAsked: () => set({ permissionAsked: true })
    }),
    {
      name: 'app-storage',
      storage: mmkvZustandStorage
    }
  )
)
