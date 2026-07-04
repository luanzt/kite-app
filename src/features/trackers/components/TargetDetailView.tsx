import { StyleSheet } from 'react-native'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import type { Tracker, Entry } from '@features/trackers/types'
import { HabitHistoryTab } from './HabitHistoryTab'
import { HabitNotesTab } from './HabitNotesTab'
import { HabitDetailProvider, useHabitDetail } from './HabitDetailContext'
import { HabitTabBar } from './HabitTabBar'
import { TargetOverviewTab } from './TargetOverviewTab'

const Tab = createMaterialTopTabNavigator()

// Transparent scene so the screen's bg-bg shows through. Host prop, no className.
const styles = StyleSheet.create({
  scene: { backgroundColor: 'transparent' }
})

/** Overview screen — reads shared data + log callbacks from context. */
function OverviewScreen() {
  const { tracker, entries, onAddLog, onEditEntry } = useHabitDetail()
  return (
    <TargetOverviewTab
      tracker={tracker}
      entries={entries}
      onAddLog={onAddLog}
      onEditEntry={onEditEntry}
    />
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
 * TargetDetailView — Target detail body as a 3-tab navigator (Overview /
 * History / Notes) reusing the Habit tab shell, custom pill tab bar, and
 * detail context. Tap-only (swipe disabled). The History/Notes tabs render the
 * logged numeric value (not Yes/No) because the tracker isn't a habit.
 */
export function TargetDetailView({
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
        <Tab.Screen name='charts' component={OverviewScreen} />
        <Tab.Screen name='history' component={HistoryScreen} />
        <Tab.Screen name='notes' component={NotesScreen} />
      </Tab.Navigator>
    </HabitDetailProvider>
  )
}
