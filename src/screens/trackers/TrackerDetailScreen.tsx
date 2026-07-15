import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useToast } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList, RootStackProps } from '@navigation/types'
import {
  useTracker,
  useEntries,
  useMilestones,
  useLogEntry,
  useDeleteEntry
} from '@features/trackers/queries'
import { progressFor } from '@features/trackers/components/TrackerCard'
import { HabitDetailView } from '@features/trackers/components/HabitDetailView'
import { TargetDetailView } from '@features/trackers/components/TargetDetailView'
import { AverageDetailView } from '@features/trackers/components/AverageDetailView'
import { LogEntryModal } from '@features/trackers/components/LogEntryModal'
import { showLogSuccess } from '@features/trackers/components/LogSuccessToast'
import { DetailAppbar } from '@features/trackers/components/DetailAppbar'
import { DetailLoading } from '@features/trackers/components/DetailLoading'
import { DetailHero } from '@features/trackers/components/DetailHero'
import { DetailStatGrid } from '@features/trackers/components/DetailStatGrid'
import { DetailBody } from '@features/trackers/components/DetailBody'
import { LogTodayButton } from '@features/trackers/components/LogTodayButton'
import { uuid } from '@features/trackers/factory'
import { toISODate } from '@utils/date'
import type { Entry } from '@features/trackers/types'

type Nav = NativeStackNavigationProp<RootStackParamList>

export function TrackerDetailScreen({
  route
}: RootStackProps<'TrackerDetail'>) {
  const { trackerId } = route.params
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const nav = useNavigation<Nav>()
  const { data: tracker } = useTracker(trackerId)
  const { data: entries = [] } = useEntries(trackerId)
  const { data: milestones = [] } = useMilestones(trackerId)
  const log = useLogEntry()
  const del = useDeleteEntry()
  const { toast } = useToast()
  const [logModal, setLogModal] = useState<{
    open: boolean
    entry: Entry | null
    date: string | null // pre-filled date when back-filling a past day
  }>({ open: false, entry: null, date: null })

  if (!tracker) {
    return <DetailLoading />
  }

  const p = progressFor(tracker, entries, milestones)

  // Quick log for non-habit "Log today" — one fresh record (uuid + timestamp).
  const onLogToday = () => {
    if (tracker.type === 'project') return
    log.mutate({
      id: uuid(),
      trackerId: tracker.id,
      date: toISODate(new Date()),
      value: 1,
      note: null,
      createdAt: new Date().toISOString()
    })
  }

  const openAddLog = () => setLogModal({ open: true, entry: null, date: null })
  const openEditLog = (entry: Entry) =>
    setLogModal({ open: true, entry, date: null })
  const openLogForDate = (iso: string) =>
    setLogModal({ open: true, entry: null, date: iso })
  const closeLog = () => setLogModal({ open: false, entry: null, date: null })

  const openEditTracker = () =>
    nav.navigate('TrackerForm', {
      trackerId: tracker.id,
      type: tracker.type
    })

  const appbar = (
    <DetailAppbar
      tracker={tracker}
      onBack={() => nav.goBack()}
      onEdit={openEditTracker}
    />
  )

  const logModalEl = (
    <LogEntryModal
      tracker={tracker}
      entry={logModal.entry}
      defaultDate={logModal.date}
      visible={logModal.open}
      onClose={closeLog}
      onSave={(e) =>
        log.mutate(e, {
          onSuccess: () => showLogSuccess(toast, t('toast.logSuccess'))
        })
      }
      onDelete={(id) => del.mutate({ id, trackerId: tracker.id })}
    />
  )

  if (tracker.type === 'habit') {
    return (
      <View className='flex-1 bg-bg'>
        {appbar}
        <HabitDetailView
          tracker={tracker}
          entries={entries}
          onAddLog={openAddLog}
          onEditEntry={openEditLog}
          onLogForDate={openLogForDate}
          onEditTracker={openEditTracker}
        />
        {logModalEl}
      </View>
    )
  }

  if (tracker.type === 'target') {
    return (
      <View className='flex-1 bg-bg'>
        {appbar}
        <TargetDetailView
          tracker={tracker}
          entries={entries}
          onAddLog={openAddLog}
          onEditEntry={openEditLog}
          onLogForDate={openLogForDate}
        />
        {logModalEl}
      </View>
    )
  }

  if (tracker.type === 'average') {
    return (
      <View className='flex-1 bg-bg'>
        {appbar}
        <AverageDetailView
          tracker={tracker}
          entries={entries}
          onAddLog={openAddLog}
          onEditEntry={openEditLog}
          onLogForDate={openLogForDate}
        />
        {logModalEl}
      </View>
    )
  }

  return (
    <View className='flex-1 bg-bg'>
      {appbar}
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <DetailHero tracker={tracker} progress={p} />
        <DetailStatGrid
          tracker={tracker}
          progress={p}
          milestones={milestones}
        />
        <DetailBody
          tracker={tracker}
          entries={entries}
          milestones={milestones}
          paceStatus={p.paceStatus}
        />
        {tracker.type !== 'project' ? (
          <LogTodayButton onPress={onLogToday} />
        ) : null}
      </ScrollView>
    </View>
  )
}
