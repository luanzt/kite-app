import type {
  TrackerType,
  Accumulation,
  Period,
  HabitDirection
} from '@features/trackers/types'
import type { BuildTrackerInput } from '@features/trackers/factory'

/**
 * Tracker templates — the "Add Tracker" library.
 *
 * A curated, offline, on-device catalog of ready-to-use trackers grouped into
 * categories (Health, Fitness, …). Picking a template pre-fills a sensible
 * tracker: e.g. "Drink Water" → a daily habit with a goal of 8 times/day and
 * reminders every 3 hours. It is static config (like `quickStarts.ts`), NOT
 * SQLite data — nothing here is persisted until the user picks a template and
 * `buildTracker` creates a real `Tracker`.
 *
 * Adding to the catalog: append a `Template` to the right category's `templates`
 * array. Every `icon` must be a keyword present in `ICON_EMOJI` (icons.ts) — a
 * missing keyword renders as the 🎯 fallback (guarded by templates.test.ts).
 *
 * Naming/i18n: category titles are i18n'd (namespace `templates.cat.*`), but a
 * template's `name` is a verbatim English string. It becomes the tracker's
 * `name` when picked, and tracker names are user data — stored verbatim, never
 * translated (see CLAUDE.md).
 */

export type TemplateCategoryKey =
  | 'health'
  | 'fitness'
  | 'wellness'
  | 'productivity'
  | 'money'
  | 'education'
  | 'hobbies'
  | 'relationships'
  | 'chores'
  | 'business'

export type Template = {
  /** Stable id, unique within its category (kebab-case). */
  id: string
  /** Display name — becomes the tracker's verbatim name when picked. */
  name: string
  type: TrackerType
  /** ICON_EMOJI keyword (icons.ts), e.g. "drop", "apple". */
  icon: string
  /** Palette name ("cyan", "green", …) or "#rrggbb" — resolved via colorHex(). */
  color: string
  unit?: string
  /** Habit: per-day log count that counts as done. Target/average: the goal. */
  targetValue?: number
  startValue?: number
  accumulation?: Accumulation
  period?: Period
  /** Habit direction — 'bad' for quit/avoid habits (No Sugar, Don't Smoke). */
  direction?: HabitDirection
  /** JS weekday numbers (0=Sun..6=Sat); omit = every day. */
  repeatDays?: number[]
  /**
   * Suggested reminder times ("HH:MM", 24h). The tracker model currently holds a
   * single `reminderTime`, so `templateToInput` applies the FIRST; the remaining
   * times are captured here for when multi-reminder support lands.
   */
  reminders?: string[]
}

export type TemplateCategory = {
  key: TemplateCategoryKey
  /**
   * Category chrome icon — a lucide component name (PascalCase). Categories are
   * UI chrome, so they use lucide icons (not tracker emoji); the picker maps this
   * name to a `lucide-react-native` component.
   */
  icon: string
  /** Palette name / hex for the category accent (colorHex-compatible). */
  color: string
  templates: Template[]
}

