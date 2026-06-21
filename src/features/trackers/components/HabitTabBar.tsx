import { Pressable, View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs'
import type { LucideIcon } from 'lucide-react-native'
import { Icons } from '@features/trackers/icons'

type TabKey = 'charts' | 'history' | 'notes'

/** Route-name → label + icon. Route names must match the navigator's Tab.Screen names. */
export const TAB_META: Record<TabKey, { labelKey: string; Icon: LucideIcon }> =
  {
    charts: { labelKey: 'detail.tabCharts', Icon: Icons.Charts },
    history: { labelKey: 'detail.tabHistory', Icon: Icons.History },
    notes: { labelKey: 'detail.tabNotes', Icon: Icons.Notes }
  }

/**
 * Custom tab bar for the Habit Detail top-tab navigator. Renders the same pill
 * UI the screen used before the navigator migration: an active green pill, a
 * lucide icon, and a Typography label. Tap-only (the navigator disables swipe).
 */
export function HabitTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const { t } = useTranslation()
  return (
    <View className='flex-row gap-s1 bg-bg px-s4 pb-s3 mt-s3'>
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name as TabKey]
        if (!meta) return null
        const { labelKey, Icon } = meta
        const on = state.index === index

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true
          })
          if (!on && !event.defaultPrevented) {
            navigation.navigate(route.name)
          }
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            className={`h-[38px] flex-1 flex-row items-center justify-center gap-s1 rounded-full ${
              on ? 'bg-brand' : 'bg-transparent'
            }`}
          >
            <Icon size={16} color={on ? '#ffffff' : '#565a4f'} />
            <Typography
              className={`text-xs ${on ? 'font-bold' : 'font-medium'} ${
                on ? 'text-on-accent' : 'text-ink-2'
              }`}
            >
              {t(labelKey)}
            </Typography>
          </Pressable>
        )
      })}
    </View>
  )
}
