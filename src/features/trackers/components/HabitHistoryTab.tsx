import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type { Tracker, Entry } from '@features/trackers/types'
import { Icons } from '@features/trackers/icons'
import {
  buildHistoryRows,
  type HistoryRowItem
} from '@features/trackers/calculators/habitStats'
import { toISODate } from '@utils/date'
import { fmtNum } from '@features/trackers/detailFormat'
import { useThemeColors } from '@hooks/useThemeColors'

type ThemeColors = ReturnType<typeof useThemeColors>

/** Render an ISO date as a UTC Date for locale formatting. */
function isoToDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`)
}

/** Short weekday, e.g. "Sat" / "T7". */
function weekdayLabel(iso: string, lang: string): string {
  return isoToDate(iso).toLocaleDateString(lang, {
    weekday: 'short',
    timeZone: 'UTC'
  })
}

/** Day-of-month number from an ISO date. */
function dayNum(iso: string): number {
  return Number(iso.slice(8, 10))
}

/** Full row date, e.g. "20 June 2026". */
function fullDate(iso: string, lang: string): string {
  return isoToDate(iso).toLocaleDateString(lang, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  })
}

/** Logged time from a createdAt ISO datetime, e.g. "8:43 AM". Local time. */
function timeLabel(createdAt: string, lang: string): string {
  if (!createdAt) return ''
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(lang, { hour: 'numeric', minute: '2-digit' })
}

/** Shared row shell: day tile + date/meta + status slot. */
function RowShell({
  iso,
  meta,
  tileDone,
  status,
  isFirst,
  isLast,
  lang,
  onPress,
  c
}: {
  iso: string
  meta: string
  tileDone: boolean
  status: React.ReactNode
  isFirst: boolean
  isLast: boolean
  lang: string
  onPress: () => void
  c: ThemeColors
}) {
  const wk = weekdayLabel(iso, lang)
  // FlashList renders each row standalone, so the row itself carries the card
  // border: left/right always, top on every row but the first (acts as the
  // divider), bottom only on the last, with rounded corners at the two ends.
  return (
    <Pressable
      onPress={onPress}
      className={`mx-s4 flex-row items-center gap-s4 border-l border-r border-line bg-surface px-s4 py-[10px] active:bg-surface-2 ${
        isFirst ? 'rounded-t-xl-k border-t' : 'border-t'
      } ${isLast ? 'rounded-b-xl-k border-b' : ''}`}
    >
      <View
        className={`h-[44px] w-[42px] items-center justify-center rounded-md-k ${
          tileDone ? 'bg-brand' : 'bg-surface-2'
        }`}
      >
        <Typography
          className={`text-base font-bold leading-[18px] ${
            tileDone ? 'text-on-accent' : 'text-ink-2'
          }`}
        >
          {dayNum(iso)}
        </Typography>
        <Typography
          className={`text-[9.5px] font-bold uppercase leading-[11px] ${
            tileDone ? 'text-on-accent' : 'text-ink-3'
          }`}
        >
          {wk}
        </Typography>
      </View>

      <View className='flex-1'>
        <Typography className='text-[14px] font-bold text-ink'>
          {fullDate(iso, lang)}
        </Typography>
        <Typography
          className='mt-[2px] text-xs-k font-medium text-ink-3'
          numberOfLines={1}
        >
          {meta}
        </Typography>
      </View>

      <View className='flex-row items-center gap-s2'>
        {status}
        <Icons.Chevron size={16} color={c.lineStrong} />
      </View>
    </Pressable>
  )
}

/** Status pill for a logged record: Yes/No (habit) or the numeric value. */
function RecordRow({
  tracker,
  entry,
  isFirst,
  isLast,
  lang,
  t,
  onPress,
  c
}: {
  tracker: Tracker
  entry: Entry
  isFirst: boolean
  isLast: boolean
  lang: string
  t: (k: string) => string
  onPress: () => void
  c: ThemeColors
}) {
  const yes = entry.value > 0
  const wk = weekdayLabel(entry.date, lang)
  const time = timeLabel(entry.createdAt, lang)
  const base = time ? `${wk} · ${time}` : wk
  const meta = entry.note && entry.note.trim() ? entry.note : base
  const isHabit = tracker.type === 'habit'
  // Bad habit inverts the Yes/No semantics (mirroring LogEntryModal): a "Yes"
  // record is a slip (red), an explicit "No" means stayed clean (green) — and
  // the day tile highlights the clean record, not the slip.
  const isBad = isHabit && tracker.direction === 'bad'
  return (
    <RowShell
      iso={entry.date}
      meta={meta}
      tileDone={isHabit ? (isBad ? !yes : yes) : true}
      isFirst={isFirst}
      isLast={isLast}
      lang={lang}
      onPress={onPress}
      c={c}
      status={
        isHabit ? (
          yes ? (
            <View
              className={`min-w-[72px] flex-row items-center justify-center gap-s1 rounded-full px-s3 py-s1 ${
                isBad ? 'bg-pace-behind-weak' : 'bg-brand-weak'
              }`}
            >
              <Icons.Check size={12} color={isBad ? c.pace.behind : c.brand} />
              <Typography
                className={`text-xs-k font-bold ${
                  isBad ? 'text-pace-behind' : 'text-brand-ink'
                }`}
              >
                {t('log.yes')}
              </Typography>
            </View>
          ) : (
            <View
              className={`min-w-[72px] flex-row items-center justify-center gap-s1 rounded-full px-s3 py-s1 ${
                isBad ? 'bg-pace-on-weak' : 'bg-pace-behind-weak'
              }`}
            >
              <Icons.Close
                size={12}
                color={isBad ? c.pace.on_track : c.pace.behind}
              />
              <Typography
                className={`text-xs-k font-bold ${
                  isBad ? 'text-pace-on' : 'text-pace-behind'
                }`}
              >
                {t('log.no')}
              </Typography>
            </View>
          )
        ) : (
          <View className='min-w-[72px] items-center justify-center rounded-full bg-brand-weak px-s3 py-s1'>
            <Typography className='text-xs-k font-bold text-brand-ink'>
              {fmtNum(entry.value)}
            </Typography>
          </View>
        )
      }
    />
  )
}

/** Dashed "Log" pill for a due day with no record yet. */
function EmptyRow({
  iso,
  isFirst,
  isLast,
  lang,
  t,
  onPress,
  c
}: {
  iso: string
  isFirst: boolean
  isLast: boolean
  lang: string
  t: (k: string) => string
  onPress: () => void
  c: ThemeColors
}) {
  const wk = weekdayLabel(iso, lang)
  return (
    <RowShell
      iso={iso}
      meta={`${wk} · ${t('detail.notLogged')}`}
      tileDone={false}
      isFirst={isFirst}
      isLast={isLast}
      lang={lang}
      onPress={onPress}
      c={c}
      status={
        // border (1px, not 1.5) renders shorter, tighter dashes than a thick one;
        // min-w matches the Yes/No pill width so all three line up.
        <View className='min-w-[72px] items-center rounded-full border border-dashed border-line-strong px-s3 py-s1'>
          <Typography className='text-xs-k font-bold text-ink-3'>
            {t('detail.logShort')}
          </Typography>
        </View>
      }
    />
  )
}

/**
 * History tab — every due day from the tracker's start date to today (newest
 * first). A logged day shows each of its records (Yes/No); a day with no record
 * shows a dashed "Log" row so the user can back-fill it. "Add Log" logs today.
 */
export function HabitHistoryTab({
  tracker,
  entries,
  onAddLog,
  onEditEntry,
  onLogForDate
}: {
  tracker: Tracker
  entries: Entry[]
  onAddLog?: () => void
  onEditEntry?: (entry: Entry) => void
  onLogForDate?: (iso: string) => void
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const insets = useSafeAreaInsets()
  const c = useThemeColors()
  const rows: HistoryRowItem[] = buildHistoryRows(
    tracker,
    entries,
    toISODate(new Date())
  )

  // "Log History" title + Add Log button — scrolls with the list.
  const header = (
    <View className='flex-row items-center justify-between px-s4 pb-s2 pt-s1'>
      <Typography className='text-h3-k font-bold text-ink'>
        {t('detail.logHistory')}
      </Typography>
      <Pressable
        onPress={onAddLog}
        className='flex-row items-center gap-s2 rounded-full bg-brand-weak px-s4 py-s2 active:opacity-80'
      >
        <Icons.Plus size={17} color={c.brand} />
        <Typography className='text-sm-k font-bold text-brand-ink'>
          {t('detail.addLog')}
        </Typography>
      </Pressable>
    </View>
  )

  const empty = (
    <View className='m-s5 items-center rounded-xl-k border border-line bg-surface p-s7'>
      <Icons.History size={28} color={c.ink3} />
      <Typography className='mt-s3 text-sm font-medium text-ink-3'>
        {t('detail.noHistory')}
      </Typography>
    </View>
  )

  return (
    <FlashList
      data={rows}
      keyExtractor={(row) =>
        row.kind === 'record' ? row.entry.id : `empty-${row.iso}`
      }
      renderItem={({ item, index }) => {
        const isFirst = index === 0
        const isLast = index === rows.length - 1
        return item.kind === 'record' ? (
          <RecordRow
            tracker={tracker}
            entry={item.entry}
            isFirst={isFirst}
            isLast={isLast}
            lang={lang}
            t={t}
            onPress={() => onEditEntry?.(item.entry)}
            c={c}
          />
        ) : (
          <EmptyRow
            iso={item.iso}
            isFirst={isFirst}
            isLast={isLast}
            lang={lang}
            t={t}
            onPress={() => onLogForDate?.(item.iso)}
            c={c}
          />
        )
      }}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} // safe-area, runtime
      showsVerticalScrollIndicator={false}
    />
  )
}
