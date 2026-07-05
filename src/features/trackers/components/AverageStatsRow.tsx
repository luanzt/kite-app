import { View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type { Tracker } from '@features/trackers/types'
import type { AverageBucketStats } from '@features/trackers/calculators/averageStats'
import { fmtNum } from '@features/trackers/detailFormat'
import { useThemeColors } from '@hooks/useThemeColors'

const RING_SIZE = 104
const RING_STROKE = 8

/** Thin progress ring (-90° start), same construction as the Today card's. */
function Ring({ fraction, color }: { fraction: number; color: string }) {
  const c = useThemeColors()
  const r = (RING_SIZE - RING_STROKE) / 2
  const circumference = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, fraction))
  return (
    <Svg
      width={RING_SIZE}
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      // runtime: SVG transform, no className equivalent
      style={{ transform: [{ rotate: '-90deg' }] }}
    >
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={r}
        fill='none'
        stroke={c.line}
        strokeWidth={RING_STROKE}
      />
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={r}
        fill='none'
        stroke={color}
        strokeWidth={RING_STROKE}
        strokeLinecap='round'
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
      />
    </Svg>
  )
}

/**
 * Strides-style stats trio: current streak | average ring (official Ø vs goal,
 * with "X under/over") | success rate over period buckets.
 */
export function AverageStatsRow({
  tracker,
  average,
  stats
}: {
  tracker: Tracker
  average: number
  stats: AverageBucketStats
}) {
  const { t } = useTranslation()
  const c = useThemeColors()
  const goal = tracker.targetValue ?? 0
  const diff = goal - average
  const met = goal > 0 && average >= goal
  const unitLabel =
    stats.unit === 'day'
      ? t('detail.days')
      : stats.unit === 'week'
      ? t('detail.unitWeeks')
      : t('detail.unitMonths')
  const pct = stats.dueBuckets
    ? Math.round((stats.metBuckets / stats.dueBuckets) * 100)
    : 0

  return (
    <View className='m-s5 flex-row items-center rounded-xl-k border border-line bg-surface p-s5'>
      {/* current streak */}
      <View className='flex-1 items-center gap-s1'>
        <Typography className='text-center text-xs font-bold text-ink-2'>
          {t('detail.currentStreak')}
        </Typography>
        <Typography className='text-3xl font-bold text-ink'>
          {stats.streak}
        </Typography>
        <Typography className='text-xs text-ink-3'>{unitLabel}</Typography>
      </View>

      {/* average ring */}
      <View className='items-center justify-center'>
        <Ring
          fraction={goal > 0 ? average / goal : 0}
          color={met ? c.pace.on_track : c.brand}
        />
        <View className='absolute items-center'>
          <Typography className='text-xs font-bold text-ink-2'>
            {t('detail.avgChartTitle')}
          </Typography>
          <Typography
            className={`text-2xl font-bold ${
              met ? 'text-pace-on' : 'text-pace-behind'
            }`}
          >
            {fmtNum(average)}
          </Typography>
          {goal > 0 ? (
            <Typography className='text-xs text-ink-3'>
              {diff > 0
                ? t('detail.avgUnder', { n: fmtNum(diff) })
                : t('detail.avgOver', { n: fmtNum(-diff) })}
            </Typography>
          ) : null}
        </View>
      </View>

      {/* success rate */}
      <View className='flex-1 items-center gap-s1'>
        <Typography className='text-center text-xs font-bold text-ink-2'>
          {t('detail.successRate')}
        </Typography>
        <Typography className='text-3xl font-bold text-ink'>
          {`${pct}%`}
        </Typography>
        <Typography className='text-xs text-ink-3'>
          {`${stats.metBuckets}/${stats.dueBuckets} ${unitLabel}`}
        </Typography>
      </View>
    </View>
  )
}
