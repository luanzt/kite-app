import { Pressable, ScrollView, View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Svg, { Circle } from 'react-native-svg'
import {
  useTrackers,
  useLogEntry,
  useEntriesForDate,
  useEntries
} from '@features/trackers/queries'
import { toISODate, weekdayOf } from '@utils/date'
import {
  Icons,
  PACE_COLOR,
  hexA,
  iconEmoji,
  colorHex
} from '@features/trackers/icons'
import { NoData } from '@features/trackers/components/NoData'
import { CreateButton } from '@features/trackers/components/CreateButton'
import type { RootStackParamList } from '@navigation/types'
import type { Tracker, Entry } from '@features/trackers/types'
import {
  classifyTodayRow,
  habitStreakStatus,
  perDayGoal,
  type StreakStatus,
  type TodayRowStatus
} from '@features/trackers/calculators/habitStats'
import { uuid } from '@features/trackers/factory'

type Nav = NativeStackNavigationProp<RootStackParamList>

function isDueToday(t: Tracker, todayISO: string): boolean {
  if (t.type === 'habit' && t.repeatDays && t.repeatDays.length) {
    return t.repeatDays.includes(weekdayOf(todayISO))
  }
  return true
}

/** A sensible quick-increment step for stepper trackers. */
function quickStep(t: Tracker): number {
  if (t.unit === '$') return 25
  if (t.unit === 'kg') return 0.1
  if (t.unit === 'steps') return 500
  return 1
}

/** Format a number: integers plain, otherwise max one decimal. */
function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return '0'
  const rounded = Number.isInteger(n) ? n : Math.round(n * 10) / 10
  return rounded.toLocaleString()
}

/** Small circular progress ring (-90deg start). */
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
      // runtime: SVG transform, no className equivalent
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

// Streak status kind → i18n key. Negative ("missed*") kinds render in the
// behind color with a warning icon; the rest are positive (flame).
const STREAK_KEY: Record<StreakStatus['kind'], string> = {
  none: '',
  greatStart: 'today.streakGreatStart',
  streakOngoing: 'today.streakOngoing',
  streakEnded: 'today.streakEnded',
  missedYesterday: 'today.missedYesterday',
  missedLastTime: 'today.missedLastTime',
  missedDays: 'today.missedDays'
}
const isMissedKind = (k: StreakStatus['kind']): boolean =>
  k === 'missedYesterday' || k === 'missedLastTime' || k === 'missedDays'

type Row = {
  tracker: Tracker
  status: TodayRowStatus
  done: boolean
  todayLog: number
}

