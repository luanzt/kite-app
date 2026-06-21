import { View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { PaceBar, PaceChip } from '@features/trackers/components/PaceBar'
import { fmtVal, pacePercent, daysLeft } from '@features/trackers/detailFormat'
import type { Tracker, TrackerProgress } from '@features/trackers/types'

/**
 * DetailHero — the big card at the top of the non-habit detail screen: the
 * current value (or percent for projects), the target, a PaceChip, the PaceBar,
 * and the expected/remaining row. Habit uses HabitDetailView instead.
 */
export function DetailHero({
  tracker,
  progress
}: {
  tracker: Tracker
  progress: TrackerProgress
}) {
  const { t } = useTranslation()
  const p = progress
  const pp = pacePercent(tracker)
  const remain = daysLeft(tracker)
  const percentInt = Math.round(p.percent * 100)
  const start = tracker.startValue ?? 0
  const expectedValue =
    pp != null && p.goal ? start + ((p.goal - start) * pp) / 100 : 0

  const paceLabel =
    p.paceStatus === 'behind'
      ? t('detail.behind')
      : p.paceStatus === 'ahead'
      ? t('detail.ahead')
      : p.paceStatus === 'on_track'
      ? t('detail.onTrack')
      : t('detail.none')

  return (
    <View className='m-s5 rounded-xl-k border border-line bg-surface p-s5 shadow-md'>
      <View className='mb-[16px] flex-row items-start justify-between'>
        <View className='flex-1'>
          <Typography className='text-[48px] font-bold leading-[50px] text-ink'>
            {tracker.type === 'project'
              ? `${percentInt}%`
              : fmtVal(tracker, p.current)}
          </Typography>
          {tracker.type !== 'project' ? (
            <Typography className='mt-[4px] text-sm text-ink-3'>
              {`${t('detail.target')} ${fmtVal(tracker, p.goal)}`}
            </Typography>
          ) : null}
        </View>
        <PaceChip paceStatus={p.paceStatus} label={paceLabel} />
      </View>
      <PaceBar
        percent={p.percent}
        paceStatus={p.paceStatus}
        paceMarkerPercent={pp}
        height={16}
      />
      {pp != null ? (
        <View className='mt-[14px] flex-row items-center justify-between'>
          <Typography className='text-xs text-ink-3'>
            {`${t('detail.expected')}: `}
            <Typography className='text-xs font-bold text-ink-2'>
              {fmtVal(tracker, expectedValue)}
            </Typography>
          </Typography>
          {remain != null ? (
            <Typography className='text-xs text-ink-3'>
              {`${remain} ${t('detail.days')} ${t(
                'detail.remaining'
              ).toLowerCase()}`}
            </Typography>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
