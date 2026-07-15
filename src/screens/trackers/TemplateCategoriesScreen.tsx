import { useMemo, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { RootStackProps } from '@navigation/types'
import {
  TEMPLATE_CATEGORIES,
  allTemplates,
  normalizeText
} from '@features/trackers/templates'
import {
  Icons,
  iconEmoji,
  CATEGORY_ICON,
  colorHex,
  hexA
} from '@features/trackers/icons'
import { SearchField } from '@components/ui'
import { useThemeColors } from '@hooks/useThemeColors'

export function TemplateCategoriesScreen({
  navigation
}: RootStackProps<'TemplateCategories'>) {
  const { t } = useTranslation()
  const c = useThemeColors()
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')
  const nq = normalizeText(query)

  const matches = useMemo(() => {
    if (!nq) return []
    return allTemplates().filter((tpl) =>
      normalizeText(t(`template.items.${tpl.key}`)).includes(nq)
    )
  }, [nq, t])

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
          {t('template.title')}
        </Typography>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View className='p-s4 gap-s4'>
          {/* search */}
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder={t('template.search')}
          />

          {nq ? (
            // search results: flat template list across all categories
            matches.length > 0 ? (
              <View className='overflow-hidden rounded-lg-k border border-line bg-surface'>
                {matches.map((tpl, i) => (
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
            )
          ) : (
            // category list
            <View className='overflow-hidden rounded-lg-k border border-line bg-surface'>
              {TEMPLATE_CATEGORIES.map((cat, i) => {
                const CatIcon = CATEGORY_ICON[cat.key]
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() =>
                      navigation.navigate('TemplateCategory', {
                        category: cat.key
                      })
                    }
                    className={`flex-row items-center gap-s3 px-s4 py-s4 active:bg-surface-2 ${
                      i > 0 ? 'border-t border-line' : ''
                    }`}
                  >
                    <View
                      className='h-[30px] w-[30px] items-center justify-center rounded-md-k'
                      // runtime: per-category tint via hexA
                      style={{ backgroundColor: hexA(cat.color, 0.14) }}
                    >
                      <CatIcon
                        size={18}
                        color={colorHex(cat.color)}
                        strokeWidth={2}
                      />
                    </View>
                    <Typography className='flex-1 text-base font-bold text-ink'>
                      {t(`template.categories.${cat.key}`)}
                    </Typography>
                    <Typography className='text-sm font-semibold text-ink-3'>
                      {cat.templates.length}
                    </Typography>
                    <Icons.Chevron size={16} color={c.ink3} />
                  </Pressable>
                )
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
