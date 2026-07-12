import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Button, Spinner, Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useQueryClient } from '@tanstack/react-query'
import { useIsCloudAvailable } from 'react-native-cloud-storage'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@navigation/types'
import { Icons } from '@features/trackers/icons'
import { runSync } from '@features/trackers/sync/syncService'
import { SnapshotError } from '@features/trackers/sync/snapshot'
import { useSyncStats } from '@features/trackers/queries'
import {
  cancelAllScheduledReminders,
  rescheduleAllReminders
} from '@features/trackers/notifications'
import { useAppStore } from '@store/useAppStore'
import { useAlert } from '@components/ui'
import { useThemeColors } from '@hooks/useThemeColors'

type Nav = NativeStackNavigationProp<RootStackParamList>

/**
 * Strides-style iCloud Sync screen (iOS only — the Settings row that leads
 * here is Platform-gated). Manual sync only: nothing runs in the background;
 * the user taps Sync Now and runSync() merges local SQLite with the iCloud
 * backup. On a fresh install the same tap pulls everything back down.
 */
export function SyncBackupScreen() {
  const nav = useNavigation<Nav>()
  const { t } = useTranslation()
  const c = useThemeColors()
  const insets = useSafeAreaInsets()
  const alert = useAlert()
  const qc = useQueryClient()

  const cloudOk = useIsCloudAvailable()
  const enabled = useAppStore((s) => s.icloudSyncEnabled)
  const setEnabled = useAppStore((s) => s.setIcloudSyncEnabled)
  const lastSyncedAt = useAppStore((s) => s.lastSyncedAt)
  const notifyEnabled = useAppStore((s) => s.notifyEnabled)
  const { data: stats } = useSyncStats(lastSyncedAt)
  const [syncing, setSyncing] = useState(false)

  // Body used when rescheduling reminders after sync, translated per type.
  const reminderBodyFor = (tr: { type: string }) =>
    tr.type === 'target'
      ? t('notification.targetBody')
      : tr.type === 'average'
      ? t('notification.averageBody')
      : t('notification.habitBody')

  const onSyncNow = async () => {
    setSyncing(true)
    try {
      await runSync(qc)
      // Sync bypasses the save/delete mutations that manage reminders:
      // clear every scheduled trigger (incl. orphans of trackers deleted on
      // another device), then reschedule from the merged tracker list.
      await cancelAllScheduledReminders()
      if (notifyEnabled) {
        await rescheduleAllReminders(reminderBodyFor)
      }
    } catch (err) {
      const newer = err instanceof SnapshotError && err.code === 'newer_version'
      alert({
        title: t('sync.errTitle'),
        message: newer ? t('sync.errNewer') : t('sync.errBody'),
        variant: 'danger'
      })
    } finally {
      setSyncing(false)
    }
  }

  const body = !cloudOk
    ? t('sync.unavailableBody')
    : enabled
    ? t('sync.enabledBody')
    : t('sync.disabledBody')

  return (
    <View className='flex-1 bg-bg'>
      {/* appbar */}
      <View
        className='flex-row items-center gap-s2 bg-surface px-s2 pb-s2'
        style={{ paddingTop: insets.top + 6 }} // safe-area, runtime
      >
        <Pressable
          onPress={() => nav.goBack()}
          hitSlop={8}
          className='h-[38px] w-[38px] items-center justify-center'
        >
          <Icons.Back size={22} color={c.ink} />
        </Pressable>
        <Typography className='text-lg font-bold text-ink'>
          {t('sync.title')}
        </Typography>
      </View>

      <ScrollView
        contentContainerClassName='items-center gap-s4 px-s5 pt-s8'
        // runtime: safe-area inset + static offset
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <View className='h-[96px] w-[96px] items-center justify-center rounded-full bg-brand-weak'>
          {cloudOk ? (
            <Icons.Cloud size={46} color={c.brand} />
          ) : (
            <Icons.CloudOff size={46} color={c.ink3} />
          )}
        </View>

        <Typography className='text-2xl font-extrabold text-brand'>
          {t('sync.title')}
        </Typography>

        <Typography className='text-center text-base leading-6 text-ink-2'>
          {body}
        </Typography>

        {enabled ? (
          <View className='w-full items-center gap-s3 pt-s2'>
            <Button
              variant='primary'
              isDisabled={syncing || !cloudOk}
              onPress={onSyncNow}
              className='w-full'
            >
              {syncing ? (
                <Spinner />
              ) : (
                <Button.Label>{t('sync.syncNow')}</Button.Label>
              )}
            </Button>
            <Button
              variant='danger-soft'
              isDisabled={syncing}
              onPress={() => setEnabled(false)}
              className='w-full'
            >
              <Button.Label>{t('sync.disable')}</Button.Label>
            </Button>

            <Typography className='pt-s2 text-center text-sm text-ink-3'>
              {t('sync.stats', {
                trackers: stats?.trackers ?? 0,
                logs: stats?.logs ?? 0
              })}
            </Typography>
            {stats && stats.pending > 0 ? (
              <Typography className='text-center text-sm font-semibold text-pace-behind'>
                {t('sync.pending', { count: stats.pending })}
              </Typography>
            ) : (
              <Typography className='text-center text-sm text-pace-on'>
                {t('sync.upToDate')}
              </Typography>
            )}
            <Typography className='text-center text-xs text-ink-3'>
              {lastSyncedAt
                ? t('sync.lastSynced', {
                    time: new Date(lastSyncedAt).toLocaleString()
                  })
                : t('sync.neverSynced')}
            </Typography>
          </View>
        ) : (
          <View className='w-full pt-s2'>
            <Button
              variant='primary'
              isDisabled={!cloudOk}
              onPress={() => setEnabled(true)}
              className='w-full'
            >
              <Button.Label>{t('sync.enable')}</Button.Label>
            </Button>
          </View>
        )}
      </ScrollView>
    </View>
  )
}
