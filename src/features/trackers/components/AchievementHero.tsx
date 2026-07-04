import { View, StyleSheet } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import Svg, { Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg'
import { useThemeColors } from '@hooks/useThemeColors'

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
  currentStreak,
  bestStreak
}: {
  percent: number // 0..100
  currentStreak: number // days
  bestStreak: number // days
}) {
  const { t } = useTranslation()
  const c = useThemeColors()
  const frac = Math.max(0, Math.min(1, percent / 100))

  return (
    <View className='m-s5 overflow-hidden rounded-xl-k'>
      <Svg style={styles.gradient} width='100%' height='100%'>
        <Defs>
          <LinearGradient id='kite-hero-grad' x1='0' y1='0' x2='1' y2='1'>
            <Stop offset='0' stopColor={c.brandProjected} />
            <Stop offset='1' stopColor={c.brand} />
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
              stroke='rgba(255,255,255,0.22)'
              strokeWidth={RING_STROKE}
              fill='none'
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={c.onAccent}
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
            <Typography className='text-display-k font-bold text-on-accent'>
              {`${Math.round(percent)}%`}
            </Typography>
            <Typography className='text-xs font-bold uppercase text-on-accent opacity-80'>
              {t('detail.goalMet')}
            </Typography>
          </View>
        </View>

        <View className='flex-1 gap-s3'>
          <StreakStat
            value={currentStreak}
            unit={t('detail.days')}
            caption={t('detail.currentStreak')}
          />
          <View className='h-px bg-on-accent opacity-20' />
          <StreakStat
            value={bestStreak}
            unit={t('detail.days')}
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
      <View className='flex-row items-end gap-s2'>
        <Typography className='text-title-k font-bold text-on-accent'>
          {value}
        </Typography>
        <Typography className='mb-[3px] text-sm font-bold text-on-accent opacity-80'>
          {unit}
        </Typography>
      </View>
      <Typography className='mt-[2px] text-xs font-bold uppercase text-on-accent opacity-70'>
        {caption}
      </Typography>
    </View>
  )
}
