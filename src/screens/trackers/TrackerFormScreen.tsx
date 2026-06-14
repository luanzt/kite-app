import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Button, TextField, Label, Input } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import type { RootStackProps } from '@navigation/types';
import type { Tracker } from '@features/trackers/types';
import { useSaveTracker } from '@features/trackers/queries';
import { toISODate } from '@utils/date';

function uuid(): string {
  return (
    'xxxxxxxxyxxxx'.replace(/[xy]/g, c => {
      const r = (Date.now() + Math.floor(Math.random() * 1e9)) % 16;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    }) + Date.now().toString(16)
  );
}

export function TrackerFormScreen({ route, navigation }: RootStackProps<'TrackerForm'>) {
  const { type } = route.params;
  const { t } = useTranslation();
  const save = useSaveTracker();
  const [name, setName] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');

  const onSave = () => {
    const tracker: Tracker = {
      id: uuid(), name: name.trim() || t(`types.${type}`), type,
      icon: 'star', color: 'blue', unit: unit || null, direction: type === 'habit' ? 'good' : null,
      targetValue: targetValue ? Number(targetValue) : null,
      startValue: type === 'target' ? 0 : null,
      accumulation: type === 'target' ? 'sum' : null,
      startDate: toISODate(new Date()), deadline: null,
      period: type === 'average' || type === 'habit' ? 'daily' : null,
      repeatDays: type === 'habit' ? [0, 1, 2, 3, 4, 5, 6] : null,
      createdAt: new Date().toISOString(), archived: false,
    };
    save.mutate(tracker, { onSuccess: () => navigation.navigate('MainTabs') });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <TextField>
        <Label><Label.Text>{t('form.name')}</Label.Text></Label>
        <Input value={name} onChangeText={setName} placeholder={t(`types.${type}`)} />
      </TextField>
      {(type === 'target' || type === 'average') && (
        <>
          <TextField>
            <Label><Label.Text>{t('form.targetValue')}</Label.Text></Label>
            <Input value={targetValue} onChangeText={setTargetValue} keyboardType="numeric" />
          </TextField>
          <TextField>
            <Label><Label.Text>{t('form.unit')}</Label.Text></Label>
            <Input value={unit} onChangeText={setUnit} />
          </TextField>
        </>
      )}
      <Button variant="primary" isDisabled={save.isPending} onPress={onSave}>
        <Button.Label>{t('form.save')}</Button.Label>
      </Button>
    </ScrollView>
  );
}
