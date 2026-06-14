import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mmkvZustandStorage } from '@utils/storage';

type ThemeMode = 'light' | 'dark';
type Language = 'en' | 'vi';

type AppState = {
  themeMode: ThemeMode;
  language: Language;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    set => ({
      themeMode: 'light',
      setThemeMode: (mode: ThemeMode) => set({ themeMode: mode }),
      toggleTheme: () =>
        set(state => ({
          themeMode: state.themeMode === 'light' ? 'dark' : 'light',
        })),
      language: 'en',
      setLanguage: (lang: Language) => set({ language: lang }),
    }),
    {
      name: 'app-storage',
      storage: mmkvZustandStorage,
    },
  ),
);
