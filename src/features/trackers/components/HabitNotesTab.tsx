import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type { Entry } from '@features/trackers/types'
import { Icons } from '@features/trackers/icons'

/** Format an entry date ("Mon, Jun 15"), UTC. */
function entryDate(iso: string, lang: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(lang, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  })
}

/**
 * Notes tab — every logged entry that carries a note, newest first, each as a
 * small card. Empty state when nothing has a note yet.
 */
export function HabitNotesTab({ entries }: { entries: Entry[] }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const insets = useSafeAreaInsets()
  const noted = entries
    .filter((e) => e.note && e.note.trim().length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))

  if (noted.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} // safe-area, runtime
        showsVerticalScrollIndicator={false}
      >
        <View className='m-s5 items-center rounded-xl-k border border-line bg-surface p-s7'>
          <Icons.Notes size={28} color='#8a8e80' />
          <Typography className='mt-s3 text-sm font-medium text-ink-3'>
            {t('detail.noNotes')}
          </Typography>
          <Typography className='mt-s1 text-center text-xs text-ink-3'>
            {t('detail.noNotesHint')}
          </Typography>
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} // safe-area, runtime
      showsVerticalScrollIndicator={false}
    >
      <View className='m-s5 gap-s3'>
        {noted.map((e) => (
          <View
            key={e.id}
            className='rounded-lg-k border border-line bg-surface p-s4'
          >
            <Typography className='text-xs font-bold uppercase text-brand-ink'>
              {entryDate(e.date, lang)}
            </Typography>
            <Typography className='mt-s2 text-sm text-ink-2'>
              {e.note}
            </Typography>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}
