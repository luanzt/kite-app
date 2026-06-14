import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Button, TextField, Label, Input } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import type { RootStackProps } from '@navigation/types';
import { useSaveTracker } from '@features/trackers/queries';
import { buildTracker } from '@features/trackers/factory';

export function TrackerFormScreen({ route, navigation }: RootStackProps<'TrackerForm'>) {
  const { type } = route.params;
  const { t } = useTranslation();
  const save = useSaveTracker();
  const [name, setName] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');

  const onSave = () => {
    const tracker = buildTracker({
      name: name.trim() || t(`types.${type}`),
      type,
      unit: unit || null,
      targetValue: targetValue ? Number(targetValue) : null,
    });
    save.mutate(tracker, { onSuccess: () => navigation.navigate('MainTabs') });
  };

  return (
    <ScrollView contentContainerClassName="p-4 gap-4">
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
