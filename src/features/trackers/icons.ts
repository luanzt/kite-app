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
  TriangleAlert,
  Ban,
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
  History,
  StickyNote,
  Cloud,
  CloudOff,
  Heart,
  Dumbbell,
  Sparkles,
  ListChecks,
  DollarSign,
  BookOpen,
  Palette,
  Users,
  Briefcase,
  type LucideIcon
} from 'lucide-react-native'
import type { FC } from 'react'
import type { SvgProps } from 'react-native-svg'
import type { PaceStatus, TrackerType } from '@features/trackers/types'
import { ICONSET } from '@features/trackers/iconSets'
import HomeActive from '@assets/images/ic_home_active.svg'
import HomeInactive from '@assets/images/ic_home_inactive.svg'
import TrackerActive from '@assets/images/ic_tracker_active.svg'
import TrackerInactive from '@assets/images/ic_tracker_inactive.svg'
import SettingActive from '@assets/images/ic_setting_active.svg'
import SettingInactive from '@assets/images/ic_setting_inactive.svg'

/**
 * Pace-status visual language (classic palette from theme.css).
 * Solid colors + their weak tints — the "soul" of the app.
 */
export const PACE_COLOR: Record<PaceStatus, string> = {
  on_track: '#1f9d57',
  behind: '#e0564e',
  ahead: '#2456b5',
  none: '#a3a8a0'
}

export const PACE_WEAK: Record<PaceStatus, string> = {
  on_track: '#e3f3ea',
  behind: '#fbe7e5',
  ahead: '#e6eefb',
  none: '#eceee8'
}

/** Dark-theme pace palette — brightened for contrast on the dark base. */
export const PACE_COLOR_DARK: Record<PaceStatus, string> = {
  on_track: '#3ec27a',
  behind: '#f0736b',
  ahead: '#5b8def',
  none: '#6f757e'
}

export const PACE_WEAK_DARK: Record<PaceStatus, string> = {
  on_track: '#13291d',
  behind: '#331917',
  ahead: '#1b2b47',
  none: '#24272d'
}

/** Pick the pace palette (solid + weak) for a resolved theme. */
export function paceColorsFor(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? { color: PACE_COLOR_DARK, weak: PACE_WEAK_DARK }
    : { color: PACE_COLOR, weak: PACE_WEAK }
}

/**
 * Pace-status as a solid-background Tailwind class. Use this instead of an
 * inline `style={{ backgroundColor: PACE_COLOR[status] }}` — the status is a
 * finite enum so it branches to a literal class (see CLAUDE.md rule #2).
 */
export const PACE_DOT_CLASS: Record<PaceStatus, string> = {
  on_track: 'bg-pace-on',
  behind: 'bg-pace-behind',
  ahead: 'bg-pace-ahead',
  none: 'bg-pace-none'
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
  Warn: TriangleAlert,
  Ban,
  Edit: Pencil,
  Trash: Trash2,
  Back: ChevronLeft,
  Close: X,
  Globe,
  Moon,
  Download,
  Cloud,
  CloudOff,
  Bolt: Zap,
  Bell,
  Calendar,
  Clock,
  Charts: ChartColumn,
  History,
  Notes: StickyNote
} as const

export type IconName = keyof typeof Icons

/**
 * Bottom-tab icons as imported SVG components (src/assets/images/ic_*.svg),
 * one active + one inactive variant per tab. The SVGs paint with
 * `currentColor`, so react-native-svg resolves their fill/stroke from the
 * `color` prop the navigator passes in — the active variant is filled, the
 * inactive one is an outline. Distinct files (not a single recolored glyph)
 * because focused/unfocused differ in shape, not just tint.
 */
export const TAB_ICON: Record<
  'today' | 'trackers' | 'settings',
  { active: FC<SvgProps>; inactive: FC<SvgProps> }
> = {
  today: { active: HomeActive, inactive: HomeInactive },
  trackers: { active: TrackerActive, inactive: TrackerInactive },
  settings: { active: SettingActive, inactive: SettingInactive }
}

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
 * Template-category icon → lucide component (mirrors TYPE_ICON). Colors are
 * carried on TemplateCategory.color, resolved via colorHex at render time.
 */
