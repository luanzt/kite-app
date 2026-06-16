import {
  House,
  List,
  Settings,
  ChevronRight,
  ChevronLeft,
  Plus,
  Check,
  Flame,
  Pencil,
  Trash2,
  Globe,
  Moon,
  Download,
  Zap,
  Repeat,
  Target,
  ChartColumn,
  Puzzle,
  Bell,
  Calendar,
  Clock,
  X,
  type LucideIcon
} from 'lucide-react-native'
import type { PaceStatus, TrackerType } from '@features/trackers/types'

/**
 * Pace-status visual language (classic palette from theme.css).
 * Solid colors + their weak tints — the "soul" of the app.
 */
export const PACE_COLOR: Record<PaceStatus, string> = {
  on_track: '#1f9d57',
  behind: '#e0564e',
  ahead: '#3d7dd8',
  none: '#a3a8a0'
}

export const PACE_WEAK: Record<PaceStatus, string> = {
  on_track: '#e3f3ea',
  behind: '#fbe7e5',
  ahead: '#e6eefb',
  none: '#eceee8'
}

/**
 * i18n key for the human-readable pace label.
 * Keys may not exist in locale files yet — the screen task adds them.
 */
export function paceLabelKey(status: PaceStatus): string {
  switch (status) {
    case 'on_track':
      return 'detail.onTrack'
    case 'behind':
      return 'detail.behind'
    case 'ahead':
      return 'detail.ahead'
    case 'none':
    default:
      return 'detail.none'
  }
}

/**
 * Lucide stroke icons for UI chrome, mapped to semantic names.
 * Tracker `icon` fields stay as emoji strings (rendered via <Typography>).
 */
export const Icons = {
  Today: House,
  Trackers: List,
  Settings,
  Chevron: ChevronRight,
  Plus,
  Check,
  Flame,
  Edit: Pencil,
  Trash: Trash2,
  Back: ChevronLeft,
  Close: X,
  Globe,
  Moon,
  Download,
  Bolt: Zap,
  Bell,
  Calendar,
  Clock
} as const

export type IconName = keyof typeof Icons

/**
 * The 4 tracker types' brand icon + accent color — single source of truth so
 * the TypePicker cards and the Form header chip stay in sync. Lucide icons
 * (not emoji) for crisp, consistent rendering.
 */
export const TYPE_ICON: Record<TrackerType, LucideIcon> = {
  habit: Repeat,
  target: Target,
  average: ChartColumn,
  project: Puzzle
}

export const TYPE_COLOR: Record<TrackerType, string> = {
  habit: '#8b5cf6',
  target: '#2e7d5b',
  average: '#0d9488',
  project: '#e0457a'
}

/**
 * Map a tracker's `icon` keyword (from quickStarts / buildTracker, e.g. "star",
 * "drop", "book") to an emoji glyph for the design's tinted emoji tiles.
 * Falls back to a target emoji for unknown keys. Values that already contain a
 * non-ASCII glyph are assumed to be emoji already and are passed through.
 */
const ICON_EMOJI: Record<string, string> = {
  star: '⭐',
  drop: '💧',
  dumbbell: '🏋️',
  piggy: '💰',
  book: '📚',
  moon: '😴',
  lotus: '🧘',
  walk: '🚶',
  scale: '⚖️',
  rocket: '🚀'
}

export function iconEmoji(key: string | null | undefined): string {
  if (!key) return '🎯'
  if (key in ICON_EMOJI) return ICON_EMOJI[key]
  // An ASCII-only keyword we don't recognise → fallback. Anything containing a
  // non-ASCII glyph is assumed to already be an emoji and is passed through.
  return /^[\x20-\x7e]+$/.test(key) ? '🎯' : key
}

/**
 * Resolve a tracker's `color` (a palette name like "cyan" / "blue", or a raw
 * "#rrggbb" hex) to a hex string. Trackers store named colors (quickStarts /
 * buildTracker), so tile tints and pace dots need this to produce valid hex.
 */
const COLOR_HEX: Record<string, string> = {
  green: '#2e7d5b',
  blue: '#3d7dd8',
  red: '#e0564e',
  orange: '#d98b2b',
  purple: '#8b5cf6',
  teal: '#0d9488',
  pink: '#e0457a',
  gray: '#6b7280',
  cyan: '#0d9488',
  indigo: '#6366f1'
}

export function colorHex(color: string | null | undefined): string {
  if (!color) return COLOR_HEX.green
  if (color.startsWith('#')) return color
  return COLOR_HEX[color] ?? COLOR_HEX.green
}

/**
 * Convert a hex color (#rrggbb) to an rgba() string at the given alpha.
 * Used for per-tracker tile tint backgrounds (color is runtime-dynamic).
 * Accepts palette names too (resolved via colorHex).
 */
export function hexA(hex: string, alpha: number): string {
  const h = colorHex(hex).replace('#', '')
  const n = parseInt(h, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
