import { ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Tracker, Entry } from '@features/trackers/types'
import { useMilestones } from '@features/trackers/queries'
import { progressFor } from '@features/trackers/components/TrackerCard'
import { DetailHero } from './DetailHero'
import { DetailStatGrid } from './DetailStatGrid'
import { DetailBody } from './DetailBody'

/**
 * Target Overview tab — the current target detail (pace hero, stat grid, body
 * with pace line / chart / milestones) lifted into the first tab. Logging is
 * done from the History tab, so there's no Log-today button here.
 */
export function TargetOverviewTab({
  tracker,
  entries
}: {
  tracker: Tracker
  entries: Entry[]
}) {
  const insets = useSafeAreaInsets()
  const { data: milestones = [] } = useMilestones(tracker.id)
  const p = progressFor(tracker, entries, milestones)
  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} // safe-area, runtime
      showsVerticalScrollIndicator={false}
    >
      <DetailHero tracker={tracker} progress={p} />
      <DetailStatGrid tracker={tracker} progress={p} milestones={milestones} />
      <DetailBody
        tracker={tracker}
        entries={entries}
        milestones={milestones}
        paceStatus={p.paceStatus}
      />
    </ScrollView>
  )
}
