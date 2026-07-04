import { useEffect, useState } from 'react'
import { Pressable, ScrollView, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type { Tracker, Entry } from '@features/trackers/types'
import { useSaveTracker } from '@features/trackers/queries'
import { Icons } from '@features/trackers/icons'
import { fmtVal } from '@features/trackers/detailFormat'
import { useThemeColors } from '@hooks/useThemeColors'

type ThemeColors = ReturnType<typeof useThemeColors>

/** Format an entry date ("18 Jun 2026"), UTC. */
function entryDate(iso: string, lang: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(lang, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  })
}

/** Editable motivation note pinned to the habit; saves on blur if changed. */
function GoalNoteCard({ tracker, c }: { tracker: Tracker; c: ThemeColors }) {
  const { t } = useTranslation()
  const saveTracker = useSaveTracker()
  const [draft, setDraft] = useState(tracker.goalNote ?? '')

  // Keep the draft in sync if the stored note changes while mounted (e.g. saved elsewhere).
  useEffect(() => {
    setDraft(tracker.goalNote ?? '')
  }, [tracker.goalNote])

  const onBlur = () => {
    const next = draft.trim() === '' ? null : draft.trim()
    if (next !== (tracker.goalNote ?? null)) {
      saveTracker.mutate({ ...tracker, goalNote: next })
    }
  }

  return (
    <View>
      <View className='mb-s3 flex-row items-center justify-between px-s2'>
        <Typography className='text-xs font-bold uppercase text-ink'>
          {t('detail.goalNote')}
        </Typography>
      </View>
      <View className='rounded-xl-k border border-line bg-surface p-s5'>
        <TextInput
          multiline
          value={draft}
          onChangeText={setDraft}
          onBlur={onBlur}
          placeholder={t('detail.goalNotePlaceholder')}
          placeholderTextColor={c.ink3}
          className='min-h-[72px] text-x-k font-medium text-ink'
        />
        <View className='mt-s3 flex-row items-center gap-s2'>
          <Icons.Edit size={14} color={c.ink3} />
          <Typography className='text-xs font-regular text-ink-3'>
            {t('detail.goalNoteHint')}
          </Typography>
        </View>
      </View>
    </View>
  )
}

/** One log note: status badge + date + value/Yes-No + the note text. Tap to edit. */
function LogNoteCard({
  tracker,
  entry,
  done,
  lang,
  onPress,
  c
}: {
  tracker: Tracker
  entry: Entry
  done: boolean
  lang: string
  onPress?: () => void
  c: ThemeColors
}) {
  const { t } = useTranslation()
  const isHabit = tracker.type === 'habit'
  return (
    <Pressable
      onPress={onPress}
      className='flex-row items-start gap-s4 rounded-lg-k border border-line bg-surface p-s4'
    >
      <View
        className={`h-[30px] w-[30px] items-center justify-center rounded-full ${
          isHabit && !done ? 'bg-pace-behind-weak' : 'bg-brand-weak'
        }`}
      >
        {isHabit ? (
          done ? (
            <Icons.Check size={16} color={c.brand} />
          ) : (
            <Icons.Close size={16} color={c.pace.behind} />
          )
        ) : (
          <Icons.Edit size={14} color={c.brand} />
        )}
      </View>
      <View className='flex-1'>
        <View className='flex-row items-baseline gap-s2'>
          <Typography className='text-sm font-bold text-ink-2'>
            {entryDate(entry.date, lang)}
          </Typography>
          <Typography className='text-sm font-bold text-ink-3'>--</Typography>
          <Typography
            className={`text-sm font-bold ${
              isHabit && !done ? 'text-pace-behind' : 'text-brand'
            }`}
          >
            {isHabit
              ? done
                ? t('log.yes')
                : t('log.no')
              : fmtVal(tracker, entry.value)}
          </Typography>
        </View>
        <Typography className='mt-s1 text-body-k text-ink'>
          {entry.note}
        </Typography>
      </View>
    </Pressable>
  )
}

/**
 * Notes tab — a pinned editable Goal note plus the list of logged entries that
 * carry a note (newest first), each with a Yes/No completion badge and tappable
 * to edit the underlying log. Empty state when no entry has a note yet.
 */
export function HabitNotesTab({
  tracker,
  entries,
  onEditEntry
}: {
  tracker: Tracker
  entries: Entry[]
  onEditEntry?: (entry: Entry) => void
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const insets = useSafeAreaInsets()
  const c = useThemeColors()

  const noted = entries
    .filter((e) => e.note && e.note.trim().length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} // safe-area, runtime
      showsVerticalScrollIndicator={false}
    >
      <View className='m-s5 gap-s6'>
        <GoalNoteCard tracker={tracker} c={c} />

        <View>
          <View className='mb-s3 flex-row items-center justify-between px-s2'>
            <Typography className='text-xs font-bold uppercase text-ink'>
              {t('detail.logNotes')}
            </Typography>
            {noted.length > 0 ? (
              <Typography className='text-xs font-bold text-ink-3'>
                {t('detail.notesCount', { count: noted.length })}
              </Typography>
            ) : null}
          </View>

          {noted.length === 0 ? (
            <View className='items-center rounded-lg-k border border-dashed border-line-strong p-s7'>
              <Icons.Notes size={28} color={c.ink3} />
              <Typography className='mt-s3 text-sm font-medium text-ink-2'>
                {t('detail.noNotes')}
              </Typography>
              <Typography className='mt-s1 text-center text-xs text-ink-3'>
                {t('detail.noNotesHint')}
              </Typography>
            </View>
          ) : (
            <View className='gap-s3'>
              {noted.map((e) => (
                <LogNoteCard
                  key={e.id}
                  tracker={tracker}
                  entry={e}
                  done={e.value > 0}
                  lang={lang}
                  onPress={onEditEntry ? () => onEditEntry(e) : undefined}
                  c={c}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  )
}
