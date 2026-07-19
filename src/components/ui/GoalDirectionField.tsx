import { useCallback, useEffect, useState } from 'react'
import { Keyboard, Pressable, View } from 'react-native'
import { BottomSheetFooter, BottomSheetTextInput } from '@gorhom/bottom-sheet'
import type { BottomSheetFooterProps } from '@gorhom/bottom-sheet'
import { BottomSheet, Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, X } from 'lucide-react-native'
import type { HabitDirection } from '@features/trackers/types'
import { useThemeColors } from '@hooks/useThemeColors'
import { Segmented } from './Segmented'

/**
 * A combined Goal + direction field for average trackers. The trigger shows the
 * goal phrased with its direction — e.g. "5 or more" / "5 or less" (empty →
 * "0 or more" hint) — and tapping it opens a bottom sheet to enter the number
 * and pick the direction together. Reuses the existing `targetValue`
 * (`value`) + `direction` model — `good` = "or more", `bad` = "or less".
 */
export function GoalDirectionField({
  value,
  direction,
  onChange
}: {
  value: string
  direction: HabitDirection
  onChange: (value: string, direction: HabitDirection) => void
}) {
  const { t } = useTranslation()
  const c = useThemeColors()
  const insets = useSafeAreaInsets()

  const [open, setOpen] = useState(false)
  const [draftValue, setDraftValue] = useState(value)
  const [draftDir, setDraftDir] = useState<HabitDirection>(direction)

  // Seed the draft from the committed value each time the sheet opens.
  useEffect(() => {
    if (!open) return
    setDraftValue(value)
    setDraftDir(direction)
  }, [open, value, direction])

  const dismiss = () => {
    Keyboard.dismiss()
    setOpen(false)
  }

  const confirm = () => {
    onChange(draftValue.trim(), draftDir)
    dismiss()
  }

  const filled = value.trim().length > 0
  const dirKey = direction === 'bad' ? 'form.goalOrLess' : 'form.goalOrMore'
  const display = t(dirKey, { value: filled ? value.trim() : '0' })

  // Footer via gorhom's BottomSheetFooter so Confirm sticks above the keyboard.
  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={insets.bottom}>
        <View className='px-s4 pb-s3 pt-s3'>
          <Pressable
            onPress={confirm}
            className='h-[56px] flex-row items-center justify-center gap-s2 rounded-lg-k bg-brand active:opacity-90'
          >
            <Check size={20} color={c.onAccent} />
            <Typography className='text-h3-k font-bold text-on-accent'>
              {t('common.save')}
            </Typography>
          </Pressable>
        </View>
      </BottomSheetFooter>
    ),
    // confirm closes over draft state — footer MUST re-create when it changes,
    // or Confirm fires with stale values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [insets.bottom, draftValue, draftDir, c.onAccent, t]
  )

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className='h-[52px] flex-row items-center rounded-md-k border border-line bg-surface px-s4 active:opacity-80'
      >
        <Typography
          className={`text-base ${filled ? 'text-ink' : 'text-ink-3'}`}
          numberOfLines={1}
        >
          {display}
        </Typography>
      </Pressable>

      <BottomSheet isOpen={open} onOpenChange={(o) => !o && dismiss()}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay className='bg-black/60' />
          <BottomSheet.Content
            snapPoints={['50%']}
            enableOverDrag={false}
            enableDynamicSizing={false}
            keyboardBehavior='extend'
            footerComponent={renderFooter}
            contentContainerClassName='h-full px-0 pt-0'
            backgroundClassName='bg-bg rounded-t-[27px]'
          >
            {/* header */}
            <View className='flex-row items-center gap-s2 px-s4 pb-s4 pt-s3'>
              <Pressable
                onPress={dismiss}
                className='h-[44px] w-[44px] items-center justify-center rounded-md-k border border-line bg-surface active:opacity-80'
              >
                <X size={22} color={c.ink} />
              </Pressable>
              <View className='flex-1 items-center'>
                <Typography className='text-h2-k font-bold text-ink'>
                  {t('form.avgGoal')}
                </Typography>
              </View>
              <View className='h-[44px] w-[44px]' />
            </View>

            <View className='gap-s4 px-s4 pt-s2'>
              <View className='overflow-hidden rounded-xl-k border border-line bg-surface'>
                <BottomSheetTextInput
                  value={draftValue}
                  onChangeText={setDraftValue}
                  placeholder='0'
                  placeholderTextColor={c.ink3}
                  keyboardType='decimal-pad'
                  autoFocus
                  textAlignVertical='center'
                  className='h-[64px] px-s4 text-h2-k font-bold text-ink'
                />
              </View>
              <Segmented<HabitDirection>
                value={draftDir}
                onChange={setDraftDir}
                options={[
                  { value: 'good', label: t('form.orMore') },
                  { value: 'bad', label: t('form.orLess') }
                ]}
              />
            </View>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </>
  )
}
