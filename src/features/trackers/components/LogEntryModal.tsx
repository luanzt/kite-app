import { useCallback, useEffect, useState } from 'react'
import { Keyboard, Pressable, View } from 'react-native'
import {
  BottomSheetFooter,
  BottomSheetScrollView,
  BottomSheetTextInput
} from '@gorhom/bottom-sheet'
import type { BottomSheetFooterProps } from '@gorhom/bottom-sheet'
import { BottomSheet, Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Tracker, Entry } from '@features/trackers/types'
import { Icons, iconEmoji } from '@features/trackers/icons'
import { cadenceLabel } from '@features/trackers/habitLabels'
import { uuid } from '@features/trackers/factory'
import { toISODate, toHHMM, combineDateTime } from '@utils/date'
import { DateField, TimeField } from '@components/ui'

/**
 * LogEntryModal — a HeroUI BottomSheet to create or edit one habit log record.
 * "Did you do this habit?" Yes → value 1, No → value 0. Notes free text. Date &
 * Time use the same pickers as the habit form. Save upserts; Delete (edit mode
 * only) removes the record.
 */
export function LogEntryModal({
  tracker,
  entry,
  defaultDate,
  visible,
  onClose,
  onSave,
  onDelete
}: {
  tracker: Tracker
  entry?: Entry | null
  defaultDate?: string | null // pre-fill date when creating (e.g. back-fill)
  visible: boolean
  onClose: () => void
  onSave: (entry: Entry) => void
  onDelete?: (id: string) => void
}) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const isEdit = !!entry

  const [done, setDone] = useState(true)
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const [dateISO, setDateISO] = useState('')
  const [timeHHMM, setTimeHHMM] = useState('')

  // Reset the form each time the sheet opens for a different record.
  useEffect(() => {
    if (!visible) return
    setDone(entry ? entry.value > 0 : true)
    setValue(entry ? String(entry.value) : '')
    setNote(entry?.note ?? '')
    setDateISO(entry?.date ?? defaultDate ?? toISODate(new Date()))
    // editing → use the record's logged time; new → now
    const when = entry?.createdAt ? new Date(entry.createdAt) : new Date()
    setTimeHHMM(toHHMM(Number.isNaN(when.getTime()) ? new Date() : when))
  }, [visible, entry, defaultDate])

  // Always drop the keyboard when the sheet closes so it doesn't linger.
  const dismissAndClose = () => {
    Keyboard.dismiss()
    onClose()
  }

  const handleSave = () => {
    // guard: never persist a record without a date (would be invisible everywhere)
    if (!dateISO) return
    onSave({
      id: entry?.id ?? uuid(),
      trackerId: tracker.id,
      date: dateISO,
      value: tracker.type === 'habit' ? (done ? 1 : 0) : Number(value) || 0,
      note: note.trim() ? note.trim() : null,
      createdAt: combineDateTime(dateISO, timeHHMM)
    })
    dismissAndClose()
  }

  // Footer rendered via gorhom's BottomSheetFooter so the Save button sticks to
  // the top of the keyboard when it opens, and to the safe-area when it's closed.
  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={insets.bottom}>
        <View className='px-s4 pb-s3 pt-s3'>
          <Pressable
            onPress={handleSave}
            className='h-[56px] flex-row items-center justify-center gap-s2 rounded-lg-k bg-brand active:opacity-90'
          >
            <Icons.Check size={20} color='#ffffff' />
            <Typography className='text-h3-k font-bold text-on-accent'>
              {t('log.save')}
            </Typography>
          </Pressable>
        </View>
      </BottomSheetFooter>
    ),
    // handleSave closes over the form state — footer MUST re-create when any of
    // it changes, or Save fires with stale (empty) date/time. (Was the cause of
    // records saving with date="" + a 1899 createdAt.)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [insets.bottom, done, value, note, dateISO, timeHHMM, entry, defaultDate, t]
  )

  return (
    <BottomSheet
      isOpen={visible}
      onOpenChange={(open) => !open && dismissAndClose()}
    >
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          snapPoints={['92%']}
          enableOverDrag={false}
          enableDynamicSizing={false}
          keyboardBehavior='extend'
          footerComponent={renderFooter}
          contentContainerClassName='h-full px-0 pt-0'
          backgroundClassName='bg-bg rounded-t-[27px]'
        >
          {/* header */}
          <View className='flex-row items-center gap-s2 px-s4 pb-s4 pt-s3'>
            <Pressable
              onPress={dismissAndClose}
              className='h-[44px] w-[44px] items-center justify-center rounded-md-k border border-line bg-surface active:opacity-80'
            >
              <Icons.Close size={22} color='#1b1e18' />
            </Pressable>
            <View className='flex-1 items-center'>
              <Typography
                className='text-h2-k font-bold text-ink'
                numberOfLines={1}
              >
                {tracker.name}
              </Typography>
              <Typography className='mt-[2px] text-sm-k font-bold text-brand-ink'>
                {`${iconEmoji(tracker.icon)} ${cadenceLabel(tracker, t)}`}
              </Typography>
            </View>
            {isEdit && onDelete ? (
              <Pressable
                onPress={() => {
                  onDelete(entry!.id)
                  dismissAndClose()
                }}
                className='h-[44px] w-[44px] items-center justify-center rounded-md-k border border-line bg-surface active:opacity-80'
              >
                <Icons.Trash size={20} color='#e0564e' />
              </Pressable>
            ) : (
              <View className='h-[44px] w-[44px]' />
            )}
          </View>

          <BottomSheetScrollView
            contentContainerClassName='px-s4 pt-s2 pb-s9 gap-s5'
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='handled'
          >
            {/* habit: Yes/No · others: numeric value */}
            {tracker.type === 'habit' ? (
              <View>
                <Typography className='mt-s4 text-center text-h3-k font-bold text-ink'>
                  {t('log.prompt')}
                </Typography>
                <View className='mt-s4 flex-row gap-s3'>
                  <Pressable
                    onPress={() => setDone(true)}
                    className={`h-[88px] flex-1 items-center justify-center gap-s2 rounded-lg-k border-2 ${
                      done ? 'border-brand bg-brand' : 'border-line bg-surface'
                    }`}
                  >
                    <Icons.Check
                      size={28}
                      color={done ? '#ffffff' : '#8a8e80'}
                    />
                    <Typography
                      className={`text-body-k font-bold ${
                        done ? 'text-on-accent' : 'text-ink-2'
                      }`}
                    >
                      {t('log.yes')}
                    </Typography>
                  </Pressable>
                  <Pressable
                    onPress={() => setDone(false)}
                    className={`h-[88px] flex-1 items-center justify-center gap-s2 rounded-lg-k border-2 ${
                      !done
                        ? 'border-pace-behind bg-pace-behind-weak'
                        : 'border-line bg-surface'
                    }`}
                  >
                    <Icons.Close
                      size={28}
                      color={!done ? '#e0564e' : '#8a8e80'}
                    />
                    <Typography
                      className={`text-body-k font-bold ${
                        !done ? 'text-pace-behind' : 'text-ink-2'
                      }`}
                    >
                      {t('log.no')}
                    </Typography>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View className='mt-s4 overflow-hidden rounded-xl-k border border-line bg-surface'>
                <Typography className='px-s5 pt-s4 text-xs-k font-bold uppercase text-ink-3'>
                  {tracker.unit
                    ? `${t('log.value')} (${tracker.unit})`
                    : t('log.value')}
                </Typography>
                <BottomSheetTextInput
                  value={value}
                  onChangeText={setValue}
                  placeholder={t('log.valuePh')}
                  placeholderTextColor='#8a8e80'
                  keyboardType='decimal-pad'
                  className='px-s5 pb-s5 pt-s2 text-h2-k font-bold text-ink'
                />
              </View>
            )}

            {/* notes */}
            <View className='overflow-hidden rounded-xl-k border border-line bg-surface'>
              <Typography className='px-s5 pt-s4 text-xs-k font-bold uppercase text-ink-3'>
                {t('detail.tabNotes')}
              </Typography>
              <BottomSheetTextInput
                value={note}
                onChangeText={setNote}
                placeholder={t('log.notesPh')}
                placeholderTextColor='#8a8e80'
                multiline
                textAlignVertical='top'
                className='min-h-[120px] px-s5 pb-s5 pt-s2 text-body-k text-ink'
              />
            </View>

            {/* date & time — same pickers as the habit form */}
            <View className='gap-s3'>
              <View className='gap-s2'>
                <Typography className='text-xs-k font-bold uppercase text-ink-3'>
                  {t('log.date')}
                </Typography>
                <DateField
                  value={dateISO}
                  onChange={setDateISO}
                  maxDate={new Date()}
                />
              </View>
              <View className='gap-s2'>
                <Typography className='text-xs-k font-bold uppercase text-ink-3'>
                  {t('log.time')}
                </Typography>
                <TimeField value={timeHHMM} onChange={setTimeHHMM} />
              </View>
            </View>
          </BottomSheetScrollView>
          {/* Save button lives in footerComponent so it sticks to the keyboard. */}
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  )
}
