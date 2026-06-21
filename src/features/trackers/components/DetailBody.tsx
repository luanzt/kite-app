import { View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { HistoryChart } from '@features/trackers/components/HistoryChart'
import { MilestoneList } from '@features/trackers/components/MilestoneList'
import type {
  Tracker,
  Entry,
  Milestone,
  PaceStatus
} from '@features/trackers/types'

/**
 * DetailBody — the lower panel of the non-habit detail screen: a milestone list
 * for projects, otherwise the history chart. Habit uses HabitDetailView.
 */
export function DetailBody({
  tracker,
  entries,
  milestones,
  paceStatus
}: {
  tracker: Tracker
  entries: Entry[]
  milestones: Milestone[]
  paceStatus: PaceStatus
}) {
  const { t } = useTranslation()
  const isProject = tracker.type === 'project'
  return (
    <View className='m-s5'>
      <Typography className='mb-[12px] text-lg font-bold text-ink'>
        {isProject ? t('detail.milestones') : t('detail.history')}
      </Typography>
      {isProject ? (
        <MilestoneList milestones={milestones} onChange={() => {}} />
      ) : (
        <HistoryChart
          entries={entries}
          tracker={tracker}
          paceStatus={paceStatus}
        />
      )}
    </View>
  )
}
