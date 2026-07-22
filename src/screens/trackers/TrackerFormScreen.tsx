import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Typography } from 'heroui-native'
import { Ellipsis } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackProps } from '@navigation/types'
import {
  useTracker,
  useSaveTracker,
  useDeleteTracker
} from '@features/trackers/queries'
import { buildTracker } from '@features/trackers/factory'
import {
  Icons,
  TYPE_ICON,
  TYPE_COLOR,
  hexA,
  iconEmoji,
  iconKey,
  colorHex
} from '@features/trackers/icons'
import { findTemplate, templateDirection, type Template } from '@features/trackers/templates'
import { findQuickStart } from '@features/trackers/quickStarts'
import { ICONSET, defaultIcon } from '@features/trackers/iconSets'
import { IconPickerModal } from '@features/trackers/components/IconPickerModal'
import { ColorPickerModal } from '@features/trackers/components/ColorPickerModal'
import { useThemeColors } from '@hooks/useThemeColors'
import {
  DateField,
  FieldLabel,
  FieldLabelRow,
  FormInput,
  GoalDirectionField,
  InfoTooltip,
  ReminderField,
  Segmented,
  SelectField,
  Toggle,
  useAlert,
  WeekdayPicker
} from '@components/ui'
import { DEFAULT_REMINDER } from '@features/trackers/reminders'
import { useAppStore } from '@store/useAppStore'
import { toISODate, isoAddMonths } from '@utils/date'
import type {
  Accumulation,
  AverageWindow,
  DoneRule,
  HabitDirection,
  Period,
  ProgressBasis,
  Tracker
} from '@features/trackers/types'

/** Tracker color palette — 20 swatches spanning the hue wheel + neutrals. */
const COLORS = [
  '#2e7d5b',
  '#2456b5',
  '#e0564e',
  '#d98b2b',
  '#8b5cf6',
  '#0d9488',
  '#e0457a',
  '#6366f1',
  '#6b7280',
  '#16a34a',
  '#0ea5e9',
  '#06b6d4',
  '#84cc16',
  '#eab308',
  '#f59e0b',
  '#f97316',
  '#dc2626',
  '#d946ef',
  '#a855f7',
  '#b45309'
]

/** Rolling-average preset windows (days) — Strides-style quick picks. */
const ROLLING_PRESETS = [7, 14, 21]

