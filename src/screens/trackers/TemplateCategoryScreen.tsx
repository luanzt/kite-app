import { useMemo, useState } from 'react'
import { Pressable, ScrollView, TextInput, View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Search, Target } from 'lucide-react-native'
import type { RootStackProps } from '@navigation/types'
import { categoryByKey, normalizeText } from '@features/trackers/templates'
import { Icons, iconEmoji } from '@features/trackers/icons'
import { useThemeColors } from '@hooks/useThemeColors'

export function TemplateCategoryScreen({
  route,
  navigation
}: RootStackProps<'TemplateCategory'>) {
  const { category } = route.params
  const { t } = useTranslation()
  const c = useThemeColors()
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')

  const cat = categoryByKey(category)
  const nq = normalizeText(query)
  const list = useMemo(() => {
    const all = cat?.templates ?? []
    if (!nq) return all
    return all.filter((tpl) =>
      normalizeText(t(`template.items.${tpl.key}`)).includes(nq)
    )
  }, [cat, nq, t])

  return (
    <View className='flex-1 bg-bg'>
      {/* appbar */}
      <View
        className='flex-row items-center gap-s3 bg-surface px-s4 pb-s3'
        style={{ paddingTop: insets.top + 8 }} // safe-area, runtime
      >
        <Pressable
          onPress={() => navigation.goBack()}
          className='h-10 w-10 items-center justify-center rounded-md-k border border-line bg-surface active:opacity-80'
        >
          <Icons.Back size={22} color={c.ink} />
        </Pressable>
        <Typography className='flex-1 text-lg font-bold text-ink'>
          {t(`template.categories.${category}`)}
        </Typography>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View className='p-s4 gap-s4'>
          {/* search */}
          <View className='h-[48px] flex-row items-center gap-s2 rounded-md-k bg-surface-2 px-s3'>
            <Search size={18} color={c.ink3} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('template.search')}
              placeholderTextColor={c.ink3}
              className='flex-1 text-base text-ink'
            />
          </View>

          {/* templates */}
          {list.length > 0 ? (
            <View className='overflow-hidden rounded-lg-k border border-line bg-surface'>
              {list.map((tpl, i) => (
                <Pressable
                  key={tpl.key}
                  onPress={() =>
                    navigation.navigate('TrackerForm', {
                      type: tpl.type,
                      templateKey: tpl.key
                    })
                  }
                  className={`flex-row items-center gap-s2 px-s4 py-s4 active:bg-surface-2 ${
                    i > 0 ? 'border-t border-line' : ''
                  }`}
                >
                  <Typography className='flex-1 text-base font-bold text-brand'>
                    {t(`template.items.${tpl.key}`)}{' '}
                    <Typography className='text-base'>
                      {iconEmoji(tpl.icon)}
                    </Typography>
                  </Typography>
                  <Typography className='text-sm font-semibold text-ink-3'>
                    {t(`types.${tpl.type}`)}
                  </Typography>
                  <Icons.Chevron size={16} color={c.ink3} />
                </Pressable>
              ))}
            </View>
          ) : (
            <Typography className='px-s2 text-center text-base text-ink-3'>
              {t('template.empty')}
            </Typography>
          )}

          {/* create custom */}
          <Pressable
            onPress={() => navigation.navigate('TrackerTypePicker')}
            className='flex-row items-center gap-s3 rounded-lg-k border border-line bg-surface p-s4 active:opacity-90'
          >
            <View className='h-[46px] w-[46px] items-center justify-center rounded-md-k border border-line'>
              <Target size={24} color={c.pace.on_track} strokeWidth={1.9} />
            </View>
            <View className='flex-1'>
              <Typography className='text-base font-extrabold text-pace-on'>
                {t('template.create')}
              </Typography>
              <Typography className='mt-[2px] text-sm text-ink-3'>
                {t('template.createDesc')}
              </Typography>
            </View>
            <Icons.Chevron size={16} color={c.ink3} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  )
}
