import type {
  TrackerType,
  HabitDirection,
  Accumulation,
  Period
} from '@features/trackers/types'

/** A pre-built goal shown in the Templates browser. Tapping one opens the
 *  TrackerForm pre-filled from these fields (name comes from i18n by `key`). */
export type Template = {
  key: string // unique; i18n key under template.items.<key>
  type: TrackerType
  icon: string // ASCII keyword (must exist in ICON_EMOJI)
  color: string // palette name (COLOR_HEX key)
  direction?: HabitDirection // habit only: 'good' | 'bad'
  unit?: string
  targetValue?: number
  accumulation?: Accumulation
  period?: Period
}

export type TemplateCategory = {
  key: string // id + i18n key under template.categories.<key>
  color: string // accent for the category icon tile (palette name)
  templates: Template[]
}

/** Categories in design order. Only Health is populated for now; the rest are
 *  filled from reference images in follow-up work (no structural change). */
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    key: 'health',
    color: 'pink',
    templates: [
      {
        key: 'weight',
        type: 'target',
        icon: 'scale',
        color: 'pink',
        unit: 'kg',
        accumulation: 'latest'
      },
      {
        key: 'drinkWater',
        type: 'habit',
        icon: 'drop',
        color: 'cyan',
        direction: 'good',
        period: 'daily'
      },
      {
        key: 'sleep',
        type: 'average',
        icon: 'sleep',
        color: 'indigo',
        unit: 'hours',
        targetValue: 8,
        period: 'daily'
      },
      {
        key: 'brushFloss',
        type: 'habit',
        icon: 'tooth',
        color: 'blue',
        direction: 'good',
        period: 'daily'
      },
      {
        key: 'healthyMeal',
        type: 'habit',
        icon: 'salad',
        color: 'green',
        direction: 'good',
        period: 'daily'
      },
      {
        key: 'foodJournal',
        type: 'habit',
        icon: 'read',
        color: 'orange',
        direction: 'good',
        period: 'daily'
      },
      {
        key: 'eatVegetables',
        type: 'habit',
        icon: 'veggie',
        color: 'green',
        direction: 'good',
        period: 'daily'
      },
      {
        key: 'eatFruit',
        type: 'habit',
        icon: 'apple',
        color: 'red',
        direction: 'good',
        period: 'daily'
      },
      {
        key: 'calories',
        type: 'average',
        icon: 'calorie',
        color: 'orange',
        unit: 'kcal',
        targetValue: 2000,
        period: 'daily'
      },
      {
        key: 'protein',
        type: 'average',
        icon: 'protein',
        color: 'red',
        unit: 'g',
        targetValue: 100,
        period: 'daily'
      },
      {
        key: 'takeVitamins',
        type: 'habit',
        icon: 'pill',
        color: 'pink',
        direction: 'good',
        period: 'daily'
      },
      {
        key: 'limitCaffeine',
        type: 'habit',
        icon: 'coffee',
        color: 'orange',
        direction: 'bad',
        period: 'daily'
      },
      {
        key: 'noSugar',
        type: 'habit',
        icon: 'candy',
        color: 'pink',
        direction: 'bad',
        period: 'daily'
      },
      {
        key: 'noJunkFood',
        type: 'habit',
        icon: 'fries',
        color: 'red',
        direction: 'bad',
        period: 'daily'
      },
      {
        key: 'noSoda',
        type: 'habit',
        icon: 'soda',
        color: 'blue',
        direction: 'bad',
        period: 'daily'
      }
    ]
  },
  { key: 'fitness', color: 'orange', templates: [] },
  { key: 'wellness', color: 'purple', templates: [] },
  { key: 'productivity', color: 'blue', templates: [] },
  { key: 'money', color: 'green', templates: [] },
  { key: 'education', color: 'pink', templates: [] },
  { key: 'hobbies', color: 'orange', templates: [] },
  { key: 'relationships', color: 'purple', templates: [] },
  { key: 'chores', color: 'blue', templates: [] },
  { key: 'business', color: 'green', templates: [] }
]

export function allTemplates(): Template[] {
  return TEMPLATE_CATEGORIES.flatMap((c) => c.templates)
}

export function findTemplate(key: string): Template | undefined {
  return allTemplates().find((t) => t.key === key)
}

export function categoryByKey(key: string): TemplateCategory | undefined {
  return TEMPLATE_CATEGORIES.find((c) => c.key === key)
}

/** Case-insensitive search key. Diacritic-insensitive matching (esp. for
 *  Vietnamese horn/stroke letters) is deferred — not trivial to do correctly. */
export function normalizeText(s: string): string {
  return s.toLowerCase().trim()
}
