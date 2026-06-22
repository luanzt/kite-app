import { View } from 'react-native'
import { Typography } from 'heroui-native'
import Svg, {
  Path,
  Line,
  Circle,
  Defs,
  LinearGradient,
  Stop
} from 'react-native-svg'
import { useTranslation } from 'react-i18next'
import type { Entry, Tracker, PaceStatus } from '@features/trackers/types'
import { PACE_COLOR } from '@features/trackers/icons'

/**
 * History line chart rendered with raw react-native-svg (already installed) —
 * matches the design's `.chart-wrap`: gradient area fill, the actual line, an
 * optional dashed "pace target" line, faint gridlines, and an end dot.
 * Uses SVG's own <LinearGradient> so it needs no extra gradient native dep.
 */
export function HistoryChart({
  entries,
  tracker,
  paceStatus = 'none'
}: {
  entries: Entry[]
  tracker?: Tracker
  paceStatus?: PaceStatus
}) {
  const { t } = useTranslation()
  const W = 320
  const H = 150
  const pad = 8

  // Build the actual series (cumulative for sum-targets, else raw values).
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const cumulative =
    tracker?.type === 'target' && tracker?.accumulation !== 'latest'
  let running = tracker?.startValue ?? 0
  const actual = sorted.map((e) => {
    if (cumulative) {
      running += e.value
      return running
    }
    return e.value
  })
  if (actual.length === 0) {
    return null
  }
  if (actual.length === 1) {
    actual.unshift(tracker?.startValue ?? 0)
  }

  // Optional linear pace-target series (only meaningful for goal+deadline targets).
  const goal = tracker?.targetValue ?? null
  const start = tracker?.startValue ?? 0
  const showPace = goal != null && tracker?.deadline != null
  const pace = showPace
    ? actual.map(
        (_, i) => start + (goal - start) * (i / Math.max(1, actual.length - 1))
      )
    : []

  const max = Math.max(...actual, ...(showPace ? pace : []), 1) * 1.1
  const X = (i: number) =>
    pad + (i / Math.max(1, actual.length - 1)) * (W - pad * 2)
  const Y = (v: number) => H - pad - (v / max) * (H - pad * 2)

  const lineOf = (series: number[]) =>
    series
      .map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`)
      .join(' ')
  const actualLine = lineOf(actual)
  const area = `${actualLine} L${X(actual.length - 1).toFixed(1)} ${
    H - pad
  } L${X(0).toFixed(1)} ${H - pad} Z`

  const col =
    paceStatus === 'behind'
      ? PACE_COLOR.behind
      : paceStatus === 'ahead'
      ? PACE_COLOR.ahead
      : PACE_COLOR.on_track
  // legend-dot class mirrors `col` (none collapses to on_track)
  const colClass =
    paceStatus === 'behind'
      ? 'bg-pace-behind'
      : paceStatus === 'ahead'
      ? 'bg-pace-ahead'
      : 'bg-pace-on'
  const gid = `hist-${tracker?.id ?? 'x'}`

  return (
    <View className='rounded-lg-k bg-surface border border-line px-s3 pt-s4 pb-s2'>
      <Svg
        width='100%'
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio='none'
      >
        <Defs>
          <LinearGradient id={gid} x1='0' y1='0' x2='0' y2='1'>
            <Stop offset='0' stopColor={col} stopOpacity={0.22} />
            <Stop offset='1' stopColor={col} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <Line
            key={f}
            x1={pad}
            x2={W - pad}
            y1={H * f}
            y2={H * f}
            stroke='#e3e5dc'
            strokeWidth={1}
            strokeDasharray='2 4'
          />
        ))}
        <Path d={area} fill={`url(#${gid})`} />
        {showPace ? (
          <Path
            d={lineOf(pace)}
            fill='none'
            stroke='#8a8e80'
            strokeWidth={2}
            strokeDasharray='4 4'
            strokeLinecap='round'
          />
        ) : null}
        <Path
          d={actualLine}
          fill='none'
          stroke={col}
          strokeWidth={3}
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <Circle
          cx={X(actual.length - 1)}
          cy={Y(actual[actual.length - 1])}
          r={4.5}
          fill={col}
          stroke='#ffffff'
          strokeWidth={2.5}
        />
      </Svg>
      <View className='flex-row gap-s4 px-s2 pt-s2'>
        <View className='flex-row items-center gap-s1'>
          <View className={`h-0.5 w-3.5 rounded-full ${colClass}`} />
          <Typography className='text-xs text-ink-2 font-semibold'>
            {tracker?.name ?? ''}
          </Typography>
        </View>
        {showPace ? (
          <View className='flex-row items-center gap-s1'>
            <View className='w-3.5 h-0.5 rounded-full bg-ink-3' />
            <Typography className='text-xs text-ink-2 font-semibold'>
              {t('detail.shouldBe')}
            </Typography>
          </View>
        ) : null}
      </View>
    </View>
  )
}
