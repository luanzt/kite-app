import { useEffect } from 'react';
import { Uniwind, useUniwind } from 'uniwind';
import { useAppStore } from '@store/useAppStore';

export function useTheme() {
  const { themeMode, toggleTheme, setThemeMode } = useAppStore();
  const { theme: activeTheme } = useUniwind();

  useEffect(() => {
    Uniwind.setTheme(themeMode);
  }, [themeMode]);

  return {
    themeMode,
    activeTheme,
    isDark: themeMode === 'dark',
    toggleTheme,
    setThemeMode,
  };
}
