import './global.css'
import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import {
  SafeAreaProvider,
  useSafeAreaInsets
} from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import { HeroUINativeProvider } from 'heroui-native'
import { AlertProvider } from '@components/ui'
import { makeHeroUIConfig } from '@theme/index'
import { queryClient } from '@api/queryClient'
import { RootNavigator } from '@navigation/RootNavigator'
import { getDb } from '@features/trackers/db/schema'
import {
  initNotifications,
  requestNotificationPermission
} from '@features/trackers/notifications'
import { useAppStore } from '@store/useAppStore'
import { initI18n } from '@i18n/index'
import BootSplash from 'react-native-bootsplash'

initI18n()

// GestureHandlerRootView is the app root and must fill the screen. It's a
// third-party host component and Uniwind className patching isn't guaranteed on
// it, so style via StyleSheet (not an inline object) — the documented
// `style`-prop exception (see CLAUDE.md styling rules).
const styles = StyleSheet.create({ root: { flex: 1 } })

export default function App() {
  useEffect(() => {
    const ready = async () => {
      await getDb() // open + migrate on launch — hold splash until DB is ready
      await initNotifications() // create the Android channel
      // First launch only: ask once, and let the preference follow the result.
      const { permissionAsked, setNotifyEnabled, markPermissionAsked } =
        useAppStore.getState()
      if (!permissionAsked) {
        const granted = await requestNotificationPermission()
        setNotifyEnabled(granted)
        markPermissionAsked()
      }
    }
    setTimeout(() => {
      ready().finally(() => {
        BootSplash.hide({ fade: true })
      })
    }, 2000)
  }, [])

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppShell />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

// Inside SafeAreaProvider so it can read the device top inset and feed it to
// HeroUI's toast config (toasts render in a full-window overlay → no auto inset).
function AppShell() {
  const insets = useSafeAreaInsets()
  return (
    <HeroUINativeProvider config={makeHeroUIConfig(insets.top)}>
      <AlertProvider>
        <RootNavigator />
      </AlertProvider>
    </HeroUINativeProvider>
  )
}
