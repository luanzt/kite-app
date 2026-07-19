import { Pressable, View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
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
import {
  periodGoalOf,
  periodTotal,
  periodUnitOf,
  habitBarStatus,
  type PeriodUnit
} from '@features/trackers/calculators/habitStats'
import { useEntries, useMilestones } from '@features/trackers/queries'
import { toISODate } from '@utils/date'
import {
  Icons,
  PACE_COLOR,
  PACE_DOT_CLASS,
  hexA,
  iconEmoji
} from '@features/trackers/icons'
import {
  fmtNum,
  fmtCompact,
  fmtShortDate
} from '@features/trackers/detailFormat'
import { PaceBar } from './PaceBar'

// Right-rail label naming the window the habit stat covers, per its cadence.
const HABIT_WINDOW_LABEL: Record<PeriodUnit, string> = {
  day: 'list.today',
  week: 'list.thisWeek',
  month: 'list.thisMonth',
  year: 'list.thisYear'
}
// Streak unit noun (pluralizable) by cadence — reads "1 month" / "2 months".
const UNIT_NOUN_KEY: Record<PeriodUnit, string> = {
  day: 'unit.day',
  week: 'unit.week',
  month: 'unit.month',
  year: 'unit.year'
}

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

export function TrackerCard({
  tracker,
  onPress
}: {
  tracker: Tracker
  onPress: () => void
}) {
  const { t, i18n } = useTranslation()
  // Each card loads its own data — TanStack Query caches per tracker and the
  // log/save mutations invalidate these keys, so the list stays live.
  const { data: entries = [] } = useEntries(tracker.id)
  const { data: milestones = [] } = useMilestones(tracker.id)
  const p = progressFor(tracker, entries, milestones)
  const today = toISODate(new Date())
  const lang = i18n.language

  // Habit bar/stat track the Yes count over the current PERIOD window (day/
  // week/month/year) vs the per-period goal; a bad habit counts slips against
  // its limit instead (0 = full abstinence). A daily habit's window is today,
  // so this matches the old per-day behavior for the common case.
  const isBadHabit = tracker.type === 'habit' && tracker.direction === 'bad'
  const habitGoal = isBadHabit
    ? tracker.targetValue ?? 0
    : periodGoalOf(tracker)
  const habitN =
    tracker.type === 'habit' ? periodTotal(tracker, entries, today) : 0
  const badOver = isBadHabit && habitN > habitGoal
  const barPercent =
    tracker.type === 'habit'
      ? isBadHabit
        ? badOver
          ? 1 // over the limit → full red
          : habitGoal > 0
          ? (habitGoal - habitN) / habitGoal // remaining quota drains per slip
          : 1 // limit 0: full green while clean
        : habitGoal
        ? habitN / habitGoal
        : 0
      : p.percent
  const barStatus: typeof p.paceStatus =
    tracker.type === 'habit'
      ? habitBarStatus(habitN, habitGoal, isBadHabit)
      : p.paceStatus

  // Strides-style right rail: big stat + a small context label under it.
  let statValue: string
  let statLabel: string
  if (tracker.type === 'habit') {
    // Always slips/limit (e.g. "7/5") — over the limit only the color flips
    // to red, matching the Today ring.
    statValue = `${habitN}/${habitGoal}`
    statLabel = t(HABIT_WINDOW_LABEL[periodUnitOf(tracker)])
  } else if (tracker.type === 'average') {
    if (tracker.progressBasis === 'today_total') {
      const total = entries
        .filter((e) => e.date.slice(0, 10) === today)
        .reduce((s, e) => s + e.value, 0)
      statValue = fmtNum(total)
      statLabel = t('list.today')
    } else {
      statValue = fmtNum(p.current)
      statLabel = t(
        tracker.period === 'weekly'
          ? 'list.avgPerWeek'
          : tracker.period === 'monthly'
          ? 'list.avgPerMonth'
          : 'list.avgPerDay'
      )
    }
  } else if (tracker.type === 'project') {
    const done = milestones.filter((m) => m.progress >= 1).length
    statValue = `${Math.round(p.percent * 100)}%`
    statLabel = tracker.deadline
      ? t('list.due', { date: fmtShortDate(tracker.deadline, lang) })
      : `${done}/${milestones.length}`
  } else {
    // target
    statValue = fmtCompact(p.current)
    statLabel = tracker.deadline
      ? t('list.goalBy', {
          value: fmtCompact(p.goal),
          date: fmtShortDate(tracker.deadline, lang)
        })
      : t('list.goal', { value: fmtCompact(p.goal) })
  }

  // Habit keeps its streak/success context under the bar.
  const habitSub =
    tracker.type === 'habit' ? (
      <View className='flex-row items-center gap-s2'>
        <View className='flex-row items-center gap-s1'>
          <Icons.Flame size={14} color={PACE_COLOR.on_track} />
          <Typography className='text-sm text-ink-2'>{`${p.streak ?? 0} ${t(
            UNIT_NOUN_KEY[periodUnitOf(tracker)],
            { count: p.streak ?? 0 }
          )}`}</Typography>
        </View>
        <Typography className='text-sm text-ink-3'>·</Typography>
        <Typography className='text-sm text-ink-2'>{`${Math.round(
          (p.successRate ?? 0) * 100
        )}% ${t('detail.success')}`}</Typography>
      </View>
    ) : null

  return (
    <Pressable onPress={onPress} className='active:opacity-90'>
      <View className='flex-row items-center gap-s4 rounded-lg-k border border-line bg-surface p-s4 shadow-sm'>
        {/* tile — emoji on a tint of the tracker's color */}
        <View
          className='h-[44px] w-[44px] items-center justify-center rounded-md-k'
          // runtime: tint blended from the user-chosen tracker.color
          style={{ backgroundColor: hexA(tracker.color, 0.14) }}
        >
          <Typography className='text-[22px]'>
            {iconEmoji(tracker.icon)}
          </Typography>
        </View>

        {/* main column */}
        <View className='flex-1 min-w-0 gap-s2'>
          <View className='flex-row items-center gap-s2'>
            <View
              className={`h-2 w-2 rounded-full ${PACE_DOT_CLASS[p.paceStatus]}`}
            />
            <Typography
              numberOfLines={1}
              className='flex-1 text-lg font-bold text-ink'
            >
              {tracker.name}
            </Typography>
          </View>

          <PaceBar percent={barPercent} paceStatus={barStatus} height={7} />

          {habitSub}
        </View>

        {/* right rail — Strides-style stat */}
        <View className='max-w-[112px] items-end gap-s1'>
          <Typography
            numberOfLines={1}
            className={`text-[14px] font-extrabold ${
              badOver ? 'text-pace-behind' : 'text-ink'
            }`}
          >
            {isBadHabit ? (
              // "/limit" always red (slash included) — it's a cap, not a goal
              <>
                {`${habitN}`}
                <Typography className='text-[14px] font-extrabold text-pace-behind'>
                  {`/${habitGoal}`}
                </Typography>
              </>
            ) : (
              statValue
            )}
          </Typography>
          <Typography
            numberOfLines={1}
            className='text-right text-[10px] font-semibold text-ink-3'
          >
            {statLabel}
          </Typography>
        </View>
      </View>
    </Pressable>
  )
}
