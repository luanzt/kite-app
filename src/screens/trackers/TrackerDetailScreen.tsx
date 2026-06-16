import { Pressable, ScrollView, View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Svg, { Circle } from 'react-native-svg'
import type { RootStackParamList, RootStackProps } from '@navigation/types'
import {
  useTracker,
  useEntries,
  useMilestones,
  useLogEntry
} from '@features/trackers/queries'
import { progressFor } from '@features/trackers/components/TrackerCard'
import { PaceBar, PaceChip } from '@features/trackers/components/PaceBar'
import { HistoryChart } from '@features/trackers/components/HistoryChart'
import { MilestoneList } from '@features/trackers/components/MilestoneList'
import { Icons, PACE_COLOR } from '@features/trackers/icons'
import { toISODate, daysBetween } from '@utils/date'
import type { Tracker } from '@features/trackers/types'

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

function Ring({
  fraction,
  color,
  size,
  strokeWidth
}: {
  fraction: number
  color: string
  size: number
  strokeWidth: number
}) {
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, fraction))
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: [{ rotate: '-90deg' }] }}
    >
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill='none'
        stroke='#e6e8df'
        strokeWidth={strokeWidth}
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill='none'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped)}
      />
    </Svg>
  )
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
        className='text-xl font-extrabold text-ink'
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

  if (!tracker) {
    return <View className='flex-1 bg-bg' style={{ paddingTop: insets.top }} />
  }

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
  const successInt = Math.round((p.successRate ?? 0) * 100)
  const streak = p.streak ?? 0
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
      <Typography
        className='flex-1 text-center text-lg font-bold text-ink'
        numberOfLines={1}
      >
        {tracker.name}
      </Typography>
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

  // ---- Hero ----
  const hero =
    tracker.type === 'habit' ? (
      <View className='m-s5 items-center rounded-xl-k border border-line bg-surface p-s5 shadow-md'>
        <View
          className='items-center justify-center'
          style={{ width: 120, height: 120, marginVertical: 4 }}
        >
          <Ring
            fraction={p.successRate ?? 0}
            color={PACE_COLOR.on_track}
            size={120}
            strokeWidth={11}
          />
          <View className='absolute inset-0 items-center justify-center'>
            <Typography
              className='font-extrabold text-ink'
              style={{ fontSize: 34, lineHeight: 36 }}
            >
              {`${successInt}%`}
            </Typography>
            <Typography className='text-xs font-bold text-ink-3'>
              {t('detail.success')}
            </Typography>
          </View>
        </View>
        <View className='flex-row items-center gap-s2' style={{ marginTop: 8 }}>
          <Icons.Flame size={22} color={PACE_COLOR.on_track} />
          <Typography className='text-lg font-extrabold text-ink'>
            {`${streak} ${t('detail.days')}`}
          </Typography>
        </View>
      </View>
    ) : (
      <View className='m-s5 rounded-xl-k border border-line bg-surface p-s5 shadow-md'>
        <View
          className='flex-row items-start justify-between'
          style={{ marginBottom: 16 }}
        >
          <View className='flex-1'>
            <Typography
              className='font-extrabold text-ink'
              style={{ fontSize: 48, lineHeight: 50 }}
            >
              {tracker.type === 'project'
                ? `${percentInt}%`
                : fmtVal(tracker, p.current)}
            </Typography>
            {tracker.type !== 'project' ? (
              <Typography
                className='text-sm text-ink-3'
                style={{ marginTop: 4 }}
              >
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

  // ---- Stat grid ----
  const stats =
    tracker.type === 'habit' ? (
      <View className='flex-row gap-s3 px-s5'>
        <Stat
          num={String(streak)}
          cap={t('detail.streak')}
          color={PACE_COLOR.on_track}
        />
        <Stat num={`${successInt}%`} cap={t('detail.success')} />
        <Stat num={String(streak)} cap={t('detail.best')} />
      </View>
    ) : tracker.type === 'project' ? (
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
          className='text-lg font-extrabold text-ink'
          style={{ marginBottom: 12 }}
        >
          {t('detail.milestones')}
        </Typography>
        <MilestoneList milestones={milestones} onChange={() => {}} />
      </View>
    ) : (
      <View className='m-s5'>
        <Typography
          className='text-lg font-extrabold text-ink'
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

  const onLogToday = () => {
    if (tracker.type === 'project') return
    const today = toISODate(new Date())
    const value = tracker.type === 'habit' ? 1 : 1
    log.mutate({
      id: `${tracker.id}-${today}`,
      trackerId: tracker.id,
      date: today,
      value,
      note: null
    })
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
