import { createElement } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useTranslation } from 'react-i18next'
import type { MainTabParamList } from '@navigation/types'
import { DailyGoalsScreen } from '@screens/today/DailyGoalsScreen'
import { TrackerListScreen } from '@screens/trackers/TrackerListScreen'
import { SettingsScreen } from '@screens/settings/SettingsScreen'
import { TAB_ICON } from '@features/trackers/icons'

const Tab = createBottomTabNavigator<MainTabParamList>()

// design tokens: active = brand ink (soft blue), inactive = muted ink-3
const ACTIVE = '#2456b5'
const INACTIVE = '#8a8e80'

/**
 * Stable `tabBarIcon` factory for a given tab. Defined at module scope (not
 * inside MainNavigator) so eslint's react/no-unstable-nested-components is
 * satisfied; uses createElement to pick the focused/unfocused SVG variant
 * without binding a component to a PascalCase local in render position.
 */
const tabIcon =
  (tab: keyof typeof TAB_ICON) =>
  ({ color, focused }: { color: string; focused: boolean }) =>
    createElement(focused ? TAB_ICON[tab].active : TAB_ICON[tab].inactive, {
      width: 24,
      height: 24,
      color
    })

export function MainNavigator() {
  const { t } = useTranslation()
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }
      }}
    >
      <Tab.Screen
        name='Today'
        component={DailyGoalsScreen}
        options={{
          title: t('tabs.today'),
          tabBarIcon: tabIcon('today')
        }}
      />
      <Tab.Screen
        name='Trackers'
        component={TrackerListScreen}
        options={{
          title: t('tabs.trackers'),
          tabBarIcon: tabIcon('trackers')
        }}
      />
      <Tab.Screen
        name='Settings'
        component={SettingsScreen}
        options={{
          title: t('tabs.settings'),
          tabBarIcon: tabIcon('settings')
        }}
      />
    </Tab.Navigator>
  )
}
