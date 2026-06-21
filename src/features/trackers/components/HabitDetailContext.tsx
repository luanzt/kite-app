import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { Tracker, Entry } from '@features/trackers/types'

/**
 * Shared data for the Habit Detail tab screens. A material-top-tabs navigator
 * renders its screens itself, so the screens read tracker/entries/callbacks
 * from this context instead of receiving them as props.
 */
export type HabitDetailContextValue = {
  tracker: Tracker
  entries: Entry[]
  onAddLog?: () => void
  onEditEntry?: (entry: Entry) => void
  onLogForDate?: (iso: string) => void
}

const HabitDetailContext = createContext<HabitDetailContextValue | null>(null)

export function HabitDetailProvider({
  value,
  children
}: {
  value: HabitDetailContextValue
  children: ReactNode
}) {
  return (
    <HabitDetailContext.Provider value={value}>
      {children}
    </HabitDetailContext.Provider>
  )
}

export function useHabitDetail(): HabitDetailContextValue {
  const ctx = useContext(HabitDetailContext)
  if (!ctx) {
    throw new Error('useHabitDetail must be used within a HabitDetailProvider')
  }
  return ctx
}
