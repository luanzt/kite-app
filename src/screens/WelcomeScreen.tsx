import { Platform, Pressable, StatusBar, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle } from 'react-native-svg'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { KiteLogo } from '@features/trackers/components/KiteLogo'
import { useAppStore } from '@store/useAppStore'
import type { RootStackProps } from '@navigation/types'

// Progress-ring geometry for the Habit card (4/5 done → 80%). Mirrors the
// design's 48px ring: r=19, stroke=4.5, so circumference ≈ 119.
const RING = 48
const RING_R = 19
const RING_C = 2 * Math.PI * RING_R
const HABIT_FRAC = 0.8

// The Average card's mini bar chart — fixed sample heights (px) + palette from
// the design, so each bar is a literal Tailwind class (no interpolation).
const AVG_BARS = [
  { h: 'h-[22px]', bg: 'bg-[#d9cef3]' },
  { h: 'h-[32px]', bg: 'bg-[#b99ceb]' },
  { h: 'h-[27px]', bg: 'bg-[#d9cef3]' },
  { h: 'h-[38px]', bg: 'bg-[#7a45d6]' },
  { h: 'h-[30px]', bg: 'bg-[#b99ceb]' }
]

/**
 * First-launch Welcome screen. Introduces Kite's three tracking styles and
 * routes into the app. Shown once (gated by `hasSeenWelcome` in the store); the
 * palette is intentionally fixed-light regardless of theme, matching the
 * marketing design.
 */
