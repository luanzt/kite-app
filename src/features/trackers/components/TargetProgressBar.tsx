import { View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import Svg, { Line, Polygon } from 'react-native-svg'
import type { Tracker, Entry } from '@features/trackers/types'
import { calculateTarget } from '@features/trackers/calculators/target'
import { fmtValCompact, pacePercent } from '@features/trackers/detailFormat'
import { progressFill } from '@features/trackers/icons'
import { useThemeColors } from '@hooks/useThemeColors'
import { toISODate } from '@utils/date'

const AXIS_TICKS = 5
// Pace-marker geometry: a dashed vertical line across the track's height with a
// small triangle pointing up to it, just below the bar. Drawn in one SVG so the
// dash + triangle stay pixel-aligned at the live marker position.
const TRACK_H = 34
const MARKER_W = 14
const TRI_H = 7
const MARKER_H = TRACK_H + TRI_H

/**
 * TargetProgressBar — a beefed-up pace bar: current/goal header, a tall filled
 * track with a vertical pace marker at the time-elapsed position, a value axis,
 * and a "pace marker" caption. Fill width, marker offset and fill color are
 * continuous runtime values → inline style (the documented exception).
 */
export function TargetProgressBar({
  tracker,
  entries
}: {
  tracker: Tracker
  entries: Entry[]
}) {
  const { t } = useTranslation()
  const c = useThemeColors()
  const today = toISODate(new Date())
  const p = calculateTarget(tracker, entries, today)
  const start = tracker.startValue ?? 0
  const fillFrac = Math.max(0, Math.min(1, p.percent))
  const markerPct = pacePercent(tracker) // 0..100 | null
  const fillColor = progressFill(p.paceStatus, c.pace, c.brand)

  // axis: 5 evenly-spaced values from start → goal
  const axis = Array.from({ length: AXIS_TICKS }, (_, i) =>
    fmtValCompact(tracker, start + ((p.goal - start) * i) / (AXIS_TICKS - 1))
  )

  return (
    <View className='mx-s4 mb-s5 rounded-xl-k border border-line bg-surface p-s5 shadow-md'>
      <View className='mb-s3 flex-row items-baseline justify-between'>
        <Typography className='text-h3-k font-bold text-ink'>
          {t('common.progress', 'Progress')}
        </Typography>
        <Typography className='text-h3-k font-bold text-brand'>
          {fmtValCompact(tracker, p.current)}
          <Typography className='text-h3-k font-bold text-ink-3'>
            {` / ${fmtValCompact(tracker, p.goal)}`}
          </Typography>
        </Typography>
      </View>

      {/* track + pace marker (dashed line across the bar + triangle below) */}
      <View className='relative mb-[9px]'>
        <View className='h-[34px] overflow-hidden bg-surface-2'>
          <View
            className='h-full'
            // runtime: fill is a live % of progress; color is the pace enum hex
            style={{ width: `${fillFrac * 100}%`, backgroundColor: fillColor }}
          />
        </View>
        {markerPct != null ? (
          <View
            className='absolute top-0'
            // runtime: marker sits at the live time-elapsed %, centered on it
            style={{ left: `${markerPct}%`, marginLeft: -MARKER_W / 2 }}
          >
            <Svg width={MARKER_W} height={MARKER_H}>
              <Line
                x1={MARKER_W / 2}
                y1={0}
                x2={MARKER_W / 2}
                y2={TRACK_H}
                stroke={c.ink}
                strokeWidth={2}
                strokeDasharray='4,3'
              />
              <Polygon
                points={`${MARKER_W / 2 - 5},${MARKER_H} ${
                  MARKER_W / 2 + 5
                },${MARKER_H} ${MARKER_W / 2},${TRACK_H}`}
                fill={c.ink}
              />
            </Svg>
          </View>
        ) : null}
      </View>

      {/* axis */}
      <View className='flex-row justify-between'>
        {axis.map((label, i) => (
          <Typography
            key={`${label}-${i}`}
            className='text-[11px] font-bold text-ink-3'
          >
            {label}
          </Typography>
        ))}
      </View>

      {markerPct != null ? (
        <View className='mt-s3 flex-row items-center justify-center gap-s2'>
          <View className='h-[2px] w-[14px] bg-ink' />
          <Typography className='text-xs font-medium text-ink-3'>
            {`${t('detail.paceMarker')} · ${fmtValCompact(
              tracker,
              p.expected ?? 0
            )}`}
          </Typography>
        </View>
      ) : null}
    </View>
  )
}
