import { View } from 'react-native';
import { Button } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import type { RootStackProps } from '@navigation/types';
import type { TrackerType } from '@features/trackers/types';

const TYPES: TrackerType[] = ['habit', 'target', 'average', 'project'];

export function TrackerTypePickerScreen({ navigation }: RootStackProps<'TrackerTypePicker'>) {
  const { t } = useTranslation();
  return (
    <View style={{ padding: 16, gap: 12 }}>
      {TYPES.map(type => (
        <Button key={type} variant="secondary" onPress={() => navigation.replace('TrackerForm', { type })}>
          <Button.Label>{t(`types.${type}`)}</Button.Label>
        </Button>
      ))}
    </View>
  );
}
