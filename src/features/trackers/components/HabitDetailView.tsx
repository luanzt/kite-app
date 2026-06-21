import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { LucideIcon } from 'lucide-react-native'
import type { Tracker, Entry } from '@features/trackers/types'
import { Icons } from '@features/trackers/icons'
import { HabitChartsTab } from './HabitChartsTab'
import { HabitHistoryTab } from './HabitHistoryTab'
import { HabitNotesTab } from './HabitNotesTab'

type TabKey = 'charts' | 'history' | 'notes'

const TABS: { key: TabKey; labelKey: string; Icon: LucideIcon }[] = [
  { key: 'charts', labelKey: 'detail.tabCharts', Icon: Icons.Charts },
  { key: 'history', labelKey: 'detail.tabHistory', Icon: Icons.History },
  { key: 'notes', labelKey: 'detail.tabNotes', Icon: Icons.Notes }
]

/**
 * HabitDetailView — the redesigned Habit Detail body. A pill tab bar
 * (Charts / History / Notes) over a scrolling content area; each tab is its
 * own component. All metrics derive from real entries.
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
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState<TabKey>('charts')

  return (
    <View className='flex-1'>
      {/* tab pills */}
      <View className='flex-row gap-s1 bg-bg px-s4 pb-s3 mt-s3'>
        {TABS.map(({ key, labelKey, Icon }) => {
          const on = key === tab
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              className={`h-[38px] flex-1 flex-row items-center justify-center gap-s1 rounded-full ${
                on ? 'bg-brand' : 'bg-transparent'
              }`}
            >
              <Icon size={16} color={on ? '#ffffff' : '#565a4f'} />
              <Typography
                className={`text-xs ${on ? 'font-bold' : 'font-medium'} ${
                  on ? 'text-on-accent' : 'text-ink-2'
                }`}
              >
                {t(labelKey)}
              </Typography>
            </Pressable>
          )
        })}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} // safe-area, runtime
        showsVerticalScrollIndicator={false}
      >
        {/* key={tab} remounts on switch → re-triggers the fade+slide entrance.
            withInitialValues caps the slide at a gentle 12px (default is larger). */}
        <Animated.View
          key={tab}
          entering={FadeInDown.duration(220).withInitialValues({
            opacity: 0,
            transform: [{ translateY: 12 }]
          })}
        >
          {tab === 'charts' ? (
            <HabitChartsTab tracker={tracker} entries={entries} />
          ) : tab === 'history' ? (
            <HabitHistoryTab
              tracker={tracker}
              entries={entries}
              onAddLog={onAddLog}
              onEditEntry={onEditEntry}
              onLogForDate={onLogForDate}
            />
          ) : (
            <HabitNotesTab entries={entries} />
          )}
        </Animated.View>
      </ScrollView>
    </View>
  )
}
