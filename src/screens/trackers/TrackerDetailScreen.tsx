import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Typography, useToast } from 'heroui-native'
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
import { PaceBar, PaceChip } from '@features/trackers/components/PaceBar'
import { HistoryChart } from '@features/trackers/components/HistoryChart'
import { MilestoneList } from '@features/trackers/components/MilestoneList'
import { HabitDetailView } from '@features/trackers/components/HabitDetailView'
import { LogEntryModal } from '@features/trackers/components/LogEntryModal'
import { showLogSuccess } from '@features/trackers/components/LogSuccessToast'
import { Icons, iconEmoji } from '@features/trackers/icons'
import { cadenceLabel } from '@features/trackers/habitLabels'
import { uuid } from '@features/trackers/factory'
import { toISODate, daysBetween } from '@utils/date'
import type { Tracker, Entry } from '@features/trackers/types'

type Nav = NativeStackNavigationProp<RootStackParamList>

/** fmtNum mirroring the design: locale, max one decimal. */
function fmtNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '0'
  const rounded = Number.isInteger(n) ? n : Math.round(n * 10) / 10
  return rounded.toLocaleString()
}

/** fmtVal — $ prefixes, other units suffix. */
function fmtVal(tracker: Tracker, n: number | null | undefined): string {
  if (tracker.unit === '$') return `$${fmtNum(n)}`
  return `${fmtNum(n)}${tracker.unit ? ` ${tracker.unit}` : ''}`
}

/** Where the pace marker sits (0..100) given start/deadline vs today. */
function pacePercent(tracker: Tracker): number | null {
  if (!tracker.deadline) return null
  const today = toISODate(new Date())
  const total = daysBetween(tracker.startDate, tracker.deadline)
  if (total <= 0) return null
  const elapsed = daysBetween(tracker.startDate, today)
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)))
}

/** Days remaining until deadline (null when no deadline). */
function daysLeft(tracker: Tracker): number | null {
  if (!tracker.deadline) return null
  return Math.max(0, daysBetween(toISODate(new Date()), tracker.deadline))
}

