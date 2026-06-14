import { ScrollView } from 'react-native';
import { Typography } from 'heroui-native';
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
    <ScrollView contentContainerClassName="p-4 gap-4">
      <Typography className="text-xl font-bold">{tracker.name}</Typography>
      <PaceBar percent={p.percent} paceStatus={p.paceStatus} label={paceLabel} />
      {p.streak !== undefined ? <Typography>{t('detail.streak')}: {p.streak}</Typography> : null}
      {p.successRate !== undefined ? <Typography>{t('detail.successRate')}: {Math.round(p.successRate * 100)}%</Typography> : null}
      <Typography className="font-semibold">{t('detail.history')}</Typography>
      <HistoryChart entries={entries} />
    </ScrollView>
  );
}
