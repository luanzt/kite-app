import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import type { MainTabParamList } from '@navigation/types';
import { DailyGoalsScreen } from '@screens/today/DailyGoalsScreen';
import { TrackerListScreen } from '@screens/trackers/TrackerListScreen';
import { SettingsScreen } from '@screens/settings/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainNavigator() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Today" component={DailyGoalsScreen} options={{ title: t('tabs.today') }} />
      <Tab.Screen name="Trackers" component={TrackerListScreen} options={{ title: t('tabs.trackers') }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t('tabs.settings') }} />
    </Tab.Navigator>
  );
}
