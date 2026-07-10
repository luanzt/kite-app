import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type { Tracker, Entry } from '@features/trackers/types'
import { calculateAverage } from '@features/trackers/calculators/average'
import {
  averageBarSeries,
  averageBucketStats,
  compareWindows
} from '@features/trackers/calculators/averageStats'
import type { CompareWindow } from '@features/trackers/calculators/averageStats'
import type { PeriodUnit } from '@features/trackers/calculators/habitStats'
import { Icons } from '@features/trackers/icons'
import { toISODate } from '@utils/date'
import { useThemeColors } from '@hooks/useThemeColors'
import { AverageComparisonCard } from './AverageComparisonCard'
import { AverageStatsRow } from './AverageStatsRow'
import { WeeklyChart } from './WeeklyChart'

/** X-axis label for a bucket start, adapted to the chart's unit. */
function barLabel(startISO: string, unit: PeriodUnit, lang: string): string {
  const d = new Date(`${startISO}T00:00:00Z`)
  if (unit === 'day') {
    return d.toLocaleDateString(lang, {
      day: 'numeric',
      month: 'numeric',
      timeZone: 'UTC'
    })
  }
  if (unit === 'month') {
    return d.toLocaleDateString(lang, { month: 'short', timeZone: 'UTC' })
  }
  return d.toLocaleDateString(lang, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  })
}

/**
 * Average Charts tab — Strides-style: streak/average/success hero (gradient,
 * AchievementHero-styled), period-comparison card (window picker), and a value
 * bar chart with the goal line.
 * The floating "Log today" opens the numeric log modal (adds a new record;
 * same-day logs sum, matching the Today screen).
 */
export function AverageChartsTab({
  tracker,
  entries,
  onAddLog
}: {
  tracker: Tracker
  entries: Entry[]
  onAddLog?: () => void
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const c = useThemeColors()
  const insets = useSafeAreaInsets()
  const today = toISODate(new Date())
  const [win, setWin] = useState<CompareWindow>('7d')

  const cmp = compareWindows(tracker, entries, today, win)
  const stats = averageBucketStats(tracker, entries, today)
  const series = averageBarSeries(tracker, entries, today)
  const average = calculateAverage(tracker, entries, today).current

  return (
    <View className='flex-1'>
      <ScrollView
        // Extra bottom room so the last card clears the floating "Log today"
        // button: safe-area + button height (52) + its top/bottom padding.
        contentContainerStyle={{ paddingBottom: insets.bottom + 88 }} // safe-area, runtime
        showsVerticalScrollIndicator={false}
      >
        <AverageStatsRow tracker={tracker} average={average} stats={stats} />
        <AverageComparisonCard
          window={win}
          onChangeWindow={setWin}
          current={cmp.current}
          previous={cmp.previous}
          deltaPct={cmp.deltaPct}
        />

        {/* value trend — adapts to the tracker's period */}
        <View className='m-s5 rounded-xl-k border border-line bg-surface p-s5'>
          <Typography className='mb-s4 text-h3-k font-bold text-ink'>
            {t(`detail.valueBy.${series.unit}`)}
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
          onPress={() => onAddLog?.()}
          className='h-[52px] flex-row items-center justify-center gap-s2 rounded-md-k bg-brand active:opacity-90'
        >
          <Icons.Plus size={20} color={c.onAccent} />
          <Typography className='text-base font-bold text-on-accent'>
            {t('detail.logToday')}
          </Typography>
        </Pressable>
      </View>
    </View>
  )
}
