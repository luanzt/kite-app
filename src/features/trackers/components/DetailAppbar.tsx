import { Pressable, View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icons, iconEmoji } from '@features/trackers/icons'
import { cadenceLabel } from '@features/trackers/habitLabels'
import type { Tracker } from '@features/trackers/types'

/**
 * DetailAppbar — the Tracker Detail header (shared by habit and non-habit
 * layouts): a back button, the tracker name (plus a habit cadence line), and an
 * edit button. Owns its own top safe-area inset.
 */
export function DetailAppbar({
  tracker,
  onBack,
  onEdit
}: {
  tracker: Tracker
  onBack: () => void
  onEdit: () => void
}) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const isHabit = tracker.type === 'habit'
  return (
    <View
      className='flex-row items-center gap-s3 bg-surface px-s4 pb-s3'
      style={{ paddingTop: insets.top + 8 }} // safe-area, runtime
    >
      <Pressable
        onPress={onBack}
        className='h-[40px] w-[40px] items-center justify-center rounded-md-k border border-line bg-surface active:opacity-80'
      >
        <Icons.Back size={22} color='#1b1e18' />
      </Pressable>
      <View className='flex-1 items-center'>
        <Typography className='text-lg font-bold text-ink' numberOfLines={1}>
          {tracker.name}
        </Typography>
        {isHabit ? (
          <Typography className='mt-[2px] text-sm font-bold text-brand-ink'>
            {`${iconEmoji(tracker.icon)} ${cadenceLabel(tracker, t)}`}
          </Typography>
        ) : null}
      </View>
      <Pressable
        onPress={onEdit}
        className='h-[40px] w-[40px] items-center justify-center rounded-md-k border border-line bg-surface active:opacity-80'
      >
        <Icons.Edit size={20} color='#1b1e18' />
      </Pressable>
    </View>
  )
}
