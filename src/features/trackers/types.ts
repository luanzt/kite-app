export type TrackerType = 'habit' | 'target' | 'average' | 'project'
export type HabitDirection = 'good' | 'bad'
export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type Accumulation = 'sum' | 'latest'
export type PaceStatus = 'on_track' | 'behind' | 'ahead' | 'none'
/** Time-of-day grouping for a habit (Strides-style "Routine"). */
export type Routine = 'any' | 'morning' | 'afternoon' | 'evening'

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
}
