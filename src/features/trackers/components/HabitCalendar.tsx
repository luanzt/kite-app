import { View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type {
  CalendarCell,
  CalendarMonth,
  CalendarStatus
} from '@features/trackers/calculators/habitStats'

/** Pill background per status (a plain past/future day has no pill). */
const PILL_CLASS: Record<CalendarStatus, string> = {
  done: 'bg-brand',
  today: 'border-2 border-brand',
  rest: 'bg-surface-2',
  future: '',
  none: ''
}

/** Day-number text color per status. */
const TEXT_CLASS: Record<CalendarStatus, string> = {
  done: 'text-on-accent',
  today: 'text-brand-ink font-bold',
  rest: 'text-ink-3',
  future: 'text-ink-3 opacity-50',
  none: 'text-ink-2'
}

/**
 * HabitCalendar — a month grid (Mon-first) painting each day's habit status,
 * plus a legend. Pure render; the month + statuses come from buildCalendarMonth.
 */
export function HabitCalendar({ month }: { month: CalendarMonth }) {
  const { t } = useTranslation()
  const dow = t('detail.dow', { returnObjects: true }) as string[]

  // Lay days out into fixed 7-column rows. A flex-wrap + per-cell percentage
  // width rounds to >100% per row in Yoga, wrapping the 7th cell down to a
  // 6-column grid — so build explicit weeks and give each cell flex-1 instead.
  const slots: (CalendarCell | null)[] = [
    ...Array.from({ length: month.firstWeekdayMon }, () => null),
    ...month.cells
  ]
  while (slots.length % 7 !== 0) slots.push(null)
  const weeks: (CalendarCell | null)[][] = []
  for (let i = 0; i < slots.length; i += 7) weeks.push(slots.slice(i, i + 7))

  return (
    <>
      <View className='flex-row'>
        {dow.map((d) => (
          <View
            key={d}
            className='aspect-square flex-1 items-center justify-center'
          >
            <Typography className='text-[11px] font-bold uppercase text-ink-3'>
              {d}
            </Typography>
          </View>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={`w-${wi}`} className='flex-row'>
          {week.map((cell, di) =>
            cell ? (
              <View
                key={cell.day}
                className='aspect-square flex-1 items-center justify-center'
              >
                <View
                  className={`h-[34px] w-[34px] items-center justify-center rounded-full ${
                    PILL_CLASS[cell.status]
                  }`}
                >
                  <Typography
                    className={`text-sm font-bold ${TEXT_CLASS[cell.status]}`}
                  >
                    {cell.day}
                  </Typography>
                </View>
              </View>
            ) : (
              <View key={`pad-${wi}-${di}`} className='aspect-square flex-1' />
            )
          )}
        </View>
      ))}

      <View className='mt-s4 flex-row gap-s4 border-t border-line pt-s4'>
        <LegendItem dotClass='bg-brand' label={t('detail.completed')} />
        <LegendItem
          dotClass='bg-surface-2 border border-line-strong'
          label={t('detail.restDay')}
        />
        <LegendItem
          dotClass='border-2 border-brand'
          label={t('common.today')}
        />
      </View>
    </>
  )
}

function LegendItem({ dotClass, label }: { dotClass: string; label: string }) {
  return (
    <View className='flex-row items-center gap-s2'>
      <View className={`h-[14px] w-[14px] rounded-full ${dotClass}`} />
      <Typography className='text-xs font-bold text-ink-2'>{label}</Typography>
    </View>
  )
}
