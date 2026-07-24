import { useRef, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Typography, useToast } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  ChevronDown,
  Sunrise,
  Sun,
  MoonStar,
  Hourglass,
  CircleCheck
} from 'lucide-react-native'
import {
  useTrackers,
  useLogEntry,
  useDeleteEntry,
  useEntriesForDate,
  useAllEntries,
  useEntries
} from '@features/trackers/queries'
import { toISODate, weekdayOf } from '@utils/date'
import { Icons, hexA, iconEmoji, progressFill } from '@features/trackers/icons'
import { NoData } from '@features/trackers/components/NoData'
import { CreateButton } from '@features/trackers/components/CreateButton'
import { NewTrackerSheet } from '@features/trackers/components/NewTrackerSheet'
import { TypeBadge } from '@features/trackers/components/TypeBadge'
import { PaceBar } from '@features/trackers/components/PaceBar'
import { cadenceLabel } from '@features/trackers/habitLabels'
import type { RootStackParamList } from '@navigation/types'
import type {
  Tracker,
  Entry,
  Period,
  PaceStatus,
  TrackerProgress
} from '@features/trackers/types'
import {
  classifyTodayRow,
  habitBarStatus,
  habitStreakStatus,
  periodGoalOf,
  periodQuotaMet,
  periodTotal,
  periodUnitOf,
  todaySummary,
  todayStripDays,
  type PeriodUnit,
  type StreakStatus,
  type StripDay,
  type TodayRowStatus
} from '@features/trackers/calculators/habitStats'
import { uuid } from '@features/trackers/factory'
import { calculateTarget } from '@features/trackers/calculators/target'
import { calculateAverage } from '@features/trackers/calculators/average'
import { fmtCompact, fmtValCompact } from '@features/trackers/detailFormat'
import { LogEntryModal } from '@features/trackers/components/LogEntryModal'
import { showLogSuccess } from '@features/trackers/components/LogSuccessToast'
import { CalendarDayMenu } from '@features/trackers/components/CalendarDayMenu'
import { Ring } from '@features/trackers/components/Ring'
import { useThemeColors } from '@hooks/useThemeColors'

type Nav = NativeStackNavigationProp<RootStackParamList>

// Bad-habit sub-line ("Limit N/…") and the caption under the progress ring,
// both keyed by the habit's period so a weekly limit reads "/week" + "This week"
// instead of the old hard-coded "/day".
const LIMIT_KEY: Record<Period, string> = {
  daily: 'today.limitPerDay',
  weekly: 'today.limitPerWeek',
  monthly: 'today.limitPerMonth',
  yearly: 'today.limitPerYear'
}
const WINDOW_KEY: Record<Period, string> = {
  daily: 'today.windowDay',
  weekly: 'today.windowWeek',
  monthly: 'today.windowMonth',
  yearly: 'today.windowYear'
}

function isDueOnDate(t: Tracker, iso: string): boolean {
  const dueByWeekday = t.type === 'habit' || t.type === 'average'
  if (dueByWeekday && t.repeatDays && t.repeatDays.length) {
    return t.repeatDays.includes(weekdayOf(iso))
  }
  return true
}

const isMissedKind = (k: StreakStatus['kind']): boolean =>
  k === 'missedYesterday' || k === 'missedLastTime' || k === 'missedDays'

// Amber warning tone shared by the limit icon and warn states on this screen.
const AMBER = '#e8923a'
// Night indigo for the evening greeting (moon) — reads as "after dark" instead
// of the warm amber used for the sunrise/sun icons.
const NIGHT = '#6366f1'

// Minimal i18n `t` shape (dynamic key + count/interpolation) — the streak line
// builds keys per cadence, so a Record-typed t would be awkward here.
type TFunc = (key: string, opts?: Record<string, unknown>) => string

// Pluralizable unit noun ("day"/"days"…), the lowercase window word for the
// bad-habit "clean so far …" line, and the "missed last <period>" key — all keyed
// by cadence unit.
const UNIT_KEY: Record<PeriodUnit, string> = {
  day: 'unit.day',
  week: 'unit.week',
  month: 'unit.month',
  year: 'unit.year'
}
const WINDOW_WORD: Record<PeriodUnit, string> = {
  day: 'list.today',
  week: 'list.thisWeek',
  month: 'list.thisMonth',
  year: 'list.thisYear'
}
const MISSED_LAST_KEY: Record<PeriodUnit, string> = {
  day: 'today.missedYesterday',
  week: 'today.missedLastWeek',
  month: 'today.missedLastMonth',
  year: 'today.missedLastYear'
}

