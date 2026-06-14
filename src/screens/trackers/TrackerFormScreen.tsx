import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Typography } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackProps } from '@navigation/types';
import { useTracker, useSaveTracker, useDeleteTracker } from '@features/trackers/queries';
import { buildTracker } from '@features/trackers/factory';
import { Icons, TYPE_ICON, TYPE_COLOR, hexA } from '@features/trackers/icons';
import { useAppStore } from '@store/useAppStore';
import type { Accumulation, HabitDirection, Period, Tracker } from '@features/trackers/types';

/** Per-type emoji set (mirrors ICONSET in data.js). */
const ICONSET: Record<string, string[]> = {
  habit: ['🧘', '🏋️', '📖', '🚭', '💊', '🦷', '🛏️', '🙏'],
  target: ['🎯', '📚', '💰', '⚖️', '🏃', '✍️', '🎸', '📈'],
  average: ['💧', '😴', '🚶', '🥗', '☕', '📱', '💵', '🔥'],
  project: ['🚀', '🧩', '🏗️', '🎨', '🎬', '🏡', '💼', '🎓'],
};

/** Tracker color palette (mirrors COLORS in data.js). */
const COLORS = ['#2e7d5b', '#3d7dd8', '#e0564e', '#d98b2b', '#8b5cf6', '#0d9488', '#e0457a', '#6b7280'];

function defaultIcon(type: string): string {
  return ({ habit: '🧘', target: '🎯', average: '💧', project: '🚀' } as Record<string, string>)[type] ?? '🎯';
}

/** A styled text field matching the design's `.input` (52px, bordered). */
function FormInput(props: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad';
}) {
  return (
    <TextInput
      value={props.value}
      onChangeText={props.onChangeText}
      placeholder={props.placeholder}
      placeholderTextColor="#8a8e80"
      keyboardType={props.keyboardType ?? 'default'}
      className="rounded-md-k border border-line bg-surface px-s4 text-base text-ink"
      style={{ height: 52 }}
    />
  );
}

