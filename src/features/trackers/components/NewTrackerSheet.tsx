import { Pressable, View } from 'react-native'
import { BottomSheet, Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Target, LayoutTemplate } from 'lucide-react-native'
import { Icons } from '@features/trackers/icons'
import { useThemeColors } from '@hooks/useThemeColors'

type Props = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onChooseCustom: () => void
  onChooseTemplates: () => void
}

/**
 * "New tracker" bottom sheet — the add-tracker entry point. Offers Custom Goal
 * (existing TrackerTypePicker flow) or Templates (browse pre-built goals).
 */
export function NewTrackerSheet({
  isOpen,
  onOpenChange,
  onChooseCustom,
  onChooseTemplates
}: Props) {
  const { t } = useTranslation()
  const c = useThemeColors()
  const insets = useSafeAreaInsets()

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          enableDynamicSizing
          backgroundClassName='bg-bg rounded-t-[27px]'
        >
          <View
            className='px-s5 pt-s1'
            style={{ paddingBottom: insets.bottom + 12 }} // safe-area, runtime
          >
            <Typography className='text-xl font-extrabold text-ink'>
              {t('template.sheetTitle')}
            </Typography>
            <Typography className='mt-s1 text-sm text-ink-2'>
              {t('template.sheetSubtitle')}
            </Typography>

            <Pressable
              onPress={onChooseCustom}
              className='mt-s4 flex-row items-center gap-s3 rounded-lg-k border border-line bg-surface p-s4 active:opacity-90'
            >
              <View className='h-[52px] w-[52px] items-center justify-center rounded-md-k border border-line'>
                <Target size={28} color={c.pace.on_track} strokeWidth={1.9} />
              </View>
              <View className='flex-1'>
                <Typography className='text-lg font-extrabold text-pace-on'>
                  {t('template.custom')}
                </Typography>
                <Typography
                  className='mt-[2px] text-sm text-ink-2'
                  numberOfLines={2}
                >
                  {t('template.customDesc')}
                </Typography>
              </View>
              <Icons.Chevron size={16} color={c.ink3} />
            </Pressable>

            <Pressable
              onPress={onChooseTemplates}
              className='mt-s3 flex-row items-center gap-s3 rounded-lg-k border border-line bg-surface p-s4 active:opacity-90'
            >
              <View className='h-[52px] w-[52px] items-center justify-center rounded-md-k border border-line'>
                <LayoutTemplate size={26} color={c.brand} strokeWidth={1.9} />
              </View>
              <View className='flex-1'>
                <Typography className='text-lg font-extrabold text-brand'>
                  {t('template.templates')}
                </Typography>
                <Typography
                  className='mt-[2px] text-sm text-ink-2'
                  numberOfLines={2}
                >
                  {t('template.templatesDesc')}
                </Typography>
              </View>
              <Icons.Chevron size={16} color={c.ink3} />
            </Pressable>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  )
}
