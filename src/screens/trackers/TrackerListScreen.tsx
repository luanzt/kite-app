import { FlatList, Pressable, ScrollView, View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@navigation/types'
import { useTrackers, useSaveTracker } from '@features/trackers/queries'
import { QUICK_STARTS, type QuickStart } from '@features/trackers/quickStarts'
import { TrackerCard } from '@features/trackers/components/TrackerCard'
import { KiteLogo } from '@features/trackers/components/KiteLogo'
import { CreateButton } from '@features/trackers/components/CreateButton'
import { buildTracker } from '@features/trackers/factory'
import { Icons, iconEmoji } from '@features/trackers/icons'

type Nav = NativeStackNavigationProp<RootStackParamList>

export function TrackerListScreen() {
  const nav = useNavigation<Nav>()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { data: trackers = [] } = useTrackers()
  const save = useSaveTracker()

  const addQuickStart = (qs: QuickStart) => {
    save.mutate(
      buildTracker({
        name: t(`quickStart.items.${qs.key}`),
        type: qs.type,
        icon: qs.icon,
        color: qs.color,
        unit: qs.unit ?? null,
        targetValue: qs.targetValue ?? null,
        accumulation: qs.accumulation ?? null,
        period: qs.period ?? null
      })
    )
  }

  const header = (
    <View
      className='flex-row items-center bg-surface px-s5 pb-s3'
      style={{ paddingTop: insets.top + 12 }}
    >
      <Typography className='text-lg font-bold text-ink'>
        {t('list.title')}
      </Typography>
      <View className='flex-1' />
      <Typography className='text-xs text-ink-3'>{trackers.length}</Typography>
    </View>
  )

  // ---- Empty state ----
  if (trackers.length === 0) {
    return (
      <View className='flex-1 bg-bg'>
        {header}
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <View
            className='items-center px-s6 gap-s3'
            style={{ paddingTop: 32, paddingBottom: 8 }}
          >
            <View style={{ marginBottom: 8 }}>
              <KiteLogo size={96} />
            </View>
            <Typography className='text-xl font-extrabold text-ink text-center'>
              {t('list.empty')}
            </Typography>
            <Typography
              className='text-base text-ink-2 text-center'
              style={{ maxWidth: 250 }}
            >
              {t('list.emptyBody')}
            </Typography>
          </View>

          <Typography
            className='text-xs font-bold uppercase text-ink-3 px-s5'
            style={{ paddingTop: 20, paddingBottom: 8 }}
          >
            {t('list.quickHint')}
          </Typography>

          <View className='flex-row flex-wrap px-s5 gap-s3'>
            {QUICK_STARTS.map((qs) => (
              <Pressable
                key={qs.key}
                onPress={() => addQuickStart(qs)}
                className='flex-row items-center gap-s2 rounded-md-k border border-line bg-surface active:bg-surface-2'
                style={{
                  width: '48%',
                  paddingVertical: 13,
                  paddingHorizontal: 14
                }}
              >
                <Typography style={{ fontSize: 20 }}>
                  {iconEmoji(qs.icon)}
                </Typography>
                <Typography
                  className='flex-1 text-sm font-bold text-ink'
                  numberOfLines={1}
                >
                  {t(`quickStart.items.${qs.key}`)}
                </Typography>
              </Pressable>
            ))}
          </View>

          <View className='px-s5' style={{ paddingTop: 20 }}>
            <CreateButton
              label={t('list.create')}
              onPress={() => nav.navigate('TrackerTypePicker')}
              block
            />
          </View>
        </ScrollView>
      </View>
    )
  }

  // ---- Populated list ----
  return (
    <View className='flex-1 bg-bg'>
      {header}
      <FlatList
        data={trackers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <TrackerCard
            tracker={item}
            entries={[]}
            milestones={[]}
            onPress={() =>
              nav.navigate('TrackerDetail', { trackerId: item.id })
            }
          />
        )}
      />

      {/* FAB */}
      <Pressable
        onPress={() => nav.navigate('TrackerTypePicker')}
        className='absolute items-center justify-center bg-brand shadow-md active:opacity-90'
        style={{
          right: 18,
          bottom: 18,
          width: 58,
          height: 58,
          borderRadius: 20
        }}
      >
        <Icons.Plus size={28} color='#ffffff' />
      </Pressable>
    </View>
  )
}
