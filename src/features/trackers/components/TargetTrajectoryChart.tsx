import { View } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import Svg, {
  Line,
  Path,
  Circle,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop
} from 'react-native-svg'
import type { Tracker, Entry } from '@features/trackers/types'
import { calculateTarget } from '@features/trackers/calculators/target'
import { buildTargetTrajectory } from '@features/trackers/calculators'
import { fmtValCompact, fmtCompact } from '@features/trackers/detailFormat'
import { daysBetween, toISODate } from '@utils/date'

// viewBox coordinate space (matches the design's 350x210 canvas)
const VB_W = 350
const VB_H = 210
const X0 = 44
const X1 = 342
const Y_TOP = 12
const Y_BOT = 186
const PLOT_W = X1 - X0
const PLOT_H = Y_BOT - Y_TOP
const Y_TICKS = 5
const X_TICKS = 5

/**
 * TargetTrajectoryChart — the actual-vs-ideal-vs-projected line chart. All
 * domain values come from buildTargetTrajectory; this component only maps them
 * to the fixed viewBox and builds SVG path strings (SVG geometry is the
 * documented inline-style exception, expressed as SVG props here).
 */
export function TargetTrajectoryChart({
  tracker,
  entries
}: {
  tracker: Tracker
  entries: Entry[]
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const today = toISODate(new Date())
  const p = calculateTarget(tracker, entries, today)
  const traj = buildTargetTrajectory(tracker, entries, today)

  const start = tracker.startValue ?? 0
  const goal = tracker.targetValue ?? 0
  const vMin = Math.min(start, goal)
  const vMax = Math.max(start, goal) || 1

  // domain → viewBox mappers. Day axis is anchored on startDate.
  const totalDays = tracker.deadline
    ? Math.max(1, daysBetween(tracker.startDate, tracker.deadline))
    : Math.max(
        1,
        daysBetween(
          tracker.startDate,
          traj.series.length ? traj.series[traj.series.length - 1].date : today
        )
      )
  const xr = (iso: string) => {
    const d = Math.max(
      0,
      Math.min(totalDays, daysBetween(tracker.startDate, iso))
    )
    return X0 + (d / totalDays) * PLOT_W
  }
  const yr = (v: number) => Y_BOT - ((v - vMin) / (vMax - vMin || 1)) * PLOT_H

  // actual line + area
  const pts = traj.series.map((s) => [xr(s.date), yr(s.value)] as const)
  const actualPath = pts.length
    ? 'M ' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')
    : ''
  const areaPath =
    pts.length > 0
      ? `${actualPath} L ${pts[pts.length - 1][0].toFixed(
          1
        )} ${Y_BOT} L ${pts[0][0].toFixed(1)} ${Y_BOT} Z`
      : ''
  const last = pts.length ? pts[pts.length - 1] : null

  // Projected dashed line: draw to the value the CURRENT RATE actually
  // reaches by the deadline (capped at the goal), not to the goal-crossing
  // point. Otherwise a behind-pace trajectory would still visually end at
  // the goal on the deadline edge (xr clamps X there), implying on-track.
  let projectedEnd: readonly [number, number] | null = null
  if (last && traj.projected && tracker.deadline) {
    const daysElapsed = daysBetween(tracker.startDate, today)
    if (daysElapsed > 0) {
      const rate = (p.current - start) / daysElapsed
      const daysToDeadline = daysBetween(today, tracker.deadline)
      const projectedAtDeadline = p.current + rate * daysToDeadline
      const cappedValue =
        goal >= start
          ? Math.min(goal, projectedAtDeadline)
          : Math.max(goal, projectedAtDeadline)
      projectedEnd = [xr(tracker.deadline), yr(cappedValue)] as const
    }
  }
  const projectedPath =
    last && projectedEnd
      ? `M ${last[0].toFixed(1)} ${last[1].toFixed(
          1
        )} L ${projectedEnd[0].toFixed(1)} ${projectedEnd[1].toFixed(1)}`
      : ''

  // ideal dotted diagonal
  const ideal = traj.idealLine
  const idealX0 = ideal ? xr(ideal.start.date) : 0
  const idealY0 = ideal ? yr(ideal.start.value) : 0
  const idealX1 = ideal ? xr(ideal.end.date) : 0
  const idealY1 = ideal ? yr(ideal.end.value) : 0

  // y grid ticks (value labels)
  const yGrid = Array.from({ length: Y_TICKS }, (_, i) => {
    const v = vMin + ((vMax - vMin) * i) / (Y_TICKS - 1)
    return { y: yr(v), label: fmtCompact(v) }
  })

  // x labels (date at even day offsets)
  const xLabels = Array.from({ length: X_TICKS }, (_, i) => {
    const dayOffset = Math.round((totalDays * i) / (X_TICKS - 1))
    const iso = new Date(
      Date.parse(`${tracker.startDate}T00:00:00Z`) + dayOffset * 86_400_000
    )
      .toISOString()
      .slice(0, 10)
    const label = new Date(`${iso}T00:00:00Z`).toLocaleDateString(lang, {
      day: 'numeric',
      month: 'numeric',
      timeZone: 'UTC'
    })
    return { x: X0 + (dayOffset / totalDays) * PLOT_W, label }
  })

  const hasPace = p.paceStatus !== 'none'
  const aheadAmount =
    p.expected != null ? Math.abs(p.current - p.expected) : null
  const paceDirKey =
    p.paceStatus === 'behind'
      ? 'behind'
      : p.paceStatus === 'ahead'
      ? 'ahead'
      : 'onTrack'
  const todayLabel = new Date(`${today}T00:00:00Z`).toLocaleDateString(lang, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  })

  return (
    <View className='mx-s5 mb-s5 rounded-xl-k border border-line bg-surface p-s5 shadow-md'>
      {/* header */}
      <View className='mb-s3 flex-row items-start justify-between'>
        <View>
          <Typography className='text-h3-k font-bold text-brand'>
            {todayLabel}
          </Typography>
          {hasPace ? (
            <Typography className='mt-[1px] text-sm text-ink-3'>
              {`${t('detail.pace')}: ${fmtValCompact(
                tracker,
                p.expected ?? 0
              )}`}
            </Typography>
          ) : null}
        </View>
        <View className='items-end'>
          <Typography className='text-h3-k font-bold text-brand'>
            {fmtValCompact(tracker, p.current)}
          </Typography>
          {hasPace && aheadAmount != null ? (
            <Typography className='mt-[1px] text-sm font-bold text-brand'>
              {`${fmtValCompact(tracker, aheadAmount)} ${t(
                `detail.${paceDirKey}`
              ).toLowerCase()}`}
            </Typography>
          ) : null}
        </View>
      </View>

      {/* chart */}
      <Svg width='100%' viewBox={`0 0 ${VB_W} ${VB_H}`}>
        <Defs>
          <LinearGradient id='kite-traj-area' x1='0' y1='0' x2='0' y2='1'>
            <Stop offset='0' stopColor='#2456b5' stopOpacity={0.28} />
            <Stop offset='1' stopColor='#2456b5' stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        {yGrid.map((g, i) => (
          <Line
            key={`grid-${i}`}
            x1={X0}
            y1={g.y}
            x2={X1}
            y2={g.y}
            stroke='#eef1f5'
            strokeWidth={1}
          />
        ))}
        {yGrid.map((g, i) => (
          <SvgText
            key={`ylab-${i}`}
            x={X0 - 6}
            y={g.y + 3.5}
            textAnchor='end'
            fontSize={10}
            fontWeight='700'
            fill='#8a8e80'
          >
            {g.label}
          </SvgText>
        ))}

        {/* goal line */}
        <Line
          x1={X0}
          y1={yr(goal)}
          x2={X1}
          y2={yr(goal)}
          stroke='#2456b5'
          strokeWidth={1.5}
        />

        {/* ideal dotted */}
        {ideal ? (
          <Line
            x1={idealX0}
            y1={idealY0}
            x2={idealX1}
            y2={idealY1}
            stroke='#8a8e80'
            strokeWidth={1.5}
            strokeDasharray='1 5'
            strokeLinecap='round'
            opacity={0.7}
          />
        ) : null}

        {/* actual area + line */}
        {areaPath ? <Path d={areaPath} fill='url(#kite-traj-area)' /> : null}
        {actualPath ? (
          <Path
            d={actualPath}
            fill='none'
            stroke='#2456b5'
            strokeWidth={2.8}
            strokeLinejoin='round'
            strokeLinecap='round'
          />
        ) : null}

        {/* projected dashed */}
        {projectedPath ? (
          <Path
            d={projectedPath}
            fill='none'
            stroke='#5b8af0'
            strokeWidth={2.4}
            strokeDasharray='7 6'
            strokeLinecap='round'
          />
        ) : null}

        {/* current dot */}
        {last ? (
          <Circle
            cx={last[0]}
            cy={last[1]}
            r={4.5}
            fill='#2456b5'
            stroke='#ffffff'
            strokeWidth={2}
          />
        ) : null}

        {xLabels.map((x, i) => (
          <SvgText
            key={`xlab-${i}`}
            x={x.x}
            y={205}
            textAnchor='middle'
            fontSize={10}
            fontWeight='700'
            fill='#8a8e80'
          >
            {x.label}
          </SvgText>
        ))}
      </Svg>

      {/* legend */}
      <View className='mt-s3 flex-row justify-center gap-s5'>
        <LegendItem color='#2456b5' label={t('detail.chartActual')} />
        <LegendItem color='#5b8af0' label={t('detail.chartProjected')} dashed />
        <LegendItem color='#8a8e80' label={t('detail.chartIdeal')} dotted />
      </View>
    </View>
  )
}

function LegendItem({
  color,
  label,
  dashed,
  dotted
}: {
  color: string
  label: string
  dashed?: boolean
  dotted?: boolean
}) {
  return (
    <View className='flex-row items-center gap-s2'>
      <Svg width={16} height={3}>
        <Line
          x1={0}
          y1={1.5}
          x2={16}
          y2={1.5}
          stroke={color}
          strokeWidth={3}
          strokeLinecap='round'
          strokeDasharray={dashed ? '5 4' : dotted ? '1 3' : undefined}
        />
      </Svg>
      <Typography className='text-xs font-bold text-ink-2'>{label}</Typography>
    </View>
  )
}
