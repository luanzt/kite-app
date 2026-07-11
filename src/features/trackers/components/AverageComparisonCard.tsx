import { Pressable, View } from 'react-native'
import { BottomSheet, Typography, useBottomSheet } from 'heroui-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, ChevronDown } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import type {
  ComparePeriod,
  CompareWindow
} from '@features/trackers/calculators/averageStats'
import { fmtNum } from '@features/trackers/detailFormat'
import { useThemeColors } from '@hooks/useThemeColors'

const WINDOWS: CompareWindow[] = [
  '7d',
  '14d',
  '30d',
  '4w',
  '3m',
  '6m',
  '12m',
  '7logs',
  '30logs'
]

/** CompareWindow → i18n key under detail.avgWin (keys can't start with a digit). */
const WIN_KEY: Record<CompareWindow, string> = {
  '7d': 'd7',
  '14d': 'd14',
  '30d': 'd30',
  '4w': 'w4',
  '3m': 'm3',
  '6m': 'm6',
  '12m': 'm12',
  '7logs': 'log7',
  '30logs': 'log30'
}

/** "29 Jun – 5 Jul" (localized, UTC to avoid TZ drift); em dash when empty. */
function rangeLabel(p: ComparePeriod, lang: string): string {
  if (!p.startISO || !p.endISO) return '—'
  const f = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(lang, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC'
    })
  return `${f(p.startISO)} – ${f(p.endISO)}`
}

/** Option rows inside the sheet; own component so it can call useBottomSheet(). */
function WindowList({
  value,
  onChange
}: {
  value: CompareWindow
  onChange: (w: CompareWindow) => void
}) {
  const { t } = useTranslation()
  const c = useThemeColors()
  const { onOpenChange } = useBottomSheet()
  return (
    <View>
      {WINDOWS.map((w) => {
        const on = w === value
        return (
          <Pressable
            key={w}
            onPress={() => {
              onChange(w)
              onOpenChange(false)
            }}
            className={`flex-row items-center justify-between rounded-md-k px-s4 py-s3 active:opacity-80 ${
              on ? 'bg-surface-2' : ''
            }`}
          >
            <Typography
              className={`text-base ${
                on ? 'font-bold text-ink' : 'text-ink-2'
              }`}
            >
              {t(`detail.avgWin.${WIN_KEY[w]}`)}
            </Typography>
            {on ? <Check size={20} color={c.pace.on_track} /> : null}
          </Pressable>
        )
      })}
    </View>
  )
}

/**
 * Strides-style period-comparison card: header opens a BottomSheet window
 * picker; body shows the current period (green bar) vs the previous one (blue
 * bar) with proportional widths and an avg + delta line.
 */
export function AverageComparisonCard({
  window,
  onChangeWindow,
  current,
  previous,
  deltaPct,
  lessIsBetter
}: {
  window: CompareWindow
  onChangeWindow: (w: CompareWindow) => void
  current: ComparePeriod
  previous: ComparePeriod
  deltaPct: number | null
  /** "or less" goal: a rising average is bad → flip the delta color. */
  lessIsBetter?: boolean
}) {
  const { t, i18n } = useTranslation()
  const c = useThemeColors()
  const insets = useSafeAreaInsets()
  const lang = i18n.language
  const perLabel = t(current.perLog ? 'detail.avgPerLog' : 'detail.avgPerDay')
  const maxAvg = Math.max(current.avg, previous.avg)
  // Bar width tracks the value but keeps room for the range label.
  const widthPct = (avg: number) =>
    maxAvg > 0 ? Math.max(38, Math.round((avg / maxAvg) * 100)) : 38

  const up = (deltaPct ?? 0) >= 0
  const good = lessIsBetter ? !up : up
  const deltaEl =
    deltaPct == null ? (
      <Typography className='text-sm font-bold text-ink-3'>—</Typography>
    ) : (
      <Typography
        className={`text-sm font-bold ${
          good ? 'text-pace-on' : 'text-pace-behind'
        }`}
      >
        {`${up ? '▲' : '▼'} ${fmtNum(Math.abs(deltaPct))}%`}
      </Typography>
    )

  return (
    <View className='m-s5 rounded-xl-k border border-line bg-surface p-s5'>
      <BottomSheet>
        <BottomSheet.Trigger asChild>
          <Pressable className='flex-row items-center justify-center gap-s1 pb-s4 active:opacity-80'>
            <Typography className='text-h3-k font-bold text-ink'>
              {t('detail.avgChartTitle')}
            </Typography>
            <Typography className='text-h3-k text-ink-2'>
              {`· ${t(`detail.avgWin.${WIN_KEY[window]}`)}`}
            </Typography>
            <ChevronDown size={18} color={c.ink3} />
          </Pressable>
        </BottomSheet.Trigger>
        <BottomSheet.Portal>
          {/* Explicit scrim — same rationale as SelectField */}
          <BottomSheet.Overlay className='bg-black/60' />
          <BottomSheet.Content>
            {/* runtime: safe-area inset */}
            <View
              className='px-s4'
              style={{ paddingBottom: insets.bottom + 12 }}
            >
              <BottomSheet.Title className='mb-s3 text-lg font-bold text-ink'>
                {t('detail.avgChartTitle')}
              </BottomSheet.Title>
              <WindowList value={window} onChange={onChangeWindow} />
            </View>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

      {/* current period */}
      <View className='gap-s2'>
        <View className='flex-row items-center gap-s2'>
          <Typography className='text-xl font-bold text-ink'>
            {fmtNum(current.avg)}
          </Typography>
          <Typography className='text-sm text-ink-2'>{perLabel}</Typography>
          {deltaEl}
        </View>
        <View
          className='h-[34px] self-start justify-center rounded-md-k bg-pace-on px-s3'
          style={{ minWidth: `${widthPct(current.avg)}%` }} // value-derived minimum; bar never narrower than its label
        >
          <Typography
            numberOfLines={1}
            className='text-sm font-bold text-on-accent'
          >
            {rangeLabel(current, lang)}
          </Typography>
        </View>
      </View>

      <View className='my-s4 h-[1px] bg-line' />

      {/* previous period */}
      <View className='gap-s2'>
        <View className='flex-row items-center gap-s2'>
          <Typography className='text-xl font-bold text-ink'>
            {fmtNum(previous.avg)}
          </Typography>
          <Typography className='text-sm text-ink-2'>{perLabel}</Typography>
        </View>
        <View
          className='h-[34px] self-start justify-center rounded-md-k bg-brand px-s3'
          style={{ minWidth: `${widthPct(previous.avg)}%` }} // value-derived minimum; bar never narrower than its label
        >
          <Typography
            numberOfLines={1}
            className='text-sm font-bold text-on-accent'
          >
            {rangeLabel(previous, lang)}
          </Typography>
        </View>
      </View>
    </View>
  )
}
