import { Pressable, View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { Icons } from '@features/trackers/icons'

/** The green "Log today" button shown below the non-project detail body. */
export function LogTodayButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation()
  return (
    <View className='px-s4 pb-[8px]'>
      <Pressable
        onPress={onPress}
        className='h-[52px] flex-row items-center justify-center gap-s2 rounded-md-k bg-brand active:opacity-90'
      >
        <Icons.Plus size={20} color='#ffffff' />
        <Typography className='text-base font-bold text-on-accent'>
          {t('detail.logToday')}
        </Typography>
      </Pressable>
    </View>
  )
}
