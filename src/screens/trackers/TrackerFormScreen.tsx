import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackProps } from '@navigation/types'
import {
  useTracker,
  useSaveTracker,
  useDeleteTracker
} from '@features/trackers/queries'
import { buildTracker } from '@features/trackers/factory'
import { Icons, TYPE_ICON, TYPE_COLOR, hexA } from '@features/trackers/icons'
import {
  DateField,
  FieldLabel,
  FormInput,
  Segmented,
  SelectField,
  TimeField,
  Toggle,
  useAlert,
  WeekdayPicker
} from '@components/ui'
import { useAppStore } from '@store/useAppStore'
import { toISODate } from '@utils/date'
import type {
  Accumulation,
  HabitDirection,
  Period,
  Routine,
  Tracker
} from '@features/trackers/types'

/** Per-type emoji set (mirrors ICONSET in data.js). */
const ICONSET: Record<string, string[]> = {
  habit: ['🧘', '🏋️', '📖', '🚭', '💊', '🦷', '🛏️', '🙏'],
  target: ['🎯', '📚', '💰', '⚖️', '🏃', '✍️', '🎸', '📈'],
  average: ['💧', '😴', '🚶', '🥗', '☕', '📱', '💵', '🔥'],
  project: ['🚀', '🧩', '🏗️', '🎨', '🎬', '🏡', '💼', '🎓']
}

/** Tracker color palette (mirrors COLORS in data.js). */
const COLORS = [
  '#2e7d5b',
  '#3d7dd8',
  '#e0564e',
  '#d98b2b',
  '#8b5cf6',
  '#0d9488',
  '#e0457a',
  '#6b7280'
]

function defaultIcon(type: string): string {
  return (
    (
      { habit: '🧘', target: '🎯', average: '💧', project: '🚀' } as Record<
        string,
        string
      >
    )[type] ?? '🎯'
  )
}

