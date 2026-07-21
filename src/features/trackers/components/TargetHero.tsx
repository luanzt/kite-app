import { View, StyleSheet } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import Svg, { Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg'
import type { Tracker, Entry } from '@features/trackers/types'
import { calculateTarget } from '@features/trackers/calculators/target'
import { buildTargetTrajectory } from '@features/trackers/calculators'
import {
  fmtValCompact,
  fmtCompact,
  daysLeft
} from '@features/trackers/detailFormat'
import { toISODate } from '@utils/date'
import { useThemeColors } from '@hooks/useThemeColors'
import { progressFill } from '@features/trackers/icons'
import { PaceChip } from './PaceBar'

const RING_SIZE = 128
const RING_STROKE = 12
const RING_R = (RING_SIZE - RING_STROKE) / 2
const RING_C = 2 * Math.PI * RING_R

// react-native-svg gradient fill for the card, clipped by overflow-hidden.
const styles = StyleSheet.create({
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }
})

/** Localized date with year "Aug 2, 2026" for the projected caption. */
function projDate(iso: string, lang: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(lang, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  })
}

/**
 * TargetHero — the Target Overview header. A brand gradient card (matching
 * AchievementHero) with a white progress ring on the left, a pace pill on top,
 * and a daily-goal / projected stat stack on the right.
 */
export function TargetHero({
  tracker,
  entries
}: {
  tracker: Tracker
  entries: Entry[]
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const c = useThemeColors()
  const today = toISODate(new Date())
  const p = calculateTarget(tracker, entries, today)
  const traj = buildTargetTrajectory(tracker, entries, today)
  // Strides-style projection: forecast value AT the deadline (date = deadline).
  // Null only for deadline-less targets, which render "—".
  const projPoint = traj.projected
  const frac = Math.max(0, Math.min(1, p.percent))
  const remain = daysLeft(tracker)
  const toGo = Math.abs(p.goal - p.current)

  const hasPace = p.paceStatus !== 'none'
  const ringColor = progressFill(p.paceStatus, c.pace, c.onAccent)
  const aheadAmount =
    p.expected != null ? Math.abs(p.current - p.expected) : null
  const paceDirKey =
    p.paceStatus === 'behind'
      ? 'behind'
      : p.paceStatus === 'ahead'
      ? 'ahead'
      : 'onTrack'

  return (
    <View className='m-s5 overflow-hidden rounded-xl-k border border-line'>
      <Svg style={styles.gradient} width='100%' height='100%'>
        <Defs>
          <LinearGradient id='kite-target-hero' x1='0' y1='0' x2='1' y2='1'>
            <Stop offset='0' stopColor={c.heroGradientFrom} />
            <Stop offset='1' stopColor={c.heroGradientTo} />
          </LinearGradient>
        </Defs>
        <Rect
          x='0'
          y='0'
          width='100%'
          height='100%'
          fill='url(#kite-target-hero)'
        />
      </Svg>

      <View className='p-s5'>
        {/* pace pill */}
        {hasPace && aheadAmount != null ? (
          <View className='mb-s4 flex-row justify-center'>
            <PaceChip
              paceStatus={p.paceStatus}
              label={`${fmtValCompact(tracker, aheadAmount)} ${t(
                `detail.${paceDirKey}`
              ).toLowerCase()} · ${t('detail.pace')} ${fmtValCompact(
                tracker,
                p.expected ?? 0
              )}`}
            />
          </View>
        ) : null}

        <View className='flex-row items-center gap-s5'>
          {/* ring */}
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
              {/* unit dropped inside the ring — the goal line above the card
                  already states the unit, so the ring stays uncluttered */}
              <Typography className='text-title-k font-bold text-on-accent'>
                {fmtCompact(p.current)}
              </Typography>
              <Typography className='mt-s1 text-xs font-bold text-on-accent opacity-80'>
                {`${fmtCompact(toGo)} ${t('detail.toGo')}`}
              </Typography>
            </View>
          </View>

          {/* stat stack — caption on top, value below */}
          <View className='flex-1 gap-s3'>
            <View>
              <Typography className='text-xs font-bold text-on-accent opacity-80'>
                {`${t('detail.dailyGoal')} · ${remain ?? 0} ${t(
                  'detail.left'
                )}`}
              </Typography>
              <View className='mt-s1 flex-row items-end gap-s2'>
                <Typography className='text-h2-k font-bold text-on-accent'>
                  {fmtValCompact(tracker, traj.dailyGoal)}
                </Typography>
                <Typography className='mb-[3px] text-sm font-bold text-on-accent opacity-90'>
                  {t('detail.perDay')}
                </Typography>
              </View>
            </View>

            <View className='h-px bg-on-accent opacity-20' />

            <View>
              <Typography className='text-xs font-bold text-on-accent opacity-80'>
                {projPoint
                  ? t('detail.projectedOn', {
                      date: projDate(projPoint.date, lang)
                    })
                  : t('detail.projected')}
              </Typography>
              <Typography className='mt-s1 text-h2-k font-bold text-on-accent'>
                {projPoint ? fmtValCompact(tracker, projPoint.value) : '—'}
              </Typography>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}
