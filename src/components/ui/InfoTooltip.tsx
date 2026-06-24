import { Pressable } from 'react-native'
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
      {/* asChild over a real Pressable — the proven trigger pattern in this app
          (see DateField). A bare View child does not reliably wire press +
          measure() on the New Architecture, leaving triggerPosition null so the
          popover content never mounts. */}
      <Popover.Trigger asChild>
        <Pressable className='h-6 w-6 items-center justify-center rounded-full border border-line bg-surface active:opacity-70'>
          <HelpCircle size={15} color='#8a8e80' />
        </Pressable>
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
