import { useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { Uniwind } from 'uniwind'
import { useAppStore } from '@store/useAppStore'
import { resolveTheme } from '@hooks/resolveTheme'

/**
 * Bridges the persisted themeMode preference to Uniwind's active theme.
 * `system` follows the OS color scheme live. Returns the resolved concrete
 * theme so components (and useThemeColors) can pick theme-aware hex values.
 */
export function useTheme() {
  const themeMode = useAppStore((s) => s.themeMode)
  const setThemeMode = useAppStore((s) => s.setThemeMode)
  const colorScheme = useColorScheme() // 'light' | 'dark' | 'unspecified' | null
  const systemScheme = (colorScheme === 'light' || colorScheme === 'dark') ? colorScheme : null
  const resolvedTheme = resolveTheme(themeMode, systemScheme)

  useEffect(() => {
    Uniwind.setTheme(resolvedTheme)
  }, [resolvedTheme])

  return {
    themeMode,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    setThemeMode
  }
}
