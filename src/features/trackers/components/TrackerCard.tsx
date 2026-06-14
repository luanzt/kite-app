import { Pressable, View } from 'react-native';
import { Card, Typography } from 'heroui-native';
import type { Tracker, Entry, Milestone, TrackerProgress } from '@features/trackers/types';
import {
  calculateHabit,
  calculateTarget,
  calculateAverage,
  calculateProject,
} from '@features/trackers/calculators';
import { toISODate } from '@utils/date';
import { PaceBar } from './PaceBar';

export function progressFor(t: Tracker, entries: Entry[], milestones: Milestone[]): TrackerProgress {
  const today = toISODate(new Date());
  switch (t.type) {
    case 'habit':
      return calculateHabit(t, entries, today);
    case 'target':
      return calculateTarget(t, entries, today);
    case 'average':
      return calculateAverage(t, entries, today);
    case 'project':
      return calculateProject(t, milestones, today);
    default:
      throw new Error(`Unknown tracker type: ${t.type as string}`);
  }
}

export function TrackerCard({
  tracker,
  entries,
  milestones,
  onPress,
}: {
  tracker: Tracker;
  entries: Entry[];
  milestones: Milestone[];
  onPress: () => void;
}) {
  const p = progressFor(tracker, entries, milestones);
  return (
    <Pressable onPress={onPress}>
      <Card>
        <Card.Body>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Typography>{tracker.name}</Typography>
            <Typography className="text-xs">{Math.round(p.percent * 100)}%</Typography>
          </View>
          <PaceBar percent={p.percent} paceStatus={p.paceStatus} />
        </Card.Body>
      </Card>
    </Pressable>
  );
}
