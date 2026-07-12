import { useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Typography, BottomSheet, Button } from 'heroui-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Trash2
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import DateTimePicker, {
  useDefaultStyles,
  type DateType
} from 'react-native-ui-datepicker'
import { toHHMM, fromHHMM } from '@utils/date'
import { useThemeColors } from '@hooks/useThemeColors'
import {
  MAX_REMINDERS,
  nextReminderTime,
  reminderSummary
} from '@features/trackers/reminders'
import { Toggle } from './Toggle'

/**
 * The form's multi-reminder editor. The trigger is an input-look row (Bell +
 * label + summary); tapping it opens ONE BottomSheet whose content swaps
 * between a list view (on/off toggle, per-time rows with trash, "Add
 * reminder" = last time + 1h via nextReminderTime) and a wheel view editing a
 * single row — swapping views avoids nesting a second BottomSheet (portal /
 * gesture conflicts). `times` stays in state while disabled so re-enabling
 * restores it; persisting `[]` when off is the caller's job.
 */
export function ReminderField({
  enabled,
  onEnabledChange,
  times,
  onTimesChange,
  accentColor
}: {
  enabled: boolean
  onEnabledChange: (v: boolean) => void
  times: string[]
  onTimesChange: (times: string[]) => void
  accentColor: string
}) {
  const { t } = useTranslation()
  const c = useThemeColors()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)
  // null = list view; a number = wheel view editing that index.
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const summary = enabled ? reminderSummary(times) : t('form.reminderOff')

  return (
    <BottomSheet
      isOpen={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setEditingIndex(null)
      }}
    >
      <BottomSheet.Trigger asChild>
        <Pressable className='h-[52px] flex-row items-center justify-between rounded-md-k border border-line bg-surface px-s4 active:opacity-80'>
          <View className='flex-row items-center gap-s2'>
            <Bell size={18} color={accentColor} />
            <Typography className='text-base text-ink'>
              {t('form.reminders')}
            </Typography>
          </View>
          <View className='flex-row items-center gap-s1'>
            <Typography
              className={`text-base ${enabled ? 'text-ink' : 'text-ink-3'}`}
            >
              {summary}
            </Typography>
            <ChevronRight size={20} color={c.ink3} />
          </View>
        </Pressable>
      </BottomSheet.Trigger>
      <BottomSheet.Portal>
        {/* Explicit scrim — see SelectField for why the token override didn't work. */}
        <BottomSheet.Overlay className='bg-black/60' />
        <BottomSheet.Content>
          {/* runtime: safe-area inset + static offset */}
          <View className='px-s4' style={{ paddingBottom: insets.bottom + 12 }}>
            {editingIndex != null && times[editingIndex] != null ? (
              <WheelView
                // Remount per row/value so the draft seeds from the current time.
                key={`${editingIndex}-${times[editingIndex]}`}
                value={times[editingIndex]}
                onBack={() => setEditingIndex(null)}
                onSave={(hhmm) => {
                  onTimesChange(
                    times.map((tm, i) => (i === editingIndex ? hhmm : tm))
                  )
                  setEditingIndex(null)
                }}
              />
            ) : (
              <ListView
                enabled={enabled}
                onEnabledChange={onEnabledChange}
                times={times}
                onTimesChange={onTimesChange}
                onEditRow={setEditingIndex}
              />
            )}
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  )
}

/** List view: header (title + on/off toggle), one row per time, add button. */
function ListView({
  enabled,
  onEnabledChange,
  times,
  onTimesChange,
  onEditRow
}: {
  enabled: boolean
  onEnabledChange: (v: boolean) => void
  times: string[]
  onTimesChange: (times: string[]) => void
  onEditRow: (index: number) => void
}) {
  const { t } = useTranslation()
  const c = useThemeColors()
  return (
    <View className='gap-s3'>
      <View className='flex-row items-center justify-between'>
        <BottomSheet.Title className='text-lg font-bold text-ink'>
          {t('form.reminders')}
        </BottomSheet.Title>
        <Toggle value={enabled} onChange={onEnabledChange} />
      </View>
      {enabled ? (
        <>
          {times.map((tm, i) => (
            <View key={`${i}-${tm}`} className='flex-row items-center gap-s2'>
              <Pressable
                onPress={() => onEditRow(i)}
                className='h-[52px] flex-1 flex-row items-center justify-between rounded-md-k border border-line bg-surface px-s4 active:opacity-80'
              >
                <Typography className='text-base text-ink'>{tm}</Typography>
                <Clock size={20} color={c.ink3} />
              </Pressable>
              {times.length > 1 ? (
                <Pressable
                  onPress={() => onTimesChange(times.filter((_, j) => j !== i))}
                  className='h-[52px] w-[52px] items-center justify-center rounded-md-k bg-pace-behind-weak active:opacity-80'
                >
                  <Trash2 size={20} color={c.pace.behind} />
                </Pressable>
              ) : null}
            </View>
          ))}
          {times.length < MAX_REMINDERS ? (
            <Pressable
              onPress={() => onTimesChange([...times, nextReminderTime(times)])}
              className='h-[52px] flex-row items-center justify-center gap-s2 rounded-md-k border border-dashed border-line active:opacity-80'
            >
              <Plus size={20} color={c.brand} />
              <Typography className='text-base font-bold text-brand'>
                {t('form.addReminder')}
              </Typography>
            </Pressable>
          ) : null}
        </>
      ) : (
        <Typography className='text-sm text-ink-3'>
          {t('form.remindersOffHint')}
        </Typography>
      )}
    </View>
  )
}

/**
 * Wheel view: edits one time. Same draft + spurious-mount-callback guard as
 * TimeField's TimeSheet; Save/back swap the sheet back to the list view.
 */
function WheelView({
  value,
  onSave,
  onBack
}: {
  value: string
  onSave: (hhmm: string) => void
  onBack: () => void
}) {
  const { t } = useTranslation()
  const c = useThemeColors()
  const defaultStyles = useDefaultStyles(c.isDark ? 'dark' : 'light')
  const [draft, setDraft] = useState<Date>(() => fromHHMM(value))
  // react-native-ui-datepicker fires a spurious onChange on mount with the
  // time reset to midnight — drop that first callback (see TimeField).
  const ready = useRef(false)

  return (
    <View className='gap-s3'>
      <View className='flex-row items-center gap-s2'>
        <Pressable
          onPress={onBack}
          className='h-10 w-10 items-center justify-center rounded-md-k border border-line bg-surface active:opacity-80'
        >
          <ChevronLeft size={20} color={c.ink} />
        </Pressable>
        <BottomSheet.Title className='text-lg font-bold text-ink'>
          {t('form.alert')}
        </BottomSheet.Title>
      </View>
      <DateTimePicker
        mode='single'
        date={draft}
        onChange={({ date }: { date: DateType }) => {
          if (!ready.current) {
            ready.current = true
            return
          }
          if (date instanceof Date) setDraft(date)
        }}
        timePicker
        initialView='time'
        hideHeader
        styles={{
          ...defaultStyles,
          selected: { backgroundColor: c.brand },
          selected_label: { color: c.onAccent }
        }}
      />
      <Button
        variant='primary'
        feedbackVariant='none'
        onPress={() => onSave(toHHMM(draft))}
      >
        <Button.Label>{t('common.save')}</Button.Label>
      </Button>
    </View>
  )
}
