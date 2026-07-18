import { Pressable, View } from 'react-native'
import { Typography, BottomSheet, useBottomSheet } from 'heroui-native'
import { Calendar } from 'lucide-react-native'
import DateTimePicker, {
  useDefaultStyles,
  type DateType
} from 'react-native-ui-datepicker'
import { useThemeColors } from '@hooks/useThemeColors'

/**
 * A field that opens a bottom sheet with a calendar to pick a single date.
 * The trigger looks like the design's `.input` (showing the chosen date);
 * tapping it slides up the calendar, and confirming a day closes the sheet.
 *
 * `value`/`onChange` are plain `YYYY-MM-DD` strings (what SQLite stores), so
 * this is a drop-in replacement for the old free-text `YYYY-MM-DD` input.
 * An empty string means "no date chosen yet".
 *
 * Mirrors `SelectField`: uncontrolled `BottomSheet`, `bg-black/60` scrim, and
 * the sheet is closed via in-context `useBottomSheet().onOpenChange(false)`.
 */
export function DateField({
  value,
  onChange,
  placeholder,
  minDate,
  maxDate
}: {
  value: string
  onChange: (iso: string) => void
  placeholder?: string
  minDate?: Date
  maxDate?: Date
}) {
  const c = useThemeColors()
  const display = value ? value : placeholder ?? 'YYYY-MM-DD'
  return (
    <BottomSheet>
      <BottomSheet.Trigger asChild>
        <Pressable className='h-[52px] flex-row items-center justify-between rounded-md-k border border-line bg-surface px-s4 active:opacity-80'>
          <Typography
            className={`text-base ${value ? 'text-ink' : 'text-ink-3'}`}
          >
            {display}
          </Typography>
          <Calendar size={20} color={c.ink3} />
        </Pressable>
      </BottomSheet.Trigger>
      <BottomSheet.Portal>
        {/* Explicit scrim — see SelectField for why the token override didn't work. */}
        <BottomSheet.Overlay className='bg-black/60' />
        <BottomSheet.Content>
          <View className='px-s4'>
            <CalendarSheet
              value={value}
              onChange={onChange}
              minDate={minDate}
              maxDate={maxDate}
            />
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  )
}

/** Local-time `YYYY-MM-DD` (avoids the UTC off-by-one that `toISOString` causes). */
function toLocalISODate(d: Date): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse a `YYYY-MM-DD` string into a local-midnight Date (or undefined). */
function fromISODate(iso: string): Date | undefined {
  if (!iso) return undefined
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

/**
 * The calendar, rendered inside `BottomSheet.Content` so it can call
 * `useBottomSheet()` to close the sheet after the user confirms a date.
 */
function CalendarSheet({
  value,
  onChange,
  minDate,
  maxDate
}: {
  value: string
  onChange: (iso: string) => void
  minDate?: Date
  maxDate?: Date
}) {
  const c = useThemeColors()
  const { onOpenChange } = useBottomSheet()
  // Follow Kite's own theme setting, not just the OS scheme — themeMode can
  // be an explicit Light/Dark override that diverges from useColorScheme().
  const defaultStyles = useDefaultStyles(c.isDark ? 'dark' : 'light')
  const selected = fromISODate(value)

  const select = (date: DateType) => {
    if (date instanceof Date) {
      onChange(toLocalISODate(date))
    }
    onOpenChange(false)
  }

  return (
    <DateTimePicker
      mode='single'
      date={selected}
      onChange={({ date }) => select(date)}
      minDate={minDate}
      maxDate={maxDate}
      firstDayOfWeek={1}
      styles={{
        ...defaultStyles,
        today: { borderColor: c.brand, borderWidth: 1 },
        selected: { backgroundColor: c.brand },
        selected_label: { color: c.onAccent }
      }}
    />
  )
}
