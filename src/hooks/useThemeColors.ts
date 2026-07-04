import type { PaceStatus } from '@features/trackers/types'
import { paceColorsFor } from '@features/trackers/icons'
import { useTheme } from '@hooks/useTheme'

/**
 * Concrete hex values for the active theme, for use where a Tailwind class
 * can't reach — react-native-svg fill/stroke and lucide `color=` props. Keeps
 * these sites in sync with the token palette in global.css by mirroring the
 * same light/dark values here.
 */
const LIGHT = {
  ink: '#1b1e18',
  ink2: '#565a4f',
  ink3: '#8a8e80',
  brand: '#2456b5',
  brandProjected: '#5b8af0',
  line: '#e3e5dc',
  lineStrong: '#d2d5c8',
  gridFaint: '#eef1f5',
  surface: '#ffffff',
  onAccent: '#ffffff',
  // Two-tone brand gradient for the hero header cards (AchievementHero /
  // TargetHero) — a distinct lighter→darker brand blend, not the flat brand.
  heroGradientFrom: '#3d7dd8',
  heroGradientTo: '#2f63b3'
}

const DARK: typeof LIGHT = {
  ink: '#e8eaed',
  ink2: '#a8adb5',
  ink3: '#6f757e',
  brand: '#5b8def',
  brandProjected: '#89b0f4',
  line: '#2c2f36',
  lineStrong: '#3a3e47',
  gridFaint: '#24272d',
  surface: '#1c1f24',
  onAccent: '#ffffff',
  // Deepened so the hero card doesn't glare against the dark app background.
  heroGradientFrom: '#2f63b3',
  heroGradientTo: '#1b3a6b'
}

export function useThemeColors() {
  const { resolvedTheme, isDark } = useTheme()
  const base = isDark ? DARK : LIGHT
  const pace = paceColorsFor(resolvedTheme)
  return {
    isDark,
    ...base,
    pace: pace.color as Record<PaceStatus, string>,
    paceWeak: pace.weak as Record<PaceStatus, string>
  }
}
