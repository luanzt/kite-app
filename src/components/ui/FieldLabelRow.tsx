import type { ReactNode } from 'react'
import { View } from 'react-native'
import { Typography } from 'heroui-native'

/**
 * A field label row: the bold label (matching `FieldLabel`) with an optional
 * trailing node (e.g. an `InfoTooltip`) sitting right beside it, left-aligned.
 */
export function FieldLabelRow({
  children,
  trailing
}: {
  children: string
  trailing?: ReactNode
}) {
  return (
    <View className='flex-row items-center gap-s1'>
      <Typography className='text-sm font-bold text-ink'>{children}</Typography>
      {trailing ?? null}
    </View>
  )
}
