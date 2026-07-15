import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Typography, useToast } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type { Tracker, Entry } from '@features/trackers/types'
import { calculateHabit } from '@features/trackers/calculators/habit'
import {
  bestStreak,
  buildCalendarMonth,
  periodSessions,
  periodUnitOf
} from '@features/trackers/calculators/habitStats'
import type { PeriodUnit } from '@features/trackers/calculators/habitStats'

// Pluralizable streak-unit noun key by cadence — AchievementHero resolves it
// per stat so "1 month" / "3 months" agree with each value.
const UNIT_NOUN_KEY: Record<PeriodUnit, string> = {
  day: 'unit.day',
  week: 'unit.week',
  month: 'unit.month',
  year: 'unit.year'
}
import { Icons } from '@features/trackers/icons'
import { useLogEntry, useDeleteEntry } from '@features/trackers/queries'
import { uuid } from '@features/trackers/factory'
import { toISODate } from '@utils/date'
import { useThemeColors } from '@hooks/useThemeColors'
import { useAlert } from '@components/ui'
import { AchievementHero } from './AchievementHero'
import { HabitCalendar } from './HabitCalendar'
import { WeeklyChart } from './WeeklyChart'
import { showLogSuccess } from './LogSuccessToast'
import { CalendarDayMenu } from './CalendarDayMenu'

/** Format a calendar month header ("June 2026"), UTC to avoid TZ drift. */
function monthLabel(year: number, month: number, lang: string): string {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString(lang, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  })
}

/** X-axis label for a bucket start, adapted to the chart's unit. */
function barLabel(startISO: string, unit: PeriodUnit, lang: string): string {
  const d = new Date(`${startISO}T00:00:00Z`)
  if (unit === 'day') {
    // "20/6" — day/month, matches the design
    return d.toLocaleDateString(lang, {
      day: 'numeric',
      month: 'numeric',
      timeZone: 'UTC'
    })
  }
  if (unit === 'month') {
    return d.toLocaleDateString(lang, { month: 'short', timeZone: 'UTC' })
  }
  if (unit === 'year') {
    return d.toLocaleDateString(lang, { year: 'numeric', timeZone: 'UTC' })
  }
  // week → "Jun 15"
  return d.toLocaleDateString(lang, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  })
}

/**
 * Charts tab — achievement hero, monthly calendar (with month navigation),
 * sessions-per-week chart, and a "Log today" button. All metrics derive from
 * real entries via the habit calculators.
 */
