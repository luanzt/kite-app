import { View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type { Tracker, Entry } from '@features/trackers/types'
import { calculateTarget } from '@features/trackers/calculators/target'
import { fmtValCompact, pacePercent } from '@features/trackers/detailFormat'
import { PACE_COLOR } from '@features/trackers/icons'
import { toISODate } from '@utils/date'

const AXIS_TICKS = 5

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
  const today = toISODate(new Date())
  const p = calculateTarget(tracker, entries, today)
  const start = tracker.startValue ?? 0
  const fillFrac = Math.max(0, Math.min(1, p.percent))
  const markerPct = pacePercent(tracker) // 0..100 | null
  const fillColor = PACE_COLOR[p.paceStatus]

  // axis: 5 evenly-spaced values from start → goal
  const axis = Array.from({ length: AXIS_TICKS }, (_, i) =>
    fmtValCompact(tracker, start + ((p.goal - start) * i) / (AXIS_TICKS - 1))
  )

  return (
    <View className='mx-s5 mb-s5 rounded-xl-k border border-line bg-surface p-s5 shadow-md'>
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

      {/* track */}
      <View className='h-[34px] overflow-hidden rounded-md-k bg-surface-2'>
        <View
          className='h-full rounded-md-k'
          // runtime: fill is a live % of progress; color is the pace enum hex
          style={{ width: `${fillFrac * 100}%`, backgroundColor: fillColor }}
        />
      </View>

      {/* pace marker */}
      {markerPct != null ? (
        <View className='relative mt-s1 h-[8px]'>
          <View
            className='absolute top-0 h-[6px] w-[2px] bg-ink'
            // runtime: marker sits at the live time-elapsed %
            style={{ left: `${markerPct}%` }}
          />
        </View>
      ) : (
        <View className='mt-s1 h-[8px]' />
      )}

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
