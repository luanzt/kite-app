import { Pressable, View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import Svg, { Circle } from 'react-native-svg'
import type {
  CalendarCell,
  CalendarMonth
} from '@features/trackers/calculators/habitStats'
import { useThemeColors } from '@hooks/useThemeColors'

const CELL = 34
const STROKE = 3
const R = (CELL - STROKE) / 2
const CIRC = 2 * Math.PI * R

/**
 * One calendar day. Render-state derives from status + value/goal:
 *  done (value>=goal)  → filled green pill, white number
 *  partial (0<value<goal, due, today-or-past) → blue arc ring, number
 *  empty (value===0, due, today-or-past)      → faint track ring, number
 *  rest → muted grey pill; future → muted number (no ring)
 * A due, not-done, today-or-past cell is tappable (adds one log to its day).
 */
function DayCell({
  cell,
  todayISO,
  onLogDay
}: {
  cell: CalendarCell
  todayISO: string
  onLogDay?: (iso: string) => void
}) {
  const c = useThemeColors()
  const done = cell.status === 'done'
  const isRest = cell.status === 'rest'
  const isFuture = cell.status === 'future'
  const isPastOrToday = cell.iso <= todayISO
  const due = !isRest && !isFuture && isPastOrToday
  const frac = cell.goal > 0 ? Math.min(1, cell.value / cell.goal) : 0
  const tappable = due && !done && !!onLogDay

  const numberClass = done
    ? 'text-on-accent'
    : isRest
    ? 'text-ink-3'
    : isFuture
    ? 'text-ink-3 opacity-50'
    : 'text-ink'

  const inner = done ? (
    // goal met → filled green pill
    <View className='h-[34px] w-[34px] items-center justify-center rounded-full bg-pace-on'>
      <Typography className={`text-sm font-bold ${numberClass}`}>
        {cell.day}
      </Typography>
    </View>
  ) : isRest ? (
    // not scheduled → muted pill
    <View className='h-[34px] w-[34px] items-center justify-center rounded-full bg-surface-2'>
      <Typography className={`text-sm font-bold ${numberClass}`}>
        {cell.day}
      </Typography>
    </View>
  ) : isFuture ? (
    // future → plain muted number, no ring
    <View className='h-[34px] w-[34px] items-center justify-center'>
      <Typography className={`text-sm font-bold ${numberClass}`}>
        {cell.day}
      </Typography>
    </View>
  ) : (
    // due, today-or-past, not done → track ring + (partial) blue arc
    <View className='h-[34px] w-[34px] items-center justify-center'>
      <Svg width={CELL} height={CELL}>
        <Circle
          cx={CELL / 2}
          cy={CELL / 2}
          r={R}
          stroke={c.line}
          strokeWidth={STROKE}
          fill='none'
        />
        {frac > 0 ? (
          <Circle
            cx={CELL / 2}
            cy={CELL / 2}
            r={R}
            stroke={c.brand}
            strokeWidth={STROKE}
            strokeLinecap='round'
            fill='none'
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - frac)}
            rotation={-90}
            originX={CELL / 2}
            originY={CELL / 2}
          />
        ) : null}
      </Svg>
      <View className='absolute inset-0 items-center justify-center'>
        <Typography className={`text-sm font-bold ${numberClass}`}>
          {cell.day}
        </Typography>
      </View>
    </View>
  )

  if (tappable) {
    return (
      <View className='aspect-square flex-1 items-center justify-center'>
        <Pressable
          onPress={() => onLogDay?.(cell.iso)}
          hitSlop={4}
          className='active:opacity-70'
        >
          {inner}
        </Pressable>
      </View>
    )
  }

  return (
    <View className='aspect-square flex-1 items-center justify-center'>
      {inner}
    </View>
  )
}

/**
 * HabitCalendar — a month grid (Mon-first) painting each day's progress ring,
 * plus a legend. Tapping a due, not-done, today-or-past day fires onLogDay.
 */
export function HabitCalendar({
  month,
  todayISO,
  onLogDay
}: {
  month: CalendarMonth
  todayISO: string
  onLogDay?: (iso: string) => void
}) {
  const { t } = useTranslation()
  const dow = t('detail.dow', { returnObjects: true }) as string[]

  // Fixed 7-column rows (flex-1 per cell) — see the note in the original file
  // about why we build explicit weeks instead of flex-wrap.
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
              <DayCell
                key={cell.day}
                cell={cell}
                todayISO={todayISO}
                onLogDay={onLogDay}
              />
            ) : (
              <View key={`pad-${wi}-${di}`} className='aspect-square flex-1' />
            )
          )}
        </View>
      ))}

      <View className='mt-s4 flex-row gap-s4 border-t border-line pt-s4'>
        <LegendItem dotClass='bg-pace-on' label={t('detail.completed')} />
        <LegendItem
          dotClass='border-2 border-brand'
          label={t('detail.inProgress')}
        />
        <LegendItem
          dotClass='bg-surface-2 border border-line-strong'
          label={t('detail.restDay')}
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
