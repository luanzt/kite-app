import './global.css';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { HeroUINativeProvider } from 'heroui-native';
import { AlertProvider } from '@components/ui';
import { heroUIConfig } from '@theme/index';
import { queryClient } from '@api/queryClient';
import { RootNavigator } from '@navigation/RootNavigator';
import { getDb } from '@features/trackers/db/schema';
import { initNotifications } from '@features/trackers/notifications';
import { initI18n } from '@i18n/index';

initI18n();

// GestureHandlerRootView is the app root and must fill the screen. It's a
// third-party host component and Uniwind className patching isn't guaranteed on
// it, so style via StyleSheet (not an inline object) — the documented
// `style`-prop exception (see CLAUDE.md styling rules).
const styles = StyleSheet.create({ root: { flex: 1 } });

export default function App() {
  useEffect(() => {
    getDb(); // open + migrate on launch
    initNotifications(); // request notification permission + create channel
  }, []);
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <HeroUINativeProvider config={heroUIConfig}>
            <AlertProvider>
              <RootNavigator />
            </AlertProvider>
          </HeroUINativeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
