import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  useNavigationContainerRef,
  type Theme
} from '@react-navigation/native'
import { useRef } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@navigation/types'
import { MainNavigator } from '@navigation/MainNavigator'
import { WelcomeScreen } from '@screens/WelcomeScreen'
import { TrackerDetailScreen } from '@screens/trackers/TrackerDetailScreen'
import { TrackerFormScreen } from '@screens/trackers/TrackerFormScreen'
import { TrackerTypePickerScreen } from '@screens/trackers/TrackerTypePickerScreen'
import { TemplateCategoryScreen } from '@screens/trackers/TemplateCategoryScreen'
import { TemplateCategoriesScreen } from '@screens/trackers/TemplateCategoriesScreen'
import { SyncBackupScreen } from '@screens/settings/SyncBackupScreen'
import { useThemeColors } from '@hooks/useThemeColors'
import { useAppStore } from '@store/useAppStore'
import { trackScreen } from '@utils/telemetry'

const Stack = createNativeStackNavigator<RootStackParamList>()

export function RootNavigator() {
  const c = useThemeColors()
  // First launch only: start on Welcome. Read once at mount — after the user
  // dismisses it we `replace` to MainTabs, and React Navigation ignores later
  // initialRouteName changes anyway.
  const hasSeenWelcome = useAppStore.getState().hasSeenWelcome
  const navigationRef = useNavigationContainerRef<RootStackParamList>()
  const routeNameRef = useRef<string | undefined>(undefined)
  // React Navigation has its own theme (separate from Uniwind) that paints the
  // stack card / screen background — white by default, so it must be mapped to
  // Kite tokens or it flashes light during transitions in dark mode.
  const navTheme: Theme = {
    ...(c.isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(c.isDark ? DarkTheme : DefaultTheme).colors,
      primary: c.brand,
      background: c.bg,
      card: c.surface,
      text: c.ink,
      border: c.line
    }
  }
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      onReady={() => {
        const routeName = navigationRef.getCurrentRoute()?.name
        routeNameRef.current = routeName
        if (routeName) trackScreen(routeName)
      }}
      onStateChange={() => {
        const routeName = navigationRef.getCurrentRoute()?.name
        if (routeName && routeName !== routeNameRef.current) {
          routeNameRef.current = routeName
          trackScreen(routeName)
        }
      }}
    >
      <Stack.Navigator
        initialRouteName={hasSeenWelcome ? 'MainTabs' : 'Welcome'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen
          name='Welcome'
          component={WelcomeScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen name='MainTabs' component={MainNavigator} />
        <Stack.Screen name='TrackerDetail' component={TrackerDetailScreen} />
        <Stack.Screen name='TrackerForm' component={TrackerFormScreen} />
        <Stack.Screen
          name='TrackerTypePicker'
          component={TrackerTypePickerScreen}
        />
        <Stack.Screen
          name='TemplateCategory'
          component={TemplateCategoryScreen}
        />
        <Stack.Screen
          name='TemplateCategories'
          component={TemplateCategoriesScreen}
        />
        <Stack.Screen name='SyncBackup' component={SyncBackupScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
