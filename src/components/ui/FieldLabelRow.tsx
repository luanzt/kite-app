import type { ReactNode } from 'react'
import { View } from 'react-native'
import { Typography } from 'heroui-native'

/**
 * A field label row: the bold label (matching `FieldLabel`) on the left and an
 * optional trailing node (e.g. an `InfoTooltip`) pinned to the right.
 */
export function FieldLabelRow({
  children,
  trailing
}: {
  children: string
  trailing?: ReactNode
}) {
  return (
    <View className='flex-row items-center justify-between'>
      <Typography className='text-sm font-bold text-ink'>{children}</Typography>
      {trailing ?? null}
    </View>
  )
}
