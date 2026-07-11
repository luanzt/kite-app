import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BottomSheet, Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { Check, X, Trash2 } from 'lucide-react-native'
import { useThemeColors } from '@hooks/useThemeColors'

type Props = {
  date: string | null
  title: string
  hasEntry: boolean
  /** Bad habit: relabel the actions as "I slipped" / "stayed clean". */
  badHabit?: boolean
  onLogYes: () => void
  onLogNo: () => void
  onDeleteLast: () => void
  onClose: () => void
}

/**
 * CalendarDayMenu — a HeroUI BottomSheet of log actions for one calendar day.
 * Opened by longpressing a past-or-today habit-calendar day. Shows Log Yes /
 * Log No, plus Delete Last Log when the day already has a record. Each row runs
 * its action then closes the sheet.
 */
export function CalendarDayMenu({
  date,
  title,
  hasEntry,
  badHabit,
  onLogYes,
  onLogNo,
  onDeleteLast,
  onClose
}: Props) {
  const { t } = useTranslation()
  const c = useThemeColors()
  const insets = useSafeAreaInsets()

  const run = (fn: () => void) => {
    fn()
    onClose()
  }

  return (
    <BottomSheet isOpen={!!date} onOpenChange={(open) => !open && onClose()}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          enableDynamicSizing
          backgroundClassName='bg-bg rounded-t-[27px]'
        >
          <View
            className='px-s5 pt-s4'
            style={{ paddingBottom: insets.bottom + 12 }} // safe-area, runtime
          >
            <Typography className='mb-s3 text-center text-sm font-bold text-ink-3'>
              {title}
            </Typography>

            <Pressable
              onPress={() => run(onLogYes)}
              className='h-[56px] flex-row items-center justify-between border-t border-line active:opacity-70'
            >
              <Typography className='text-base font-bold text-ink'>
                {t(badHabit ? 'log.slipped' : 'detail.logYes')}
              </Typography>
              <Check
                size={22}
                color={badHabit ? c.pace.behind : c.pace.on_track}
              />
            </Pressable>

            <Pressable
              onPress={() => run(onLogNo)}
              className='h-[56px] flex-row items-center justify-between border-t border-line active:opacity-70'
            >
              <Typography className='text-base font-bold text-ink'>
                {t(badHabit ? 'log.stayedClean' : 'detail.logNo')}
              </Typography>
              <X size={22} color={badHabit ? c.pace.on_track : c.ink2} />
            </Pressable>

            {hasEntry ? (
              <Pressable
                onPress={() => run(onDeleteLast)}
                className='h-[56px] flex-row items-center justify-between border-t border-line active:opacity-70'
              >
                <Typography className='text-base font-bold text-pace-behind'>
                  {t('detail.deleteLastLog')}
                </Typography>
                <Trash2 size={22} color={c.pace.behind} />
              </Pressable>
            ) : null}
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  )
}
