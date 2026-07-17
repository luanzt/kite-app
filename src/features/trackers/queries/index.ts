import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as repo from '@features/trackers/db/repository'
import {
  cancelTrackerReminders,
  scheduleTrackerReminders
} from '@features/trackers/notifications'
import { useAppStore } from '@store/useAppStore'
import { countPending } from '@features/trackers/sync/snapshot'
import type { Tracker, Entry, Milestone } from '@features/trackers/types'
import { trackEntryLogged, trackTrackerSaved } from '@utils/telemetry'

const keys = {
  trackers: ['trackers'] as const,
  tracker: (id: string) => ['tracker', id] as const,
  entries: (id: string) => ['entries', id] as const,
  entriesForDate: (date: string) => ['entries', 'date', date] as const,
  entriesAll: ['entries', 'all'] as const,
  milestones: (id: string) => ['milestones', id] as const
}

export function useTrackers() {
  return useQuery({
    queryKey: keys.trackers,
    queryFn: () => repo.listTrackers()
  })
}
export function useTracker(id: string) {
  return useQuery({
    queryKey: keys.tracker(id),
    queryFn: () => repo.getTracker(id)
  })
}
export function useEntries(id: string) {
  return useQuery({
    queryKey: keys.entries(id),
    queryFn: () => repo.listEntries(id)
  })
}
export function useMilestones(id: string) {
  return useQuery({
    queryKey: keys.milestones(id),
    queryFn: () => repo.listMilestones(id)
  })
}
export function useEntriesForDate(date: string) {
  return useQuery({
    queryKey: keys.entriesForDate(date),
    queryFn: () => repo.listEntriesForDate(date)
  })
}
/**
 * Every entry across all trackers — the Today screen needs this to score a
 * habit's whole period window (e.g. "3 of 3 this month"), not just one day.
 */
export function useAllEntries() {
  return useQuery({
    queryKey: keys.entriesAll,
    queryFn: () => repo.listAllEntries()
  })
}

export function useSaveTracker() {
  const qc = useQueryClient()
  const { t: tr } = useTranslation()
  return useMutation({
    mutationFn: async (t: Tracker) => {
      const isNew = repo.getTracker(t.id) == null
      repo.insertTracker(t)
      // Only schedule when the user has notifications enabled; always safe to
      // cancel-then-(maybe)-reschedule via scheduleTrackerReminders.
      const enabled = useAppStore.getState().notifyEnabled
      if (enabled) {
        const body =
          t.type === 'target'
            ? tr('notification.targetBody')
            : t.type === 'average'
            ? tr('notification.averageBody')
            : tr('notification.habitBody')
        await scheduleTrackerReminders(t, body)
      } else {
        await cancelTrackerReminders(t.id)
      }
      return { isNew }
    },
    onSuccess: ({ isNew }, t) => {
      qc.invalidateQueries({ queryKey: keys.trackers })
      qc.invalidateQueries({ queryKey: keys.tracker(t.id) })
      trackTrackerSaved(t.type, isNew)
    }
  })
}
export function useDeleteTracker() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      repo.deleteTracker(id)
      await cancelTrackerReminders(id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.trackers })
  })
}
export function useLogEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (e: Entry) => repo.insertEntry(e),
    onSuccess: (_data, entry) => {
      // Invalidate the whole 'entries' subtree: per-tracker, per-date, and the
      // all-entries cache the Today screen uses for period-window scoring.
      qc.invalidateQueries({ queryKey: ['entries'] })
      qc.invalidateQueries({ queryKey: keys.trackers })
      const tracker = repo.getTracker(entry.trackerId)
      if (tracker) trackEntryLogged(tracker.type)
    }
  })
}
export function useDeleteEntry() {
  const qc = useQueryClient()
  return useMutation({
    // trackerId is passed alongside id only so onSuccess can invalidate its cache.
    mutationFn: async ({ id }: { id: string; trackerId: string }) =>
      repo.deleteEntry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] })
      qc.invalidateQueries({ queryKey: keys.trackers })
    }
  })
}
export function useSaveMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (m: Milestone) => repo.upsertMilestone(m),
    onSuccess: (_d, m) =>
      qc.invalidateQueries({ queryKey: keys.milestones(m.trackerId) })
  })
}

/**
 * Sync & Backup screen stats. Keyed on lastSyncedAt so a completed sync
 * refetches; runSync's blanket invalidateQueries() also covers it.
 */
export function useSyncStats(lastSyncedAt: string | null) {
  return useQuery({
    queryKey: ['syncStats', lastSyncedAt],
    queryFn: () => {
      const trackers = repo.listAllTrackers()
      const entries = repo.listAllEntries()
      const milestones = repo.listAllMilestones()
      const tombstones = repo.listTombstones()
      return {
        trackers: trackers.length,
        logs: entries.length,
        pending: countPending(
          { trackers, entries, milestones, tombstones },
          lastSyncedAt
        )
      }
    }
  })
}
