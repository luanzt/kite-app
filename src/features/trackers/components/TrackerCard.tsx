import { Pressable, View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type {
  Tracker,
  Entry,
  Milestone,
  TrackerProgress,
  PaceStatus
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
  periodSessions,
  type PeriodUnit
} from '@features/trackers/calculators/habitStats'
import { useEntries, useMilestones } from '@features/trackers/queries'
import { toISODate } from '@utils/date'
import {
  Icons,
  colorHex,
  progressFill,
  paceLabelKey,
  hexA,
  iconEmoji
} from '@features/trackers/icons'
import {
  fmtNum,
  fmtCompact,
  fmtShortDate
} from '@features/trackers/detailFormat'
import { cadenceLabel } from '@features/trackers/habitLabels'
import { useThemeColors } from '@hooks/useThemeColors'
import { PaceBar } from './PaceBar'
import { Ring } from './Ring'
import { MiniBars } from './MiniBars'
import { TypeBadge } from './TypeBadge'

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
// Pace word → Tailwind text-color class (the word itself comes from the
// existing i18n-keyed `paceLabelKey`).
const PACE_TEXT_CLASS: Record<PaceStatus, string> = {
  on_track: 'text-pace-on',
  behind: 'text-pace-behind',
  ahead: 'text-pace-ahead',
  none: 'text-pace-none'
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
  const c = useThemeColors()
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
  // A bad habit's ring stays green while within the limit (n <= goal) and only
  // turns red once the limit is exceeded (n > goal). The "/goal" cap is always
  // red regardless — it marks the limit itself.
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

  // Sub-line under the name: cadence for habits, limit for bad habits, goal/target
  // for the rest. Decreasing target gets a ↓ prefix so its shrinking number reads.
  const isDecreasingTarget =
    tracker.type === 'target' &&
    tracker.startValue != null &&
    tracker.startValue > (tracker.targetValue ?? 0)
  let subLine: string
  if (tracker.type === 'habit') {
    subLine = cadenceLabel(tracker, t)
  } else if (tracker.type === 'average') {
    subLine = t('today.targetIs', {
      value: fmtCompact(tracker.targetValue ?? 0)
    })
  } else {
    // target / project → the goal line, reusing the right-rail statLabel
    subLine = isDecreasingTarget ? `↓ ${statLabel}` : statLabel
  }
  // Average sparkline series — compute ONCE here, reuse in the rail below.
  const avgSessions =
    tracker.type === 'average' ? periodSessions(tracker, entries, today) : null

  return (
    <Pressable onPress={onPress} className='active:opacity-90'>
      <View className='gap-s3 rounded-lg-k border border-line bg-surface p-s4 shadow-sm'>
        {/* top row: tile · (badge + inline stat / name / sub-line) · rail */}
        <View className='flex-row items-start gap-s3'>
          <View
            className='h-[46px] w-[46px] items-center justify-center rounded-full'
            // runtime: tint blended from the user-chosen tracker.color
            style={{ backgroundColor: hexA(tracker.color, 0.14) }}
          >
            <Typography className='text-[22px]'>
              {iconEmoji(tracker.icon)}
            </Typography>
          </View>

          <View className='min-w-0 flex-1'>
            <View className='flex-row items-center gap-s2'>
              <TypeBadge type={tracker.type} />
              {tracker.type === 'habit' ? (
                <View className='flex-row items-center gap-s1'>
                  <Icons.Flame
                    size={13}
                    color={(p.streak ?? 0) > 0 ? c.pace.on_track : c.pace.none}
                  />
                  <Typography
                    className={`text-sm font-semibold ${
                      (p.streak ?? 0) > 0 ? 'text-pace-on' : 'text-ink-3'
                    }`}
                  >
                    {`${p.streak ?? 0} ${t(
                      UNIT_NOUN_KEY[periodUnitOf(tracker)],
                      {
                        count: p.streak ?? 0
                      }
                    )}`}
                  </Typography>
                </View>
              ) : tracker.type === 'average' ? (
                <Typography className='text-sm font-semibold text-ink-3'>
                  {`${statValue} · ${statLabel}`}
                </Typography>
              ) : (
                // target / project → pace chip
                <Typography
                  className={`text-sm font-bold ${
                    PACE_TEXT_CLASS[p.paceStatus]
                  }`}
                >
                  {`${Math.round(p.percent * 100)}% · ${t(
                    paceLabelKey(p.paceStatus)
                  )}`}
                </Typography>
              )}
            </View>

            <Typography
              numberOfLines={1}
              className='mt-[5px] text-lg font-bold text-ink'
            >
              {tracker.name}
            </Typography>
            <Typography
              numberOfLines={1}
              className='mt-[1px] text-sm text-ink-3'
            >
              {subLine}
            </Typography>
          </View>

          {/* rail: habit ring, average sparkline, else nothing */}
          {tracker.type === 'habit' ? (
            <View className='items-center justify-center'>
              <Ring
                fraction={barPercent}
                color={
                  isBadHabit
                    ? badOver
                      ? c.pace.behind
                      : c.pace.on_track
                    : progressFill(barStatus, c.pace, c.brand)
                }
                size={46}
                strokeWidth={4.5}
              />
              <View className='absolute inset-0 items-center justify-center'>
                <Typography
                  className={`text-xs font-extrabold ${
                    badOver ? 'text-pace-behind' : 'text-ink'
                  }`}
                >
                  {isBadHabit ? (
                    <>
                      {`${habitN}`}
                      <Typography className='text-xs font-extrabold text-pace-behind'>
                        {`/${habitGoal}`}
                      </Typography>
                    </>
                  ) : (
                    `${habitN}/${habitGoal}`
                  )}
                </Typography>
              </View>
            </View>
          ) : tracker.type === 'average' && avgSessions ? (
            <MiniBars
              values={avgSessions.bars.map((b) => b.count)}
              scaleMax={avgSessions.scaleMax}
              color={colorHex(tracker.color)}
            />
          ) : null}
        </View>

        {/* below: target / project gradient bar with the current value */}
        {tracker.type === 'target' || tracker.type === 'project' ? (
          <View className='flex-row items-center gap-s2'>
            <View className='flex-1'>
              <PaceBar percent={barPercent} paceStatus={barStatus} height={8} />
            </View>
            <Typography className='text-sm font-extrabold text-ink'>
              {statValue}
            </Typography>
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}
