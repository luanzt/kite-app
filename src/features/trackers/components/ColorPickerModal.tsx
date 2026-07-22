import { Pressable, View } from 'react-native'
import { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { BottomSheet, Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type Props = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** Full palette to choose from (hex strings). */
  colors: string[]
  selected: string
  onSelect: (color: string) => void
}

/**
 * Full-grid color chooser in a HeroUI BottomSheet — opened from the form's
 * "More" swatch when the palette has more colors than the single-row preview
 * shows. Tapping a swatch selects it and closes the sheet.
 *
 * Mirrors IconPickerModal: gorhom's scrollable inside a fixed-height HeroUI
 * content container so the grid owns the vertical scroll gesture.
 */
export function ColorPickerModal({
  isOpen,
  onOpenChange,
  colors,
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
          snapPoints={['55%']}
          enableOverDrag={false}
          enableDynamicSizing={false}
          contentContainerClassName='h-full px-0 pt-0'
          backgroundClassName='bg-bg rounded-t-[27px]'
        >
          <View className='px-s5 pb-s2 pt-s4'>
            <Typography className='text-lg font-bold text-ink'>
              {t('form.color')}
            </Typography>
          </View>
          <BottomSheetScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} // safe-area, runtime
          >
            <View className='flex-row flex-wrap px-s3'>
              {colors.map((swatch) => {
                const sel = swatch === selected
                return (
                  <View key={swatch} className='w-[20%] items-center py-s2'>
                    <Pressable
                      onPress={() => {
                        onSelect(swatch)
                        onOpenChange(false)
                      }}
                      className={`h-11 w-11 items-center justify-center rounded-full border-2 ${
                        sel ? 'border-ink' : 'border-transparent'
                      }`}
                    >
                      <View
                        className={`h-full w-full rounded-full ${
                          sel ? 'border border-surface' : ''
                        }`}
                        // runtime: palette color, not expressible as a class
                        style={{ backgroundColor: swatch }}
                      />
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
