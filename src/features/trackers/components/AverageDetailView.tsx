import { StyleSheet } from 'react-native'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import type { Tracker, Entry } from '@features/trackers/types'
import { HabitHistoryTab } from './HabitHistoryTab'
import { HabitNotesTab } from './HabitNotesTab'
import { HabitDetailProvider, useHabitDetail } from './HabitDetailContext'
import { HabitTabBar } from './HabitTabBar'
import { AverageChartsTab } from './AverageChartsTab'

const Tab = createMaterialTopTabNavigator()

// Transparent scene so the screen's bg-bg shows through. Host prop, no className.
const styles = StyleSheet.create({
  scene: { backgroundColor: 'transparent' }
})

/** Charts screen — reads shared data + the add-log callback from context. */
function ChartsScreen() {
  const { tracker, entries, onAddLog } = useHabitDetail()
  return (
    <AverageChartsTab tracker={tracker} entries={entries} onAddLog={onAddLog} />
  )
}

/** History screen — reads shared data + callbacks from context. */
function HistoryScreen() {
  const { tracker, entries, onAddLog, onEditEntry, onLogForDate } =
    useHabitDetail()
  return (
    <HabitHistoryTab
      tracker={tracker}
      entries={entries}
      onAddLog={onAddLog}
      onEditEntry={onEditEntry}
      onLogForDate={onLogForDate}
    />
  )
}

/** Notes screen — reads tracker, entries, and the edit callback from context. */
function NotesScreen() {
  const { tracker, entries, onEditEntry } = useHabitDetail()
  return (
    <HabitNotesTab
      tracker={tracker}
      entries={entries}
      onEditEntry={onEditEntry}
    />
  )
}

/**
 * AverageDetailView — Average detail body as a 3-tab navigator (Charts /
 * History / Notes) reusing the Habit tab shell, custom pill tab bar, and
 * detail context. Tap-only (swipe disabled). History/Notes render the logged
 * numeric value because the tracker isn't a habit.
 */
export function AverageDetailView({
  tracker,
  entries,
  onAddLog,
  onEditEntry,
  onLogForDate
}: {
  tracker: Tracker
  entries: Entry[]
  onAddLog?: () => void
  onEditEntry?: (entry: Entry) => void
  onLogForDate?: (iso: string) => void
}) {
  return (
    <HabitDetailProvider
      value={{ tracker, entries, onAddLog, onEditEntry, onLogForDate }}
    >
      <Tab.Navigator
        tabBar={HabitTabBar}
        screenOptions={{
          swipeEnabled: false,
          lazy: true,
          sceneStyle: styles.scene
        }}
      >
        <Tab.Screen name='charts' component={ChartsScreen} />
        <Tab.Screen name='history' component={HistoryScreen} />
        <Tab.Screen name='notes' component={NotesScreen} />
      </Tab.Navigator>
    </HabitDetailProvider>
  )
}
