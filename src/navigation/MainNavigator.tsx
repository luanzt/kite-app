import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useTranslation } from 'react-i18next'
import type { MainTabParamList } from '@navigation/types'
import { DailyGoalsScreen } from '@screens/today/DailyGoalsScreen'
import { TrackerListScreen } from '@screens/trackers/TrackerListScreen'
import { SettingsScreen } from '@screens/settings/SettingsScreen'
import { Icons } from '@features/trackers/icons'

const Tab = createBottomTabNavigator<MainTabParamList>()

// design tokens: active = brand ink (soft blue), inactive = muted ink-3
const ACTIVE = '#2f63b3'
const INACTIVE = '#8a8e80'

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
          tabBarIcon: ({ color, focused }) => (
            <Icons.Today
              size={24}
              color={color}
              strokeWidth={focused ? 2.4 : 2}
            />
          )
        }}
      />
      <Tab.Screen
        name='Trackers'
        component={TrackerListScreen}
        options={{
          title: t('tabs.trackers'),
          tabBarIcon: ({ color, focused }) => (
            <Icons.Trackers
              size={24}
              color={color}
              strokeWidth={focused ? 2.4 : 2}
            />
          )
        }}
      />
      <Tab.Screen
        name='Settings'
        component={SettingsScreen}
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, focused }) => (
            <Icons.Settings
              size={24}
              color={color}
              strokeWidth={focused ? 2.4 : 2}
            />
          )
        }}
      />
    </Tab.Navigator>
  )
}