function Stat({
  num,
  cap,
  color
}: {
  num: string
  cap: string
  color?: string
}) {
  return (
    <View className='flex-1 items-center rounded-lg-k border border-line bg-surface p-s4'>
      <Typography
        className='text-xl font-bold text-ink'
        style={color ? { color } : undefined}
      >
        {num}
      </Typography>
      <Typography
        className='text-xs font-bold uppercase text-ink-3'
        style={{ marginTop: 3 }}
      >
        {cap}
      </Typography>
    </View>
  )
}

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
    return <View className='flex-1 bg-bg' style={{ paddingTop: insets.top }} />
  }

  const isHabit = tracker.type === 'habit'
  const p = progressFor(tracker, entries, milestones)
  const paceLabel =
    p.paceStatus === 'behind'
      ? t('detail.behind')
      : p.paceStatus === 'ahead'
      ? t('detail.ahead')
      : p.paceStatus === 'on_track'
      ? t('detail.onTrack')
      : t('detail.none')

  const pp = pacePercent(tracker)
  const remain = daysLeft(tracker)
  const percentInt = Math.round(p.percent * 100)
  const doneMilestones = milestones.filter((m) => m.progress >= 1).length

  const start = tracker.startValue ?? 0
  const expectedValue =
    pp != null && p.goal ? start + ((p.goal - start) * pp) / 100 : 0

  // ---- Appbar ----
  const appbar = (
    <View
      className='flex-row items-center gap-s3 bg-surface px-s4 pb-s3'
      style={{ paddingTop: insets.top + 8 }}
    >
      <Pressable
        onPress={() => nav.goBack()}
        className='items-center justify-center rounded-md-k border border-line bg-surface active:opacity-80'
        style={{ width: 40, height: 40 }}
      >
        <Icons.Back size={22} color='#1b1e18' />
      </Pressable>
      <View className='flex-1 items-center'>
        <Typography className='text-lg font-bold text-ink' numberOfLines={1}>
          {tracker.name}
        </Typography>
        {isHabit ? (
          <Typography className='mt-[2px] text-sm font-bold text-brand-ink'>
            {`${iconEmoji(tracker.icon)} ${cadenceLabel(tracker, t)}`}
          </Typography>
        ) : null}
      </View>
      <Pressable
        onPress={() =>
          nav.navigate('TrackerForm', {
            trackerId: tracker.id,
            type: tracker.type
          })
        }
        className='items-center justify-center rounded-md-k border border-line bg-surface active:opacity-80'
        style={{ width: 40, height: 40 }}
      >
        <Icons.Edit size={20} color='#1b1e18' />
      </Pressable>
    </View>
  )

  // ---- Hero (target / average / project; habit uses HabitDetailView) ----
  const hero = (
    <View className='m-s5 rounded-xl-k border border-line bg-surface p-s5 shadow-md'>
      <View
        className='flex-row items-start justify-between'
        style={{ marginBottom: 16 }}
      >
        <View className='flex-1'>
          <Typography
            className='font-bold text-ink'
            style={{ fontSize: 48, lineHeight: 50 }}
          >
            {tracker.type === 'project'
              ? `${percentInt}%`
              : fmtVal(tracker, p.current)}
          </Typography>
          {tracker.type !== 'project' ? (
            <Typography className='text-sm text-ink-3' style={{ marginTop: 4 }}>
              {`${t('detail.target')} ${fmtVal(tracker, p.goal)}`}
            </Typography>
          ) : null}
        </View>
        <PaceChip paceStatus={p.paceStatus} label={paceLabel} />
      </View>
      <PaceBar
        percent={p.percent}
        paceStatus={p.paceStatus}
        paceMarkerPercent={pp}
        height={16}
      />
      {pp != null ? (
        <View
          className='flex-row items-center justify-between'
          style={{ marginTop: 14 }}
        >
          <Typography className='text-xs text-ink-3'>
            {`${t('detail.expected')}: `}
            <Typography className='text-xs font-bold text-ink-2'>
              {fmtVal(tracker, expectedValue)}
            </Typography>
          </Typography>
          {remain != null ? (
            <Typography className='text-xs text-ink-3'>
              {`${remain} ${t('detail.days')} ${t(
                'detail.remaining'
              ).toLowerCase()}`}
            </Typography>
          ) : null}
        </View>
      ) : null}
    </View>
  )

  // ---- Stat grid (habit uses HabitDetailView) ----
  const stats =
    tracker.type === 'project' ? (
      <View className='flex-row gap-s3 px-s5'>
        <Stat num={`${percentInt}%`} cap={t('common.done')} />
        <Stat
          num={`${doneMilestones}/${milestones.length}`}
          cap={t('detail.milestones')}
        />
        <Stat
          num={remain != null ? String(remain) : '∞'}
          cap={t('detail.days')}
        />
      </View>
    ) : (
      <View className='flex-row gap-s3 px-s5'>
        <Stat num={fmtVal(tracker, p.current)} cap={t('common.done')} />
        <Stat num={`${percentInt}%`} cap={t('detail.target')} />
        <Stat
          num={remain != null ? String(remain) : '∞'}
          cap={t('detail.days')}
        />
      </View>
    )

  // ---- Body panel ----
  const body =
    tracker.type === 'project' ? (
      <View className='m-s5'>
        <Typography
          className='text-lg font-bold text-ink'
          style={{ marginBottom: 12 }}
        >
          {t('detail.milestones')}
        </Typography>
        <MilestoneList milestones={milestones} onChange={() => {}} />
      </View>
    ) : (
      <View className='m-s5'>
        <Typography
          className='text-lg font-bold text-ink'
          style={{ marginBottom: 12 }}
        >
          {t('detail.history')}
        </Typography>
        <HistoryChart
          entries={entries}
          tracker={tracker}
          paceStatus={p.paceStatus}
        />
      </View>
    )

  // Quick log for non-habit "Log today" — one fresh record (uuid + timestamp).
  const onLogToday = () => {
    if (tracker.type === 'project') return
    const today = toISODate(new Date())
    log.mutate({
      id: uuid(),
      trackerId: tracker.id,
      date: today,
      value: 1,
      note: null,
      createdAt: new Date().toISOString()
    })
  }

  const openAddLog = () =>
    setLogModal({ open: true, entry: null, date: null })
  const openEditLog = (entry: Entry) =>
    setLogModal({ open: true, entry, date: null })
  const openLogForDate = (iso: string) =>
    setLogModal({ open: true, entry: null, date: iso })
  const closeLog = () => setLogModal({ open: false, entry: null, date: null })

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

  if (isHabit) {
    return (
      <View className='flex-1 bg-bg'>
        {appbar}
        <HabitDetailView
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
        {hero}
        {stats}
        {body}
        {tracker.type !== 'project' ? (
          <View className='px-s5' style={{ paddingBottom: 8 }}>
            <Pressable
              onPress={onLogToday}
              className='flex-row items-center justify-center gap-s2 rounded-md-k bg-brand active:opacity-90'
              style={{ height: 52 }}
            >
              <Icons.Plus size={20} color='#ffffff' />
              <Typography className='text-base font-bold text-on-accent'>
                {t('detail.logToday')}
              </Typography>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}
