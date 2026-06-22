import { useEffect, useState } from 'react'
import { Pressable, ScrollView, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type { Tracker, Entry } from '@features/trackers/types'
import { useSaveTracker } from '@features/trackers/queries'
import { Icons } from '@features/trackers/icons'

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
function GoalNoteCard({ tracker }: { tracker: Tracker }) {
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
          placeholderTextColor='#8a8e80'
          className='min-h-[72px] text-x-k font-medium text-ink'
        />
        <View className='mt-s3 flex-row items-center gap-s2'>
          <Icons.Edit size={14} color='#8a8e80' />
          <Typography className='text-xs font-regular text-ink-3'>
            {t('detail.goalNoteHint')}
          </Typography>
        </View>
      </View>
    </View>
  )
}

/** One log note: Yes/No badge + date + status + the note text. Tap to edit. */
function LogNoteCard({
  entry,
  done,
  lang,
  onPress
}: {
  entry: Entry
  done: boolean
  lang: string
  onPress?: () => void
}) {
  const { t } = useTranslation()
  return (
    <Pressable
      onPress={onPress}
      className='flex-row items-start gap-s4 rounded-lg-k border border-line bg-surface p-s4'
    >
      <View
        className={`h-[30px] w-[30px] items-center justify-center rounded-full ${
          done ? 'bg-brand-weak' : 'bg-pace-behind-weak'
        }`}
      >
        {done ? (
          <Icons.Check size={16} color='#2456b5' />
        ) : (
          <Icons.Close size={16} color='#e0564e' />
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
              done ? 'text-brand' : 'text-pace-behind'
            }`}
          >
            {done ? t('log.yes') : t('log.no')}
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

  const noted = entries
    .filter((e) => e.note && e.note.trim().length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} // safe-area, runtime
      showsVerticalScrollIndicator={false}
    >
      <View className='m-s5 gap-s6'>
        <GoalNoteCard tracker={tracker} />

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
              <Icons.Notes size={28} color='#8a8e80' />
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
                  entry={e}
                  done={e.value > 0}
                  lang={lang}
                  onPress={onEditEntry ? () => onEditEntry(e) : undefined}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  )
}
