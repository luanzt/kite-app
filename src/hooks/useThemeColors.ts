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
  bg: '#eef1f6',
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
  // Very pale blue two-tone for the hero header cards (AchievementHero /
  // TargetHero / AverageStatsRow) — a barely-there blue tint on a light card so
  // the ring + numbers carry the pace palette (ink text, pace-colored ring)
  // instead of white-on-brand.
  heroGradientFrom: '#e4edfc',
  heroGradientTo: '#d2e2fa'
}

const DARK: typeof LIGHT = {
  bg: '#121417',
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
  // Subtle navy tint just above the dark surface — the dark-mode counterpart of
  // the pale-blue light hero (ink text + pace-colored ring, not white-on-brand).
  heroGradientFrom: '#212c40',
  heroGradientTo: '#1a2334'
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
