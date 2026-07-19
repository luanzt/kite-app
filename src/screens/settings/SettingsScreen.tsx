import { useEffect, useState } from 'react'
import { AppState, Platform, Pressable, ScrollView, View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@navigation/types'
import { useAppStore } from '@store/useAppStore'
import {
  changeLanguage,
  shouldShowLanguageSetting,
  type Language
} from '@i18n/index'
import { Icons } from '@features/trackers/icons'
import { KiteLogo } from '@features/trackers/components/KiteLogo'
import { Segmented, useAlert, Toggle } from '@components/ui'
import { useTheme } from '@hooks/useTheme'
import { useThemeColors } from '@hooks/useThemeColors'
import type { ThemeMode } from '@hooks/resolveTheme'
import { decideToggleAction } from '@features/trackers/notificationToggle'
import { useClearAllData } from '@features/trackers/queries'
import {
  getPermissionStatus,
  requestNotificationPermission,
  openSystemNotificationSettings,
  cancelAllReminders,
  rescheduleAllReminders
} from '@features/trackers/notifications'
import { makeReminderBodyFor } from '@features/trackers/reminderBodyFor'

function SectionTitle({ children }: { children: string }) {
  return (
    <Typography className='px-2 pb-1 text-xs font-bold uppercase text-ink-3'>
      {children}
    </Typography>
  )
}

function Group({ children }: { children: React.ReactNode }) {
  return (
    <View className='overflow-hidden rounded-lg-k border border-line bg-surface'>
      {children}
    </View>
  )
}

export function SettingsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { t } = useTranslation()
  const alert = useAlert()
  const insets = useSafeAreaInsets()
  const { themeMode, setThemeMode } = useTheme()
  const c = useThemeColors()
  const language = useAppStore((s) => s.language)
  const notifyEnabled = useAppStore((s) => s.notifyEnabled)
  const setNotifyEnabled = useAppStore((s) => s.setNotifyEnabled)
  const icloudSyncEnabled = useAppStore((s) => s.icloudSyncEnabled)
  const clearAll = useClearAllData()
  const [osGranted, setOsGranted] = useState(true)

  useEffect(() => {
    let active = true
    const refresh = () =>
      getPermissionStatus().then((g) => active && setOsGranted(g))
    refresh()
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh()
    })
    return () => {
      active = false
      sub.remove()
    }
  }, [])

  // Body used when (re)scheduling all reminders: live per-tracker stats.
  const reminderBodyFor = makeReminderBodyFor(t, language ?? 'en')

  const conflict = notifyEnabled && !osGranted

  const onToggleNotifications = async () => {
    const action = decideToggleAction(osGranted, notifyEnabled)
    if (action === 'toggle') {
      const next = !notifyEnabled
      setNotifyEnabled(next)
      if (next) {
        await rescheduleAllReminders(reminderBodyFor)
      } else {
        await cancelAllReminders()
      }
      return
    }
    // action === 'request' → OS denied and currently off; try to request.
    const granted = await requestNotificationPermission()
    setOsGranted(granted)
    if (granted) {
      setNotifyEnabled(true)
      await rescheduleAllReminders(reminderBodyFor)
    } else {
      alert({
        title: t('set.notifBlockedTitle'),
        message: t('set.notifBlockedMsg'),
        confirmLabel: t('set.openSettings'),
        onConfirm: openSystemNotificationSettings,
        cancelLabel: t('common.close')
      })
    }
  }

  const onClearAll = () => {
    alert({
      title: t('set.clearConfirmTitle'),
      message: icloudSyncEnabled
        ? t('set.clearConfirmMsgSync')
        : t('set.clearConfirmMsg'),
      variant: 'danger',
      confirmLabel: t('set.clearConfirmBtn'),
      cancelLabel: t('common.cancel'),
      onConfirm: async () => {
        const { cloudPushFailed } = await clearAll.mutateAsync()
        alert({
          title: t('set.clearedTitle'),
          message: cloudPushFailed
            ? t('set.clearedCloudFailedMsg')
            : t('set.clearedMsg')
        })
      }
    })
  }

  const showLang = shouldShowLanguageSetting()
  const langs: { value: Language; label: string }[] = [
    { value: 'en', label: 'EN' },
    { value: 'vi', label: 'VI' }
  ]

  const themeOpts: { value: ThemeMode; label: string }[] = [
    { value: 'light', label: t('set.themeLight') },
    { value: 'dark', label: t('set.themeDark') },
    { value: 'system', label: t('set.themeSystem') }
  ]

  return (
    <View className='flex-1 bg-bg'>
      {/* appbar */}
      <View
        className='bg-surface px-s4 pb-s3'
        style={{ paddingTop: insets.top + 12 }} // safe-area, runtime
      >
        <Typography className='text-lg font-bold text-ink'>
          {t('tabs.settings')}
        </Typography>
      </View>

      <ScrollView
        contentContainerClassName='gap-s6 px-s4 pt-s4'
        // runtime: safe-area inset + static offset
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* app header */}
        <View className='items-center pb-1 pt-2'>
          <KiteLogo size={56} />
          <Typography className='mt-[10px] text-xl font-extrabold text-ink'>
            Kite
          </Typography>
          <Typography className='mt-[2px] text-sm text-ink-3'>
            {t('set.offline')}
          </Typography>
        </View>

        {/* appearance */}
        <View>
          <SectionTitle>{t('set.appearance')}</SectionTitle>
          <Group>
            <View className='gap-s3 border-b border-line p-s4'>
              <View className='flex-row items-center gap-s3'>
                <View className='h-[34px] w-[34px] items-center justify-center rounded-sm-k bg-surface-2'>
                  <Icons.Moon size={18} color={c.ink} />
                </View>
                <Typography className='flex-1 text-base font-semibold text-ink'>
                  {t('set.theme')}
                </Typography>
              </View>
              <Segmented<ThemeMode>
                options={themeOpts}
                value={themeMode}
                onChange={setThemeMode}
              />
            </View>
            <View
              className={`gap-s1 ${showLang ? 'border-b border-line' : ''}`}
            >
              <View className='flex-row items-center gap-s3 p-s4'>
                <View className='h-[34px] w-[34px] items-center justify-center rounded-sm-k bg-surface-2'>
                  <Icons.Bell size={18} color={c.ink} />
                </View>
                <Typography className='flex-1 text-base font-semibold text-ink'>
                  {t('set.notifications')}
                </Typography>
                {conflict ? (
                  <View className='mr-s2'>
                    <Icons.Warn size={18} color={c.pace.behind} />
                  </View>
                ) : null}
                <Toggle
                  value={notifyEnabled}
                  onChange={onToggleNotifications}
                />
              </View>
              {conflict ? (
                <View className='flex-row flex-wrap items-center gap-s1 px-s4 pb-s3'>
                  <Typography className='text-xs text-pace-behind'>
                    {t('set.notifOsOff')}
                  </Typography>
                  <Pressable
                    onPress={openSystemNotificationSettings}
                    hitSlop={6}
                  >
                    <Typography className='text-xs font-bold text-brand underline'>
                      {t('set.goSettings')}
                    </Typography>
                  </Pressable>
                </View>
              ) : null}
            </View>
            {showLang ? (
              <View className='flex-row items-center gap-s3 p-s4'>
                <View className='h-[34px] w-[34px] items-center justify-center rounded-sm-k bg-surface-2'>
                  <Icons.Globe size={18} color={c.ink} />
                </View>
                <Typography className='flex-1 text-base font-semibold text-ink'>
                  {t('set.language')}
                </Typography>
                <View className='flex-row gap-s1 rounded-sm-k bg-surface-2 p-[3px]'>
                  {langs.map((l) => {
                    const on = (language ?? 'en') === l.value
                    return (
                      <Pressable
                        key={l.value}
                        onPress={() => changeLanguage(l.value)}
                        className={`rounded-xs-k px-[14px] py-[7px] ${
                          on ? 'bg-surface shadow-sm' : ''
                        }`}
                      >
                        <Typography
                          className={`text-sm font-bold ${
                            on ? 'text-ink' : 'text-ink-2'
                          }`}
                        >
                          {l.label}
                        </Typography>
                      </Pressable>
                    )
                  })}
                </View>
              </View>
            ) : null}
          </Group>
        </View>

        {/* data */}
        <View>
          <SectionTitle>{t('set.data')}</SectionTitle>
          <Group>
            {Platform.OS === 'ios' ? (
              <Pressable
                onPress={() => nav.navigate('SyncBackup')}
                className='flex-row items-center gap-s3 border-b border-line p-s4 active:opacity-80'
              >
                <View className='h-[34px] w-[34px] items-center justify-center rounded-sm-k bg-surface-2'>
                  <Icons.Cloud size={18} color={c.ink} />
                </View>
                <View className='flex-1'>
                  <Typography className='text-base font-semibold text-ink'>
                    {t('sync.row')}
                  </Typography>
                  <Typography className='mt-[1px] text-xs text-ink-3'>
                    {t('sync.rowSub')}
                  </Typography>
                </View>
                <Icons.Chevron size={18} color={c.ink3} />
              </Pressable>
            ) : null}
            <Pressable className='flex-row items-center gap-s3 border-b border-line p-s4 active:opacity-80'>
              <View className='h-[34px] w-[34px] items-center justify-center rounded-sm-k bg-surface-2'>
                <Icons.Download size={18} color={c.ink} />
              </View>
              <View className='flex-1'>
                <Typography className='text-base font-semibold text-ink'>
                  {t('set.export')}
                </Typography>
                <Typography className='mt-[1px] text-xs text-ink-3'>
                  {t('set.exportSub')}
                </Typography>
              </View>
              <Icons.Chevron size={18} color={c.ink3} />
            </Pressable>
            <Pressable
              onPress={onClearAll}
              className='flex-row items-center gap-s3 p-s4 active:opacity-80'
            >
              <View className='h-[34px] w-[34px] items-center justify-center rounded-sm-k bg-pace-behind-weak'>
                <Icons.Trash size={18} color={c.pace.behind} />
              </View>
              <View className='flex-1'>
                <Typography className='text-base font-semibold text-pace-behind'>
                  {t('set.clear')}
                </Typography>
                <Typography className='mt-[1px] text-xs text-ink-3'>
                  {t('set.clearSub')}
                </Typography>
              </View>
            </Pressable>
          </Group>
        </View>

        {/* about */}
        <View>
          <SectionTitle>{t('set.about')}</SectionTitle>
          <Group>
            <View className='flex-row items-center gap-s3 border-b border-line p-s4'>
              <Typography className='flex-1 text-base font-semibold text-ink'>
                {t('set.version')}
              </Typography>
              <Typography className='text-sm text-ink-3'>1.0.0</Typography>
            </View>
            <View className='flex-row items-center gap-s3 p-s4'>
              <Typography className='flex-1 text-base font-semibold text-ink'>
                {t('set.offline')}
              </Typography>
              <View className='h-[10px] w-[10px] rounded-full bg-pace-on' />
            </View>
          </Group>
        </View>
      </ScrollView>
    </View>
  )
}
