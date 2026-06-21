import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { Typography } from 'heroui-native'
import Svg, { Circle } from 'react-native-svg'
import type {
  Tracker,
  Entry,
  Milestone,
  TrackerProgress
} from '@features/trackers/types'
import {
  calculateHabit,
  calculateTarget,
  calculateAverage,
  calculateProject
} from '@features/trackers/calculators'
import { toISODate } from '@utils/date'
import { Icons, PACE_COLOR, hexA, iconEmoji } from '@features/trackers/icons'
import { fmtVal } from '@features/trackers/detailFormat'
import { PaceBar } from './PaceBar'

export function progressFor(
  t: Tracker,
  entries: Entry[],
  milestones: Milestone[]
): TrackerProgress {
  const today = toISODate(new Date())
  switch (t.type) {
    case 'habit':
      return calculateHabit(t, entries, today)
    case 'target':
      return calculateTarget(t, entries, today)
    case 'average':
      return calculateAverage(t, entries, today)
    case 'project':
      return calculateProject(t, milestones, today)
    default:
      throw new Error(`Unknown tracker type: ${t.type as string}`)
  }
}

/** Circular progress ring (-90deg start), via react-native-svg. */
function Ring({
  fraction,
  color,
  size = 40,
  strokeWidth = 5
}: {
  fraction: number
  color: string
  size?: number
  strokeWidth?: number
}) {
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, fraction))
  const offset = c * (1 - clamped)
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: [{ rotate: '-90deg' }] }}
    >
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill='none'
        stroke='#e6e8df'
        strokeWidth={strokeWidth}
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill='none'
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap='round'
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
    </Svg>
  )
}

export function TrackerCard({
  tracker,
  entries,
  milestones,
  onPress
}: {
  tracker: Tracker
  entries: Entry[]
  milestones: Milestone[]
  onPress: () => void
}) {
  const p = progressFor(tracker, entries, milestones)
  const showBar = tracker.type !== 'habit'

  // Type-appropriate sub-line.
  let sub: ReactNode
  if (tracker.type === 'habit') {
    const streak = p.streak ?? 0
    const success = Math.round((p.successRate ?? 0) * 100)
    sub = (
      <View className='flex-row items-center gap-s2'>
        <View className='flex-row items-center gap-s1'>
          <Icons.Flame size={14} color={PACE_COLOR.on_track} />
          <Typography className='text-sm text-ink-2'>{`${streak} days`}</Typography>
        </View>
        <Typography className='text-sm text-ink-3'>·</Typography>
        <Typography className='text-sm text-ink-2'>{`${success}% success`}</Typography>
      </View>
    )
  } else if (tracker.type === 'average') {
    sub = (
      <Typography className='text-sm text-ink-2'>
        {`Target ${fmtVal(tracker, tracker.targetValue)} · Ø ${fmtVal(
          tracker,
          p.current
        )}`}
      </Typography>
    )
  } else if (tracker.type === 'project') {
    const done = milestones.filter((m) => m.progress >= 1).length
    sub = (
      <Typography className='text-sm text-ink-2'>
        {`${done}/${milestones.length} milestones`}
      </Typography>
    )
  } else {
    sub = (
      <Typography className='text-sm text-ink-2'>
        {`${fmtVal(tracker, p.current)} / ${fmtVal(tracker, p.goal)}`}
      </Typography>
    )
  }

  return (
    <Pressable onPress={onPress} className='active:opacity-90'>
      <View className='flex-row items-center gap-s4 rounded-lg-k border border-line bg-surface p-s4 shadow-sm'>
        {/* tile — emoji on a tint of the tracker's color (dynamic → inline) */}
        <View
          className='items-center justify-center rounded-md-k'
          style={{
            width: 44,
            height: 44,
            backgroundColor: hexA(tracker.color, 0.14)
          }}
        >
          <Typography style={{ fontSize: 22 }}>
            {iconEmoji(tracker.icon)}
          </Typography>
        </View>

        {/* main column */}
        <View className='flex-1 min-w-0 gap-s2'>
          <View className='flex-row items-center gap-s2'>
            <View
              className='rounded-full'
              style={{
                width: 8,
                height: 8,
                backgroundColor: PACE_COLOR[p.paceStatus]
              }}
            />
            <Typography
              numberOfLines={1}
              className='flex-1 text-lg font-bold text-ink'
            >
              {tracker.name}
            </Typography>
          </View>

          {showBar ? (
            <PaceBar percent={p.percent} paceStatus={p.paceStatus} height={7} />
          ) : null}

          {sub}
        </View>

        {/* right rail */}
        {tracker.type === 'habit' ? (
          <View
            className='items-center justify-center'
            style={{ width: 40, height: 40 }}
          >
            <Ring fraction={p.successRate ?? 0} color={PACE_COLOR.on_track} />
            <View className='absolute inset-0 items-center justify-center'>
              <Typography className='text-xs font-extrabold text-ink'>
                {Math.round((p.successRate ?? 0) * 100)}
              </Typography>
            </View>
          </View>
        ) : (
          <Icons.Chevron size={20} color={PACE_COLOR.none} />
        )}
      </View>
    </Pressable>
  )
}
