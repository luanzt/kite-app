import { useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Typography, BottomSheet, Button, useBottomSheet } from 'heroui-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Clock } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import DateTimePicker, {
  useDefaultStyles,
  type DateType
} from 'react-native-ui-datepicker'
import { toHHMM, fromHHMM } from '@utils/date'
import { useThemeColors } from '@hooks/useThemeColors'

/**
 * A field that opens a bottom sheet with a scrollable time wheel to pick an
 * `HH:mm` time. The trigger looks like the design's `.input` (showing the
 * chosen time); tapping it slides up the wheel, and "Save" confirms.
 *
 * `value`/`onChange` are plain `HH:mm` strings (what SQLite stores for
 * `reminderTime`), so this is a drop-in replacement for the old free-text
 * `18:00` input.
 *
 * Unlike `DateField` (where picking a day closes the sheet), a time wheel
 * scrolls continuously, so we keep a draft in local state and commit it on
 * "Save" rather than on every scroll tick.
 */
export function TimeField({
  value,
  onChange,
  placeholder
}: {
  value: string
  onChange: (hhmm: string) => void
  placeholder?: string
}) {
  const c = useThemeColors()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)
  const display = value ? value : placeholder ?? 'HH:mm'
  return (
    <BottomSheet isOpen={open} onOpenChange={setOpen}>
      <BottomSheet.Trigger asChild>
        <Pressable className='h-[52px] flex-row items-center justify-between rounded-md-k border border-line bg-surface px-s4 active:opacity-80'>
          <Typography
            className={`text-base ${value ? 'text-ink' : 'text-ink-3'}`}
          >
            {display}
          </Typography>
          <Clock size={20} color={c.ink3} />
        </Pressable>
      </BottomSheet.Trigger>
      <BottomSheet.Portal>
        {/* Explicit scrim — see SelectField for why the token override didn't work. */}
        <BottomSheet.Overlay className='bg-black/60' />
        <BottomSheet.Content>
          {/* runtime: safe-area inset */}
          <View className='px-s4' style={{ paddingBottom: insets.bottom }}>
            {/* Mount the wheel only while open and key it by `value`, so its
                draft (and the picker's internal initial state) is always seeded
                from the current value rather than a stale mount-time snapshot. */}
            {open ? (
              <TimeSheet key={value} value={value} onChange={onChange} />
            ) : null}
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  )
}

/**
 * The time wheel, rendered inside `BottomSheet.Content` so it can call
 * `useBottomSheet()` to close the sheet. The wheel writes to a local draft;
 * "Save" commits it to the parent and closes.
 */
function TimeSheet({
  value,
  onChange
}: {
  value: string
  onChange: (hhmm: string) => void
}) {
  const { t } = useTranslation()
  const c = useThemeColors()
  const { onOpenChange } = useBottomSheet()
  const defaultStyles = useDefaultStyles()
  const [draft, setDraft] = useState<Date>(() => fromHHMM(value || '18:00'))
  // react-native-ui-datepicker fires a spurious onChange on mount with the
  // time reset to midnight, which would clobber our correct initial draft.
  // Drop that first callback; honour every change after the user interacts.
  const ready = useRef(false)

  const confirm = () => {
    onChange(toHHMM(draft))
    onOpenChange(false)
  }

  return (
    <View className='gap-s3'>
      <DateTimePicker
        mode='single'
        date={draft}
        onChange={({ date }: { date: DateType }) => {
          // Skip the spurious mount-time callback (see `ready` above).
          if (!ready.current) {
            ready.current = true
            return
          }
          if (date instanceof Date) setDraft(date)
        }}
        timePicker
        initialView='time'
        hideHeader
        styles={{
          ...defaultStyles,
          selected: { backgroundColor: c.brand },
          selected_label: { color: c.onAccent }
        }}
      />
      <Button variant='primary' feedbackVariant='none' onPress={confirm}>
        <Button.Label>{t('common.save')}</Button.Label>
      </Button>
    </View>
  )
}
