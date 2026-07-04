export type ResolvedTheme = 'light' | 'dark'
export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * Resolve the user's theme preference to a concrete theme. `system` follows the
 * OS color scheme (from RN useColorScheme, which may be null), defaulting to
 * light when the scheme is unknown.
 */
export function resolveTheme(
  mode: ThemeMode,
  systemScheme: 'light' | 'dark' | null
): ResolvedTheme {
  if (mode === 'system') return systemScheme === 'dark' ? 'dark' : 'light'
  return mode
}
