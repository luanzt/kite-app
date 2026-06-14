import { ScrollView } from 'react-native';
import { Text } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import type { RootStackProps } from '@navigation/types';
import { useTracker, useEntries, useMilestones } from '@features/trackers/queries';
import { progressFor } from '@features/trackers/components/TrackerCard';
import { PaceBar } from '@features/trackers/components/PaceBar';
import { HistoryChart } from '@features/trackers/components/HistoryChart';

export function TrackerDetailScreen({ route }: RootStackProps<'TrackerDetail'>) {
  const { trackerId } = route.params;
  const { t } = useTranslation();
  const { data: tracker } = useTracker(trackerId);
  const { data: entries = [] } = useEntries(trackerId);
  const { data: milestones = [] } = useMilestones(trackerId);
  if (!tracker) return null;
  const p = progressFor(tracker, entries, milestones);
  const paceLabel =
    p.paceStatus === 'behind' ? t('detail.behind')
    : p.paceStatus === 'ahead' ? t('detail.ahead')
    : p.paceStatus === 'on_track' ? t('detail.onTrack') : '';

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text className="text-xl font-bold">{tracker.name}</Text>
      <PaceBar percent={p.percent} paceStatus={p.paceStatus} label={paceLabel} />
      {p.streak !== undefined ? <Text>{t('detail.streak')}: {p.streak}</Text> : null}
      {p.successRate !== undefined ? <Text>{t('detail.successRate')}: {Math.round(p.successRate * 100)}%</Text> : null}
      <Text className="font-semibold">{t('detail.history')}</Text>
      <HistoryChart entries={entries} />
    </ScrollView>
  );
}
