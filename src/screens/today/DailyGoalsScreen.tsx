import { Pressable, ScrollView, View } from 'react-native';
import { Typography } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle } from 'react-native-svg';
import { useTrackers, useLogEntry, useEntriesForDate } from '@features/trackers/queries';
import { toISODate, weekdayOf } from '@utils/date';
import { Icons, PACE_COLOR, hexA, iconEmoji, colorHex } from '@features/trackers/icons';
import { KiteLogo } from '@features/trackers/components/KiteLogo';
import { CreateButton } from '@features/trackers/components/CreateButton';
import type { RootStackParamList } from '@navigation/types';
import type { Tracker, Entry } from '@features/trackers/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function isDueToday(t: Tracker, todayISO: string): boolean {
  if (t.type === 'habit' && t.repeatDays && t.repeatDays.length) {
    return t.repeatDays.includes(weekdayOf(todayISO));
  }
  return true;
}

/** A sensible quick-increment step for stepper trackers. */
function quickStep(t: Tracker): number {
  if (t.unit === '$') return 25;
  if (t.unit === 'kg') return 0.1;
  if (t.unit === 'steps') return 500;
  return 1;
}

/** Format a number: integers plain, otherwise max one decimal. */
function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const rounded = Number.isInteger(n) ? n : Math.round(n * 10) / 10;
  return rounded.toLocaleString();
}

/** Small circular progress ring (-90deg start). */
function Ring({
  fraction,
  color,
  size,
  strokeWidth,
}: {
  fraction: number;
  color: string;
  size: number;
  strokeWidth: number;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, fraction));
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: [{ rotate: '-90deg' }] }}
    >
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e6e8df" strokeWidth={strokeWidth} />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped)}
      />
    </Svg>
  );
}

type Row = {
  tracker: Tracker;
  done: boolean;
  todayLog: number;
};

