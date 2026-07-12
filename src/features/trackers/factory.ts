import type {
  Tracker,
  TrackerType,
  Accumulation,
  Period,
  Routine,
  AverageWindow,
  DoneRule,
  ProgressBasis
} from '@features/trackers/types'
import { toISODate } from '@utils/date'
import { DEFAULT_REMINDER } from '@features/trackers/reminders'

export function uuid(): string {
  return (
    'xxxxxxxxyxxxx'.replace(/[xy]/g, (c) => {
      const r = (Date.now() + Math.floor(Math.random() * 1e9)) % 16
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    }) + Date.now().toString(16)
  )
}

export type BuildTrackerInput = {
  name: string
  type: TrackerType
  icon?: string
  color?: string
  unit?: string | null
  targetValue?: number | null
  startValue?: number | null
  accumulation?: Accumulation | null
  period?: Period | null
  startDate?: string
  repeatDays?: number[] | null
  routine?: Routine | null
  reminderTimes?: string[]
  averageWindow?: AverageWindow | null
  rollingDays?: number | null
  doneRule?: DoneRule | null
  progressBasis?: ProgressBasis | null
}

/**
 * Build a fully-formed Tracker from minimal input, applying type-appropriate
 * defaults (habit gets direction/repeatDays/daily period; target gets startValue 0
 * and sum accumulation unless overridden). Always assigns a fresh collision-resistant id.
 */
export function buildTracker(input: BuildTrackerInput): Tracker {
  const { type } = input
  const isHabit = type === 'habit'
  const isAverage = type === 'average'
  return {
    id: uuid(),
    name: input.name,
    type,
    icon: input.icon ?? 'star',
    color: input.color ?? 'blue',
    unit: input.unit ?? null,
    // average: 'good' = "goal or more", 'bad' = "goal or less"
    direction: isHabit || isAverage ? 'good' : null,
    targetValue: input.targetValue ?? null,
    startValue: type === 'target' ? input.startValue ?? 0 : null,
    accumulation: type === 'target' ? input.accumulation ?? 'sum' : null,
    startDate: input.startDate ?? toISODate(new Date()),
    deadline: null,
    period: input.period ?? (type === 'average' || isHabit ? 'daily' : null),
    repeatDays:
      input.repeatDays ??
      (isHabit || type === 'target' ? [0, 1, 2, 3, 4, 5, 6] : null),
    routine: isHabit ? input.routine ?? 'any' : null,
    reminderTimes:
      input.reminderTimes ??
      (isHabit || type === 'target' || isAverage ? [DEFAULT_REMINDER] : []),
    goalNote: null,
    averageWindow: isAverage ? input.averageWindow ?? 'since_start' : null,
    rollingDays:
      isAverage && (input.averageWindow ?? 'since_start') === 'rolling'
        ? input.rollingDays ?? 7
        : null,
    doneRule: isAverage ? input.doneRule ?? 'when_logged' : null,
    progressBasis: isAverage ? input.progressBasis ?? 'overall_avg' : null,
    createdAt: new Date().toISOString(),
    archived: false
  }
}
