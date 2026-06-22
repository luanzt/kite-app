import { Pressable, View } from 'react-native'
import { Typography } from 'heroui-native'
import { Icons } from '@features/trackers/icons'

/**
 * Primary "Create tracker" button — matches the design's `.btn-primary .btn-lg`:
 * brand-green fill, white label, rounded, soft shadow, leading + icon.
 * Used by the Today and Trackers empty states. `block` makes it full-width.
 */
export function CreateButton({
  label,
  onPress,
  block = false
}: {
  label: string
  onPress: () => void
  block?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`h-[54px] flex-row items-center justify-center gap-s2 rounded-md-k bg-brand px-s5 shadow-sm active:opacity-90 ${
        block ? 'self-stretch' : 'self-center'
      }`}
    >
      <Icons.Plus size={20} color='#ffffff' strokeWidth={2.6} />
      <View>
        <Typography className='text-base font-bold text-on-accent'>
          {label}
        </Typography>
      </View>
    </Pressable>
  )
}
