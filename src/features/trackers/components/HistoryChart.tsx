import { LineChart } from 'react-native-gifted-charts';
import type { Entry } from '@features/trackers/types';

export function HistoryChart({ entries }: { entries: Entry[] }) {
  const data = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => ({ value: e.value, label: e.date.slice(5) }));
  if (data.length === 0) return null;
  return <LineChart data={data} areaChart curved thickness={2} hideRules />;
}
