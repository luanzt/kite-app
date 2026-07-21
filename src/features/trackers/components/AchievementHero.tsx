import { View, StyleSheet } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import Svg, { Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg'
import { useThemeColors } from '@hooks/useThemeColors'
import { progressFill } from '@features/trackers/icons'
import { habitBarStatus } from '@features/trackers/calculators/habitStats'

const RING_SIZE = 128
const RING_STROKE = 12
const RING_R = (RING_SIZE - RING_STROKE) / 2
const RING_C = 2 * Math.PI * RING_R

/**
 * react-native-svg fills the gradient backdrop (we have no gradient native dep,
 * and the SVG <LinearGradient> the HistoryChart already uses needs none). It is
 * absolutely positioned to fill the rounded card; `overflow-hidden` on the card
 * clips it to the corner radius.
 */
const styles = StyleSheet.create({
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }
})

/**
 * AchievementHero — the Habit Detail header: a brand gradient card with a white
 * "goal met" achievement ring and the current / best streak beside it.
 */
export function AchievementHero({
  percent,
  daysDone,
  daysTotal,
  currentStreak,
  bestStreak,
  unitKey
}: {
  percent: number // 0..100
  daysDone: number // due days met from start → today
  daysTotal: number // due days from start → today (denominator of percent)
  currentStreak: number // in the cadence unit
  bestStreak: number // in the cadence unit
  unitKey: string // i18n key of the pluralizable unit noun ("unit.month" …)
}) {
  const { t } = useTranslation()
  const c = useThemeColors()
  const frac = Math.max(0, Math.min(1, percent / 100))
  const ringColor = progressFill(
    habitBarStatus(percent, 100, false),
    c.pace,
    c.onAccent
  )

  return (
    <View className='m-s5 overflow-hidden rounded-xl-k border border-line'>
      <Svg style={styles.gradient} width='100%' height='100%'>
        <Defs>
          <LinearGradient id='kite-hero-grad' x1='0' y1='0' x2='1' y2='1'>
            <Stop offset='0' stopColor={c.heroGradientFrom} />
            <Stop offset='1' stopColor={c.heroGradientTo} />
          </LinearGradient>
        </Defs>
        <Rect
          x='0'
          y='0'
          width='100%'
          height='100%'
          fill='url(#kite-hero-grad)'
        />
      </Svg>

      <View className='flex-row items-center gap-s5 p-s5'>
        <View className='h-[128px] w-[128px] items-center justify-center'>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={c.heroRingTrack}
              strokeWidth={RING_STROKE}
              fill='none'
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={ringColor}
              strokeWidth={RING_STROKE}
              strokeLinecap='round'
              fill='none'
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - frac)}
              rotation={-90}
              originX={RING_SIZE / 2}
              originY={RING_SIZE / 2}
            />
          </Svg>
          <View className='absolute inset-0 items-center justify-center'>
            <Typography className='text-xs font-bold text-on-accent opacity-80'>
              {t('detail.goalMet')}
            </Typography>
            <Typography className='text-display-k font-bold text-on-accent'>
              {`${Math.round(percent)}%`}
            </Typography>
            {/* days met / due days from start → today (numerator/denominator of
                the percent above) */}
            <Typography className='mt-[1px] text-xs font-bold text-on-accent opacity-80'>
              {`${daysDone}/${daysTotal} ${t(unitKey, { count: daysTotal })}`}
            </Typography>
          </View>
        </View>

        <View className='flex-1 gap-s3'>
          <StreakStat
            value={currentStreak}
            unit={t(unitKey, { count: currentStreak })}
            caption={t('detail.currentStreak')}
          />
          <View className='h-px bg-on-accent opacity-20' />
          <StreakStat
            value={bestStreak}
            unit={t(unitKey, { count: bestStreak })}
            caption={t('detail.bestStreak')}
          />
        </View>
      </View>
    </View>
  )
}

function StreakStat({
  value,
  unit,
  caption
}: {
  value: number
  unit: string
  caption: string
}) {
  return (
    <View>
      <Typography className='text-xs font-bold text-on-accent opacity-80'>
        {caption}
      </Typography>
      <View className='mt-s1 flex-row items-end gap-s2'>
        <Typography className='text-title-k font-bold text-on-accent'>
          {value}
        </Typography>
        <Typography className='mb-[3px] text-sm font-bold text-on-accent opacity-90'>
          {unit}
        </Typography>
      </View>
    </View>
  )
}
