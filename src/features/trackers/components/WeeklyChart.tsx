import { useRef } from 'react'
import { FlatList, View } from 'react-native'
import type { FlatList as FlatListType } from 'react-native'
import { Typography } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import type {
  PeriodSessions,
  WeekBar
} from '@features/trackers/calculators/habitStats'
import { useThemeColors } from '@hooks/useThemeColors'

const CHART_H = 144
const BAR_W = 44 // fixed per-bar column width (see renderItem's w-[44px])

/**
 * Daily chart — one bar per day, horizontally scrollable (newest on the right,
 * scroll left for older days). Each bar shows the number of logs that day (0 if
 * none); a day that meets the per-day target is green, a partial day is blue.
 */
function DailyBarChart({
  data,
  formatLabel
}: {
  data: PeriodSessions
  formatLabel: (startISO: string) => string
}) {
  const { t } = useTranslation()
  const c = useThemeColors()
  const listRef = useRef<FlatListType<WeekBar>>(null)
  const target = data.perDayTarget ?? 1
  // target line offset from the baseline, capped to the top of the plot
  const targetRatio = Math.min(1, target / data.scaleMax)
  // the "GOAL N" label sits on the target line; hide any grey Y-axis tick that
  // lands on the same value to avoid two numbers overlapping
  const midValue = Math.round(data.scaleMax / 2)
  const hideTopLabel = data.scaleMax === target
  const hideMidLabel = midValue === target

  const renderItem = ({ item: b }: { item: WeekBar }) => {
    const met = b.count > 0 && b.count >= target
    return (
      <View className='w-[44px] items-center'>
        <View className='h-[144px] w-full justify-end'>
          {b.count > 0 ? (
            <View
              className={`mx-[3px] items-center rounded-t-[6px] pt-[3px] ${
                met ? 'bg-pace-on' : 'bg-brand'
              }`}
              // value-derived height, floored so the count stays readable
              style={{
                height: Math.max(20, (b.count / data.scaleMax) * CHART_H)
              }}
            >
              {/* logged → count shown inside the top of the bar, in white */}
              <Typography className='text-[11px] font-bold text-on-accent'>
                {b.count}
              </Typography>
            </View>
          ) : (
            // not logged → a muted 0 sitting on the baseline
            <Typography className='mb-[2px] text-center text-xs-k font-bold text-ink-3'>
              0
            </Typography>
          )}
        </View>
        <Typography
          className='mt-s2 text-center text-[10px] font-bold text-ink-3'
          numberOfLines={1}
        >
          {formatLabel(b.startISO)}
        </Typography>
      </View>
    )
  }

  // Y-axis ticks placed at their true value position (not evenly spaced) so a
  // rounded mid value lines up correctly relative to the goal line. Dedupe by
  // value so a tiny scale (e.g. max 1) doesn't stack two ticks on each other.
  const ticks = [
    { value: data.scaleMax, hide: hideTopLabel },
    { value: midValue, hide: hideMidLabel },
    { value: 0, hide: false }
  ].filter((tick, i, all) => all.findIndex((o) => o.value === tick.value) === i)

  return (
    <View className='flex-row'>
      {/* y axis — ticks positioned by value */}
      <View className='h-[144px] w-[28px]'>
        {ticks.map((tick) => (
          <Typography
            key={tick.value}
            className='absolute right-s1 text-[10px] font-bold text-ink-3'
            numberOfLines={1}
            // -6px centers the ~12px label on its value line
            style={{ bottom: (tick.value / data.scaleMax) * CHART_H - 6 }}
          >
            {tick.hide ? '' : tick.value}
          </Typography>
        ))}
      </View>

      {/* scrollable bars */}
      <View className='relative flex-1 border-b border-l border-r border-line'>
        {/* target line — fixed across the plot at the per-day target value.
            Pinned to a 144px overlay from the top so it lines up with the bar
            baseline (bars sit at the bottom of their own 144px column).
            pointerEvents none so it doesn't swallow the FlatList scroll gesture. */}
        <View
          pointerEvents='none'
          className='absolute left-0 right-0 top-0 z-10 h-[144px]'
        >
          <View
            className={`absolute left-0 right-0 border-t border-dashed ${
              c.isDark ? 'border-[#89b0f4]' : 'border-[#9db8e4]'
            }`}
            style={{ bottom: targetRatio * CHART_H }} // value-derived offset
          >
            {/* label sits to the LEFT of the Y axis, one line: "Goal 2" */}
            <View className='absolute left-[-58px] top-[-8px] w-[54px] flex-row items-center justify-end gap-s1 pr-s1'>
              <Typography className='text-[9px] font-bold uppercase text-brand'>
                {t('detail.goal')}
              </Typography>
              <Typography className='text-[11px] font-bold text-brand'>
                {target}
              </Typography>
            </View>
          </View>
        </View>
        <FlatList
          ref={listRef}
          data={data.bars}
          keyExtractor={(b) => b.startISO}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          // bars are fixed-width → a static layout lets us open scrolled to the
          // end (today) without waiting on measurement, so the user starts on
          // the most recent day and scrolls LEFT into the past.
          getItemLayout={(_, index) => ({
            length: BAR_W,
            offset: BAR_W * index,
            index
          })}
          initialScrollIndex={Math.max(0, data.bars.length - 1)}
          // belt-and-suspenders: also snap to the end once content is laid out,
          // in case initialScrollIndex is clamped on the first frame
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
        />
      </View>
    </View>
  )
}

