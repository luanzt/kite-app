import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as repo from '@features/trackers/db/repository';
import { cancelTrackerReminders, scheduleTrackerReminders } from '@features/trackers/notifications';
import type { Tracker, Entry, Milestone } from '@features/trackers/types';

const keys = {
  trackers: ['trackers'] as const,
  tracker: (id: string) => ['tracker', id] as const,
  entries: (id: string) => ['entries', id] as const,
  entriesForDate: (date: string) => ['entries', 'date', date] as const,
  milestones: (id: string) => ['milestones', id] as const,
};

export function useTrackers() {
  return useQuery({ queryKey: keys.trackers, queryFn: () => repo.listTrackers() });
}
export function useTracker(id: string) {
  return useQuery({ queryKey: keys.tracker(id), queryFn: () => repo.getTracker(id) });
}
export function useEntries(id: string) {
  return useQuery({ queryKey: keys.entries(id), queryFn: () => repo.listEntries(id) });
}
export function useMilestones(id: string) {
  return useQuery({ queryKey: keys.milestones(id), queryFn: () => repo.listMilestones(id) });
}
export function useEntriesForDate(date: string) {
  return useQuery({
    queryKey: keys.entriesForDate(date),
    queryFn: () => repo.listEntriesForDate(date),
  });
}

export function useSaveTracker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Tracker) => {
      repo.insertTracker(t);
      await scheduleTrackerReminders(t);
    },
    onSuccess: (_d, t) => {
      qc.invalidateQueries({ queryKey: keys.trackers });
      qc.invalidateQueries({ queryKey: keys.tracker(t.id) });
    },
  });
}
export function useDeleteTracker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      repo.deleteTracker(id);
      await cancelTrackerReminders(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.trackers }),
  });
}
export function useLogEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: Entry) => repo.insertEntry(e),
    onSuccess: (_d, e) => {
      // Invalidate the whole 'entries' tree: per-tracker AND per-date caches.
      qc.invalidateQueries({ queryKey: keys.entries(e.trackerId) });
      qc.invalidateQueries({ queryKey: ['entries', 'date'] });
      qc.invalidateQueries({ queryKey: keys.trackers });
    },
  });
}
export function useSaveMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Milestone) => repo.upsertMilestone(m),
    onSuccess: (_d, m) => qc.invalidateQueries({ queryKey: keys.milestones(m.trackerId) }),
  });
}