export function WelcomeScreen({ navigation }: RootStackProps<'Welcome'>) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const markWelcomeSeen = useAppStore((s) => s.markWelcomeSeen)

  const start = () => {
    markWelcomeSeen()
    navigation.replace('MainTabs')
  }
  const restore = () => {
    markWelcomeSeen()
    navigation.replace('MainTabs')
    navigation.navigate('SyncBackup')
  }

  return (
    // Fixed-light marketing surface; safe-area insets are runtime values no
    // Tailwind class can express, so top/bottom padding is inline (documented
    // dynamic-style exception).
    <View
      className='flex-1 bg-[#f4f6fa]'
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <StatusBar barStyle='dark-content' backgroundColor='#f4f6fa' />

      {/* brand + headline */}
      <View className='px-[26px] pt-[10px]'>
        <View className='flex-row items-center gap-[10px]'>
          <KiteLogo size={38} />
          <Typography className='text-[18px] font-extrabold tracking-tight text-[#0f172a]'>
            {t('welcome.brand')}
          </Typography>
        </View>
        <Typography className='mt-[18px] text-[32px] font-extrabold leading-[36px] tracking-tight text-[#0f172a]'>
          {t('welcome.title.lead')}
          <Typography className='text-[32px] font-extrabold text-[#2952cc]'>
            {t('welcome.title.accent')}
          </Typography>
          {t('welcome.title.end')}
        </Typography>
        <Typography className='mt-[10px] text-[15px] font-medium leading-[21px] text-[#64748b]'>
          {t('welcome.subtitle')}
        </Typography>
      </View>

      {/* three type cards */}
      <View className='min-h-0 flex-1 justify-center gap-[13px] px-[22px] py-[14px]'>
        {/* HABIT */}
        <View className='flex-row items-center gap-[14px] rounded-[22px] bg-white p-[15px] shadow-md'>
          <View className='h-[50px] w-[50px] items-center justify-center rounded-[15px] bg-[#e7eefb]'>
            <Typography className='text-[25px]'>💧</Typography>
          </View>
          <View className='min-w-0 flex-1'>
            <View className='flex-row flex-wrap items-center gap-[8px]'>
              <Typography className='rounded-[8px] bg-[#e7eefb] px-[8px] py-[3px] text-[11px] font-extrabold uppercase tracking-wide text-[#2952cc]'>
                {t('types.habit')}
              </Typography>
              <Typography className='text-[12px] font-semibold text-[#1e9e5a]'>
                {t('welcome.habit.stat')}
              </Typography>
            </View>
            <Typography className='mt-[5px] text-[17px] font-extrabold tracking-tight text-[#0f172a]'>
              {t('welcome.habit.title')}
            </Typography>
            <Typography className='mt-[1px] text-[13px] font-medium text-[#8a93a0]'>
              {t('welcome.habit.desc')}
            </Typography>
          </View>
          <View className='h-[48px] w-[48px] items-center justify-center'>
            <Svg width={RING} height={RING}>
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={RING_R}
                stroke='#e2e8f0'
                strokeWidth={4.5}
                fill='none'
              />
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={RING_R}
                stroke='#2952cc'
                strokeWidth={4.5}
                strokeLinecap='round'
                fill='none'
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - HABIT_FRAC)}
                rotation={-90}
                originX={RING / 2}
                originY={RING / 2}
              />
            </Svg>
            <View className='absolute inset-0 items-center justify-center'>
              <Typography className='text-[12px] font-extrabold text-[#2952cc]'>
                4/5
              </Typography>
            </View>
          </View>
        </View>

        {/* TARGET */}
        <View className='rounded-[22px] bg-white p-[15px] shadow-md'>
          <View className='flex-row items-center gap-[14px]'>
            <View className='h-[50px] w-[50px] items-center justify-center rounded-[15px] bg-[#fbe3e8]'>
              <Typography className='text-[25px]'>🎯</Typography>
            </View>
            <View className='min-w-0 flex-1'>
              <View className='flex-row flex-wrap items-center gap-[8px]'>
                <Typography className='rounded-[8px] bg-[#fbe3e8] px-[8px] py-[3px] text-[11px] font-extrabold uppercase tracking-wide text-[#dc2c6e]'>
                  {t('types.target')}
                </Typography>
                <Typography className='text-[12px] font-bold text-[#1e9e5a]'>
                  {t('welcome.target.stat')}
                </Typography>
              </View>
              <Typography className='mt-[5px] text-[17px] font-extrabold tracking-tight text-[#0f172a]'>
                {t('welcome.target.title')}
              </Typography>
              <Typography className='mt-[1px] text-[13px] font-medium text-[#8a93a0]'>
                {t('welcome.target.desc')}
              </Typography>
            </View>
          </View>
          <View className='mt-[12px] h-[8px] overflow-hidden rounded-[5px] bg-[#eef1f5]'>
            <View className='h-full w-[78%] rounded-[5px] bg-[#1e9e5a]' />
          </View>
        </View>

        {/* AVERAGE */}
        <View className='flex-row items-center gap-[14px] rounded-[22px] bg-white p-[15px] shadow-md'>
          <View className='h-[50px] w-[50px] items-center justify-center rounded-[15px] bg-[#efeafb]'>
            <Typography className='text-[25px]'>😴</Typography>
          </View>
          <View className='min-w-0 flex-1'>
            <View className='flex-row flex-wrap items-center gap-[8px]'>
              <Typography className='rounded-[8px] bg-[#efeafb] px-[8px] py-[3px] text-[11px] font-extrabold uppercase tracking-wide text-[#7a45d6]'>
                {t('types.average')}
              </Typography>
              <Typography className='text-[12px] font-semibold text-[#8a93a0]'>
                {t('welcome.average.stat')}
              </Typography>
            </View>
            <Typography className='mt-[5px] text-[17px] font-extrabold tracking-tight text-[#0f172a]'>
              {t('welcome.average.title')}
            </Typography>
            <Typography className='mt-[1px] text-[13px] font-medium text-[#8a93a0]'>
              {t('welcome.average.desc')}
            </Typography>
          </View>
          <View className='h-[40px] flex-row items-end gap-[3px]'>
            {AVG_BARS.map((b, i) => (
              <View
                key={i}
                className={`w-[7px] rounded-[3px] ${b.h} ${b.bg}`}
              />
            ))}
          </View>
        </View>
      </View>

      {/* CTA */}
      <View className='px-[26px] pb-[16px] pt-[12px]'>
        <Pressable
          onPress={start}
          className='items-center rounded-[18px] bg-[#1e9e5a] py-[17px] shadow-md active:opacity-90'
        >
          <Typography className='text-[18px] font-extrabold tracking-tight text-white'>
            {t('welcome.cta')}
          </Typography>
        </Pressable>
        {Platform.OS === 'ios' && (
          <Pressable
            onPress={restore}
            className='items-center pb-[2px] pt-[13px] active:opacity-70'
          >
            <Typography className='text-[16px] font-bold text-[#2952cc]'>
              {t('welcome.restore')}
            </Typography>
          </Pressable>
        )}
      </View>
    </View>
  )
}
