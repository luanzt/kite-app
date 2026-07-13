import { useState } from 'react'
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
  useDeleteEntry,
  useEntriesForDate,
  useEntries
} from '@features/trackers/queries'
import { toISODate, weekdayOf } from '@utils/date'
import { Icons, hexA, iconEmoji, colorHex } from '@features/trackers/icons'
import { NoData } from '@features/trackers/components/NoData'
import { CreateButton } from '@features/trackers/components/CreateButton'
import type { RootStackParamList } from '@navigation/types'
import type {
  Tracker,
  Entry,
  PaceStatus,
  TrackerProgress
} from '@features/trackers/types'
import {
  classifyTodayRow,
  habitStreakStatus,
  perDayGoal,
  todaySummary,
  type StreakStatus,
  type TodayRowStatus
} from '@features/trackers/calculators/habitStats'
import { uuid } from '@features/trackers/factory'
import { calculateTarget } from '@features/trackers/calculators/target'
import { calculateAverage } from '@features/trackers/calculators/average'
import { fmtCompact, fmtValCompact } from '@features/trackers/detailFormat'
import { LogEntryModal } from '@features/trackers/components/LogEntryModal'
import { CalendarDayMenu } from '@features/trackers/components/CalendarDayMenu'
import { useThemeColors } from '@hooks/useThemeColors'

type Nav = NativeStackNavigationProp<RootStackParamList>

