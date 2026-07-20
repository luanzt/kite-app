import { View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type { TrackerType } from '@features/trackers/types'
import { TYPE_COLOR, hexA } from '@features/trackers/icons'

/**
 * Uppercase type pill (HABIT / TARGET / AVERAGE / PROJECT). Colored by the
 * per-type identity palette (TYPE_COLOR) on a faint tint of the same hue — both
 * are computed hex, so they are the documented inline-style exception.
 */
export function TypeBadge({ type }: { type: TrackerType }) {
  const { t } = useTranslation()
  const hue = TYPE_COLOR[type]
  return (
    <View
      className='rounded-xs-k px-[7px] py-[2px]'
      // runtime: per-type identity tint, no class equivalent
      style={{ backgroundColor: hexA(hue, 0.13) }}
    >
      <Typography
        className='text-[10.5px] font-extrabold uppercase tracking-wide'
        // runtime: per-type identity color, no class equivalent
        style={{ color: hue }}
      >
        {t(`types.${type}`)}
      </Typography>
    </View>
  )
}
