import './global.css';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { HeroUINativeProvider } from 'heroui-native';
import { heroUIConfig } from '@theme/index';
import { queryClient } from '@api/queryClient';
import { RootNavigator } from '@navigation/RootNavigator';
import { getDb } from '@features/trackers/db/schema';
import { initI18n } from '@i18n/index';
import { StyleSheet } from 'react-native';

initI18n();

export default function App() {
  useEffect(() => {
    getDb(); // open + migrate on launch
  }, []);
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <HeroUINativeProvider config={heroUIConfig}>
          <RootNavigator />
        </HeroUINativeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
