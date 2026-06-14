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
} from 'lucide-react-native';
import type { PaceStatus } from '@features/trackers/types';

/**
 * Pace-status visual language (classic palette from theme.css).
 * Solid colors + their weak tints — the "soul" of the app.
 */
export const PACE_COLOR: Record<PaceStatus, string> = {
  on_track: '#1f9d57',
  behind: '#e0564e',
  ahead: '#3d7dd8',
  none: '#a3a8a0',
};

export const PACE_WEAK: Record<PaceStatus, string> = {
  on_track: '#e3f3ea',
  behind: '#fbe7e5',
  ahead: '#e6eefb',
  none: '#eceee8',
};

/**
 * i18n key for the human-readable pace label.
 * Keys may not exist in locale files yet — the screen task adds them.
 */
export function paceLabelKey(status: PaceStatus): string {
  switch (status) {
    case 'on_track':
      return 'detail.onTrack';
    case 'behind':
      return 'detail.behind';
    case 'ahead':
      return 'detail.ahead';
    case 'none':
    default:
      return 'detail.none';
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
  Globe,
  Moon,
  Download,
  Bolt: Zap,
} as const;

export type IconName = keyof typeof Icons;

/**
 * Convert a hex color (#rrggbb) to an rgba() string at the given alpha.
 * Used for per-tracker tile tint backgrounds (color is runtime-dynamic).
 */
export function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