export const CATEGORY_ICON: Record<string, LucideIcon> = {
  health: Heart,
  fitness: Dumbbell,
  wellness: Sparkles,
  productivity: ListChecks,
  money: DollarSign,
  education: BookOpen,
  hobbies: Palette,
  relationships: Users,
  chores: House,
  business: Briefcase
}

/**
 * Map a tracker's `icon` keyword (e.g. "lotus", "drop", "book") to an emoji
 * glyph for the design's tinted emoji tiles.
 *
 * Icons are persisted as ASCII keywords, NEVER as raw emoji: op-sqlite v16
 * corrupts string bind parameters containing non-BMP characters (surrogate
 * pairs), so an emoji written to SQLite reads back as garbage. Keeping the
 * stored value ASCII sidesteps that entirely; the emoji exists only at render
 * time via this map. Every emoji offered in the form's picker has a key here.
 */
const ICON_EMOJI: Record<string, string> = {
  // shared / quick-start keys
  star: '⭐',
  drop: '💧',
  dumbbell: '🏋️',
  piggy: '💰',
  book: '📚',
  moon: '😴',
  lotus: '🧘',
  walk: '🚶',
  scale: '⚖️',
  rocket: '🚀',
  // habit set
  read: '📖',
  nosmoke: '🚭',
  pill: '💊',
  tooth: '🦷',
  bed: '🛏️',
  pray: '🙏',
  // target set
  target: '🎯',
  run: '🏃',
  write: '✍️',
  guitar: '🎸',
  chart: '📈',
  // average set
  sleep: '😴',
  salad: '🥗',
  coffee: '☕',
  phone: '📱',
  cash: '💵',
  fire: '🔥',
  // project set
  puzzle: '🧩',
  build: '🏗️',
  paint: '🎨',
  film: '🎬',
  home: '🏡',
  work: '💼',
  grad: '🎓',
  // template-only keys (render, not in the form picker ICONSET)
  veggie: '🥦',
  apple: '🍎',
  calorie: '⚡',
  protein: '💪',
  candy: '🍬',
  fries: '🍟',
  soda: '🥤'
}

/**
 * Reverse lookup: emoji glyph → keyword. ICONSET keys are seeded first so that
 * when two keywords share a glyph (e.g. "moon"/"sleep" → 😴), the one actually
 * offered in the picker wins the reverse mapping.
 */
const EMOJI_KEY: Record<string, string> = {}
for (const keys of Object.values(ICONSET)) {
  for (const k of keys) {
    const e = ICON_EMOJI[k]
    if (e && !(e in EMOJI_KEY)) EMOJI_KEY[e] = k
  }
}
for (const [k, e] of Object.entries(ICON_EMOJI)) {
  if (!(e in EMOJI_KEY)) EMOJI_KEY[e] = k
}

export function iconEmoji(key: string | null | undefined): string {
  if (!key) return '🎯'
  if (key in ICON_EMOJI) return ICON_EMOJI[key]
  // An ASCII-only keyword we don't recognise → fallback. Anything containing a
  // non-ASCII glyph is assumed to already be an emoji and is passed through
  // (legacy/hand-set values).
  return /^[\x20-\x7e]+$/.test(key) ? '🎯' : key
}

/**
 * Inverse of iconEmoji for the picker: given a value that may be an emoji glyph
 * (a freshly tapped tile) or already a keyword, return the ASCII keyword to
 * persist. Unknown emoji fall back to "star" so we never store a surrogate.
 */
export function iconKey(value: string | null | undefined): string {
  if (!value) return 'star'
  if (value in ICON_EMOJI) return value // already a keyword
  if (value in EMOJI_KEY) return EMOJI_KEY[value] // emoji glyph → keyword
  // Unknown emoji glyph (non-ASCII) → safe default; unknown ASCII → itself.
  return /^[\x20-\x7e]+$/.test(value) ? value : 'star'
}

/**
 * Resolve a tracker's `color` (a palette name like "cyan" / "blue", or a raw
 * "#rrggbb" hex) to a hex string. Trackers store named colors (quickStarts /
 * buildTracker), so tile tints and pace dots need this to produce valid hex.
 */
const COLOR_HEX: Record<string, string> = {
  green: '#2e7d5b',
  blue: '#2456b5',
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
