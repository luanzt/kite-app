import { FlatList, View } from 'react-native';
import { Text, Button } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import { useTrackers, useLogEntry } from '@features/trackers/queries';
import { toISODate, weekdayOf } from '@utils/date';
import type { Tracker } from '@features/trackers/types';

function isDueToday(t: Tracker, todayISO: string): boolean {
  if (t.type === 'habit' && t.repeatDays && t.repeatDays.length) {
    return t.repeatDays.includes(weekdayOf(todayISO));
  }
  return true;
}

export function DailyGoalsScreen() {
  const { t } = useTranslation();
  const today = toISODate(new Date());
  const { data: trackers = [] } = useTrackers();
  const log = useLogEntry();
  const due = trackers.filter(tr => isDueToday(tr, today));

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text className="text-xl font-bold">{t('today.title')}</Text>
      {due.length === 0 ? (
        <Text className="mt-4">{t('today.empty')}</Text>
      ) : (
        <FlatList
          data={due}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
              <Text>{item.name}</Text>
              <Button variant="secondary"
                onPress={() => log.mutate({ id: `${item.id}-${today}`, trackerId: item.id, date: today, value: 1, note: null })}>
                <Button.Label>✓</Button.Label>
              </Button>
            </View>
          )}
        />
      )}
    </View>
  );
}
