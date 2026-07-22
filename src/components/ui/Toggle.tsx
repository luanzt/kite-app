import { Pressable, View } from 'react-native'

/** A small on/off switch matching the design's green toggle. */
export function Toggle({
  value,
  onChange
}: {
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      className={`h-8 w-[52px] justify-center rounded-full p-[3px] ${
        value ? 'bg-brand' : 'bg-line-strong'
      }`}
    >
      <View
        className={`h-[26px] w-[26px] rounded-full bg-surface shadow-sm ${
          value ? 'ml-[20px]' : 'ml-0'
        }`}
      />
    </Pressable>
  )
}
