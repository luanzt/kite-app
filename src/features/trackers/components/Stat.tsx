import { View } from 'react-native'
import { Typography } from 'heroui-native'

/** A single stat cell: a big number above a small uppercase caption. */
export function Stat({
  num,
  cap,
  color
}: {
  num: string
  cap: string
  color?: string
}) {
  return (
    <View className='flex-1 items-center rounded-lg-k border border-line bg-surface p-s4'>
      <Typography
        className='text-xl font-bold text-ink'
        // runtime: `color` is an arbitrary caller-provided override, not a known
        // token, so it can't be expressed as a literal class
        style={color ? { color } : undefined}
      >
        {num}
      </Typography>
      <Typography className='mt-[3px] text-xs font-bold uppercase text-ink-3'>
        {cap}
      </Typography>
    </View>
  )
}
