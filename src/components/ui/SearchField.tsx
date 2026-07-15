import { View } from 'react-native'
import { Input, TextField } from 'heroui-native'
import { Search } from 'lucide-react-native'
import { useThemeColors } from '@hooks/useThemeColors'

/**
 * A HeroUI search field — same bordered look as `FormInput` (52px, rounded,
 * `focus:border-brand`) with a leading magnifier icon. HeroUI's `Input` has no
 * start-content slot, so the icon is overlaid absolutely and the input carries
 * left padding to clear it (the pattern from HeroUI's own Input docs).
 */
export function SearchField(props: {
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
}) {
  const c = useThemeColors()
  return (
    <TextField>
      <View className='w-full flex-row items-center'>
        <Input
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          multiline={false}
          numberOfLines={1}
          lineBreakModeIOS='tail'
          // See FormInput for the ios leading quirk this mirrors.
          className='h-[52px] flex-1 rounded-md-k border border-line bg-surface pl-[42px] pr-s4 text-base text-ink shadow-none ios:leading-[19px] ios:shadow-none android:shadow-none focus:border-brand'
        />
        <View className='absolute left-[14px]' pointerEvents='none'>
          <Search size={18} color={c.ink3} />
        </View>
      </View>
    </TextField>
  )
}
