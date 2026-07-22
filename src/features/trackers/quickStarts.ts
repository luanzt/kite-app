import type {
  TrackerType,
  Accumulation,
  Period
} from '@features/trackers/types'

export type QuickStart = {
  key: string // i18n key under quickStart.items
  type: TrackerType
  icon: string
  color: string
  unit?: string
  targetValue?: number
  accumulation?: Accumulation
  period?: Period
}

export const QUICK_STARTS: QuickStart[] = [
  {
    key: 'water',
    type: 'average',
    icon: 'drop',
    color: 'cyan',
    unit: 'glasses',
    targetValue: 8,
    period: 'daily'
  },
  {
    key: 'exercise',
    type: 'habit',
    icon: 'dumbbell',
    color: 'orange',
    targetValue: 1,
    period: 'daily'
  },
  {
    key: 'save',
    type: 'target',
    icon: 'piggy',
    color: 'green',
    unit: '$',
    targetValue: 1000,
    accumulation: 'sum'
  },
  {
    key: 'read',
    type: 'target',
    icon: 'book',
    color: 'purple',
    unit: 'books',
    targetValue: 12,
    accumulation: 'sum'
  },
  {
    key: 'sleep',
    type: 'average',
    icon: 'moon',
    color: 'indigo',
    unit: 'hours',
    targetValue: 8,
    period: 'daily'
  },
  {
    key: 'meditate',
    type: 'habit',
    icon: 'lotus',
    color: 'blue',
    targetValue: 1,
    period: 'daily'
  },
  {
    key: 'steps',
    type: 'average',
    icon: 'walk',
    color: 'teal',
    unit: 'steps',
    targetValue: 10000,
    period: 'daily'
  },
  {
    key: 'weight',
    type: 'target',
    icon: 'scale',
    color: 'pink',
    unit: 'kg',
    accumulation: 'latest'
  }
]

export function findQuickStart(key: string): QuickStart | undefined {
  return QUICK_STARTS.find((qs) => qs.key === key)
}
