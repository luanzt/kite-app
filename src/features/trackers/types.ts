export type TrackerType = 'habit' | 'target' | 'average' | 'project'
export type HabitDirection = 'good' | 'bad'
export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type Accumulation = 'sum' | 'latest'
export type PaceStatus = 'on_track' | 'behind' | 'ahead' | 'none'
/** Time-of-day grouping for a habit (Strides-style "Routine"). */
export type Routine = 'any' | 'morning' | 'afternoon' | 'evening'
/** Average only: which entries feed the mean (Strides "Average"). */
export type AverageWindow = 'since_start' | 'rolling'
/** Average only: when the Today row counts as done (Strides "Move to Done"). */
export type DoneRule = 'when_logged' | 'when_goal_met'
/** Average only: what fills the progress bar (Strides "Progress Bar"). */
export type ProgressBasis = 'overall_avg' | 'today_total'

export type Tracker = {
  id: string
  name: string
  type: TrackerType
  icon: string
  color: string
  unit: string | null
  direction: HabitDirection | null
  targetValue: number | null
  startValue: number | null
  accumulation: Accumulation | null
  startDate: string // ISO date
  deadline: string | null // ISO date
  period: Period | null
  repeatDays: number[] | null // 0=Sun..6=Sat
  routine: Routine | null // time-of-day grouping (habit)
  reminderTime: string | null // "HH:MM" 24h, null = reminders off
  goalNote: string | null // free-text motivation note pinned to the goal (habit Notes tab)
  averageWindow: AverageWindow | null // average only; null = since_start
  rollingDays: number | null // average only: rolling window in calendar days
  doneRule: DoneRule | null // average only; null = when_logged
  progressBasis: ProgressBasis | null // average only; null = overall_avg
  createdAt: string // ISO datetime
  archived: boolean
}

export type Entry = {
  id: string
  trackerId: string
  date: string // ISO date (YYYY-MM-DD) — the day this log belongs to
  value: number
  note: string | null
  createdAt: string // ISO datetime — when logged; orders multiple logs per day
}

export type Milestone = {
  id: string
  trackerId: string
  title: string
  dueDate: string | null // ISO date
  progress: number // 0..1
  orderIndex: number
}

export type TrackerProgress = {
  current: number
  goal: number
  percent: number // 0..1
  paceStatus: PaceStatus
  streak?: number
  successRate?: number // 0..1
  expected?: number | null // value you should have reached by today (timeline)
}
