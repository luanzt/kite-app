import { Input, TextField } from 'heroui-native'

/** A styled text field matching the design's `.input` (52px, bordered). */
export function FormInput(props: {
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'decimal-pad'
}) {
  return (
    <TextField>
      <Input
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        keyboardType={props.keyboardType ?? 'default'}
        multiline={false}
        numberOfLines={1}
        lineBreakModeIOS='tail'
        // iOS vertical-centering quirk: at the default 24px line-height entered
        // text sits ~2px BELOW the placeholder; at 16px it sits ~2px above. 20px
        // is the midpoint that lands entered text on the original placeholder
        // baseline. Android is untouched (keeps its default leading).
        className='h-[52px] rounded-md-k border border-line bg-surface px-s4 text-base text-ink shadow-none ios:leading-[19px] ios:shadow-none android:shadow-none focus:border-brand'
      />
    </TextField>
  )
}
