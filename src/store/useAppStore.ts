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
  hasSeenWelcome: boolean
  icloudSyncEnabled: boolean
  lastSyncedAt: string | null
  setThemeMode: (mode: ThemeMode) => void
  setLanguage: (lang: Language) => void
  setNotifyEnabled: (v: boolean) => void
  markPermissionAsked: () => void
  markWelcomeSeen: () => void
  setIcloudSyncEnabled: (v: boolean) => void
  setLastSyncedAt: (iso: string | null) => void
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
      markPermissionAsked: () => set({ permissionAsked: true }),
      hasSeenWelcome: false,
      markWelcomeSeen: () => set({ hasSeenWelcome: true }),
      icloudSyncEnabled: false,
      lastSyncedAt: null,
      setIcloudSyncEnabled: (v: boolean) => set({ icloudSyncEnabled: v }),
      setLastSyncedAt: (iso: string | null) => set({ lastSyncedAt: iso })
    }),
    {
      name: 'app-storage',
      storage: mmkvZustandStorage
    }
  )
)