function LogRow({
  row,
  today,
  onLog,
  onOpen
}: {
  row: Row
  today: string
  onLog: (e: Entry) => void
  onOpen: (id: string) => void
}) {
  const { t } = useTranslation()
  const { tracker, done, todayLog } = row
  const { data: allEntries = [] } = useEntries(tracker.id)
  const streak: StreakStatus | null =
    tracker.type === 'habit'
      ? habitStreakStatus(tracker, allEntries, today)
      : null
  const entryId = `${tracker.id}-${today}`

  // Sub-line text per type.
  let subText: string
  if (tracker.type === 'habit') {
    const period = tracker.period ?? 'daily'
    subText = period.charAt(0).toUpperCase() + period.slice(1)
  } else if (tracker.type === 'average') {
    const target = tracker.targetValue ?? 0
    const u = tracker.unit ? ` ${tracker.unit}` : ''
    subText = `${t('detail.target')} ${fmtNum(target)}${u}`
  } else {
    const u = tracker.unit ? ` ${tracker.unit}` : ''
    subText = `${fmtNum(todayLog)}${u}`
  }

  // Today's quick-set keeps a stable per-day id so tapping again overwrites the
  // day's value (on/off, set) rather than stacking records — unlike the Habit
  // Detail log, which creates a fresh record each time.
  const setValue = (v: number) =>
    onLog({
      id: entryId,
      trackerId: tracker.id,
      date: today,
      value: v,
      note: null,
      createdAt: new Date().toISOString()
    })

  // Habit ring: each tap is its own Yes record (uuid + now), so History shows
  // one row per tap — unlike the stepper's absolute set/overwrite.
  const logYes = () =>
    onLog({
      id: uuid(),
      trackerId: tracker.id,
      date: today,
      value: 1,
      note: null,
      createdAt: new Date().toISOString()
    })

  const renderControl = () => {
    if (tracker.type === 'habit') {
      const goal = perDayGoal(tracker)
      const n = todayLog
      const ringColor = done ? PACE_COLOR.on_track : PACE_COLOR.ahead
      return (
        <Pressable
          onPress={logYes}
          className='h-[46px] w-[46px] items-center justify-center'
        >
          <Ring
            fraction={goal ? n / goal : 0}
            color={ringColor}
            size={46}
            strokeWidth={4}
          />
          <View className='absolute inset-0 items-center justify-center'>
            <Typography
              className={`text-xs font-extrabold ${
                done ? 'text-pace-on' : 'text-ink-2'
              }`}
            >
              {`${n}/${goal}`}
            </Typography>
          </View>
        </Pressable>
      )
    }
    if (tracker.type === 'project') {
      return <Icons.Chevron size={20} color={PACE_COLOR.none} />
    }
    // target / average → stepper
    const step = quickStep(tracker)
    const unitLabel = tracker.unit ?? t('common.done')
    return (
      <View className='flex-row items-center gap-s2'>
        <Pressable
          onPress={() => setValue(Math.max(0, todayLog - step))}
          className='items-center justify-center rounded-md-k border border-line bg-surface-2 h-[38px] w-[38px]'
        >
          <Typography className='text-xl font-bold text-ink'>−</Typography>
        </Pressable>
        <View className='items-center min-w-[46px]'>
          <Typography className='text-lg font-extrabold text-ink'>
            {fmtNum(todayLog)}
          </Typography>
          <Typography
            className='text-ink-3 font-semibold text-[10px]'
            numberOfLines={1}
          >
            {unitLabel}
          </Typography>
        </View>
        <Pressable
          onPress={() => setValue(todayLog + step)}
          className='items-center justify-center rounded-md-k border border-line bg-surface-2 h-[38px] w-[38px]'
        >
          <Typography className='text-xl font-bold text-ink'>+</Typography>
        </Pressable>
      </View>
    )
  }

  return (
    <Pressable
      onPress={() => onOpen(tracker.id)}
      className={`flex-row items-center gap-s3 rounded-lg-k border p-s3 px-s4 shadow-sm ${
        done ? 'bg-brand-faint border-brand-weak' : 'bg-surface border-line'
      }`}
    >
      <View
        className='items-center justify-center rounded-md-k h-[38px] w-[38px]'
        // runtime: tint from user-chosen tracker.color
        style={{ backgroundColor: hexA(tracker.color, 0.14) }}
      >
        <Typography className='text-[19px]'>
          {iconEmoji(tracker.icon)}
        </Typography>
      </View>

      <View className='flex-1 min-w-0'>
        <Typography numberOfLines={1} className='text-lg font-bold text-ink'>
          {tracker.name}
        </Typography>
        <View className='flex-row items-center gap-s2 mt-[2px]'>
          <View
            className='rounded-full h-2 w-2'
            // runtime: user-chosen tracker.color
            style={{ backgroundColor: colorHex(tracker.color) }}
          />
          <Typography className='text-sm text-ink-2'>{subText}</Typography>
        </View>
        {row.status === 'missed' ? (
          // Missed today (attempts filled the goal but not enough Yes) — a muted
          // encouragement line instead of the streak text.
          <Typography className='text-sm text-ink-2 mt-[2px]'>
            {t('today.missedEncourage')}
          </Typography>
        ) : streak && streak.kind !== 'none' ? (
          <View className='flex-row items-center gap-s1 mt-[2px]'>
            {isMissedKind(streak.kind) ? (
              // amber warning icon; the text stays muted (like the cadence line)
              <Icons.Warn size={13} color='#e8923a' />
            ) : (
              <Icons.Flame size={13} color={PACE_COLOR.on_track} />
            )}
            <Typography
              className={`text-sm font-bold ${
                isMissedKind(streak.kind) ? 'text-ink-2' : 'text-pace-on'
              }`}
            >
              {t(STREAK_KEY[streak.kind], { count: streak.n })}
            </Typography>
          </View>
        ) : null}
      </View>

      {renderControl()}
    </Pressable>
  )
}

