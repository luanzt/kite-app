import { View } from 'react-native'
import { Typography } from 'heroui-native'
import type { PaceStatus } from '@features/trackers/types'
import { PACE_DOT_CLASS, progressFill } from '@features/trackers/icons'
import { useThemeColors } from '@hooks/useThemeColors'

/**
 * Normalize a progress value to a 0..1 fraction.
 * Calculators emit 0..1; tolerate a 0..100 value just in case a caller
 * passes a raw percentage.
 */
function toFraction(value: number): number {
  if (!Number.isFinite(value)) return 0
  const v = value > 1 ? value / 100 : value
  return Math.max(0, Math.min(1, v))
}

const PACE_WEAK_CLASS: Record<PaceStatus, string> = {
  on_track: 'bg-pace-on-weak',
  behind: 'bg-pace-behind-weak',
  ahead: 'bg-pace-ahead-weak',
  none: 'bg-pace-none-weak'
}

const PACE_TEXT_CLASS: Record<PaceStatus, string> = {
  on_track: 'text-pace-on',
  behind: 'text-pace-behind',
  ahead: 'text-pace-ahead',
  none: 'text-pace-none'
}

/**
 * PaceBar — the signature progress track. A rounded-full track with a colored
 * fill and an optional vertical "pace marker" showing where you *should* be by
 * now (matches .pacebar in screens.css).
 *
 * Fill width, fill color and marker offset are runtime-dynamic → inline style
 * is the documented exception; all static styling stays in className.
 */
export function PaceBar({
  percent,
  paceStatus,
  paceMarkerPercent,
  height = 14,
  label
}: {
  percent: number
  paceStatus: PaceStatus
  paceMarkerPercent?: number | null
  height?: number
  label?: string
}) {
  const c = useThemeColors()
  const fillFrac = toFraction(percent)
  const fillColor = progressFill(paceStatus, c.pace, c.brand)
  const markerFrac =
    paceMarkerPercent == null ? null : toFraction(paceMarkerPercent)

  return (
    <View className='gap-s2'>
      <View
        className='relative justify-center rounded-full bg-surface-2 border border-line'
        style={{ height }} // runtime: height is a caller prop
      >
        <View
          className='absolute left-0 top-0 bottom-0 rounded-full'
          // runtime: fill width is a live % of progress, color is the pace enum's hex
          style={{ width: `${fillFrac * 100}%`, backgroundColor: fillColor }}
        />
        {markerFrac != null ? (
          <View
            className='absolute top-[-6px] ml-[-1.5px] w-[3px] rounded-sm-k bg-ink'
            // runtime: marker left is a live % position; height tracks the prop
            style={{ left: `${markerFrac * 100}%`, height: height + 12 }}
          />
        ) : null}
      </View>
      {label ? (
        <Typography className='text-xs text-ink-2'>{label}</Typography>
      ) : null}
    </View>
  )
}

/**
 * PaceChip — a pill showing a colored dot + the pace label, tinted by status.
 * Matches .pace-label in screens.css.
 */
export function PaceChip({
  paceStatus,
  label
}: {
  paceStatus: PaceStatus
  label: string
}) {
  return (
    <View
      className={`flex-row items-center gap-s2 self-start rounded-full px-3 py-1 ${PACE_WEAK_CLASS[paceStatus]}`}
    >
      <View className={`h-2 w-2 rounded-full ${PACE_DOT_CLASS[paceStatus]}`} />
      <Typography
        className={`text-sm font-bold ${PACE_TEXT_CLASS[paceStatus]}`}
      >
        {label}
      </Typography>
    </View>
  )
}