export function HabitChartsTab({
  tracker,
  entries,
  onEditTracker
}: {
  tracker: Tracker
  entries: Entry[]
  /** Opens the tracker's edit screen — offered when tapping a pre-start day. */
  onEditTracker?: () => void
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const c = useThemeColors()
  const insets = useSafeAreaInsets()
  const today = toISODate(new Date())
  const log = useLogEntry()
  const del = useDeleteEntry()
  const alert = useAlert()
  const [menuDate, setMenuDate] = useState<string | null>(null)
  const { toast } = useToast()

  const [ym, setYm] = useState(() => {
    const [y, m] = today.split('-').map(Number)
    return { year: y, month: m - 1 } // month 0-based
  })

  const progress = calculateHabit(tracker, entries, today)
  const best = bestStreak(tracker, entries, today)
  const calendar = buildCalendarMonth(
    tracker,
    entries,
    ym.year,
    ym.month,
    today
  )
  const series = periodSessions(tracker, entries, today)

  const prevMonth = () =>
    setYm(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    )
  const nextMonth = () =>
    setYm(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    )

  const onLogToday = () =>
    log.mutate(
      {
        id: uuid(),
        trackerId: tracker.id,
        date: today,
        value: 1,
        note: null,
        createdAt: new Date().toISOString()
      },
      {
        onSuccess: () => showLogSuccess(toast, t('toast.logSuccess'))
      }
    )

  const onLogDay = (iso: string) =>
    log.mutate(
      {
        id: uuid(),
        trackerId: tracker.id,
        date: iso,
        value: 1,
        note: null,
        createdAt: new Date().toISOString()
      },
      {
        onSuccess: () => showLogSuccess(toast, t('toast.logSuccess'))
      }
    )

  const onLongPressDay = (iso: string) => setMenuDate(iso)

  // A day before the tracker's start date can't be logged (the habit didn't
  // exist yet) — offer to move the start date back instead, opening the editor.
  const onPreStartDay = () => {
    const startLabel = new Date(
      `${tracker.startDate.slice(0, 10)}T00:00:00Z`
    ).toLocaleDateString(lang, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    })
    alert({
      title: t('detail.changeStartTitle'),
      message: t('detail.changeStartMsg', { date: startLabel }),
      cancelLabel: t('common.cancel'),
      confirmLabel: t('detail.changeStartConfirm'),
      onConfirm: () => onEditTracker?.()
    })
  }

  // format the menu title as e.g. "July 2, 2026" (UTC to avoid TZ drift)
  const menuTitle = menuDate
    ? new Date(`${menuDate}T00:00:00Z`).toLocaleDateString(lang, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      })
    : ''

  const menuEntries = menuDate
    ? entries.filter((e) => e.date.slice(0, 10) === menuDate)
    : []
  const menuHasEntry = menuEntries.length > 0

  const logValue = (value: number) => {
    if (!menuDate) return
    log.mutate(
      {
        id: uuid(),
        trackerId: tracker.id,
        date: menuDate,
        value,
        note: null,
        createdAt: new Date().toISOString()
      },
      { onSuccess: () => showLogSuccess(toast, t('toast.logSuccess')) }
    )
  }

  const onDeleteLast = () => {
    // newest record of the day, by createdAt (fallback to date)
    const last = [...menuEntries].sort((a, b) =>
      (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
    )[0]
    if (last) del.mutate({ id: last.id, trackerId: tracker.id })
  }

  return (
    <View className='flex-1'>
      <ScrollView
        // Extra bottom room so the last card clears the floating "Log today"
        // button: safe-area + button height (52) + its top/bottom padding.
        contentContainerStyle={{ paddingBottom: insets.bottom + 88 }} // safe-area, runtime
        showsVerticalScrollIndicator={false}
      >
        <AchievementHero
          percent={(progress.successRate ?? 0) * 100}
          currentStreak={progress.streak ?? 0}
          bestStreak={best}
          unitKey={UNIT_NOUN_KEY[periodUnitOf(tracker)]}
        />

        {/* calendar */}
        <View className='m-s5 rounded-xl-k border border-line bg-surface p-s5'>
          <View className='mb-s4 flex-row items-center justify-between'>
            <Typography className='text-h3-k font-bold text-ink'>
              {t('detail.calendar')}
            </Typography>
            <View className='flex-row items-center gap-s2'>
              <Pressable
                onPress={prevMonth}
                hitSlop={6}
                className='h-[32px] w-[32px] items-center justify-center rounded-sm-k border border-line bg-surface active:opacity-80'
              >
                <Icons.Back size={16} color={c.ink2} />
              </Pressable>
              <Typography className='w-[112px] text-center text-sm font-bold text-ink'>
                {monthLabel(ym.year, ym.month, lang)}
              </Typography>
              <Pressable
                onPress={nextMonth}
                hitSlop={6}
                className='h-[32px] w-[32px] items-center justify-center rounded-sm-k border border-line bg-surface active:opacity-80'
              >
                <Icons.Chevron size={16} color={c.ink2} />
              </Pressable>
            </View>
          </View>
          <HabitCalendar
            month={calendar}
            todayISO={today}
            // Bad habit: never log a slip on a bare tap — always open the
            // day menu so the user confirms what to record.
            onLogDay={tracker.direction === 'bad' ? onLongPressDay : onLogDay}
            onLongPressDay={onLongPressDay}
            onPreStartDay={onPreStartDay}
          />
        </View>

        {/* sessions trend — adapts to the habit's cadence */}
        <View className='m-s5 rounded-xl-k border border-line bg-surface p-s5'>
          <Typography className='mb-s4 text-h3-k font-bold text-ink'>
            {t(`detail.sessionsBy.${series.unit}`)}
          </Typography>
          <WeeklyChart
            data={series}
            formatLabel={(iso) => barLabel(iso, series.unit, lang)}
          />
        </View>
      </ScrollView>

      {/* Floating "Log today" — pinned above the scrolling content. */}
      <View
        className='absolute inset-x-0 bottom-0 px-s4 pt-s3'
        style={{ paddingBottom: insets.bottom + 8 }} // safe-area, runtime
        pointerEvents='box-none'
      >
        <Pressable
          onPress={onLogToday}
          disabled={log.isPending}
          className={`h-[52px] flex-row items-center justify-center gap-s2 rounded-md-k bg-brand active:opacity-90 ${
            log.isPending ? 'opacity-60' : 'opacity-100'
          }`}
        >
          <Icons.Plus size={20} color={c.onAccent} />
          <Typography className='text-base font-bold text-on-accent'>
            {t('detail.logToday')}
          </Typography>
        </Pressable>
      </View>

      <CalendarDayMenu
        date={menuDate}
        title={menuTitle}
        hasEntry={menuHasEntry}
        badHabit={tracker.direction === 'bad'}
        onLogYes={() => logValue(1)}
        onLogNo={() => logValue(0)}
        onDeleteLast={onDeleteLast}
        onClose={() => setMenuDate(null)}
      />
    </View>
  )
}