export function DailyGoalsScreen() {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const nav = useNavigation<Nav>()
  const today = toISODate(new Date())

  const { data: trackers = [] } = useTrackers()
  const { data: todayEntries = [] } = useEntriesForDate(today)
  const log = useLogEntry()

  // Sum of today's logged value per tracker.
  const todayValue = new Map<string, number>()
  for (const e of todayEntries) {
    todayValue.set(e.trackerId, (todayValue.get(e.trackerId) ?? 0) + e.value)
  }

  // Count of today's "No" logs (value 0) per tracker — used to classify a
  // habit as missed (attempts filled the goal but not enough were Yes).
  const todayNo = new Map<string, number>()
  for (const e of todayEntries) {
    if (e.value === 0)
      todayNo.set(e.trackerId, (todayNo.get(e.trackerId) ?? 0) + 1)
  }

  const due = trackers.filter((tr) => isDueToday(tr, today))
  const rows: Row[] = due.map((tracker) => {
    const todayLog = todayValue.get(tracker.id) ?? 0
    const no = todayNo.get(tracker.id) ?? 0
    const status = classifyTodayRow(tracker, todayLog, no)
    return { tracker, status, done: status === 'completed', todayLog }
  })

  const total = rows.length
  const dueRows = rows.filter((r) => r.status === 'due')
  const missed = rows.filter((r) => r.status === 'missed')
  const completed = rows.filter((r) => r.status === 'completed')
  const doneCount = completed.length

  const hours = new Date().getHours()
  const greetKey =
    hours < 12
      ? 'today.greetMorning'
      : hours < 18
      ? 'today.greetAfternoon'
      : 'today.greetEvening'
  const dateStr = new Date()
    .toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })
    .toUpperCase()

  const onLog = (e: Entry) => log.mutate(e)
  const onOpen = (id: string) =>
    nav.navigate('TrackerDetail', { trackerId: id })

  // ---- Empty state (no trackers at all) ----
  if (trackers.length === 0) {
    return (
      <View className='flex-1 bg-bg'>
        <View
          className='bg-surface px-s5 pb-s4'
          // safe-area, runtime
          style={{ paddingTop: insets.top + 16 }}
        >
          <Typography className='text-sm font-bold text-brand-ink uppercase'>
            {dateStr}
          </Typography>
          <Typography className='text-2xl font-extrabold text-ink mt-1'>
            {t(greetKey)}
          </Typography>
        </View>
        <View className='flex-1 items-center justify-center px-s6 gap-s3'>
          <View className='mb-2'>
            <NoData size={220} />
          </View>
          <Typography className='text-xl font-extrabold text-ink text-center'>
            {t('today.empty')}
          </Typography>
          <Typography className='text-base text-ink-2 text-center max-w-[250px]'>
            {t('today.emptyBody')}
          </Typography>
          <View className='mt-s3'>
            <CreateButton
              label={t('list.create')}
              onPress={() => nav.navigate('TrackerTypePicker')}
            />
          </View>
        </View>
      </View>
    )
  }

  // "All caught up" — nothing left to log today: no due and no missed rows.
  // Covers both everything-completed and nothing-due-today (total === 0).
  const allDone = dueRows.length === 0 && missed.length === 0

  return (
    <View className='flex-1 bg-bg'>
      {/* head */}
      <View
        className='bg-surface px-s5 pb-s4'
        // safe-area, runtime
        style={{ paddingTop: insets.top + 16 }}
      >
        <Typography className='text-sm font-bold text-brand-ink uppercase'>
          {dateStr}
        </Typography>
        <Typography className='text-2xl font-extrabold text-ink mt-1'>
          {t(greetKey)}
        </Typography>

        <View className='flex-row items-center gap-s4 rounded-lg-k bg-brand-weak p-s4 mt-s4'>
          <View className='items-center justify-center h-[52px] w-[52px]'>
            <Ring
              fraction={total ? doneCount / total : 0}
              color='#2456b5'
              size={52}
              strokeWidth={6}
            />
            <View className='absolute inset-0 items-center justify-center'>
              <Typography className='font-extrabold text-brand-ink text-[14px]'>
                {`${doneCount}/${total}`}
              </Typography>
            </View>
          </View>
          <View className='flex-1'>
            <Typography className='text-xl font-extrabold text-brand-ink'>
              {t('today.summaryDone', { done: doneCount, total })}
            </Typography>
            <Typography className='text-sm text-brand-ink opacity-80'>
              {allDone ? t('today.allClear') : t('today.summaryCap')}
            </Typography>
          </View>
        </View>
      </View>

      <ScrollView contentContainerClassName='pb-8'>
        {allDone ? (
          <View className='items-center px-s6 gap-s3 pt-12'>
            <View className='mb-s2 h-24 w-24 items-center justify-center rounded-xl-k bg-brand-weak'>
              <Typography className='text-[46px] leading-[60px]'>🎉</Typography>
            </View>
            <Typography className='text-xl font-extrabold text-ink text-center'>
              {t('today.allClear')}
            </Typography>
            <Typography className='text-base text-ink-2 text-center max-w-[250px]'>
              {t('today.allClearBody')}
            </Typography>
          </View>
        ) : null}

        {dueRows.length > 0 && !allDone ? (
          <>
            <Typography className='text-xs font-bold uppercase text-ink-3 px-s5 pt-5 pb-2'>
              {t('today.dueToday')}
            </Typography>
            <View className='px-s5 gap-s3'>
              {dueRows.map((row) => (
                <LogRow
                  key={row.tracker.id}
                  row={row}
                  today={today}
                  onLog={onLog}
                  onOpen={onOpen}
                />
              ))}
            </View>
          </>
        ) : null}

        {missed.length > 0 && !allDone ? (
          <>
            <Typography className='text-xs font-bold uppercase text-ink-3 px-s5 pt-5 pb-2'>
              {t('today.missed')}
            </Typography>
            <View className='px-s5 gap-s3'>
              {missed.map((row) => (
                <LogRow
                  key={row.tracker.id}
                  row={row}
                  today={today}
                  onLog={onLog}
                  onOpen={onOpen}
                />
              ))}
            </View>
          </>
        ) : null}

        {completed.length > 0 && !allDone ? (
          <>
            <Typography className='text-xs font-bold uppercase text-ink-3 px-s5 pt-5 pb-2'>
              {t('today.completed')}
            </Typography>
            <View className='px-s5 gap-s3'>
              {completed.map((row) => (
                <LogRow
                  key={row.tracker.id}
                  row={row}
                  today={today}
                  onLog={onLog}
                  onOpen={onOpen}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  )
}
