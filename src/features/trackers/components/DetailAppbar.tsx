import { Pressable, View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icons, iconEmoji } from '@features/trackers/icons'
import { cadenceLabel } from '@features/trackers/habitLabels'
import { fmtValCompact } from '@features/trackers/detailFormat'
import type { Tracker } from '@features/trackers/types'

/** Deadline as "1 Apr 2027" in the active locale. */
function fmtDeadline(iso: string, lang: string): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

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
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const isHabit = tracker.type === 'habit'

  // Sub-line under the title (icon + goal), mirroring the Today card's row 2.
  // Habit → "{icon} {cadence}"; target/average → "{icon} Goal: <value> by <date>".
  let subLine: string | null = null
  if (isHabit) {
    subLine = `${iconEmoji(tracker.icon)} ${cadenceLabel(tracker, t)}`
  } else if (tracker.type === 'target' || tracker.type === 'average') {
    const goalVal = fmtValCompact(tracker, tracker.targetValue ?? 0)
    const goalText =
      tracker.type === 'target' && tracker.deadline
        ? t('today.goalBy', {
            value: goalVal,
            date: fmtDeadline(tracker.deadline, i18n.language)
          })
        : t('today.goal', { value: goalVal })
    subLine = `${iconEmoji(tracker.icon)} ${goalText}`
  }

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
        {subLine ? (
          <Typography
            className='mt-[2px] text-sm font-bold text-brand-ink'
            numberOfLines={1}
          >
            {subLine}
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
