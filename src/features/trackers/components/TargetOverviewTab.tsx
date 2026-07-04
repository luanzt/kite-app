import { Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type { Tracker, Entry } from '@features/trackers/types'
import { Icons } from '@features/trackers/icons'
import { toISODate } from '@utils/date'
import { TargetHero } from './TargetHero'
import { TargetProgressBar } from './TargetProgressBar'
import { TargetTrajectoryChart } from './TargetTrajectoryChart'

/** The latest entry logged for `date`, or null (same-day logs order by createdAt). */
function entryForDate(entries: Entry[], date: string): Entry | null {
  const sameDay = entries.filter((e) => e.date === date)
  if (sameDay.length === 0) return null
  return sameDay.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b))
}

/**
 * Target Overview tab — a blue gradient hero (ring + daily-goal/projected), a
 * progress-bar card with a pace marker, and an actual/ideal/projected trajectory
 * chart. A "Log today" button floats above the scrolling content: it opens the
 * log-entry modal to add today's value, or to edit it if today was already
 * logged.
 */
export function TargetOverviewTab({
  tracker,
  entries,
  onAddLog,
  onEditEntry
}: {
  tracker: Tracker
  entries: Entry[]
  onAddLog?: () => void
  onEditEntry?: (entry: Entry) => void
}) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  // Tap "Log today": edit today's entry if one exists, otherwise add a new one.
  const onLogToday = () => {
    const todays = entryForDate(entries, toISODate(new Date()))
    if (todays) {
      onEditEntry?.(todays)
    } else {
      onAddLog?.()
    }
  }

  return (
    <View className='flex-1'>
      <ScrollView
        // Extra bottom room so the last card clears the floating "Log today"
        // button: safe-area + button height (52) + its top/bottom padding.
        contentContainerStyle={{ paddingBottom: insets.bottom + 88 }} // safe-area, runtime
        showsVerticalScrollIndicator={false}
      >
        <TargetHero tracker={tracker} entries={entries} />
        <TargetProgressBar tracker={tracker} entries={entries} />
        <TargetTrajectoryChart tracker={tracker} entries={entries} />
      </ScrollView>

      {/* Floating "Log today" — pinned above the scrolling content. */}
      <View
        className='absolute inset-x-0 bottom-0 px-s4 pt-s3'
        style={{ paddingBottom: insets.bottom + 8 }} // safe-area, runtime
        pointerEvents='box-none'
      >
        <Pressable
          onPress={onLogToday}
          className='h-[52px] flex-row items-center justify-center gap-s2 rounded-md-k bg-brand active:opacity-90'
        >
          <Icons.Plus size={20} color='#ffffff' />
          <Typography className='text-base font-bold text-on-accent'>
            {t('detail.logToday')}
          </Typography>
        </Pressable>
      </View>
    </View>
  )
}
