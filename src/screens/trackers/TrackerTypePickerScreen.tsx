import { Pressable, ScrollView, View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackProps } from '@navigation/types'
import type { TrackerType } from '@features/trackers/types'
import { Icons, hexA, TYPE_ICON, TYPE_COLOR } from '@features/trackers/icons'

type TypeMeta = {
  k: TrackerType
  tag: 'tagHabit' | 'tagTarget' | 'tagAverage' | 'tagProject'
}

const TYPES: TypeMeta[] = [
  { k: 'habit', tag: 'tagHabit' },
  { k: 'target', tag: 'tagTarget' },
  { k: 'average', tag: 'tagAverage' },
  { k: 'project', tag: 'tagProject' }
]

export function TrackerTypePickerScreen({
  navigation
}: RootStackProps<'TrackerTypePicker'>) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  return (
    <View className='flex-1 bg-bg'>
      {/* appbar */}
      <View
        className='flex-row items-center gap-s3 bg-surface px-s4 pb-s3'
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          className='h-10 w-10 items-center justify-center rounded-md-k border border-line bg-surface active:opacity-80'
        >
          <Icons.Back size={22} color='#1b1e18' />
        </Pressable>
        <Typography className='text-lg font-bold text-ink'>
          {t('list.create')}
        </Typography>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* heading */}
        <View className='px-s5 pt-s6 pb-s3'>
          <Typography className='text-2xl font-extrabold text-ink'>
            {t('type.title')}
          </Typography>
          <Typography className='mt-[6px] text-base text-ink-2'>
            {t('type.pick')}
          </Typography>
        </View>

        {/* type cards */}
        <View className='px-s5 gap-s4'>
          {TYPES.map((ty) => {
            const TypeIcon = TYPE_ICON[ty.k]
            const color = TYPE_COLOR[ty.k]
            return (
              <Pressable
                key={ty.k}
                onPress={() =>
                  navigation.navigate('TrackerForm', { type: ty.k })
                }
                className='flex-row items-start gap-s4 rounded-xl-k border border-line bg-surface p-s5 shadow-sm active:opacity-90'
              >
                <View
                  className='h-[56px] w-[56px] items-center justify-center rounded-lg-k'
                  style={{ backgroundColor: hexA(color, 0.14) }} // per-type tint, runtime
                >
                  <TypeIcon size={28} color={color} strokeWidth={2.2} />
                </View>
                <View className='flex-1'>
                  <Typography className='text-lg font-extrabold text-ink'>
                    {t(`type.${ty.k}`)}
                  </Typography>
                  <Typography
                    className='mt-s1 text-sm leading-[20px] text-ink-2'
                    numberOfLines={2}
                  >
                    {t(`type.${ty.k}Desc`)}
                  </Typography>
                  <View className='mt-s2 flex-row items-center gap-s1'>
                    <Icons.Bolt size={14} color={color} />
                    <Typography className='text-xs font-bold' style={{ color }}>
                      {t(`type.${ty.tag}`)}
                    </Typography>
                  </View>
                </View>
                <View className='self-center'>
                  <Icons.Chevron size={18} color='#8a8e80' />
                </View>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}
