import { View } from 'react-native';
import { Typography } from 'heroui-native';
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
      <View className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
        {/* width + status color are runtime-dynamic → inline style is the documented exception */}
        <View className="h-full" style={{ width: `${pct * 100}%`, backgroundColor: COLOR[paceStatus] }} />
      </View>
      {label ? <Typography className="text-xs mt-1">{label}</Typography> : null}
    </View>
  );
}
