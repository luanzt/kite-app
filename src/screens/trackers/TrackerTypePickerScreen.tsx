import { Pressable, ScrollView, View } from 'react-native';
import { Typography } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackProps } from '@navigation/types';
import type { TrackerType } from '@features/trackers/types';
import { Icons, hexA } from '@features/trackers/icons';

type TypeMeta = {
  k: TrackerType;
  emoji: string;
  color: string;
  tag: 'tagHabit' | 'tagTarget' | 'tagAverage' | 'tagProject';
};

const TYPES: TypeMeta[] = [
  { k: 'habit', emoji: '🔁', color: '#8b5cf6', tag: 'tagHabit' },
  { k: 'target', emoji: '🎯', color: '#2e7d5b', tag: 'tagTarget' },
  { k: 'average', emoji: '📊', color: '#0d9488', tag: 'tagAverage' },
  { k: 'project', emoji: '🧩', color: '#e0457a', tag: 'tagProject' },
];

export function TrackerTypePickerScreen({ navigation }: RootStackProps<'TrackerTypePicker'>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-bg">
      {/* appbar */}
      <View
        className="flex-row items-center gap-s3 bg-surface px-s4 pb-s3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          className="items-center justify-center rounded-md-k border border-line bg-surface active:opacity-80"
          style={{ width: 40, height: 40 }}
        >
          <Icons.Back size={22} color="#1b1e18" />
        </Pressable>
        <Typography className="text-lg font-bold text-ink">{t('list.create')}</Typography>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* heading */}
        <View className="px-s5" style={{ paddingTop: 24, paddingBottom: 12 }}>
          <Typography className="text-2xl font-extrabold text-ink">{t('type.title')}</Typography>
          <Typography className="text-base text-ink-2" style={{ marginTop: 6 }}>
            {t('type.pick')}
          </Typography>
        </View>

        {/* type cards */}
        <View className="px-s5 gap-s4">
          {TYPES.map(ty => (
            <Pressable
              key={ty.k}
              onPress={() => navigation.navigate('TrackerForm', { type: ty.k })}
              className="flex-row items-start gap-s4 rounded-xl-k border border-line bg-surface p-s5 shadow-sm active:opacity-90"
            >
              <View
                className="items-center justify-center rounded-lg-k"
                style={{ width: 56, height: 56, backgroundColor: hexA(ty.color, 0.14) }}
              >
                <Typography style={{ fontSize: 30 }}>{ty.emoji}</Typography>
              </View>
              <View className="flex-1">
                <Typography className="text-lg font-extrabold text-ink">{t(`type.${ty.k}`)}</Typography>
                <Typography
                  className="text-sm text-ink-2"
                  style={{ marginTop: 4, lineHeight: 20 }}
                  numberOfLines={2}
                >
                  {t(`type.${ty.k}Desc`)}
                </Typography>
                <View className="flex-row items-center gap-s1" style={{ marginTop: 8 }}>
                  <Icons.Bolt size={14} color={ty.color} />
                  <Typography className="text-xs font-bold" style={{ color: ty.color }}>
                    {t(`type.${ty.tag}`)}
                  </Typography>
                </View>
              </View>
              <View className="self-center">
                <Icons.Chevron size={18} color="#8a8e80" />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
