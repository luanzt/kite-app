import type { TrackerType } from '@features/trackers/types'

/**
 * Per-type icon sets shown in the form's picker, as ASCII KEYWORDS (not emoji).
 * Icons are persisted as keywords because op-sqlite v16 corrupts non-BMP emoji
 * on write; the emoji glyph is produced for display via `iconEmoji(key)`. Each
 * keyword here must exist in icons.ts ICON_EMOJI and resolve to a distinct
 * glyph within its type. Order mirrors the original emoji rows.
 */
export const ICONSET: Record<TrackerType, string[]> = {
  habit: [
    'lotus',
    'dumbbell',
    'read',
    'nosmoke',
    'pill',
    'tooth',
    'bed',
    'pray'
  ],
  target: [
    'target',
    'book',
    'piggy',
    'scale',
    'run',
    'write',
    'guitar',
    'chart'
  ],
  average: [
    'drop',
    'sleep',
    'walk',
    'salad',
    'coffee',
    'phone',
    'cash',
    'fire'
  ],
  project: [
    'rocket',
    'puzzle',
    'build',
    'paint',
    'film',
    'home',
    'work',
    'grad'
  ]
}

/** Default icon keyword for a type when none has been chosen yet. */
export function defaultIcon(type: TrackerType): string {
  return ICONSET[type]?.[0] ?? ICONSET.target[0]
}