function isDueToday(t: Tracker, todayISO: string): boolean {
  const dueByWeekday = t.type === 'habit' || t.type === 'average'
  if (dueByWeekday && t.repeatDays && t.repeatDays.length) {
    return t.repeatDays.includes(weekdayOf(todayISO))
  }
  return true
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
  const theme = useThemeColors()
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
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
        stroke={theme.line}
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
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
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

// Amber warning tone shared by the limit icon and warn states on this screen.
const AMBER = '#e8923a'

// Bad-habit streak line: clean-day copy instead of "streak" wording. Only the
// kinds habitStreakStatus can return for a bad habit are mapped.
const BAD_STREAK_KEY: Partial<Record<StreakStatus['kind'], string>> = {
  greatStart: 'today.cleanStart',
  streakOngoing: 'today.cleanOngoing',
  streakEnded: 'today.cleanEnded'
}

// Pace line color by status (literal classes — never interpolate).
const PACE_TEXT_CLASS: Record<PaceStatus, string> = {
  on_track: 'text-pace-on',
  behind: 'text-pace-behind',
  ahead: 'text-pace-ahead',
  none: 'text-ink-2'
}

/** Deadline as "29 Nov 2026" in the active locale. */
function fmtDeadline(iso: string, lang: string): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

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
  onOpen,
  onQuickLog,
  onOpenMenu
}: {
  row: Row
  today: string
  onLog: (e: Entry) => void
  onOpen: (id: string) => void
  onQuickLog: (tracker: Tracker) => void
  onOpenMenu: (tracker: Tracker) => void
}) {
  const { t, i18n } = useTranslation()
  const c = useThemeColors()
  const { tracker, done, todayLog } = row
  const isBad = tracker.type === 'habit' && tracker.direction === 'bad'
  const { data: allEntries = [] } = useEntries(tracker.id)
  const streak: StreakStatus | null =
    tracker.type === 'habit'
      ? habitStreakStatus(tracker, allEntries, today)
      : null
  // Bad habits use clean-day copy; a bad-habit streakEnded (went over today)
  // renders as a warning, mirroring isMissedKind for good habits.
  const streakKey = streak
    ? isBad
      ? BAD_STREAK_KEY[streak.kind] ?? ''
      : STREAK_KEY[streak.kind]
    : ''
  const streakNegative = streak
    ? isBad
      ? streak.kind === 'streakEnded'
      : isMissedKind(streak.kind)
    : false
  const progress: TrackerProgress | null =
    tracker.type === 'target'
      ? calculateTarget(tracker, allEntries, today)
      : tracker.type === 'average'
      ? calculateAverage(tracker, allEntries, today)
      : null

  // Sub-line text per type.
  let subText: string
  if (tracker.type === 'habit') {
    const period = tracker.period ?? 'daily'
    subText = period.charAt(0).toUpperCase() + period.slice(1)
  } else if (tracker.type === 'average') {
    subText = t('today.targetIs', {
      value: fmtValCompact(tracker, tracker.targetValue ?? 0)
    })
  } else {
    // target — drop the unit; the big value/pace are already unit-less, so the
    // goal sub-line stays just the number too.
    const goalVal = fmtCompact(tracker.targetValue ?? 0)
    subText = tracker.deadline
      ? t('today.goalBy', {
          value: goalVal,
          date: fmtDeadline(tracker.deadline, i18n.language)
        })
      : t('today.goal', { value: goalVal })
  }

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
      const n = todayLog
      if (isBad) {
        // Limit ring: shows the REMAINING quota (starts full, drains per
        // slip). Center is the remaining count — or red "slips/limit"
        // (e.g. "7/5") once over the limit. A tap never logs directly:
        // under the limit it opens the log sheet to confirm; at/over the
        // limit (or on long-press anytime) it opens the day action menu so
        // the last log can be deleted.
        const limit = tracker.targetValue ?? 0
        const over = n > limit
        const remaining = Math.max(0, limit - n)
        const ringColor = over
          ? c.pace.behind
          : remaining === 0
          ? AMBER
          : c.pace.on_track
        const ringFraction = over ? 1 : limit > 0 ? remaining / limit : 1
        return (
          <Pressable
            onPress={() =>
              n >= limit ? onOpenMenu(tracker) : onQuickLog(tracker)
            }
            onLongPress={() => onOpenMenu(tracker)}
            className='h-[46px] w-[46px] items-center justify-center'
          >
            <Ring
              fraction={ringFraction}
              color={ringColor}
              size={46}
              strokeWidth={4}
            />
            <View className='absolute inset-0 items-center justify-center'>
              <Typography
                className={`text-xs font-extrabold ${
                  over
                    ? 'text-pace-behind'
                    : remaining === 0
                    ? 'text-[#e8923a]'
                    : 'text-pace-on'
                }`}
              >
                {over ? `${n}/${limit}` : `${remaining}`}
              </Typography>
            </View>
          </Pressable>
        )
      }
      const goal = perDayGoal(tracker)
      const ringColor = done ? c.pace.on_track : c.pace.ahead
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
      return <Icons.Chevron size={20} color={c.pace.none} />
    }
    // target / average → read-only value + pace, tap opens the log sheet
    const isAverage = tracker.type === 'average'
    // Big value drops the unit (the goal sub-line already carries it) — just the number.
    const bigValue = isAverage
      ? fmtCompact(todayLog) // average shows today's logged value
      : fmtCompact(progress?.current ?? 0) // target shows accumulated current
    const paceStatus: PaceStatus = progress?.paceStatus ?? 'none'
    // average → "Avg: <cumulative avg>"; target → "Pace: <expected>" (hidden if none)
    const paceLine = isAverage
      ? t('today.avg', { value: fmtCompact(progress?.current ?? 0) })
      : progress?.expected != null
      ? t('today.pace', { value: fmtCompact(progress.expected) })
      : null
    return (
      <Pressable
        onPress={() => onQuickLog(tracker)}
        className='items-end min-w-[78px] py-s1'
      >
        <Typography className='text-base font-extrabold text-brand-ink'>
          {bigValue}
        </Typography>
        {paceLine ? (
          <Typography
            className={`text-sm font-semibold ${PACE_TEXT_CLASS[paceStatus]}`}
          >
            {paceLine}
          </Typography>
        ) : null}
      </Pressable>
    )
  }

  return (
    <Pressable
      onPress={() => onOpen(tracker.id)}
      // Bad habit: long-press anywhere on the card opens the day action menu
      // (same as long-pressing the ring).
      onLongPress={isBad ? () => onOpenMenu(tracker) : undefined}
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
        <Typography numberOfLines={1} className='text-base font-bold text-ink'>
          {tracker.name}
        </Typography>
        {isBad ? (
          <View className='flex-row items-center gap-s2 mt-[2px]'>
            <Icons.Ban size={13} color={AMBER} />
            <Typography className='text-sm text-ink-2'>
              {t('today.limitPerDay', {
                value: fmtCompact(tracker.targetValue ?? 0)
              })}
            </Typography>
          </View>
        ) : (
          <View className='flex-row items-center gap-s2 mt-[2px]'>
            <View
              className='rounded-full h-2 w-2'
              // runtime: user-chosen tracker.color
              style={{ backgroundColor: colorHex(tracker.color) }}
            />
            <Typography className='text-sm text-ink-2'>{subText}</Typography>
          </View>
        )}
        {row.status === 'missed' && !isBad ? (
          // Missed today (attempts filled the goal but not enough Yes) — a muted
          // encouragement line instead of the streak text.
          <Typography className='text-sm text-ink-2 mt-[2px]'>
            {t('today.missedEncourage')}
          </Typography>
        ) : streak && streak.kind !== 'none' && streakKey ? (
          <View className='flex-row items-center gap-s1 mt-[2px]'>
            {streakNegative ? (
              // amber warning icon; the text stays muted (like the cadence line)
              <Icons.Warn size={13} color={AMBER} />
            ) : isBad && streak.kind === 'greatStart' ? (
              <Icons.Check size={13} color={c.pace.on_track} />
            ) : (
              <Icons.Flame size={13} color={c.pace.on_track} />
            )}
            <Typography
              className={`text-sm ${
                streakNegative ? 'text-ink-2' : 'text-pace-on'
              }`}
            >
              {t(streakKey, { count: streak.n })}
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
  const c = useThemeColors()
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

  const dueRows = rows.filter((r) => r.status === 'due')
  const missed = rows.filter((r) => r.status === 'missed')
  const completed = rows.filter((r) => r.status === 'completed')
  // Summary decouples from sections: a clean bad habit sits in Due Today yet
  // counts as done, and allDone tolerates clean bad habits still listed below.
  const { done: doneCount, total, allDone } = todaySummary(rows)

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

  // Quick-log sheet. Mirrors TrackerDetailScreen: the LogEntryModal is ALWAYS
  // mounted (never gated on the tracker) so its BottomSheet sees a clean
  // false→true transition; only `logOpen` toggles. `logTarget` remembers which
  // tracker to log and stays set across closes so the sheet can animate out.
  const [logTarget, setLogTarget] = useState<Tracker | null>(null)
  const [logOpen, setLogOpen] = useState(false)
  const openQuickLog = (tracker: Tracker) => {
    setLogTarget(tracker)
    setLogOpen(true)
  }
  const closeQuickLog = () => setLogOpen(false)

  // Bad-habit day action menu (log slip / stayed clean / delete last log) —
  // opened by long-pressing the limit ring, or by a plain tap once today's
  // slips reach the limit.
  const [menuTracker, setMenuTracker] = useState<Tracker | null>(null)
  const del = useDeleteEntry()
  const menuEntries = menuTracker
    ? todayEntries.filter((e) => e.trackerId === menuTracker.id)
    : []
  const menuLog = (value: number) => {
    if (!menuTracker) return
    log.mutate({
      id: uuid(),
      trackerId: menuTracker.id,
      date: today,
      value,
      note: null,
      createdAt: new Date().toISOString()
    })
  }
  const menuDeleteLast = () => {
    if (!menuTracker) return
    // newest record of the day, by createdAt (fallback to date)
    const last = [...menuEntries].sort((a, b) =>
      (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
    )[0]
    if (last) del.mutate({ id: last.id, trackerId: menuTracker.id })
  }

  const onLog = (e: Entry) => log.mutate(e)
  const onOpen = (id: string) =>
    nav.navigate('TrackerDetail', { trackerId: id })

  // ---- Empty state (no trackers at all) ----
  if (trackers.length === 0) {
    return (
      <View className='flex-1 bg-bg'>
        <View
          className='bg-surface px-s4 pb-s4'
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

  return (
    <View className='flex-1 bg-bg'>
      {/* head */}
      <View
        className='bg-surface px-s4 pb-s4'
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

      <ScrollView contentContainerClassName='pb-8'>
        <View className='flex-row items-center gap-s4 rounded-lg-k bg-brand-weak p-s4 mx-s4 mt-s4'>
          <View className='items-center justify-center h-[52px] w-[52px]'>
            <Ring
              fraction={total ? doneCount / total : 0}
              color={c.brand}
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

        {dueRows.length > 0 ? (
          <>
            <Typography className='text-xs font-bold uppercase text-ink px-s4 pt-5 pb-2'>
              {t('today.dueToday')}
            </Typography>
            <View className='px-s4 gap-s3'>
              {dueRows.map((row) => (
                <LogRow
                  key={row.tracker.id}
                  row={row}
                  today={today}
                  onLog={onLog}
                  onOpen={onOpen}
                  onQuickLog={openQuickLog}
                  onOpenMenu={setMenuTracker}
                />
              ))}
            </View>
          </>
        ) : null}

        {missed.length > 0 && !allDone ? (
          <>
            <Typography className='text-xs font-bold uppercase text-ink px-s4 pt-5 pb-2'>
              {t('today.missed')}
            </Typography>
            <View className='px-s4 gap-s3'>
              {missed.map((row) => (
                <LogRow
                  key={row.tracker.id}
                  row={row}
                  today={today}
                  onLog={onLog}
                  onOpen={onOpen}
                  onQuickLog={openQuickLog}
                  onOpenMenu={setMenuTracker}
                />
              ))}
            </View>
          </>
        ) : null}

        {completed.length > 0 && !allDone ? (
          <>
            <Typography className='text-xs font-bold uppercase text-ink px-s4 pt-5 pb-2'>
              {t('today.completed')}
            </Typography>
            <View className='px-s4 gap-s3'>
              {completed.map((row) => (
                <LogRow
                  key={row.tracker.id}
                  row={row}
                  today={today}
                  onLog={onLog}
                  onOpen={onOpen}
                  onQuickLog={openQuickLog}
                  onOpenMenu={setMenuTracker}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
      {/* Always mounted (like TrackerDetailScreen) so the BottomSheet animates
          on a clean false→true. Falls back to a stable tracker before the first
          pick; `logOpen` keeps it closed until a value is tapped. */}
      {logTarget ?? trackers[0] ? (
        <LogEntryModal
          tracker={(logTarget ?? trackers[0])!}
          defaultDate={today}
          visible={logOpen}
          onClose={closeQuickLog}
          onSave={(e) => {
            onLog(e)
            closeQuickLog()
          }}
        />
      ) : null}
      {/* Bad-habit action menu — always mounted; `date` toggles visibility. */}
      <CalendarDayMenu
        date={menuTracker ? today : null}
        title={menuTracker?.name ?? ''}
        hasEntry={menuEntries.length > 0}
        badHabit
        onLogYes={() => menuLog(1)}
        onLogNo={() => menuLog(0)}
        onDeleteLast={menuDeleteLast}
        onClose={() => setMenuTracker(null)}
      />
    </View>
  )
}