export function TrackerFormScreen({
  route,
  navigation
}: RootStackProps<'TrackerForm'>) {
  const { type, trackerId, templateKey, quickStartKey } = route.params
  const { t } = useTranslation()
  const alert = useAlert()
  const c = useThemeColors()
  const insets = useSafeAreaInsets()
  const save = useSaveTracker()
  const del = useDeleteTracker()
  const language = useAppStore((s) => s.language)
  const { data: editing } = useTracker(trackerId ?? '')

  // Prefill source (create mode): a Template, or a QuickStart (structurally a
  // subset of Template — same required key/type/icon/color, fewer optionals).
  // Lookup is synchronous, so it seeds the useState initialisers directly.
  const template: Template | undefined = templateKey
    ? findTemplate(templateKey)
    : quickStartKey
    ? findQuickStart(quickStartKey)
    : undefined

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
  const [name, setName] = useState(
    editing?.name ??
      (quickStartKey
        ? t(`quickStart.items.${quickStartKey}`)
        : template
        ? t(`template.items.${template.key}`)
        : '')
  )
  // Hold the icon as its ASCII keyword (e.g. "lotus"). Stored values are
  // keywords; legacy/raw-emoji values are normalised via iconKey(). Keywords
  // are what we persist — op-sqlite corrupts raw emoji on write.
  const [icon, setIcon] = useState(
    editing?.icon ? iconKey(editing.icon) : template?.icon ?? defaultIcon(type)
  )
  const [color, setColor] = useState(
    editing?.color ?? (template ? colorHex(template.color) : COLORS[0])
  )
  const [unit, setUnit] = useState(editing?.unit ?? template?.unit ?? '')
  const [target, setTarget] = useState(
    editing?.targetValue != null
      ? String(editing.targetValue)
      : template?.targetValue != null
      ? String(template.targetValue)
      : ''
  )
  const [startValue, setStartValue] = useState(
    editing?.startValue != null ? String(editing.startValue) : ''
  )
  const [accum, setAccum] = useState<Accumulation>(
    editing?.accumulation ?? template?.accumulation ?? 'sum'
  )
  const [dir, setDir] = useState<HabitDirection>(
    editing?.direction ?? templateDirection(template)
  )
  const [period, setPeriod] = useState<Period>(
    editing?.period ?? template?.period ?? 'daily'
  )
  const [deadline, setDeadline] = useState(
    editing?.deadline ??
      (template?.deadlineMonths != null
        ? isoAddMonths(toISODate(new Date()), template.deadlineMonths)
        : '')
  )
  // Habit-specific fields (Strides-style schedule + reminders).
  const [startDate, setStartDate] = useState(
    editing?.startDate ?? toISODate(new Date())
  )
  const [repeatDays, setRepeatDays] = useState<number[]>(
    editing?.repeatDays ?? template?.repeatDays ?? [0, 1, 2, 3, 4, 5, 6]
  )
  // Create defaults to one active 18:00 reminder; edit hydrates from the row.
  const [reminderOn, setReminderOn] = useState(
    editing ? editing.reminderTimes.length > 0 : true
  )
  const [reminderTimes, setReminderTimes] = useState<string[]>(
    editing && editing.reminderTimes.length > 0
      ? editing.reminderTimes
      : template?.reminderTimes?.length
      ? template.reminderTimes
      : [DEFAULT_REMINDER]
  )
  // Average-only Strides options.
  const [averageWindow, setAverageWindow] = useState<AverageWindow>(
    editing?.averageWindow ?? template?.averageWindow ?? 'since_start'
  )
  const [rollingDaysStr, setRollingDaysStr] = useState(
    editing?.rollingDays != null
      ? String(editing.rollingDays)
      : template?.rollingDays != null
      ? String(template.rollingDays)
      : '7'
  )
  const [doneRule, setDoneRule] = useState<DoneRule>(
    editing?.doneRule ?? 'when_logged'
  )
  const [progressBasis, setProgressBasis] = useState<ProgressBasis>(
    editing?.progressBasis ?? 'overall_avg'
  )

  // `useTracker` resolves after first render (async query), so the useState
  // initialisers can't see the editing tracker. Hydrate fields once it arrives.
  const hydrated = useRef(false)
  useEffect(() => {
    if (!editing || hydrated.current) return
    hydrated.current = true
    setName(editing.name)
    setIcon(iconKey(editing.icon))
    setColor(editing.color)
    setUnit(editing.unit ?? '')
    setTarget(editing.targetValue != null ? String(editing.targetValue) : '')
    setStartValue(editing.startValue != null ? String(editing.startValue) : '')
    setAccum(editing.accumulation ?? 'sum')
    setDir(editing.direction ?? 'good')
    setPeriod(editing.period ?? 'daily')
    setDeadline(editing.deadline ?? '')
    setStartDate(editing.startDate)
    setRepeatDays(editing.repeatDays ?? [0, 1, 2, 3, 4, 5, 6])
    setReminderOn(editing.reminderTimes.length > 0)
    setReminderTimes(
      editing.reminderTimes.length > 0
        ? editing.reminderTimes
        : [DEFAULT_REMINDER]
    )
    setAverageWindow(editing.averageWindow ?? 'since_start')
    setRollingDaysStr(
      editing.rollingDays != null ? String(editing.rollingDays) : '7'
    )
    setDoneRule(editing.doneRule ?? 'when_logged')
    setProgressBasis(editing.progressBasis ?? 'overall_avg')
  }, [editing])

  const icons = ICONSET[type] ?? ICONSET.target
  // Icon picker: a single inline row (6 tiles + a "More" tile); the full set
  // opens in a sheet. Keep the selected icon visible inline even when deep in
  // the list.
  const [iconModal, setIconModal] = useState(false)
  const INLINE_ICONS = 6
  const showMoreIcons = icons.length > INLINE_ICONS
  const inlineIcons = !showMoreIcons
    ? icons
    : icons.slice(0, INLINE_ICONS).includes(icon)
    ? icons.slice(0, INLINE_ICONS)
    : [icon, ...icons.slice(0, INLINE_ICONS - 1)]

  // Color picker: same single-row-plus-More pattern (7 swatches + a "More"
  // swatch), full palette opens in a sheet. Keep the selected color visible.
  const [colorModal, setColorModal] = useState(false)
  const INLINE_COLORS = 7
  const showMoreColors = COLORS.length > INLINE_COLORS
  const inlineColors = !showMoreColors
    ? COLORS
    : COLORS.slice(0, INLINE_COLORS).includes(color)
    ? COLORS.slice(0, INLINE_COLORS)
    : [color, ...COLORS.slice(0, INLINE_COLORS - 1)]

  const onSave = () => {
    const isHabit = type === 'habit'
    const isTarget = type === 'target'
    const isAverage = type === 'average'

    // Required fields: habit/target/average need a goal > 0 — except a bad
    // habit, whose limit may be 0 or left empty (0 = full abstinence); habit
    // & average also need at least one Due day.
    if (isHabit || isTarget || isAverage) {
      const goalNum = Number(target)
      const isBadHabit = isHabit && dir === 'bad'
      const problems: string[] = []
      if (isBadHabit) {
        if (target.trim() && (!Number.isFinite(goalNum) || goalNum < 0))
          problems.push(t('form.errGoal'))
      } else if (!target.trim() || !Number.isFinite(goalNum) || goalNum <= 0) {
        problems.push(t('form.errGoal'))
      }
      if ((isHabit || isAverage) && repeatDays.length === 0)
        problems.push(t('form.errDue'))
      if (problems.length) {
        alert({
          title: t('form.errTitle'),
          message: problems.join('\n'),
          variant: 'danger'
        })
        return
      }
    }

    // Rolling window: parse the free-text days, falling back to 7.
    const parsedRolling = Number(rollingDaysStr)
    const rollingDaysNum =
      Number.isFinite(parsedRolling) && parsedRolling >= 1
        ? Math.round(parsedRolling)
        : 7

    const base = buildTracker({
      name: name.trim() || t(`type.${type}`),
      type,
      icon,
      color,
      unit: isAverage ? null : unit.trim() || null,
      targetValue: target ? Number(target) : null,
      startValue: isTarget ? Number(startValue) || 0 : undefined,
      accumulation: isTarget ? accum : undefined,
      period: isAverage || isHabit ? period : undefined,
      startDate:
        isHabit || isTarget || isAverage
          ? startDate.trim() || undefined
          : undefined,
      repeatDays: isHabit || isTarget || isAverage ? repeatDays : undefined,
      reminderTimes:
        (isHabit || isTarget || isAverage) && reminderOn ? reminderTimes : [],
      averageWindow: isAverage ? averageWindow : undefined,
      rollingDays:
        isAverage && averageWindow === 'rolling' ? rollingDaysNum : undefined,
      doneRule: isAverage ? doneRule : undefined,
      progressBasis: isAverage ? progressBasis : undefined
    })
    const tracker: Tracker = {
      ...base,
      // Preserve identity, origin date & goal note when editing.
      id: editing?.id ?? base.id,
      createdAt: editing?.createdAt ?? base.createdAt,
      goalNote: editing?.goalNote ?? base.goalNote,
      startDate:
        isHabit || isTarget || isAverage
          ? base.startDate
          : editing?.startDate ?? base.startDate,
      direction:
        type === 'target' || type === 'average' || isHabit
          ? dir
          : base.direction,
      deadline: deadline.trim() ? deadline.trim() : null
    }
    save.mutate(tracker, { onSuccess: () => navigation.navigate('MainTabs') })
  }

  const onDelete = () => {
    if (!editing) return
    alert({
      title: t('detail.deleteConfirmTitle'),
      message: t('detail.deleteConfirmMsg'),
      variant: 'danger',
      cancelLabel: t('form.cancel'),
      confirmLabel: t('form.delete'),
      onConfirm: () =>
        del.mutate(editing.id, {
          onSuccess: () => navigation.navigate('MainTabs')
        })
    })
  }

  return (
    <View className='flex-1 bg-bg'>
      {/* appbar */}
      <View
        className='flex-row items-center gap-s3 bg-surface px-s4 pb-s3'
        // safe-area, runtime
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          className='h-10 w-10 items-center justify-center rounded-md-k border border-line bg-surface active:opacity-80'
        >
          <Icons.Back size={22} color={c.ink} />
        </Pressable>
        <Typography className='flex-1 text-lg font-bold text-ink'>
          {editing ? t('form.editTitle') : t('form.newTitle')}
        </Typography>
        <View
          className='flex-row items-center gap-s1 rounded-full px-3 py-1'
          // runtime: per-type tint via hexA
          style={{ backgroundColor: hexA(TYPE_COLOR[type], 0.14) }}
        >
          {(() => {
            const TypeIcon = TYPE_ICON[type]
            return (
              <TypeIcon size={15} color={TYPE_COLOR[type]} strokeWidth={2.2} />
            )
          })()}
          <Typography
            className='text-sm font-bold'
            // runtime: per-type color
            style={{ color: TYPE_COLOR[type] }}
          >
            {t(`type.${type}`)}
          </Typography>
        </View>
      </View>

      <ScrollView contentContainerClassName='p-s4 gap-s5'>
        {/* name */}
        <View className='gap-s2'>
          <FieldLabel>{t('form.name')}</FieldLabel>
          <FormInput
            value={name}
            onChangeText={setName}
            placeholder={t(`form.namePh.${type}`)}
          />
        </View>

        {/* icon picker */}
        <View className='gap-s2'>
          <FieldLabel>{t('form.icon')}</FieldLabel>
          <View className='flex-row flex-wrap gap-s2'>
            {inlineIcons.map((ic) => {
              const sel = ic === icon
              return (
                <Pressable
                  key={ic}
                  onPress={() => setIcon(ic)}
                  className={`h-[46px] w-[46px] items-center justify-center rounded-full border ${
                    sel
                      ? 'border-brand bg-brand-weak'
                      : 'border-line bg-surface'
                  }`}
                >
                  <Typography className='text-[22px]'>
                    {iconEmoji(ic)}
                  </Typography>
                </Pressable>
              )
            })}
            {showMoreIcons ? (
              <Pressable
                onPress={() => setIconModal(true)}
                className='h-[46px] w-[46px] items-center justify-center rounded-full border border-line bg-surface active:opacity-80'
              >
                <Ellipsis size={22} color={c.ink2} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* color picker */}
        <View className='gap-s2'>
          <FieldLabel>{t('form.color')}</FieldLabel>
          <View className='flex-row flex-wrap items-center gap-[10px]'>
            {inlineColors.map((swatch) => {
              const sel = swatch === color
              return (
                <Pressable
                  key={swatch}
                  onPress={() => setColor(swatch)}
                  className={`h-9 w-9 items-center justify-center rounded-full border-2 ${
                    sel ? 'border-ink' : 'border-transparent'
                  }`}
                >
                  {/* When selected: outer black ring → white 1px ring → swatch
                      (border-ink → border-surface → color), all touching. */}
                  <View
                    className={`h-full w-full rounded-full ${
                      sel ? 'border border-surface' : ''
                    }`}
                    // runtime: selected palette color
                    style={{ backgroundColor: swatch }}
                  />
                </Pressable>
              )
            })}
            {showMoreColors ? (
              <Pressable
                onPress={() => setColorModal(true)}
                className='h-9 w-9 items-center justify-center rounded-full border border-line bg-surface active:opacity-80'
              >
                <Ellipsis size={20} color={c.ink2} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* target-specific */}
        {type === 'target' ? (
          <>
            <View className='flex-row gap-s3'>
              <View className='flex-1 gap-s2'>
                <FieldLabel>{t('form.startValueLabel')}</FieldLabel>
                <FormInput
                  value={startValue}
                  onChangeText={setStartValue}
                  placeholder={t('form.startValuePh')}
                  keyboardType='decimal-pad'
                />
              </View>
              <View className='flex-1 gap-s2'>
                <FieldLabel>{t('form.goalValue')}</FieldLabel>
                <FormInput
                  value={target}
                  onChangeText={setTarget}
                  placeholder={t('form.goalValuePh')}
                  keyboardType='decimal-pad'
                />
              </View>
            </View>
            <View className='gap-s2'>
              <FieldLabel>{t('form.unit')}</FieldLabel>
              <FormInput
                value={unit}
                onChangeText={setUnit}
                placeholder={t('form.unitPh')}
              />
            </View>
            <View className='gap-s2'>
              <FieldLabelRow
                trailing={
                  <InfoTooltip
                    title={t('form.helpTitle')}
                    description={t('form.modeHelp')}
                  />
                }
              >
                {t('form.mode')}
              </FieldLabelRow>
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
              <FieldLabelRow
                trailing={
                  <InfoTooltip
                    title={t('form.helpTitle')}
                    description={t('form.directionHelp')}
                  />
                }
              >
                {t('form.direction')}
              </FieldLabelRow>
              <Segmented<HabitDirection>
                value={dir}
                onChange={setDir}
                options={[
                  { value: 'good', label: t('form.higher') },
                  { value: 'bad', label: t('form.lower') }
                ]}
              />
            </View>
            <View className='flex-row gap-s3'>
              <View className='flex-1 gap-s2'>
                <FieldLabel>{t('form.startDate')}</FieldLabel>
                <DateField value={startDate} onChange={setStartDate} />
              </View>
              <View className='flex-1 gap-s2'>
                <FieldLabel>{t('form.goalDate')}</FieldLabel>
                <DateField value={deadline} onChange={setDeadline} />
              </View>
            </View>
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
            {/* reminders */}
            <ReminderField
              enabled={reminderOn}
              onEnabledChange={setReminderOn}
              times={reminderTimes}
              onTimesChange={setReminderTimes}
              accentColor={TYPE_COLOR.target}
            />
          </>
        ) : null}

        {/* average-specific */}
        {type === 'average' ? (
          <>
            {/* goal (+ direction) + time period */}
            <View className='flex-row gap-s3'>
              <View className='flex-1 gap-s2'>
                <FieldLabelRow
                  trailing={
                    <InfoTooltip
                      title={t('form.helpTitle')}
                      description={t('form.avgDirectionHelp')}
                    />
                  }
                >
                  {t('form.avgGoal')}
                </FieldLabelRow>
                <GoalDirectionField
                  value={target}
                  direction={dir}
                  onChange={(v, d) => {
                    setTarget(v)
                    setDir(d)
                  }}
                />
              </View>
              <View className='flex-1 gap-s2'>
                <FieldLabel>{t('form.timePeriod')}</FieldLabel>
                <SelectField<Period>
                  label={t('form.timePeriod')}
                  value={period}
                  onChange={setPeriod}
                  options={[
                    { value: 'daily', label: periodLabels.daily },
                    { value: 'weekly', label: periodLabels.weekly },
                    { value: 'monthly', label: periodLabels.monthly }
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

            {/* reminders */}
            <ReminderField
              enabled={reminderOn}
              onEnabledChange={setReminderOn}
              times={reminderTimes}
              onTimesChange={setReminderTimes}
              accentColor={TYPE_COLOR.average}
            />

            {/* average window (Strides "Average") */}
            <View className='gap-s2'>
              <FieldLabelRow
                trailing={
                  <InfoTooltip
                    title={t('form.helpTitle')}
                    description={t('form.avgWindowHelp')}
                  />
                }
              >
                {t('form.avgWindow')}
              </FieldLabelRow>
              <Segmented<AverageWindow>
                value={averageWindow}
                onChange={setAverageWindow}
                options={[
                  { value: 'since_start', label: t('form.avgSinceStart') },
                  { value: 'rolling', label: t('form.avgRolling') }
                ]}
              />
              {averageWindow === 'rolling' ? (
                <View className='gap-s2'>
                  <FieldLabel>{t('form.avgRollingDays')}</FieldLabel>
                  <View className='flex-row items-center gap-s2'>
                    {ROLLING_PRESETS.map((d) => {
                      const sel = rollingDaysStr === String(d)
                      return (
                        <Pressable
                          key={d}
                          onPress={() => setRollingDaysStr(String(d))}
                          className={`h-[46px] w-[56px] items-center justify-center rounded-md-k border ${
                            sel
                              ? 'border-brand bg-brand-weak'
                              : 'border-line bg-surface'
                          }`}
                        >
                          <Typography
                            className={`text-base font-bold ${
                              sel ? 'text-brand' : 'text-ink-2'
                            }`}
                          >
                            {d}
                          </Typography>
                        </Pressable>
                      )
                    })}
                    <View className='flex-1'>
                      <FormInput
                        value={rollingDaysStr}
                        onChangeText={setRollingDaysStr}
                        placeholder={t('form.avgCustom')}
                        keyboardType='decimal-pad'
                      />
                    </View>
                  </View>
                </View>
              ) : null}
            </View>

            {/* move to done */}
            <View className='gap-s2'>
              <FieldLabelRow
                trailing={
                  <InfoTooltip
                    title={t('form.helpTitle')}
                    description={t('form.moveHelp')}
                  />
                }
              >
                {t('form.moveToDone')}
              </FieldLabelRow>
              <Segmented<DoneRule>
                value={doneRule}
                onChange={setDoneRule}
                options={[
                  { value: 'when_logged', label: t('form.moveWhenLogged') },
                  { value: 'when_goal_met', label: t('form.moveWhenGoalMet') }
                ]}
              />
            </View>

            {/* progress bar */}
            <View className='gap-s2'>
              <FieldLabelRow
                trailing={
                  <InfoTooltip
                    title={t('form.helpTitle')}
                    description={t('form.progressHelp')}
                  />
                }
              >
                {t('form.progressBar')}
              </FieldLabelRow>
              <Segmented<ProgressBasis>
                value={progressBasis}
                onChange={setProgressBasis}
                options={[
                  { value: 'overall_avg', label: t('form.progressOverall') },
                  { value: 'today_total', label: t('form.progressToday') }
                ]}
              />
            </View>
          </>
        ) : null}

        {/* habit-specific */}
        {type === 'habit' ? (
          <>
            {/* bad habit toggle — targetValue becomes a LIMIT (0 = never) */}
            <View className='flex-row items-center gap-s3'>
              <FieldLabelRow
                trailing={
                  <InfoTooltip
                    title={t('form.helpTitle')}
                    description={t('form.badHabitHelp')}
                  />
                }
              >
                {t('form.badHabit')}
              </FieldLabelRow>
              <Toggle
                value={dir === 'bad'}
                onChange={(v) => setDir(v ? 'bad' : 'good')}
              />
            </View>

            {/* goal (or limit) + time period */}
            <View className='flex-row gap-s3'>
              <View className='flex-1 gap-s2'>
                <FieldLabel>
                  {t(dir === 'bad' ? 'form.limit' : 'form.goal')}
                </FieldLabel>
                <FormInput
                  value={target}
                  onChangeText={setTarget}
                  placeholder={t(
                    dir === 'bad' ? 'form.limitPh' : 'form.goalPh'
                  )}
                  keyboardType='decimal-pad'
                />
              </View>
              <View className='flex-1 gap-s2'>
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

            {/* reminders */}
            <ReminderField
              enabled={reminderOn}
              onEnabledChange={setReminderOn}
              times={reminderTimes}
              onTimesChange={setReminderTimes}
              accentColor={TYPE_COLOR.habit}
            />
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
        className='flex-row gap-s3 border-t border-line bg-surface px-s4 pt-s4'
        // safe-area, runtime
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        {editing ? (
          <Pressable
            onPress={onDelete}
            className='h-[52px] w-[52px] items-center justify-center rounded-md-k bg-pace-behind-weak active:opacity-80'
          >
            <Icons.Trash size={20} color={c.pace.behind} />
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

      <IconPickerModal
        isOpen={iconModal}
        onOpenChange={setIconModal}
        icons={icons}
        selected={icon}
        onSelect={setIcon}
      />

      <ColorPickerModal
        isOpen={colorModal}
        onOpenChange={setColorModal}
        colors={COLORS}
        selected={color}
        onSelect={setColor}
      />
    </View>
  )
}
