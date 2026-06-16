import { Pressable, View } from 'react-native'
import { Typography } from 'heroui-native'

/** Weekday chips (Mon-first), storing JS day numbers (0=Sun..6=Sat). */
const WEEKDAYS: { day: number; key: string }[] = [
  { day: 1, key: 'mon' },
  { day: 2, key: 'tue' },
  { day: 3, key: 'wed' },
  { day: 4, key: 'thu' },
  { day: 5, key: 'fri' },
  { day: 6, key: 'sat' },
  { day: 0, key: 'sun' }
]

export function WeekdayPicker({
  value,
  onChange,
  labels
}: {
  value: number[]
  onChange: (days: number[]) => void
  labels: Record<string, string>
}) {
  const toggle = (day: number) => {
    const next = value.includes(day)
      ? value.filter((d) => d !== day)
      : [...value, day]
    onChange(next.sort((a, b) => a - b))
  }
  return (
    <View className='flex-row justify-between'>
      {WEEKDAYS.map(({ day, key }) => {
        const on = value.includes(day)
        return (
          <Pressable
            key={key}
            onPress={() => toggle(day)}
            className={`h-[38px] w-[38px] items-center justify-center rounded-full ${
              on ? 'bg-brand' : 'bg-surface-2'
            }`}
          >
            <Typography
              className={`text-xs font-bold ${
                on ? 'text-on-accent' : 'text-ink-2'
              }`}
            >
              {labels[key]}
            </Typography>
          </Pressable>
        )
      })}
    </View>
  )
}
