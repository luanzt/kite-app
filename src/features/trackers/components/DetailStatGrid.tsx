import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Stat } from '@features/trackers/components/Stat'
import { fmtVal, daysLeft } from '@features/trackers/detailFormat'
import type {
  Tracker,
  TrackerProgress,
  Milestone
} from '@features/trackers/types'

/**
 * DetailStatGrid — the three-stat row under the hero. Projects show
 * done%/milestones/days; other types show current/target%/days. Habit uses
 * HabitDetailView instead.
 */
export function DetailStatGrid({
  tracker,
  progress,
  milestones
}: {
  tracker: Tracker
  progress: TrackerProgress
  milestones: Milestone[]
}) {
  const { t } = useTranslation()
  const p = progress
  const remain = daysLeft(tracker)
  const percentInt = Math.round(p.percent * 100)
  const daysVal = remain != null ? String(remain) : '∞'

  if (tracker.type === 'project') {
    const doneMilestones = milestones.filter((m) => m.progress >= 1).length
    return (
      <View className='flex-row gap-s3 px-s5'>
        <Stat num={`${percentInt}%`} cap={t('common.done')} />
        <Stat
          num={`${doneMilestones}/${milestones.length}`}
          cap={t('detail.milestones')}
        />
        <Stat num={daysVal} cap={t('detail.days')} />
      </View>
    )
  }

  return (
    <View className='flex-row gap-s3 px-s5'>
      <Stat num={fmtVal(tracker, p.current)} cap={t('common.done')} />
      <Stat num={`${percentInt}%`} cap={t('detail.target')} />
      <Stat num={daysVal} cap={t('detail.days')} />
    </View>
  )
}
