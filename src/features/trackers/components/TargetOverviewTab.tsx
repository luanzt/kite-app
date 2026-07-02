import { ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Tracker, Entry } from '@features/trackers/types'
import { TargetHero } from './TargetHero'
import { TargetProgressBar } from './TargetProgressBar'
import { TargetTrajectoryChart } from './TargetTrajectoryChart'

/**
 * Target Overview tab — redesigned to the "Save Money Detail" mockup: a blue
 * gradient hero (ring + daily-goal/projected), a progress-bar card with a pace
 * marker, and an actual/ideal/projected trajectory chart. Logging happens from
 * the History tab, so there is no Log-today button here.
 */
export function TargetOverviewTab({
  tracker,
  entries
}: {
  tracker: Tracker
  entries: Entry[]
}) {
  const insets = useSafeAreaInsets()
  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} // safe-area, runtime
      showsVerticalScrollIndicator={false}
    >
      <TargetHero tracker={tracker} entries={entries} />
      <TargetProgressBar tracker={tracker} entries={entries} />
      <TargetTrajectoryChart tracker={tracker} entries={entries} />
    </ScrollView>
  )
}