/** Segmented control matching `.seg`. */
function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row gap-s1 rounded-md-k bg-surface-2" style={{ padding: 4 }}>
      {options.map(opt => {
        const on = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`flex-1 items-center justify-center rounded-sm-k ${on ? 'bg-surface shadow-sm' : ''}`}
            style={{ height: 40 }}
          >
            <Typography className={`text-sm font-bold ${on ? 'text-ink' : 'text-ink-2'}`}>
              {opt.label}
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Typography className="text-sm font-bold text-ink">{children}</Typography>;
}

export function TrackerFormScreen({ route, navigation }: RootStackProps<'TrackerForm'>) {
  const { type, trackerId } = route.params;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const save = useSaveTracker();
  const del = useDeleteTracker();
  const language = useAppStore(s => s.language);
  const { data: editing } = useTracker(trackerId ?? '');

  // The design's PERIOD_LABEL words. No dedicated i18n keys exist in the
  // handoff key list, so localise EN/VI inline from data.js PERIOD_LABEL.
  const isVi = (language ?? 'en') === 'vi';
  const periodLabels: Record<Period, string> = isVi
    ? { daily: 'Hằng ngày', weekly: 'Hằng tuần', monthly: 'Hằng tháng', yearly: 'Hằng năm' }
    : { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

  // Controlled fields — initialised from the editing tracker when present.
  const [name, setName] = useState(editing?.name ?? '');
  const [icon, setIcon] = useState(editing?.icon ?? defaultIcon(type));
  const [color, setColor] = useState(editing?.color ?? COLORS[0]);
  const [unit, setUnit] = useState(editing?.unit ?? '');
  const [target, setTarget] = useState(
    editing?.targetValue != null ? String(editing.targetValue) : '',
  );
  const [accum, setAccum] = useState<Accumulation>(editing?.accumulation ?? 'sum');
  const [dir, setDir] = useState<HabitDirection>(editing?.direction ?? 'good');
  const [period, setPeriod] = useState<Period>(editing?.period ?? 'daily');
  const [deadline, setDeadline] = useState(editing?.deadline ?? '');

  // `useTracker` resolves after first render (async query), so the useState
  // initialisers can't see the editing tracker. Hydrate fields once it arrives.
  const hydrated = useRef(false);
  useEffect(() => {
    if (!editing || hydrated.current) return;
    hydrated.current = true;
    setName(editing.name);
    setIcon(editing.icon);
    setColor(editing.color);
    setUnit(editing.unit ?? '');
    setTarget(editing.targetValue != null ? String(editing.targetValue) : '');
    setAccum(editing.accumulation ?? 'sum');
    setDir(editing.direction ?? 'good');
    setPeriod(editing.period ?? 'daily');
    setDeadline(editing.deadline ?? '');
  }, [editing]);

  const icons = ICONSET[type] ?? ICONSET.target;

  const onSave = () => {
    const base = buildTracker({
      name: name.trim() || t(`type.${type}`),
      type,
      icon,
      color,
      unit: unit.trim() || null,
      targetValue: target ? Number(target) : null,
      accumulation: type === 'target' ? accum : undefined,
      period: type === 'average' || type === 'habit' ? period : undefined,
    });
    const tracker: Tracker = {
      ...base,
      // Preserve identity & origin date when editing.
      id: editing?.id ?? base.id,
      createdAt: editing?.createdAt ?? base.createdAt,
      startDate: editing?.startDate ?? base.startDate,
      direction: type === 'target' || type === 'habit' ? dir : base.direction,
      deadline: deadline.trim() ? deadline.trim() : null,
    };
    save.mutate(tracker, { onSuccess: () => navigation.navigate('MainTabs') });
  };

  const onDelete = () => {
    if (!editing) return;
    del.mutate(editing.id, { onSuccess: () => navigation.navigate('MainTabs') });
  };

  return (
    <View className="flex-1 bg-bg">
      {/* appbar */}
      <View
        className="flex-row items-center gap-s3 bg-surface px-s4 pb-s3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          className="items-center justify-center rounded-md-k border border-line bg-surface active:opacity-80"
          style={{ width: 40, height: 40 }}
        >
          <Icons.Back size={22} color="#1b1e18" />
        </Pressable>
        <Typography className="flex-1 text-lg font-bold text-ink">
          {editing ? t('form.editTitle') : t('form.newTitle')}
        </Typography>
        <View
          className="flex-row items-center gap-s1 rounded-full px-3 py-1"
          style={{ backgroundColor: hexA(TYPE_COLOR[type], 0.14) }}
        >
          {(() => {
            const TypeIcon = TYPE_ICON[type];
            return <TypeIcon size={15} color={TYPE_COLOR[type]} strokeWidth={2.2} />;
          })()}
          <Typography className="text-sm font-bold" style={{ color: TYPE_COLOR[type] }}>
            {t(`type.${type}`)}
          </Typography>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        {/* name */}
        <View className="gap-s2">
          <FieldLabel>{t('form.name')}</FieldLabel>
          <FormInput value={name} onChangeText={setName} placeholder={t('form.namePh')} />
        </View>

        {/* icon picker */}
        <View className="gap-s2">
          <FieldLabel>{t('form.icon')}</FieldLabel>
          <View className="flex-row flex-wrap gap-s2">
            {icons.map(ic => {
              const sel = ic === icon;
              return (
                <Pressable
                  key={ic}
                  onPress={() => setIcon(ic)}
                  className={`items-center justify-center rounded-md-k border ${
                    sel ? 'border-brand bg-brand-weak' : 'border-line bg-surface'
                  }`}
                  style={{ width: 46, height: 46 }}
                >
                  <Typography style={{ fontSize: 22 }}>{ic}</Typography>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* color picker */}
        <View className="gap-s2">
          <FieldLabel>{t('form.color')}</FieldLabel>
          <View className="flex-row flex-wrap" style={{ gap: 10 }}>
            {COLORS.map(c => {
              const sel = c === color;
              return (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  className="rounded-full"
                  style={{
                    width: 36,
                    height: 36,
                    backgroundColor: c,
                    borderWidth: 2,
                    borderColor: sel ? '#1b1e18' : 'transparent',
                  }}
                />
              );
            })}
          </View>
        </View>

        {/* target-specific */}
        {type === 'target' ? (
          <>
            <View className="flex-row gap-s3">
              <View className="gap-s2" style={{ flex: 2 }}>
                <FieldLabel>{t('form.target')}</FieldLabel>
                <FormInput value={target} onChangeText={setTarget} placeholder="2000" keyboardType="decimal-pad" />
              </View>
              <View className="gap-s2" style={{ flex: 1 }}>
                <FieldLabel>{t('form.unit')}</FieldLabel>
                <FormInput value={unit} onChangeText={setUnit} placeholder={t('form.unitPh')} />
              </View>
            </View>
            <View className="gap-s2">
              <FieldLabel>{t('form.mode')}</FieldLabel>
              <Segmented<Accumulation>
                value={accum}
                onChange={setAccum}
                options={[
                  { value: 'sum', label: t('form.sum') },
                  { value: 'latest', label: t('form.latest') },
                ]}
              />
            </View>
            <View className="gap-s2">
              <FieldLabel>{t('form.direction')}</FieldLabel>
              <Segmented<HabitDirection>
                value={dir}
                onChange={setDir}
                options={[
                  { value: 'good', label: t('form.higher') },
                  { value: 'bad', label: t('form.lower') },
                ]}
              />
            </View>
            <View className="gap-s2">
              <FieldLabel>{t('form.deadline')}</FieldLabel>
              <FormInput value={deadline} onChangeText={setDeadline} placeholder="YYYY-MM-DD" />
            </View>
          </>
        ) : null}

        {/* average-specific */}
        {type === 'average' ? (
          <>
            <View className="flex-row gap-s3">
              <View className="gap-s2" style={{ flex: 2 }}>
                <FieldLabel>{`${t('form.target')} / ${t('form.period').toLowerCase()}`}</FieldLabel>
                <FormInput value={target} onChangeText={setTarget} placeholder="8" keyboardType="decimal-pad" />
              </View>
              <View className="gap-s2" style={{ flex: 1 }}>
                <FieldLabel>{t('form.unit')}</FieldLabel>
                <FormInput value={unit} onChangeText={setUnit} placeholder={t('form.unitPh')} />
              </View>
            </View>
            <View className="gap-s2">
              <FieldLabel>{t('form.period')}</FieldLabel>
              <Segmented<Period>
                value={period}
                onChange={setPeriod}
                options={[
                  { value: 'daily', label: periodLabels.daily },
                  { value: 'weekly', label: periodLabels.weekly },
                  { value: 'monthly', label: periodLabels.monthly },
                ]}
              />
            </View>
          </>
        ) : null}

        {/* habit-specific */}
        {type === 'habit' ? (
          <View className="gap-s2">
            <FieldLabel>{t('form.period')}</FieldLabel>
            <Segmented<Period>
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'daily', label: periodLabels.daily },
                { value: 'weekly', label: periodLabels.weekly },
                { value: 'monthly', label: periodLabels.monthly },
              ]}
            />
            <Typography className="text-xs text-ink-3">{t('today.summaryCap')}</Typography>
          </View>
        ) : null}

        {/* project-specific */}
        {type === 'project' ? (
          <View className="gap-s2">
            <FieldLabel>{t('form.deadline')}</FieldLabel>
            <FormInput value={deadline} onChangeText={setDeadline} placeholder="YYYY-MM-DD" />
            <Typography className="text-xs text-ink-3">{t('type.projectDesc')}</Typography>
          </View>
        ) : null}
      </ScrollView>

      {/* sticky footer */}
      <View
        className="flex-row gap-s3 border-t border-line bg-surface px-s5 pt-s4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        {editing ? (
          <Pressable
            onPress={onDelete}
            className="items-center justify-center rounded-md-k bg-pace-behind-weak active:opacity-80"
            style={{ height: 52, width: 52 }}
          >
            <Icons.Trash size={20} color="#e0564e" />
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => navigation.goBack()}
          className="flex-1 items-center justify-center rounded-md-k border border-line bg-surface active:opacity-80"
          style={{ height: 52 }}
        >
          <Typography className="text-base font-bold text-ink">{t('form.cancel')}</Typography>
        </Pressable>
        <Pressable
          onPress={onSave}
          disabled={save.isPending}
          className="flex-1 items-center justify-center rounded-md-k bg-brand active:opacity-90"
          style={{ height: 52, opacity: save.isPending ? 0.6 : 1 }}
        >
          <Typography className="text-base font-bold text-on-accent">{t('form.save')}</Typography>
        </Pressable>
      </View>
    </View>
  );
}
