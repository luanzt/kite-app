import { Pressable, ScrollView, View } from 'react-native';
import { Typography } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@store/useAppStore';
import { changeLanguage, type Language } from '@i18n/index';
import { Icons, PACE_COLOR } from '@features/trackers/icons';
import { KiteLogo } from '@features/trackers/components/KiteLogo';

function SectionTitle({ children }: { children: string }) {
  return (
    <Typography
      className="text-xs font-bold uppercase text-ink-3"
      style={{ paddingHorizontal: 8, paddingBottom: 4 }}
    >
      {children}
    </Typography>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return (
    <View className="overflow-hidden rounded-lg-k border border-line bg-surface">{children}</View>
  );
}

/** A small theme toggle switch matching `.switch`. */
function Switch({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full"
      style={{ width: 50, height: 30, backgroundColor: on ? '#2e7d5b' : '#e6e8df' }}
    >
      <View
        className="rounded-full bg-surface shadow-sm"
        style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 24, height: 24 }}
      />
    </Pressable>
  );
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const themeMode = useAppStore(s => s.themeMode);
  const toggleTheme = useAppStore(s => s.toggleTheme);
  const language = useAppStore(s => s.language);

  const langs: { value: Language; label: string }[] = [
    { value: 'en', label: 'EN' },
    { value: 'vi', label: 'VI' },
  ];

  return (
    <View className="flex-1 bg-bg">
      {/* appbar */}
      <View className="bg-surface px-s5 pb-s3" style={{ paddingTop: insets.top + 12 }}>
        <Typography className="text-lg font-bold text-ink">{t('tabs.settings')}</Typography>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: insets.bottom + 32 }}>
        {/* app header */}
        <View className="items-center" style={{ paddingTop: 8, paddingBottom: 4 }}>
          <KiteLogo size={56} />
          <Typography className="text-xl font-extrabold text-ink" style={{ marginTop: 10 }}>
            Kite
          </Typography>
          <Typography className="text-sm text-ink-3" style={{ marginTop: 2 }}>
            {t('set.offline')}
          </Typography>
        </View>

        {/* appearance */}
        <View>
          <SectionTitle>{t('set.appearance')}</SectionTitle>
          <Group>
            <View className="flex-row items-center gap-s3 border-b border-line p-s4">
              <View
                className="items-center justify-center rounded-sm-k bg-surface-2"
                style={{ width: 34, height: 34 }}
              >
                <Icons.Moon size={18} color="#1b1e18" />
              </View>
              <Typography className="flex-1 text-base font-semibold text-ink">
                {t('set.theme')}
              </Typography>
              <Switch on={themeMode === 'dark'} onPress={toggleTheme} />
            </View>
            <View className="flex-row items-center gap-s3 p-s4">
              <View
                className="items-center justify-center rounded-sm-k bg-surface-2"
                style={{ width: 34, height: 34 }}
              >
                <Icons.Globe size={18} color="#1b1e18" />
              </View>
              <Typography className="flex-1 text-base font-semibold text-ink">
                {t('set.language')}
              </Typography>
              <View className="flex-row gap-s1 rounded-sm-k bg-surface-2" style={{ padding: 3 }}>
                {langs.map(l => {
                  const on = (language ?? 'en') === l.value;
                  return (
                    <Pressable
                      key={l.value}
                      onPress={() => changeLanguage(l.value)}
                      className={`rounded-xs-k ${on ? 'bg-surface shadow-sm' : ''}`}
                      style={{ paddingVertical: 7, paddingHorizontal: 14 }}
                    >
                      <Typography className={`text-sm font-bold ${on ? 'text-ink' : 'text-ink-2'}`}>
                        {l.label}
                      </Typography>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Group>
        </View>

        {/* data */}
        <View>
          <SectionTitle>{t('set.data')}</SectionTitle>
          <Group>
            <Pressable className="flex-row items-center gap-s3 border-b border-line p-s4 active:opacity-80">
              <View
                className="items-center justify-center rounded-sm-k bg-surface-2"
                style={{ width: 34, height: 34 }}
              >
                <Icons.Download size={18} color="#1b1e18" />
              </View>
              <View className="flex-1">
                <Typography className="text-base font-semibold text-ink">{t('set.export')}</Typography>
                <Typography className="text-xs text-ink-3" style={{ marginTop: 1 }}>
                  {t('set.exportSub')}
                </Typography>
              </View>
              <Icons.Chevron size={18} color="#8a8e80" />
            </Pressable>
            <Pressable className="flex-row items-center gap-s3 p-s4 active:opacity-80">
              <View
                className="items-center justify-center rounded-sm-k bg-pace-behind-weak"
                style={{ width: 34, height: 34 }}
              >
                <Icons.Trash size={18} color={PACE_COLOR.behind} />
              </View>
              <View className="flex-1">
                <Typography className="text-base font-semibold text-pace-behind">
                  {t('set.clear')}
                </Typography>
                <Typography className="text-xs text-ink-3" style={{ marginTop: 1 }}>
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
            <View className="flex-row items-center gap-s3 border-b border-line p-s4">
              <Typography className="flex-1 text-base font-semibold text-ink">
                {t('set.version')}
              </Typography>
              <Typography className="text-sm text-ink-3">1.0.0</Typography>
            </View>
            <View className="flex-row items-center gap-s3 p-s4">
              <Typography className="flex-1 text-base font-semibold text-ink">
                {t('set.offline')}
              </Typography>
              <View
                className="rounded-full"
                style={{ width: 10, height: 10, backgroundColor: PACE_COLOR.on_track }}
              />
            </View>
          </Group>
        </View>
      </ScrollView>
    </View>
  );
}
