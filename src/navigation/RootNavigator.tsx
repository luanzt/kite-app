import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { MainNavigator } from '@navigation/MainNavigator';
import { TrackerDetailScreen } from '@screens/trackers/TrackerDetailScreen';
import { TrackerFormScreen } from '@screens/trackers/TrackerFormScreen';
import { TrackerTypePickerScreen } from '@screens/trackers/TrackerTypePickerScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainNavigator} />
        <Stack.Screen name="TrackerDetail" component={TrackerDetailScreen} />
        <Stack.Screen name="TrackerForm" component={TrackerFormScreen} />
        <Stack.Screen name="TrackerTypePicker" component={TrackerTypePickerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
