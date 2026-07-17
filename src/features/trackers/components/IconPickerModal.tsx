import { Pressable, View } from 'react-native'
import { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { BottomSheet, Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { iconEmoji } from '@features/trackers/icons'

type Props = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** Full keyword list to choose from (a type's ICONSET). */
  icons: string[]
  selected: string
  onSelect: (icon: string) => void
}

/**
 * Full-grid icon chooser in a HeroUI BottomSheet — opened from the form's
 * "More" tile when a type has more icons than the 2-row inline preview shows.
 * Tapping a tile selects it and closes the sheet.
 *
 * Uses gorhom's scrollable inside a fixed-height HeroUI content container so
 * the grid owns the vertical scroll gesture.
 */
export function IconPickerModal({
  isOpen,
  onOpenChange,
  icons,
  selected,
  onSelect
}: Props) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          snapPoints={['70%']}
          enableOverDrag={false}
          enableDynamicSizing={false}
          contentContainerClassName='h-full px-0 pt-0'
          backgroundClassName='bg-bg rounded-t-[27px]'
        >
          <View className='px-s5 pb-s2 pt-s4'>
            <Typography className='text-lg font-bold text-ink'>
              {t('form.icon')}
            </Typography>
          </View>
          <BottomSheetScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} // safe-area, runtime
          >
            <View className='flex-row flex-wrap'>
              {icons.map((ic) => {
                const sel = ic === selected
                return (
                  <View key={ic} className='w-[16.66%] items-center py-s1'>
                    <Pressable
                      onPress={() => {
                        onSelect(ic)
                        onOpenChange(false)
                      }}
                      className={`h-[46px] w-[46px] items-center justify-center rounded-md-k border ${
                        sel
                          ? 'border-brand bg-brand-weak'
                          : 'border-line bg-surface'
                      }`}
                    >
                      <Typography className='text-[22px]'>
                        {iconEmoji(ic)}
                      </Typography>
                    </Pressable>
                  </View>
                )
              })}
            </View>
          </BottomSheetScrollView>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  )
}