/**
 * The streak/clean line, worded for the habit's cadence. The "streak" copy is
 * an adjectival compound — hyphen + singular noun ("2-day streak", "2-month
 * streak"); the "clean" and "missed N in a row" copy read as natural plural
 * sentences ("3 days clean", "Missed 3 weeks in a row"). Good habits read
 * "2-day streak" / "Missed 3 weeks in a row"; bad habits read "3 days clean" /
 * "Clean so far this week". Returns '' when there's nothing to show.
 */
function streakLine(
  t: TFunc,
  streak: StreakStatus,
  unit: PeriodUnit,
  isBad: boolean
): string {
  const { kind, n } = streak
  const plural = t(UNIT_KEY[unit], { count: n })
  const singular = t(UNIT_KEY[unit], { count: 1 })
  if (isBad) {
    switch (kind) {
      case 'greatStart':
        return t('today.cleanStart', { window: t(WINDOW_WORD[unit]) })
      case 'streakOngoing':
        return t('today.cleanOngoing', { count: n, unit: plural })
      case 'streakEnded':
        return t('today.cleanEnded', { count: n, unit: singular })
      default:
        return ''
    }
  }
  switch (kind) {
    case 'greatStart':
      return t('today.streakGreatStart')
    case 'streakOngoing':
      return t('today.streakOngoing', { count: n, unit: singular })
    case 'streakEnded':
      return t('today.streakEnded', { count: n, unit: singular })
    case 'missedDays':
      return t('today.missedInARow', { count: n, unit: plural })
    case 'missedYesterday':
      return t(MISSED_LAST_KEY[unit])
    case 'missedLastTime':
      return t('today.missedLastTime')
    default:
      return ''
  }
}

// Pace line color by status (literal classes — never interpolate).
const PACE_TEXT_CLASS: Record<PaceStatus, string> = {
  on_track: 'text-pace-on',
  behind: 'text-pace-behind',
  ahead: 'text-pace-ahead',
  none: 'text-ink-2'
}

type SectionKey = 'due' | 'completed' | 'missed'

// Grouped-section header tint + text per section (literal classes — never
// interpolate). The section header carries the status color; rows stay plain.
const SECTION_HEAD_BG: Record<SectionKey, string> = {
  due: 'bg-brand-weak',
  completed: 'bg-pace-on-weak',
  missed: 'bg-pace-behind-weak'
}
const SECTION_HEAD_TEXT: Record<SectionKey, string> = {
  due: 'text-brand-ink',
  completed: 'text-pace-on',
  missed: 'text-pace-behind'
}

/** Deadline as "29 Nov 2026" in the active locale. */
// Day + short month, day-first ("17 Jul" / "17 thg 7") — used in the header
// when a day other than today is selected.
function fmtDayMonth(iso: string, lang: string): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  const month = d.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    month: 'short'
  })
  return `${d.getDate()} ${month}`
}

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

/** One pill of the horizontal date strip (month abbr + day number). */
function DayPill({
  day,
  selected,
  locale,
  onSelect
}: {
  day: StripDay
  selected: boolean
  locale: string
  onSelect: (iso: string) => void
}) {
  // vi's "short" month is "Tháng 7" (too long for the pill) — abbreviate to "TH 7"
  const mon = locale.startsWith('vi')
    ? `TH ${Number(day.iso.slice(5, 7))}`
    : new Date(`${day.iso}T00:00:00`)
        .toLocaleDateString(locale, { month: 'short' })
        .toUpperCase()
  const num = `${Number(day.iso.slice(8, 10))}`
  return (
    <Pressable
      disabled={day.isFuture}
      onPress={() => onSelect(day.iso)}
      className={`items-center gap-[6px] ${day.isFuture ? 'opacity-40' : ''}`}
    >
      <View
        className={`h-[52px] w-[52px] items-center justify-center rounded-full border-[1.5px] ${
          selected ? 'bg-brand-weak border-brand' : 'bg-bg border-transparent'
        }`}
      >
        <Typography
          className={`text-[10px] font-bold ${
            selected ? 'text-brand-ink' : 'text-ink-3'
          }`}
        >
          {mon}
        </Typography>
        <Typography
          className={`text-[17px] font-extrabold leading-[19px] ${
            selected ? 'text-brand-ink' : 'text-ink'
          }`}
        >
          {num}
        </Typography>
      </View>
      <View
        className={`h-[5px] w-[5px] rounded-full ${
          selected ? 'bg-brand' : 'bg-transparent'
        }`}
      />
    </Pressable>
  )
}

