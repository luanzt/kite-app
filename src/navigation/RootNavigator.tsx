import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '@store/useAuthStore';
import { AuthNavigator } from '@navigation/AuthNavigator';
import { MainNavigator } from '@navigation/MainNavigator';

export function RootNavigator() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
