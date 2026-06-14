import './global.css';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { HeroUINativeProvider } from 'heroui-native';
import { heroUIConfig } from '@theme/index';
import { queryClient } from '@api/queryClient';
import { RootNavigator } from '@navigation/RootNavigator';
import { getDb } from '@features/trackers/db/schema';
import { initI18n } from '@i18n/index';

initI18n();

// GestureHandlerRootView is the app root and must fill the screen. It's a
// third-party host component; the gesture-handler docs use inline flex:1 here,
// and Uniwind className patching isn't guaranteed on it — this is the
// documented inline-style exception (see CLAUDE.md styling rules).
export default function App() {
  useEffect(() => {
    getDb(); // open + migrate on launch
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <HeroUINativeProvider config={heroUIConfig}>
            <RootNavigator />
          </HeroUINativeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