/**
 * The template catalog. Health is fully populated; the remaining categories are
 * scaffolded (metadata + empty `templates`) and filled in incrementally as more
 * reference screenshots arrive.
 */
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    key: 'health',
    icon: 'Heart',
    color: 'red',
    templates: [
      {
        id: 'weight',
        name: 'Weight',
        type: 'target',
        icon: 'scale',
        color: 'pink',
        unit: 'kg',
        accumulation: 'latest'
      },
      {
        id: 'drink-water',
        name: 'Drink Water',
        type: 'habit',
        icon: 'drop',
        color: 'cyan',
        targetValue: 8,
        period: 'daily',
        reminders: ['09:00', '12:00', '15:00', '18:00']
      },
      {
        id: 'sleep',
        name: 'Sleep',
        type: 'average',
        icon: 'sleep',
        color: 'indigo',
        unit: 'hours',
        targetValue: 8,
        period: 'daily'
      },
      {
        id: 'brush-floss',
        name: 'Brush & Floss',
        type: 'habit',
        icon: 'grin',
        color: 'teal',
        targetValue: 2,
        period: 'daily',
        reminders: ['08:00', '21:00']
      },
      {
        id: 'healthy-meal',
        name: 'Healthy Meal',
        type: 'habit',
        icon: 'salad',
        color: 'green',
        period: 'daily'
      },
      {
        id: 'food-journal',
        name: 'Food Journal',
        type: 'habit',
        icon: 'read',
        color: 'orange',
        period: 'daily'
      },
      {
        id: 'eat-vegetables',
        name: 'Eat Vegetables',
        type: 'habit',
        icon: 'broccoli',
        color: 'green',
        period: 'daily'
      },
      {
        id: 'eat-fruit',
        name: 'Eat Fruit',
        type: 'habit',
        icon: 'apple',
        color: 'red',
        period: 'daily'
      },
      {
        id: 'calories',
        name: 'Calories',
        type: 'average',
        icon: 'zap',
        color: 'orange',
        unit: 'kcal',
        targetValue: 2000,
        period: 'daily'
      },
      {
        id: 'protein',
        name: 'Protein',
        type: 'average',
        icon: 'muscle',
        color: 'orange',
        unit: 'g',
        targetValue: 100,
        period: 'daily'
      },
      {
        id: 'take-vitamins',
        name: 'Take Vitamins',
        type: 'habit',
        icon: 'pill',
        color: 'red',
        period: 'daily',
        reminders: ['09:00']
      },
      {
        id: 'limit-caffeine',
        name: 'Limit Caffeine',
        type: 'habit',
        icon: 'coffee',
        color: 'orange',
        period: 'daily'
      },
      {
        id: 'no-sugar',
        name: 'No Sugar',
        type: 'habit',
        icon: 'candy',
        color: 'pink',
        direction: 'bad',
        period: 'daily'
      },
      {
        id: 'no-junk-food',
        name: 'No Junk Food',
        type: 'habit',
        icon: 'fries',
        color: 'red',
        direction: 'bad',
        period: 'daily'
      },
      {
        id: 'no-soda',
        name: 'No Soda',
        type: 'habit',
        icon: 'cup',
        color: 'red',
        direction: 'bad',
        period: 'daily'
      },
      {
        id: 'no-alcohol',
        name: 'No Alcohol',
        type: 'habit',
        icon: 'beer',
        color: 'orange',
        direction: 'bad',
        period: 'daily'
      },
      {
        id: 'no-snacks',
        name: 'No Snacks',
        type: 'habit',
        icon: 'popcorn',
        color: 'red',
        direction: 'bad',
        period: 'daily'
      },
      {
        id: 'dont-smoke',
        name: "Don't Smoke",
        type: 'habit',
        icon: 'nosmoke',
        color: 'gray',
        direction: 'bad',
        period: 'daily'
      },
      {
        id: 'dont-bite-nails',
        name: "Don't Bite Nails",
        type: 'habit',
        icon: 'fingerscrossed',
        color: 'purple',
        direction: 'bad',
        period: 'daily'
      },
      {
        id: 'take-medicine',
        name: 'Take Medicine',
        type: 'habit',
        icon: 'pill',
        color: 'red',
        period: 'daily',
        reminders: ['09:00']
      }
    ]
  },
  // ── Scaffolded — filled in as more reference screenshots arrive ──
  { key: 'fitness', icon: 'Dumbbell', color: 'orange', templates: [] },
  { key: 'wellness', icon: 'Smile', color: 'purple', templates: [] },
  { key: 'productivity', icon: 'CircleCheck', color: 'blue', templates: [] },
  { key: 'money', icon: 'CircleDollarSign', color: 'green', templates: [] },
  { key: 'education', icon: 'BookOpen', color: 'red', templates: [] },
  { key: 'hobbies', icon: 'Camera', color: 'orange', templates: [] },
  { key: 'relationships', icon: 'Users', color: 'purple', templates: [] },
  { key: 'chores', icon: 'House', color: 'blue', templates: [] },
  { key: 'business', icon: 'Briefcase', color: 'green', templates: [] }
]

/** Map a template to `buildTracker` input. Applies the first reminder time only
 *  (the model holds a single `reminderTime`); other suggested times are ignored
 *  until multi-reminder support lands. */
export function templateToInput(t: Template): BuildTrackerInput {
  return {
    name: t.name,
    type: t.type,
    icon: t.icon,
    color: t.color,
    unit: t.unit ?? null,
    targetValue: t.targetValue ?? null,
    startValue: t.startValue ?? null,
    accumulation: t.accumulation ?? null,
    period: t.period ?? null,
    direction: t.direction ?? null,
    repeatDays: t.repeatDays ?? null,
    reminderTime: t.reminders?.[0] ?? null
  }
}

/** Every template across all categories, flattened. */
export function allTemplates(): Template[] {
  return TEMPLATE_CATEGORIES.flatMap((c) => c.templates)
}

/** Find a category by key. */
export function categoryByKey(
  key: TemplateCategoryKey
): TemplateCategory | undefined {
  return TEMPLATE_CATEGORIES.find((c) => c.key === key)
}

/**
 * Case-insensitive search over template names, matching the picker's search bar.
 * An empty/blank query returns nothing (the picker shows the category list then).
 */
export function searchTemplates(query: string): Template[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return allTemplates().filter((t) => t.name.toLowerCase().includes(q))
}