export function TrackerFormScreen({
  route,
  navigation
}: RootStackProps<'TrackerForm'>) {
  const { type, trackerId } = route.params
  const { t } = useTranslation()
  const alert = useAlert()
  const insets = useSafeAreaInsets()
  const save = useSaveTracker()
  const del = useDeleteTracker()
  const language = useAppStore((s) => s.language)
  const { data: editing } = useTracker(trackerId ?? '')

  // The design's PERIOD_LABEL words. No dedicated i18n keys exist in the
  // handoff key list, so localise EN/VI inline from data.js PERIOD_LABEL.
  const isVi = (language ?? 'en') === 'vi'
  const periodLabels: Record<Period, string> = isVi
    ? {
        daily: 'Hằng ngày',
        weekly: 'Hằng tuần',
        monthly: 'Hằng tháng',
        yearly: 'Hằng năm'
      }
    : { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }

  // Controlled fields — initialised from the editing tracker when present.
  const [name, setName] = useState(editing?.name ?? '')
  const [icon, setIcon] = useState(editing?.icon ?? defaultIcon(type))
  const [color, setColor] = useState(editing?.color ?? COLORS[0])
  const [unit, setUnit] = useState(editing?.unit ?? '')
  const [target, setTarget] = useState(
    editing?.targetValue != null ? String(editing.targetValue) : ''
  )
  const [accum, setAccum] = useState<Accumulation>(
    editing?.accumulation ?? 'sum'
  )
  const [dir, setDir] = useState<HabitDirection>(editing?.direction ?? 'good')
  const [period, setPeriod] = useState<Period>(editing?.period ?? 'daily')
  const [deadline, setDeadline] = useState(editing?.deadline ?? '')
  // Habit-specific fields (Strides-style schedule + reminders).
  const [startDate, setStartDate] = useState(
    editing?.startDate ?? toISODate(new Date())
  )
  const [repeatDays, setRepeatDays] = useState<number[]>(
    editing?.repeatDays ?? [0, 1, 2, 3, 4, 5, 6]
  )
  const [routine, setRoutine] = useState<Routine>(editing?.routine ?? 'any')
  const [reminderOn, setReminderOn] = useState(!!editing?.reminderTime)
  const [reminderTime, setReminderTime] = useState(
    editing?.reminderTime ?? '18:00'
  )

  // `useTracker` resolves after first render (async query), so the useState
  // initialisers can't see the editing tracker. Hydrate fields once it arrives.
  const hydrated = useRef(false)
  useEffect(() => {
    if (!editing || hydrated.current) return
    hydrated.current = true
    setName(editing.name)
    setIcon(editing.icon)
    setColor(editing.color)
    setUnit(editing.unit ?? '')
    setTarget(editing.targetValue != null ? String(editing.targetValue) : '')
    setAccum(editing.accumulation ?? 'sum')
    setDir(editing.direction ?? 'good')
    setPeriod(editing.period ?? 'daily')
    setDeadline(editing.deadline ?? '')
    setStartDate(editing.startDate)
    setRepeatDays(editing.repeatDays ?? [0, 1, 2, 3, 4, 5, 6])
    setRoutine(editing.routine ?? 'any')
    setReminderOn(!!editing.reminderTime)
    setReminderTime(editing.reminderTime ?? '18:00')
  }, [editing])

  const icons = ICONSET[type] ?? ICONSET.target

  const onSave = () => {
    const isHabit = type === 'habit'

    // Habit-only required fields: a goal count > 0 and at least one Due day.
    if (isHabit) {
      const goalNum = Number(target)
      const problems: string[] = []
      if (!target.trim() || !Number.isFinite(goalNum) || goalNum <= 0)
        problems.push(t('form.errGoal'))
      if (repeatDays.length === 0) problems.push(t('form.errDue'))
      if (problems.length) {
        alert({
          title: t('form.errTitle'),
          message: problems.join('\n'),
          variant: 'danger'
        })
        return
      }
    }

    const base = buildTracker({
      name: name.trim() || t(`type.${type}`),
      type,
      icon,
      color,
      unit: unit.trim() || null,
      targetValue: target ? Number(target) : null,
      accumulation: type === 'target' ? accum : undefined,
      period: type === 'average' || isHabit ? period : undefined,
      startDate: isHabit ? startDate.trim() || undefined : undefined,
      repeatDays: isHabit ? repeatDays : undefined,
      routine: isHabit ? routine : undefined,
      reminderTime: isHabit && reminderOn ? reminderTime.trim() || null : null
    })
    const tracker: Tracker = {
      ...base,
      // Preserve identity & origin date when editing.
      id: editing?.id ?? base.id,
      createdAt: editing?.createdAt ?? base.createdAt,
      startDate: isHabit
        ? base.startDate
        : editing?.startDate ?? base.startDate,
      direction: type === 'target' || isHabit ? dir : base.direction,
      deadline: deadline.trim() ? deadline.trim() : null
    }
    save.mutate(tracker, { onSuccess: () => navigation.navigate('MainTabs') })
  }

  const onDelete = () => {
    if (!editing) return
    del.mutate(editing.id, { onSuccess: () => navigation.navigate('MainTabs') })
  }

  return (
    <View className='flex-1 bg-bg'>
      {/* appbar */}
      <View
        className='flex-row items-center gap-s3 bg-surface px-s4 pb-s3'
        style={{ paddingTop: insets.top + 8 }} // safe-area top, runtime
      >
        <Pressable
          onPress={() => navigation.goBack()}
          className='h-10 w-10 items-center justify-center rounded-md-k border border-line bg-surface active:opacity-80'
        >
          <Icons.Back size={22} color='#1b1e18' />
        </Pressable>
        <Typography className='flex-1 text-lg font-bold text-ink'>
          {editing ? t('form.editTitle') : t('form.newTitle')}
        </Typography>
        <View
          className='flex-row items-center gap-s1 rounded-full px-3 py-1'
          style={{ backgroundColor: hexA(TYPE_COLOR[type], 0.14) }} // per-type tint, runtime
        >
          {(() => {
            const TypeIcon = TYPE_ICON[type]
            return (
              <TypeIcon size={15} color={TYPE_COLOR[type]} strokeWidth={2.2} />
            )
          })()}
          {/* per-type color is runtime-dynamic → inline style */}
          <Typography
            className='text-sm font-bold'
            style={{ color: TYPE_COLOR[type] }}
          >
            {t(`type.${type}`)}
          </Typography>
        </View>
      </View>

      <ScrollView contentContainerClassName='p-s5 gap-s5'>
        {/* name */}
        <View className='gap-s2'>
          <FieldLabel>{t('form.name')}</FieldLabel>
          <FormInput
            value={name}
            onChangeText={setName}
            placeholder={t('form.namePh')}
          />
        </View>

        {/* icon picker */}
        <View className='gap-s2'>
          <FieldLabel>{t('form.icon')}</FieldLabel>
          <View className='flex-row flex-wrap gap-s2'>
            {icons.map((ic) => {
              const sel = ic === icon
              return (
                <Pressable
                  key={ic}
                  onPress={() => setIcon(ic)}
                  className={`h-[46px] w-[46px] items-center justify-center rounded-md-k border ${
                    sel
                      ? 'border-brand bg-brand-weak'
                      : 'border-line bg-surface'
                  }`}
                >
                  <Typography className='text-[22px]'>{ic}</Typography>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* color picker */}
        <View className='gap-s2'>
          <FieldLabel>{t('form.color')}</FieldLabel>
          <View className='flex-row flex-wrap gap-[10px]'>
            {COLORS.map((c) => {
              const sel = c === color
              return (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  className={`h-9 w-9 rounded-full border-2 ${
                    sel ? 'border-ink' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }} // palette swatch color, runtime
                />
              )
            })}
          </View>
        </View>

        {/* target-specific */}
        {type === 'target' ? (
          <>
            <View className='flex-row gap-s3'>
              <View className='flex-[2] gap-s2'>
                <FieldLabel>{t('form.target')}</FieldLabel>
                <FormInput
                  value={target}
                  onChangeText={setTarget}
                  placeholder='2000'
                  keyboardType='decimal-pad'
                />
              </View>
              <View className='flex-1 gap-s2'>
                <FieldLabel>{t('form.unit')}</FieldLabel>
                <FormInput
                  value={unit}
                  onChangeText={setUnit}
                  placeholder={t('form.unitPh')}
                />
              </View>
            </View>
            <View className='gap-s2'>
              <FieldLabel>{t('form.mode')}</FieldLabel>
              <Segmented<Accumulation>
                value={accum}
                onChange={setAccum}
                options={[
                  { value: 'sum', label: t('form.sum') },
                  { value: 'latest', label: t('form.latest') }
                ]}
              />
            </View>
            <View className='gap-s2'>
              <FieldLabel>{t('form.direction')}</FieldLabel>
              <Segmented<HabitDirection>
                value={dir}
                onChange={setDir}
                options={[
                  { value: 'good', label: t('form.higher') },
                  { value: 'bad', label: t('form.lower') }
                ]}
              />
            </View>
            <View className='gap-s2'>
              <FieldLabel>{t('form.deadline')}</FieldLabel>
              <DateField value={deadline} onChange={setDeadline} />
            </View>
          </>
        ) : null}

        {/* average-specific */}
        {type === 'average' ? (
          <>
            <View className='flex-row gap-s3'>
              <View className='flex-[2] gap-s2'>
                <FieldLabel>{`${t('form.target')} / ${t(
                  'form.period'
                ).toLowerCase()}`}</FieldLabel>
                <FormInput
                  value={target}
                  onChangeText={setTarget}
                  placeholder='8'
                  keyboardType='decimal-pad'
                />
              </View>
              <View className='flex-1 gap-s2'>
                <FieldLabel>{t('form.unit')}</FieldLabel>
                <FormInput
                  value={unit}
                  onChangeText={setUnit}
                  placeholder={t('form.unitPh')}
                />
              </View>
            </View>
            <View className='gap-s2'>
              <FieldLabel>{t('form.period')}</FieldLabel>
              <Segmented<Period>
                value={period}
                onChange={setPeriod}
                options={[
                  { value: 'daily', label: periodLabels.daily },
                  { value: 'weekly', label: periodLabels.weekly },
                  { value: 'monthly', label: periodLabels.monthly }
                ]}
              />
            </View>
          </>
        ) : null}

        {/* habit-specific */}
        {type === 'habit' ? (
          <>
            {/* goal + time period */}
            <View className='flex-row gap-s3'>
              <View className='flex-1 gap-s2'>
                <FieldLabel>{t('form.goal')}</FieldLabel>
                <FormInput
                  value={target}
                  onChangeText={setTarget}
                  placeholder={t('form.goalPh')}
                  keyboardType='decimal-pad'
                />
              </View>
              <View className='flex-[2] gap-s2'>
                <FieldLabel>{t('form.timePeriod')}</FieldLabel>
                <SelectField<Period>
                  label={t('form.timePeriod')}
                  value={period}
                  onChange={setPeriod}
                  options={[
                    { value: 'daily', label: periodLabels.daily },
                    { value: 'weekly', label: periodLabels.weekly },
                    { value: 'monthly', label: periodLabels.monthly },
                    { value: 'yearly', label: periodLabels.yearly }
                  ]}
                />
              </View>
            </View>

            {/* start date */}
            <View className='gap-s2'>
              <FieldLabel>{t('form.startDate')}</FieldLabel>
              <DateField value={startDate} onChange={setStartDate} />
            </View>

            {/* due / repeat days */}
            <View className='gap-s2'>
              <FieldLabel>{t('form.due')}</FieldLabel>
              <WeekdayPicker
                value={repeatDays}
                onChange={setRepeatDays}
                labels={{
                  mon: t('form.wd.mon'),
                  tue: t('form.wd.tue'),
                  wed: t('form.wd.wed'),
                  thu: t('form.wd.thu'),
                  fri: t('form.wd.fri'),
                  sat: t('form.wd.sat'),
                  sun: t('form.wd.sun')
                }}
              />
            </View>

            {/* routine */}
            <View className='gap-s2'>
              <FieldLabel>{t('form.routine')}</FieldLabel>
              <SelectField<Routine>
                label={t('form.routine')}
                value={routine}
                onChange={setRoutine}
                options={[
                  { value: 'any', label: t('form.routineAny') },
                  { value: 'morning', label: t('form.routineMorning') },
                  { value: 'afternoon', label: t('form.routineAfternoon') },
                  { value: 'evening', label: t('form.routineEvening') }
                ]}
              />
            </View>

            {/* reminders */}
            <View className='gap-s2'>
              <View className='flex-row items-center justify-between'>
                <View className='flex-row items-center gap-s2'>
                  <Icons.Bell size={18} color={TYPE_COLOR.habit} />
                  <FieldLabel>{t('form.reminders')}</FieldLabel>
                </View>
                <Toggle value={reminderOn} onChange={setReminderOn} />
              </View>
              {reminderOn ? (
                <View className='gap-s2'>
                  <FieldLabel>{t('form.alert')}</FieldLabel>
                  <TimeField
                    value={reminderTime}
                    onChange={setReminderTime}
                    placeholder='18:00'
                  />
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {/* project-specific */}
        {type === 'project' ? (
          <View className='gap-s2'>
            <FieldLabel>{t('form.deadline')}</FieldLabel>
            <DateField value={deadline} onChange={setDeadline} />
            <Typography className='text-xs text-ink-3'>
              {t('type.projectDesc')}
            </Typography>
          </View>
        ) : null}
      </ScrollView>

      {/* sticky footer */}
      <View
        className='flex-row gap-s3 border-t border-line bg-surface px-s5 pt-s4'
        style={{ paddingBottom: insets.bottom + 16 }} // safe-area bottom, runtime
      >
        {editing ? (
          <Pressable
            onPress={onDelete}
            className='h-[52px] w-[52px] items-center justify-center rounded-md-k bg-pace-behind-weak active:opacity-80'
          >
            <Icons.Trash size={20} color='#e0564e' />
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => navigation.goBack()}
          className='h-[52px] flex-1 items-center justify-center rounded-md-k border border-line bg-surface active:opacity-80'
        >
          <Typography className='text-base font-bold text-ink'>
            {t('form.cancel')}
          </Typography>
        </Pressable>
        <Pressable
          onPress={onSave}
          disabled={save.isPending}
          className={`h-[52px] flex-1 items-center justify-center rounded-md-k bg-brand active:opacity-90 ${
            save.isPending ? 'opacity-60' : 'opacity-100'
          }`}
        >
          <Typography className='text-base font-bold text-on-accent'>
            {t('form.save')}
          </Typography>
        </Pressable>
      </View>
    </View>
  )
}
