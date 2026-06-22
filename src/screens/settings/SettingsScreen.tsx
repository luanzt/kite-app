import { Pressable, ScrollView, View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAppStore } from '@store/useAppStore'
import { changeLanguage, type Language } from '@i18n/index'
import { Icons, PACE_COLOR } from '@features/trackers/icons'
import { KiteLogo } from '@features/trackers/components/KiteLogo'

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

/** A small theme toggle switch matching `.switch`. */
function Switch({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`h-[30px] w-[50px] rounded-full ${
        on ? 'bg-[#2e7d5b]' : 'bg-[#e6e8df]'
      }`}
    >
      <View
        className={`absolute top-[3px] h-6 w-6 rounded-full bg-surface shadow-sm ${
          on ? 'left-[23px]' : 'left-[3px]'
        }`}
      />
    </Pressable>
  )
}

export function SettingsScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const themeMode = useAppStore((s) => s.themeMode)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const language = useAppStore((s) => s.language)

  const langs: { value: Language; label: string }[] = [
    { value: 'en', label: 'EN' },
    { value: 'vi', label: 'VI' }
  ]

  return (
    <View className='flex-1 bg-bg'>
      {/* appbar */}
      <View
        className='bg-surface px-s5 pb-s3'
        style={{ paddingTop: insets.top + 12 }} // safe-area, runtime
      >
        <Typography className='text-lg font-bold text-ink'>
          {t('tabs.settings')}
        </Typography>
      </View>

      <ScrollView
        contentContainerClassName='gap-s6 p-5'
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
            <View className='flex-row items-center gap-s3 border-b border-line p-s4'>
              <View className='h-[34px] w-[34px] items-center justify-center rounded-sm-k bg-surface-2'>
                <Icons.Moon size={18} color='#1b1e18' />
              </View>
              <Typography className='flex-1 text-base font-semibold text-ink'>
                {t('set.theme')}
              </Typography>
              <Switch on={themeMode === 'dark'} onPress={toggleTheme} />
            </View>
            <View className='flex-row items-center gap-s3 p-s4'>
              <View className='h-[34px] w-[34px] items-center justify-center rounded-sm-k bg-surface-2'>
                <Icons.Globe size={18} color='#1b1e18' />
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
          </Group>
        </View>

        {/* data */}
        <View>
          <SectionTitle>{t('set.data')}</SectionTitle>
          <Group>
            <Pressable className='flex-row items-center gap-s3 border-b border-line p-s4 active:opacity-80'>
              <View className='h-[34px] w-[34px] items-center justify-center rounded-sm-k bg-surface-2'>
                <Icons.Download size={18} color='#1b1e18' />
              </View>
              <View className='flex-1'>
                <Typography className='text-base font-semibold text-ink'>
                  {t('set.export')}
                </Typography>
                <Typography className='mt-[1px] text-xs text-ink-3'>
                  {t('set.exportSub')}
                </Typography>
              </View>
              <Icons.Chevron size={18} color='#8a8e80' />
            </Pressable>
            <Pressable className='flex-row items-center gap-s3 p-s4 active:opacity-80'>
              <View className='h-[34px] w-[34px] items-center justify-center rounded-sm-k bg-pace-behind-weak'>
                <Icons.Trash size={18} color={PACE_COLOR.behind} />
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
