import { View } from 'react-native';
import { Text } from 'heroui-native';
import type { PaceStatus } from '@features/trackers/types';

const COLOR: Record<PaceStatus, string> = {
  on_track: '#22c55e',
  ahead: '#16a34a',
  behind: '#ef4444',
  none: '#3b82f6',
};

export function PaceBar({
  percent,
  paceStatus,
  label,
}: {
  percent: number;
  paceStatus: PaceStatus;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, percent));
  return (
    <View>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: '#e5e7eb', overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: COLOR[paceStatus] }} />
      </View>
      {label ? <Text className="text-xs mt-1">{label}</Text> : null}
    </View>
  );
}
