import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { Typography, useToast } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type { Tracker, Entry } from '@features/trackers/types'
import { calculateHabit } from '@features/trackers/calculators/habit'
import {
  bestStreak,
  buildCalendarMonth,
  periodSessions
} from '@features/trackers/calculators/habitStats'
import type { PeriodUnit } from '@features/trackers/calculators/habitStats'
import { Icons } from '@features/trackers/icons'
import { useLogEntry } from '@features/trackers/queries'
import { uuid } from '@features/trackers/factory'
import { toISODate } from '@utils/date'
import { AchievementHero } from './AchievementHero'
import { HabitCalendar } from './HabitCalendar'
import { WeeklyChart } from './WeeklyChart'
import { showLogSuccess } from './LogSuccessToast'

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
  entries
}: {
  tracker: Tracker
  entries: Entry[]
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const today = toISODate(new Date())
  const log = useLogEntry()
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

  return (
    <>
      <AchievementHero
        percent={(progress.successRate ?? 0) * 100}
        currentStreak={progress.streak ?? 0}
        bestStreak={best}
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
              <Icons.Back size={16} color='#565a4f' />
            </Pressable>
            <Typography className='w-[112px] text-center text-sm font-bold text-ink'>
              {monthLabel(ym.year, ym.month, lang)}
            </Typography>
            <Pressable
              onPress={nextMonth}
              hitSlop={6}
              className='h-[32px] w-[32px] items-center justify-center rounded-sm-k border border-line bg-surface active:opacity-80'
            >
              <Icons.Chevron size={16} color='#565a4f' />
            </Pressable>
          </View>
        </View>
        <HabitCalendar month={calendar} />
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

      {/* log today */}
      <View className='mx-s5'>
        <Pressable
          onPress={onLogToday}
          disabled={log.isPending}
          className={`h-[52px] flex-row items-center justify-center gap-s2 rounded-md-k bg-brand active:opacity-90 ${
            log.isPending ? 'opacity-60' : 'opacity-100'
          }`}
        >
          <Icons.Plus size={20} color='#ffffff' />
          <Typography className='text-base font-bold text-on-accent'>
            {t('detail.logToday')}
          </Typography>
        </Pressable>
      </View>
    </>
  )
}
