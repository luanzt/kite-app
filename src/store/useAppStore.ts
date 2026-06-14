import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mmkvZustandStorage } from '@utils/storage';

type ThemeMode = 'light' | 'dark';

type AppState = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
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
    }),
    {
      name: 'app-storage',
      storage: mmkvZustandStorage,
    },
  ),
);
