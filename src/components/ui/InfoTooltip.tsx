import { View } from 'react-native'
import { Popover } from 'heroui-native'
import { HelpCircle } from 'lucide-react-native'

/**
 * A circular "?" button that opens a Popover explaining a field. Used beside
 * `FieldLabelRow` labels (Mode / Direction / Period). Tap outside or the close
 * button to dismiss.
 */
export function InfoTooltip({
  title,
  description
}: {
  title: string
  description: string
}) {
  return (
    <Popover>
      <Popover.Trigger>
        <View className='h-6 w-6 items-center justify-center rounded-full border border-line bg-surface active:opacity-70'>
          <HelpCircle size={15} color='#8a8e80' />
        </View>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Overlay />
        <Popover.Content
          presentation='popover'
          placement='top'
          width={280}
          className='border border-line'
        >
          <Popover.Arrow />
          <Popover.Close />
          <Popover.Title>{title}</Popover.Title>
          <Popover.Description>{description}</Popover.Description>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  )
}