function LogRow({
  row,
  today,
  onLog,
  onOpen,
}: {
  row: Row;
  today: string;
  onLog: (e: Entry) => void;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { tracker, done, todayLog } = row;
  const entryId = `${tracker.id}-${today}`;

  // Sub-line text per type.
  let subText: string;
  if (tracker.type === 'habit') {
    subText = `${tracker.period ?? 'daily'}`;
  } else if (tracker.type === 'average') {
    const target = tracker.targetValue ?? 0;
    const u = tracker.unit ? ` ${tracker.unit}` : '';
    subText = `${t('detail.target')} ${fmtNum(target)}${u}`;
  } else {
    const u = tracker.unit ? ` ${tracker.unit}` : '';
    subText = `${fmtNum(todayLog)}${u}`;
  }

  const setValue = (v: number) =>
    onLog({ id: entryId, trackerId: tracker.id, date: today, value: v, note: null });

  const renderControl = () => {
    if (tracker.type === 'habit') {
      return (
        <Pressable
          onPress={() => setValue(done ? 0 : 1)}
          className="items-center justify-center rounded-full"
          style={{
            width: 46,
            height: 46,
            borderWidth: 2.5,
            borderColor: done ? PACE_COLOR.on_track : '#d2d5c8',
            backgroundColor: done ? PACE_COLOR.on_track : '#ffffff',
          }}
        >
          <Icons.Check size={24} color={done ? '#ffffff' : 'transparent'} />
        </Pressable>
      );
    }
    if (tracker.type === 'project') {
      return <Icons.Chevron size={20} color={PACE_COLOR.none} />;
    }
    // target / average → stepper
    const step = quickStep(tracker);
    const unitLabel = tracker.unit ?? t('common.done');
    return (
      <View className="flex-row items-center gap-s2">
        <Pressable
          onPress={() => setValue(Math.max(0, todayLog - step))}
          className="items-center justify-center rounded-md-k border border-line bg-surface-2"
          style={{ width: 38, height: 38 }}
        >
          <Typography className="text-xl font-bold text-ink">−</Typography>
        </Pressable>
        <View className="items-center" style={{ minWidth: 46 }}>
          <Typography className="text-lg font-extrabold text-ink">{fmtNum(todayLog)}</Typography>
          <Typography className="text-ink-3 font-semibold" style={{ fontSize: 10 }} numberOfLines={1}>
            {unitLabel}
          </Typography>
        </View>
        <Pressable
          onPress={() => setValue(todayLog + step)}
          className="items-center justify-center rounded-md-k border border-line bg-surface-2"
          style={{ width: 38, height: 38 }}
        >
          <Typography className="text-xl font-bold text-ink">+</Typography>
        </Pressable>
      </View>
    );
  };

  return (
    <Pressable
      onPress={() => onOpen(tracker.id)}
      className={`flex-row items-center gap-s3 rounded-lg-k border p-s3 px-s4 shadow-sm ${
        done ? 'bg-pace-on-weak border-pace-on' : 'bg-surface border-line'
      }`}
    >
      <View
        className="items-center justify-center rounded-md-k"
        style={{ width: 38, height: 38, backgroundColor: hexA(tracker.color, 0.14) }}
      >
        <Typography style={{ fontSize: 19 }}>{iconEmoji(tracker.icon)}</Typography>
      </View>

      <View className="flex-1 min-w-0">
        <Typography
          numberOfLines={1}
          className={`text-lg font-bold text-ink ${done ? 'line-through' : ''}`}
        >
          {tracker.name}
        </Typography>
        <View className="flex-row items-center gap-s2" style={{ marginTop: 2 }}>
          <View
            className="rounded-full"
            style={{ width: 8, height: 8, backgroundColor: colorHex(tracker.color) }}
          />
          <Typography className="text-sm text-ink-2">{subText}</Typography>
        </View>
      </View>

      {renderControl()}
    </Pressable>
  );
}

export function DailyGoalsScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  const today = toISODate(new Date());

  const { data: trackers = [] } = useTrackers();
  const { data: todayEntries = [] } = useEntriesForDate(today);
  const log = useLogEntry();

  // Sum of today's logged value per tracker.
  const todayValue = new Map<string, number>();
  for (const e of todayEntries) {
    todayValue.set(e.trackerId, (todayValue.get(e.trackerId) ?? 0) + e.value);
  }

  const due = trackers.filter(tr => isDueToday(tr, today));
  const rows: Row[] = due.map(tracker => {
    const todayLog = todayValue.get(tracker.id) ?? 0;
    const done = tracker.type === 'project' ? false : todayLog > 0;
    return { tracker, done, todayLog };
  });

  const total = rows.length;
  const doneCount = rows.filter(r => r.done).length;
  const pending = rows.filter(r => !r.done);
  const completed = rows.filter(r => r.done);

  const hours = new Date().getHours();
  const greetKey =
    hours < 12 ? 'today.greetMorning' : hours < 18 ? 'today.greetAfternoon' : 'today.greetEvening';
  const dateStr = new Date()
    .toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    .toUpperCase();

  const onLog = (e: Entry) => log.mutate(e);
  const onOpen = (id: string) => nav.navigate('TrackerDetail', { trackerId: id });

  // ---- Empty state (no trackers at all) ----
  if (trackers.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        <View className="bg-surface px-s5 pb-s4" style={{ paddingTop: insets.top + 16 }}>
          <Typography className="text-sm font-bold text-brand-ink uppercase">{dateStr}</Typography>
          <Typography className="text-2xl font-extrabold text-ink" style={{ marginTop: 4 }}>
            {t(greetKey)}
          </Typography>
        </View>
        <View className="flex-1 items-center justify-center px-s6 gap-s3">
          <View style={{ marginBottom: 8 }}>
            <KiteLogo size={96} />
          </View>
          <Typography className="text-xl font-extrabold text-ink text-center">
            {t('today.empty')}
          </Typography>
          <Typography className="text-base text-ink-2 text-center" style={{ maxWidth: 250 }}>
            {t('today.emptyBody')}
          </Typography>
          <View className="mt-s3">
            <CreateButton label={t('list.create')} onPress={() => nav.navigate('TrackerTypePicker')} />
          </View>
        </View>
      </View>
    );
  }

  const allDone = total > 0 && doneCount === total;

  return (
    <View className="flex-1 bg-bg">
      {/* head */}
      <View className="bg-surface px-s5 pb-s4" style={{ paddingTop: insets.top + 16 }}>
        <Typography className="text-sm font-bold text-brand-ink uppercase">{dateStr}</Typography>
        <Typography className="text-2xl font-extrabold text-ink" style={{ marginTop: 4 }}>
          {t(greetKey)}
        </Typography>

        <View className="flex-row items-center gap-s4 rounded-lg-k bg-brand-weak p-s4" style={{ marginTop: 16 }}>
          <View className="items-center justify-center" style={{ width: 52, height: 52 }}>
            <Ring fraction={total ? doneCount / total : 0} color="#2e7d5b" size={52} strokeWidth={6} />
            <View className="absolute inset-0 items-center justify-center">
              <Typography className="font-extrabold text-brand-ink" style={{ fontSize: 14 }}>
                {`${doneCount}/${total}`}
              </Typography>
            </View>
          </View>
          <View className="flex-1">
            <Typography className="text-xl font-extrabold text-brand-ink">
              {t('today.summaryDone', { done: doneCount, total })}
            </Typography>
            <Typography className="text-sm text-brand-ink" style={{ opacity: 0.8 }}>
              {allDone ? t('today.allClear') : t('today.summaryCap')}
            </Typography>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {allDone ? (
          <View className="items-center px-s6 gap-s3 pt-12">
            <View className="mb-s2 h-24 w-24 items-center justify-center rounded-xl-k bg-brand-weak">
              <Typography className="text-[46px] leading-[60px]">🎉</Typography>
            </View>
            <Typography className="text-xl font-extrabold text-ink text-center">
              {t('today.allClear')}
            </Typography>
            <Typography className="text-base text-ink-2 text-center" style={{ maxWidth: 250 }}>
              {t('today.allClearBody')}
            </Typography>
          </View>
        ) : (
          <>
            <Typography className="text-xs font-bold uppercase text-ink-3 px-s5" style={{ paddingTop: 20, paddingBottom: 8 }}>
              {t('today.dueToday')}
            </Typography>
            <View className="px-s5 gap-s3">
              {pending.map(row => (
                <LogRow key={row.tracker.id} row={row} today={today} onLog={onLog} onOpen={onOpen} />
              ))}
            </View>
          </>
        )}

        {completed.length > 0 && !allDone ? (
          <>
            <Typography className="text-xs font-bold uppercase text-ink-3 px-s5" style={{ paddingTop: 20, paddingBottom: 8 }}>
              {t('today.completed')}
            </Typography>
            <View className="px-s5 gap-s3">
              {completed.map(row => (
                <LogRow key={row.tracker.id} row={row} today={today} onLog={onLog} onOpen={onOpen} />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
