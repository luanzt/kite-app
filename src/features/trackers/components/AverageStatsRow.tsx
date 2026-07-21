import { View, StyleSheet } from 'react-native'
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type { Tracker } from '@features/trackers/types'
import type { AverageBucketStats } from '@features/trackers/calculators/averageStats'
import { fmtNum } from '@features/trackers/detailFormat'
import { useThemeColors } from '@hooks/useThemeColors'
import { progressFill } from '@features/trackers/icons'
import { Ring } from './Ring'

const RING_SIZE = 104
const RING_STROKE = 8

/**
 * Gradient backdrop, same construction as AchievementHero: an absolutely
 * positioned SVG rect clipped to the card's radius by `overflow-hidden`.
 */
const styles = StyleSheet.create({
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }
})

/**
 * Average Detail hero — AchievementHero-styled brand-gradient card with the
 * Strides stats trio: current streak | average ring (official Ø vs goal, with
 * "X under/over") | success rate over period buckets.
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
  // "or less" goals: ring is full while at/below goal, drains as it overshoots
  const ringFraction =
    goal <= 0
      ? 0
      : tracker.direction === 'bad'
      ? average <= goal
        ? 1
        : goal / average
      : average / goal
  const unitLabel =
    stats.unit === 'day'
      ? t('detail.days')
      : stats.unit === 'week'
      ? t('detail.unitWeeks')
      : t('detail.unitMonths')
  const pct = stats.loggedBuckets
    ? Math.round((stats.metBuckets / stats.loggedBuckets) * 100)
    : 0
  const ringColor = progressFill(
    ringFraction >= 1 ? 'on_track' : 'none',
    c.pace,
    c.brand
  )

  return (
    <View className='m-s5 overflow-hidden rounded-xl-k border border-line'>
      <Svg style={styles.gradient} width='100%' height='100%'>
        <Defs>
          <LinearGradient id='kite-avg-hero-grad' x1='0' y1='0' x2='1' y2='1'>
            <Stop offset='0' stopColor={c.heroGradientFrom} />
            <Stop offset='1' stopColor={c.heroGradientTo} />
          </LinearGradient>
        </Defs>
        <Rect
          x='0'
          y='0'
          width='100%'
          height='100%'
          fill='url(#kite-avg-hero-grad)'
        />
      </Svg>

      <View className='flex-row items-center p-s5'>
        {/* current streak */}
        <View className='flex-1 items-center gap-s1'>
          <Typography className='text-center text-xs font-bold uppercase text-ink-3'>
            {t('detail.currentStreak')}
          </Typography>
          <Typography className='text-3xl font-bold text-ink'>
            {stats.streak}
          </Typography>
          <Typography className='text-xs font-bold text-ink-2'>
            {unitLabel}
          </Typography>
        </View>

        {/* average ring */}
        <View className='items-center justify-center'>
          <Ring
            fraction={ringFraction}
            color={ringColor}
            trackColor={c.line}
            size={RING_SIZE}
            strokeWidth={RING_STROKE}
          />
          <View className='absolute items-center'>
            <Typography className='text-xs font-bold uppercase text-ink-3'>
              {t('detail.avgChartTitle')}
            </Typography>
            <Typography className='text-2xl font-bold text-ink'>
              {fmtNum(average)}
            </Typography>
            {goal > 0 ? (
              <Typography className='text-xs font-bold text-ink-2'>
                {diff > 0
                  ? t('detail.avgUnder', { n: fmtNum(diff) })
                  : t('detail.avgOver', { n: fmtNum(-diff) })}
              </Typography>
            ) : null}
          </View>
        </View>

        {/* success rate */}
        <View className='flex-1 items-center gap-s1'>
          <Typography className='text-center text-xs font-bold uppercase text-ink-3'>
            {t('detail.successRate')}
          </Typography>
          <Typography className='text-3xl font-bold text-ink'>
            {`${pct}%`}
          </Typography>
          <Typography className='text-xs font-bold text-ink-2'>
            {`${stats.metBuckets}/${stats.loggedBuckets} ${unitLabel}`}
          </Typography>
        </View>
      </View>
    </View>
  )
}