/**
 * Sessions trend. Daily habits get a scrollable per-day bar chart; weekly /
 * monthly / yearly get fixed bars with a dashed goal line. Bar heights and the
 * goal-line offset are runtime-dynamic → inline style.
 */
export function WeeklyChart({
  data,
  formatLabel
}: {
  data: PeriodSessions
  formatLabel: (startISO: string) => string
}) {
  const { t } = useTranslation()

  if (data.unit === 'day') {
    return <DailyBarChart data={data} formatLabel={formatLabel} />
  }

  const showGoal = data.goal > 0
  const goalRatio = Math.min(1, data.goal / data.scaleMax)

  return (
    <View>
      <View className='h-[144px] flex-row'>
        {/* y axis */}
        <View className='w-[24px] items-end justify-between pr-s1'>
          <Typography className='text-[10px] font-bold text-ink-3'>
            {data.scaleMax}
          </Typography>
          <Typography className='text-[10px] font-bold text-ink-3'>
            {Math.round(data.scaleMax / 2)}
          </Typography>
          <Typography className='text-[10px] font-bold text-ink-3'>
            0
          </Typography>
        </View>

        {/* plot */}
        <View className='relative ml-s1 flex-1 border-b border-l border-line'>
          {showGoal ? (
            <View
              className='absolute left-0 right-0 border-t-2 border-dashed border-brand'
              style={{ bottom: goalRatio * CHART_H }} // data-derived offset
            >
              <Typography className='absolute right-s1 top-[-9px] bg-surface px-s1 text-[10px] font-bold text-brand'>
                {`${t('detail.goal')} ${data.goal}`}
              </Typography>
            </View>
          ) : null}

          {/* bars */}
          <View className='flex-1 flex-row items-end justify-around px-s2'>
            {data.bars.map((b) => (
              <View
                key={b.startISO}
                className='flex-1 items-center justify-end'
              >
                <Typography className='mb-[2px] text-sm font-bold text-ink'>
                  {b.count}
                </Typography>
                <View
                  className={`w-[38px] rounded-t-[6px] ${
                    b.partial ? 'bg-brand opacity-60' : 'bg-brand'
                  }`}
                  style={{ height: (b.count / data.scaleMax) * CHART_H }} // value-derived
                />
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* x labels (offset to clear the y axis) */}
      <View className='ml-[28px] flex-row px-s2'>
        {data.bars.map((b) => (
          <Typography
            key={b.startISO}
            className='mt-s2 flex-1 text-center text-xs font-bold text-ink-3'
            numberOfLines={1}
          >
            {formatLabel(b.startISO)}
          </Typography>
        ))}
      </View>
    </View>
  )
}
