import { Pressable, View } from 'react-native'
import { Skeleton } from 'heroui-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '@navigation/types'
import { Icons } from '@features/trackers/icons'

type Nav = NativeStackNavigationProp<RootStackParamList>

/**
 * DetailLoading — placeholder shown while the tracker query resolves on first
 * open. Keeps the real appbar layout (back / title slot / edit) so the screen
 * doesn't flash an empty white frame, with HeroUI Skeletons standing in for the
 * title and the body card. The back button stays live so the user is never
 * stuck if the read is slow.
 */
export function DetailLoading() {
  const nav = useNavigation<Nav>()
  const insets = useSafeAreaInsets()
  return (
    <View className='flex-1 bg-bg'>
      <View
        className='flex-row items-center gap-s3 bg-surface px-s4 pb-s3'
        style={{ paddingTop: insets.top + 8 }} // safe-area, runtime
      >
        <Pressable
          onPress={() => nav.goBack()}
          className='h-[40px] w-[40px] items-center justify-center rounded-md-k border border-line bg-surface active:opacity-80'
        >
          <Icons.Back size={22} color='#1b1e18' />
        </Pressable>
        <View className='flex-1 items-center'>
          <Skeleton className='h-[20px] w-[140px] rounded-md' />
        </View>
        <View className='h-[40px] w-[40px] rounded-md-k border border-line bg-surface' />
      </View>
      <View className='m-s5 gap-s4 rounded-xl-k border border-line bg-surface p-s5 shadow-md'>
        <Skeleton className='h-[48px] w-[160px] rounded-md' />
        <Skeleton className='h-[16px] w-[100px] rounded-md' />
        <Skeleton className='h-[16px] w-full rounded-full' />
        <Skeleton className='h-[14px] w-3/4 rounded-md' />
      </View>
      <View className='mx-s4 flex-row gap-s4'>
        <Skeleton className='h-[72px] flex-1 rounded-xl-k' />
        <Skeleton className='h-[72px] flex-1 rounded-xl-k' />
      </View>
    </View>
  )
}
