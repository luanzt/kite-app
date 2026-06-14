import { FlatList, View } from 'react-native';
import { Button, Text } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { useTrackers, useSaveTracker } from '@features/trackers/queries';
import { QUICK_STARTS, type QuickStart } from '@features/trackers/quickStarts';
import { TrackerCard } from '@features/trackers/components/TrackerCard';
import { toISODate } from '@utils/date';
import type { Tracker } from '@features/trackers/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TrackerListScreen() {
  const nav = useNavigation<Nav>();
  const { t } = useTranslation();
  const { data: trackers = [] } = useTrackers();
  const save = useSaveTracker();

  const addQuickStart = (qs: QuickStart) => {
    const tr: Tracker = {
      id: `${qs.key}-${Date.now()}`, name: t(`quickStart.items.${qs.key}`), type: qs.type,
      icon: qs.icon, color: qs.color, unit: qs.unit ?? null, direction: qs.type === 'habit' ? 'good' : null,
      targetValue: qs.targetValue ?? null, startValue: qs.type === 'target' ? 0 : null,
      accumulation: qs.accumulation ?? (qs.type === 'target' ? 'sum' : null),
      startDate: toISODate(new Date()), deadline: null, period: qs.period ?? null,
      repeatDays: qs.type === 'habit' ? [0, 1, 2, 3, 4, 5, 6] : null,
      createdAt: new Date().toISOString(), archived: false,
    };
    save.mutate(tr);
  };

  if (trackers.length === 0) {
    return (
      <View style={{ padding: 16, gap: 12 }}>
        <Text className="text-lg font-semibold">{t('quickStart.heading')}</Text>
        {QUICK_STARTS.map(qs => (
          <Button key={qs.key} variant="secondary" onPress={() => addQuickStart(qs)}>
            <Button.Label>{t(`quickStart.items.${qs.key}`)}</Button.Label>
          </Button>
        ))}
        <Button variant="primary" onPress={() => nav.navigate('TrackerTypePicker')}>
          <Button.Label>{t('form.create')}</Button.Label>
        </Button>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={trackers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TrackerCard tracker={item} entries={[]} milestones={[]}
            onPress={() => nav.navigate('TrackerDetail', { trackerId: item.id })} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
      <Button variant="primary" onPress={() => nav.navigate('TrackerTypePicker')}>
        <Button.Label>{t('form.create')}</Button.Label>
      </Button>
    </View>
  );
}