/** Tinted header bar of a grouped section card: icon + title + count chip + chevron. */
function SectionHeader({
  sectionKey,
  title,
  count,
  open,
  onToggle
}: {
  sectionKey: SectionKey
  title: string
  count: number
  open: boolean
  onToggle: () => void
}) {
  const c = useThemeColors()
  // Concrete hex for the lucide icons — mirrors SECTION_HEAD_TEXT.
  const fg =
    sectionKey === 'due'
      ? c.brand
      : sectionKey === 'completed'
      ? c.pace.on_track
      : c.pace.behind
  const HeadIcon =
    sectionKey === 'due'
      ? Hourglass
      : sectionKey === 'completed'
      ? CircleCheck
      : Icons.Ban
  return (
    <Pressable
      onPress={onToggle}
      className={`flex-row items-center gap-s2 px-s4 py-[15px] ${SECTION_HEAD_BG[sectionKey]}`}
    >
      <HeadIcon size={16} color={fg} />
      <Typography
        className={`text-[15px] font-extrabold ${SECTION_HEAD_TEXT[sectionKey]}`}
      >
        {title}
      </Typography>
      <View className='h-[20px] min-w-[22px] items-center justify-center rounded-full bg-surface px-[6px]'>
        <Typography
          className={`text-xs font-extrabold ${SECTION_HEAD_TEXT[sectionKey]}`}
        >
          {count}
        </Typography>
      </View>
      <View className='flex-1' />
      {open ? (
        <ChevronDown size={16} color={fg} />
      ) : (
        <Icons.Chevron size={16} color={fg} />
      )}
    </Pressable>
  )
}

