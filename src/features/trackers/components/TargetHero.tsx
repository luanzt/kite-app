import { View, StyleSheet } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import Svg, { Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg'
import type { Tracker, Entry } from '@features/trackers/types'
import { calculateTarget } from '@features/trackers/calculators/target'
import { buildTargetTrajectory } from '@features/trackers/calculators'
import { fmtValCompact, daysLeft } from '@features/trackers/detailFormat'
import { toISODate } from '@utils/date'

const RING_SIZE = 128
const RING_STROKE = 12
const RING_R = (RING_SIZE - RING_STROKE) / 2
const RING_C = 2 * Math.PI * RING_R

// react-native-svg gradient fill for the card, clipped by overflow-hidden.
const styles = StyleSheet.create({
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }
})

/** Localized short date "11 Jul" for the projected caption. */
function shortDate(iso: string, lang: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(lang, {
    day: 'numeric',
    month: 'short',
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
  const today = toISODate(new Date())
  const p = calculateTarget(tracker, entries, today)
  const traj = buildTargetTrajectory(tracker, entries, today)
  const frac = Math.max(0, Math.min(1, p.percent))
  const remain = daysLeft(tracker)
  const toGo = Math.max(0, p.goal - p.current)

  const hasPace = p.paceStatus !== 'none'
  const aheadAmount =
    p.expected != null ? Math.abs(p.current - p.expected) : null
  const paceDirKey =
    p.paceStatus === 'behind'
      ? 'behind'
      : p.paceStatus === 'ahead'
      ? 'ahead'
      : 'onTrack'

  return (
    <View className='m-s5 overflow-hidden rounded-xl-k'>
      <Svg style={styles.gradient} width='100%' height='100%'>
        <Defs>
          <LinearGradient id='kite-target-hero' x1='0' y1='0' x2='1' y2='1'>
            <Stop offset='0' stopColor='#3d7dd8' />
            <Stop offset='1' stopColor='#2f63b3' />
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
            <View className='flex-row items-center gap-s2 rounded-full bg-on-accent/20 px-s3 py-s1'>
              <Typography className='text-xs font-bold text-on-accent'>
                {`${fmtValCompact(tracker, aheadAmount)} ${t(
                  `detail.${paceDirKey}`
                ).toLowerCase()} · ${t('detail.pace')} ${fmtValCompact(
                  tracker,
                  p.expected ?? 0
                )}`}
              </Typography>
            </View>
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
                stroke='rgba(255,255,255,0.22)'
                strokeWidth={RING_STROKE}
                fill='none'
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_R}
                stroke='#ffffff'
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
              <Typography className='text-title-k font-bold text-on-accent'>
                {fmtValCompact(tracker, p.current)}
              </Typography>
              <Typography className='mt-s1 text-xs font-bold text-on-accent opacity-70'>
                {`${fmtValCompact(tracker, toGo)} ${t('detail.toGo')}`}
              </Typography>
            </View>
          </View>

          {/* stat stack */}
          <View className='flex-1 gap-s3'>
            <View>
              <View className='flex-row items-end gap-s2'>
                <Typography className='text-h2-k font-bold text-on-accent'>
                  {fmtValCompact(tracker, traj.dailyGoal)}
                </Typography>
                <Typography className='mb-[3px] text-sm font-bold text-on-accent opacity-70'>
                  {t('detail.perDay')}
                </Typography>
              </View>
              <Typography className='mt-s1 text-xs font-bold uppercase text-on-accent opacity-75'>
                {`${t('detail.dailyGoal')} · ${remain ?? 0} ${t(
                  'detail.left'
                )}`}
              </Typography>
            </View>

            <View className='h-px bg-on-accent opacity-20' />

            <View>
              <Typography className='text-h2-k font-bold text-on-accent'>
                {traj.projected
                  ? fmtValCompact(tracker, traj.projected.value)
                  : '—'}
              </Typography>
              <Typography className='mt-s1 text-xs font-bold uppercase text-on-accent opacity-75'>
                {traj.projected
                  ? `${t('detail.projected')} · ${shortDate(
                      traj.projected.date,
                      lang
                    )}`
                  : t('detail.projected')}
              </Typography>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}
