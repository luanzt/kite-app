import { View } from 'react-native'

/** Normalize each bar count to a 0..1 fraction of `scaleMax` (clamped). */
export function normalizeBars(values: number[], scaleMax: number): number[] {
  if (scaleMax <= 0) return values.map(() => 0)
  return values.map((v) => Math.max(0, Math.min(1, v / scaleMax)))
}

/**
 * Tiny cadence sparkline for the `average` card — a row of fixed-width bars
 * whose heights are counts normalized to `scaleMax` (from `periodSessions`).
 * `color` is the tracker's personal identity hex (never theme chrome), so it
 * must be an inline style — a computed hex can't live in a Tailwind class.
 */
export function MiniBars({
  values,
  scaleMax,
  color,
  height = 40,
  maxBars = 12
}: {
  values: number[]
  scaleMax: number
  color: string
  height?: number
  maxBars?: number
}) {
  const shown = values.slice(-maxBars)
  const fractions = normalizeBars(shown, scaleMax)
  return (
    <View
      className='flex-row items-end gap-[3px] overflow-hidden'
      // runtime: caller-driven pixel height, no class equivalent
      style={{ height }}
    >
      {fractions.map((f, i) => (
        <View
          key={i}
          className='w-[7px] rounded-[3px]'
          // runtime: continuous height + personal identity color, no class equivalent
          style={{ height: Math.max(2, f * height), backgroundColor: color }}
        />
      ))}
    </View>
  )
}
