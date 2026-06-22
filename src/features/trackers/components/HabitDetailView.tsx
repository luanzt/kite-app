import { StyleSheet } from 'react-native'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import type { Tracker, Entry } from '@features/trackers/types'
import { HabitChartsTab } from './HabitChartsTab'
import { HabitHistoryTab } from './HabitHistoryTab'
import { HabitNotesTab } from './HabitNotesTab'
import { HabitDetailProvider, useHabitDetail } from './HabitDetailContext'
import { HabitTabBar } from './HabitTabBar'

const Tab = createMaterialTopTabNavigator()

// Transparent scene background so the screen's bg-bg shows through. Static, but
// the navigator's sceneStyle is a host prop with no className, so it goes
// through StyleSheet per the styling rules.
const styles = StyleSheet.create({
  scene: { backgroundColor: 'transparent' }
})

// Each tab owns its own scroll (Charts/Notes wrap a ScrollView, History uses a
// FlashList) and its own bottom safe-area padding — there is no shared scroll
// container here, so the screen wrappers just feed context data to each tab.

/** Charts screen — reads shared data from context, renders the existing tab. */
function ChartsScreen() {
  const { tracker, entries } = useHabitDetail()
  return <HabitChartsTab tracker={tracker} entries={entries} />
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
 * HabitDetailView — the redesigned Habit Detail body. A material-top-tabs
 * navigator (Charts / History / Notes) with a custom pill tab bar. Tap-only:
 * swipe is disabled. Screen data flows through HabitDetailContext.
 */
export function HabitDetailView({
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
