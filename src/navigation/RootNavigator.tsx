import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  type Theme
} from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@navigation/types'
import { MainNavigator } from '@navigation/MainNavigator'
import { TrackerDetailScreen } from '@screens/trackers/TrackerDetailScreen'
import { TrackerFormScreen } from '@screens/trackers/TrackerFormScreen'
import { TrackerTypePickerScreen } from '@screens/trackers/TrackerTypePickerScreen'
import { TemplateCategoryScreen } from '@screens/trackers/TemplateCategoryScreen'
import { SyncBackupScreen } from '@screens/settings/SyncBackupScreen'
import { useThemeColors } from '@hooks/useThemeColors'

const Stack = createNativeStackNavigator<RootStackParamList>()

export function RootNavigator() {
  const c = useThemeColors()
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
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
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
        <Stack.Screen name='SyncBackup' component={SyncBackupScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
