import { View } from 'react-native';
import { Typography, Slider } from 'heroui-native';
import type { Milestone } from '@features/trackers/types';

export function MilestoneList({
  milestones,
  onChange,
}: {
  milestones: Milestone[];
  onChange: (m: Milestone, value: number) => void;
}) {
  return (
    <View>
      {milestones.map(m => (
        <View key={m.id} style={{ marginVertical: 8 }}>
          <Typography>{m.title}</Typography>
          <Slider
            value={m.progress}
            minValue={0}
            maxValue={1}
            step={0.05}
            onChange={v => onChange(m, Array.isArray(v) ? (v[0] ?? 0) : v)}
          >
            <Slider.Track>
              <Slider.Fill />
              <Slider.Thumb />
            </Slider.Track>
          </Slider>
        </View>
      ))}
    </View>
  );
}
