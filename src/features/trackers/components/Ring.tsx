import Svg, { Circle } from 'react-native-svg'
import { useThemeColors } from '@hooks/useThemeColors'

/**
 * Thin progress ring (arc starts at −90°): a colored arc over a neutral track.
 * `trackColor` defaults to the theme's line color. Extracted from the twin
 * copies that lived in DailyGoalsScreen and AverageStatsRow.
 */
export function Ring({
  fraction,
  color,
  size,
  strokeWidth,
  trackColor
}: {
  fraction: number
  color: string
  size: number
  strokeWidth: number
  trackColor?: string
}) {
  const theme = useThemeColors()
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, fraction))
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      // runtime: SVG transform, no className equivalent
      style={{ transform: [{ rotate: '-90deg' }] }}
    >
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill='none'
        stroke={trackColor ?? theme.line}
        strokeWidth={strokeWidth}
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill='none'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
      />
    </Svg>
  )
}