function LogRow({
  row,
  date,
  onOpen,
  onQuickLog,
  onQuickAdd,
  onOpenMenu
}: {
  row: Row
  date: string
  onOpen: (id: string) => void
  onQuickLog: (tracker: Tracker) => void
  onQuickAdd: (tracker: Tracker) => void
  onOpenMenu: (tracker: Tracker) => void
}) {
  const { t, i18n } = useTranslation()
  const c = useThemeColors()
  const { tracker, done, todayLog } = row
  const isBad = tracker.type === 'habit' && tracker.direction === 'bad'
  const { data: allEntries = [] } = useEntries(tracker.id)
  const streak: StreakStatus | null =
    tracker.type === 'habit'
      ? habitStreakStatus(tracker, allEntries, date)
      : null
  // Bad habits use clean-day copy; a bad-habit streakEnded (went over today)
  // renders as a warning, mirroring isMissedKind for good habits. The line is
  // worded and pluralized for the habit's cadence (day/week/month/year).
  const streakText = streak
    ? streakLine(t, streak, periodUnitOf(tracker), isBad)
    : ''
  const streakNegative = streak
    ? isBad
      ? streak.kind === 'streakEnded'
      : isMissedKind(streak.kind)
    : false
  const progress: TrackerProgress | null =
    tracker.type === 'target'
      ? calculateTarget(tracker, allEntries, date)
      : tracker.type === 'average'
      ? calculateAverage(tracker, allEntries, date)
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

  // One sub-line for the new layout: cadence for good habits, the limit for bad
  // habits, the goal/target line (subText) otherwise. Decreasing target gets ↓.
  const isDecreasingTarget =
    tracker.type === 'target' &&
    tracker.startValue != null &&
    tracker.startValue > (tracker.targetValue ?? 0)
  const subLine =
    tracker.type === 'habit'
      ? isBad
        ? t(LIMIT_KEY[tracker.period ?? 'daily'], {
            value: fmtCompact(tracker.targetValue ?? 0)
          })
        : cadenceLabel(tracker, t)
      : isDecreasingTarget
      ? `↓ ${subText}`
      : subText
  // Progress bar (target) shown below the row, mirroring the Trackers card.
  const showBar = tracker.type === 'target'
  const barPercent = progress?.percent ?? 0
  const barStatus: PaceStatus = progress?.paceStatus ?? 'none'

  const renderControl = () => {
    if (tracker.type === 'habit') {
      const period = tracker.period ?? 'daily'
      // The ring/limit are scored over the whole period window (day/week/month/
      // year), not just the selected day, so a "5 per week" limit reads its
      // week's slips — matching how good habits already treat a weekly target.
      const n = periodTotal(tracker, allEntries, date)
      // Caption naming the window the ring counts ("Today" / "This week" …).
      const withCaption = (control: ReactNode) => (
        <View className='items-center'>
          {control}
          <Typography className='mt-[1px] text-xs font-medium text-ink-3'>
            {t(WINDOW_KEY[period])}
          </Typography>
        </View>
      )
      if (isBad) {
        // Limit ring: fills with the window's slips ("0/5" → "1/5") in the
        // behind red — slips are the thing being counted, and the arc maxes
        // out once over the limit. A tap never logs directly: under the limit
        // it opens the log sheet to confirm; at/over the limit (or on
        // long-press anytime) it opens the day action menu so the last log
        // can be deleted.
        const limit = tracker.targetValue ?? 0
        // Ring is green while within the limit (n <= limit) and turns red only
        // once exceeded (n > limit); the "/limit" cap is always red. The arc is
        // a draining quota: full while clean, emptying with each slip, then full
        // red once over — matching the Trackers card.
        const over = n > limit
        const ringFraction = over ? 1 : limit > 0 ? (limit - n) / limit : 1
        return withCaption(
          <Pressable
            onPress={() =>
              n >= limit ? onOpenMenu(tracker) : onQuickLog(tracker)
            }
            onLongPress={() => onOpenMenu(tracker)}
            className='h-[54px] w-[54px] items-center justify-center'
          >
            <Ring
              fraction={ringFraction}
              color={over ? c.pace.behind : c.pace.on_track}
              size={48}
              strokeWidth={4}
            />
            <View className='absolute inset-0 items-center justify-center'>
              <Typography
                className={`text-xs font-extrabold ${
                  over ? 'text-pace-behind' : 'text-ink'
                }`}
              >
                {`${n}`}
                {/* "/limit" (slash included) always red — it's the cap */}
                <Typography className='text-xs font-extrabold text-pace-behind'>
                  {`/${limit}`}
                </Typography>
              </Typography>
            </View>
          </Pressable>
        )
      }
      const goal = periodGoalOf(tracker)
      const isDone = goal > 0 && n >= goal
      if (period === 'daily' && goal === 1) {
        // Once-a-day habit → check circle instead of a ring. Tapping when not
        // done logs it directly (a fast one-tap +1, no sheet); tapping when done
        // (or long-pressing) opens the day action menu to undo it.
        return withCaption(
          <Pressable
            onPress={() => (done ? onOpenMenu(tracker) : onQuickAdd(tracker))}
            onLongPress={() => onOpenMenu(tracker)}
            className='h-[54px] w-[54px] items-center justify-center'
          >
            {done ? (
              <View className='h-[32px] w-[32px] items-center justify-center rounded-full bg-pace-on'>
                <Icons.Check size={18} color={c.onAccent} strokeWidth={3} />
              </View>
            ) : (
              <View className='h-[32px] w-[32px] rounded-full border-[2.5px] border-line-strong' />
            )}
          </Pressable>
        )
      }
      // Unified progress color: a brand-blue arc while in progress, flipping to
      // green once the goal is met (see habitBarStatus) — matching the Trackers
      // list card. Until the goal is met, a tap is a fast one-tap +1 (logs
      // directly, no sheet); once met, a tap opens the day action menu;
      // long-press always opens the menu.
      return withCaption(
        <Pressable
          onPress={() => (isDone ? onOpenMenu(tracker) : onQuickAdd(tracker))}
          onLongPress={() => onOpenMenu(tracker)}
          className='h-[54px] w-[54px] items-center justify-center'
        >
          <Ring
            fraction={goal ? n / goal : 0}
            color={progressFill(
              habitBarStatus(n, goal, false),
              c.pace,
              c.brand
            )}
            size={48}
            strokeWidth={4}
          />
          <View className='absolute inset-0 items-center justify-center'>
            <Typography
              className={`text-xs font-extrabold ${
                isDone ? 'text-pace-on' : 'text-ink'
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
      ? fmtCompact(todayLog) // average shows the day's logged value
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
      // Any habit: long-press anywhere on the card opens the day action menu
      // (same as long-pressing the ring).
      onLongPress={
        tracker.type === 'habit' ? () => onOpenMenu(tracker) : undefined
      }
      className='gap-s2 border-t border-line px-s2 py-s3'
    >
      <View className='flex-row items-center gap-s3'>
        <View
          className='h-[40px] w-[40px] items-center justify-center rounded-full'
          // runtime: tint from user-chosen tracker.color
          style={{ backgroundColor: hexA(tracker.color, 0.14) }}
        >
          <Typography className='text-[22px]'>
            {iconEmoji(tracker.icon)}
          </Typography>
        </View>

        <View className='min-w-0 flex-1'>
          <View className='flex-row items-center gap-s2'>
            <TypeBadge type={tracker.type} />
            {row.status === 'missed' && !isBad ? (
              <Typography className='text-xs text-ink-2'>
                {t('today.missedEncourage')}
              </Typography>
            ) : streak && streak.kind !== 'none' && streakText ? (
              <View className='flex-row items-center gap-s1'>
                {streakNegative ? (
                  <Icons.Warn size={13} color={AMBER} />
                ) : isBad && streak.kind === 'greatStart' ? (
                  <Icons.Check size={13} color={c.pace.on_track} />
                ) : (
                  <Icons.Flame size={13} color={c.pace.on_track} />
                )}
                <Typography
                  className={`text-xs font-medium ${
                    streakNegative ? 'text-ink-2' : 'text-pace-on'
                  }`}
                >
                  {streakText}
                </Typography>
              </View>
            ) : null}
          </View>

          <Typography
            numberOfLines={1}
            className='mt-[3px] text-[17px] font-bold text-ink'
          >
            {tracker.name}
          </Typography>
          <Typography numberOfLines={1} className='mt-[1px] text-xs text-ink-3'>
            {subLine}
          </Typography>
        </View>

        {renderControl()}
      </View>

      {showBar ? (
        <View className='flex-row items-center gap-s2 pl-[52px]'>
          <View className='flex-1'>
            <PaceBar percent={barPercent} paceStatus={barStatus} height={7} />
          </View>
        </View>
      ) : null}
    </Pressable>
  )
}

export function DailyGoalsScreen() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const c = useThemeColors()
  const insets = useSafeAreaInsets()
  const nav = useNavigation<Nav>()
  const today = toISODate(new Date())
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'

  const [sheetOpen, setSheetOpen] = useState(false)
  const chooseCustom = () => {
    setSheetOpen(false)
    nav.navigate('TrackerTypePicker')
  }
  const chooseTemplates = () => {
    setSheetOpen(false)
    nav.navigate('TemplateCategories')
  }

  // The date strip can rewind the whole screen to a past day: entries,
  // section classification, and logging all target `selectedISO`. It carries
  // 90 days of history; on mount it scrolls to the end so today is in view.
  const [selectedISO, setSelectedISO] = useState(today)
  const stripDays = todayStripDays(today, 90)
  const stripRef = useRef<ScrollView>(null)

  const { data: trackers = [] } = useTrackers()
  const { data: dayEntries = [] } = useEntriesForDate(selectedISO)
  const { data: allEntries = [] } = useAllEntries()
  const log = useLogEntry()

  // Sum of the day's logged value per tracker.
  const dayValue = new Map<string, number>()
  for (const e of dayEntries) {
    dayValue.set(e.trackerId, (dayValue.get(e.trackerId) ?? 0) + e.value)
  }

  // Count of the day's "No" logs (value 0) per tracker — used to classify a
  // habit as missed (attempts filled the goal but not enough were Yes).
  const dayNo = new Map<string, number>()
  for (const e of dayEntries) {
    if (e.value === 0) dayNo.set(e.trackerId, (dayNo.get(e.trackerId) ?? 0) + 1)
  }

  // All entries grouped by tracker — lets us score a habit's whole period
  // window (week/month/year), not just the selected day.
  const entriesByTracker = new Map<string, Entry[]>()
  for (const e of allEntries) {
    const list = entriesByTracker.get(e.trackerId)
    if (list) list.push(e)
    else entriesByTracker.set(e.trackerId, [e])
  }

  const due = trackers.filter((tr) => isDueOnDate(tr, selectedISO))
  const rows: Row[] = []
  for (const tracker of due) {
    const todayLog = dayValue.get(tracker.id) ?? 0
    const no = dayNo.get(tracker.id) ?? 0
    // A period habit that has already filled its quota for the window drops
    // off Today (Strides-style) — but a day it was logged still shows as
    // completed, so only hide the untouched days.
    const windowTotal = periodTotal(
      tracker,
      entriesByTracker.get(tracker.id) ?? [],
      selectedISO
    )
    if (periodQuotaMet(tracker, windowTotal) && todayLog === 0) continue
    const status = classifyTodayRow(tracker, todayLog, no)
    rows.push({ tracker, status, done: status === 'completed', todayLog })
  }

  // Summary decouples from sections: a clean bad habit sits in Due Today yet
  // counts as done, and allDone tolerates clean bad habits still listed below.
  const { done: doneCount, total, allDone } = todaySummary(rows)

  const sections: { key: SectionKey; title: string; rows: Row[] }[] = [
    {
      key: 'due',
      title: t('today.dueToday'),
      rows: rows.filter((r) => r.status === 'due')
    },
    {
      key: 'completed',
      title: t('today.completed'),
      rows: rows.filter((r) => r.status === 'completed')
    },
    {
      key: 'missed',
      title: t('today.missed'),
      rows: rows.filter((r) => r.status === 'missed')
    }
  ]
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    due: true,
    completed: true,
    missed: true
  })
  const toggle = (key: SectionKey) => setOpen((s) => ({ ...s, [key]: !s[key] }))

  const hours = new Date().getHours()
  const greetKey =
    hours < 12
      ? 'today.greetMorning'
      : hours < 18
      ? 'today.greetAfternoon'
      : 'today.greetEvening'
  const isEvening = hours >= 18
  const GreetIcon = hours < 12 ? Sunrise : hours < 18 ? Sun : MoonStar
  const greetColor = isEvening ? NIGHT : AMBER

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

  // Silent one-tap +1 for a good habit that hasn't reached its goal yet — no
  // sheet, just an increment + success toast. Once the goal is met the ring's
  // onPress switches to the day action menu instead (see renderControl).
  const onQuickAdd = (tracker: Tracker) => {
    log.mutate(
      {
        id: uuid(),
        trackerId: tracker.id,
        date: selectedISO,
        value: 1,
        note: null,
        createdAt: new Date().toISOString()
      },
      { onSuccess: () => showLogSuccess(toast, t('toast.logSuccess')) }
    )
  }

  // Day action menu (log yes / no / delete last) — opened by long-pressing a
  // bad-habit limit ring (or tapping it at/over the limit), and by tapping a
  // once-a-day habit's done check to undo it.
  const [menuTracker, setMenuTracker] = useState<Tracker | null>(null)
  const del = useDeleteEntry()
  const menuEntries = menuTracker
    ? dayEntries.filter((e) => e.trackerId === menuTracker.id)
    : []
  const menuLog = (value: number) => {
    if (!menuTracker) return
    log.mutate({
      id: uuid(),
      trackerId: menuTracker.id,
      date: selectedISO,
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
          className='bg-surface px-s5 pb-s4'
          // safe-area, runtime
          style={{ paddingTop: insets.top }}
        >
          <Typography className='text-display-k font-extrabold text-ink'>
            {t('today.header')}
          </Typography>
          <View className='flex-row items-center gap-s2 mt-s1'>
            <GreetIcon size={14} color={greetColor} />
            <Typography className='text-sm font-semibold text-ink-2'>
              {t(greetKey)}
            </Typography>
          </View>
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
              onPress={() => setSheetOpen(true)}
            />
          </View>
        </View>
        <NewTrackerSheet
          isOpen={sheetOpen}
          onOpenChange={setSheetOpen}
          onChooseCustom={chooseCustom}
          onChooseTemplates={chooseTemplates}
        />
      </View>
    )
  }

  return (
    <View className='flex-1 bg-surface'>
      {/* head */}
      <View
        className='px-s5 pb-s1'
        // safe-area, runtime
        style={{ paddingTop: insets.top }}
      >
        <Typography className='text-display-k font-extrabold text-ink'>
          {selectedISO === today
            ? t('today.header')
            : t('today.headerDay', {
                date: fmtDayMonth(selectedISO, i18n.language)
              })}
        </Typography>
        <View className='flex-row items-center gap-s2 mt-s1'>
          <CircleCheck size={14} color={c.brand} strokeWidth={2.5} />
          <Typography className='text-sm font-extrabold text-brand-ink'>
            {t('today.summary', { done: doneCount, total })}
          </Typography>
          {/* Greeting reflects the real current time, so it's only meaningful
              while viewing today — hide it (and its separator) on other days. */}
          {selectedISO === today ? (
            <>
              <Typography className='text-sm text-ink-3'>·</Typography>
              <GreetIcon size={14} color={greetColor} />
              <Typography className='text-sm font-semibold text-ink-2'>
                {t(greetKey)}
              </Typography>
            </>
          ) : null}
        </View>
      </View>

      {/* date strip */}
      <ScrollView
        ref={stripRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        className='flex-grow-0'
        contentContainerClassName='gap-s3 px-s5 pt-s3 pb-s3'
        // open at the right edge (today); fires once content is measured
        onContentSizeChange={() =>
          stripRef.current?.scrollToEnd({ animated: false })
        }
      >
        {stripDays.map((day) => (
          <DayPill
            key={day.iso}
            day={day}
            selected={day.iso === selectedISO}
            locale={locale}
            onSelect={setSelectedISO}
          />
        ))}
      </ScrollView>

      {/* body */}
      <ScrollView
        className='flex-1 rounded-t-xl-k bg-bg'
        contentContainerClassName='px-s4 pt-s3 pb-8'
      >
        {allDone ? (
          <View className='items-center px-s6 gap-s3 py-8'>
            <View className='mb-s2 h-24 w-24 items-center justify-center rounded-xl-k bg-brand-weak'>
              <Typography className='text-[46px] leading-[60px]'>🎉</Typography>
            </View>
            <Typography className='text-xl font-extrabold text-ink text-center'>
              {t('today.allClear')}
            </Typography>
            <Typography className='text-base text-ink-2 text-center max-w-[250px]'>
              {selectedISO === today
                ? t('today.allClearBody')
                : t('today.allClearBodyDay')}
            </Typography>
          </View>
        ) : null}

        {sections
          .filter((sec) => sec.rows.length > 0)
          .map((sec) => (
            <View
              key={sec.key}
              className='mb-[14px] overflow-hidden rounded-lg-k bg-surface shadow-sm'
            >
              <SectionHeader
                sectionKey={sec.key}
                title={sec.title}
                count={sec.rows.length}
                open={open[sec.key]}
                onToggle={() => toggle(sec.key)}
              />
              {open[sec.key] ? (
                <View>
                  {sec.rows.map((row) => (
                    <LogRow
                      key={row.tracker.id}
                      row={row}
                      date={selectedISO}
                      onOpen={onOpen}
                      onQuickLog={openQuickLog}
                      onQuickAdd={onQuickAdd}
                      onOpenMenu={setMenuTracker}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ))}
      </ScrollView>
      {/* Always mounted (like TrackerDetailScreen) so the BottomSheet animates
          on a clean false→true. Falls back to a stable tracker before the first
          pick; `logOpen` keeps it closed until a value is tapped. */}
      {logTarget ?? trackers[0] ? (
        <LogEntryModal
          tracker={(logTarget ?? trackers[0])!}
          defaultDate={selectedISO}
          visible={logOpen}
          onClose={closeQuickLog}
          onSave={(e) => {
            onLog(e)
            closeQuickLog()
          }}
        />
      ) : null}
      {/* Day action menu — always mounted; `date` toggles visibility. */}
      <CalendarDayMenu
        date={menuTracker ? selectedISO : null}
        title={menuTracker?.name ?? ''}
        hasEntry={menuEntries.length > 0}
        badHabit={
          menuTracker?.type === 'habit' && menuTracker.direction === 'bad'
        }
        onLogYes={() => menuLog(1)}
        onLogNo={() => menuLog(0)}
        onDeleteLast={menuDeleteLast}
        onClose={() => setMenuTracker(null)}
      />
    </View>
  )
}
