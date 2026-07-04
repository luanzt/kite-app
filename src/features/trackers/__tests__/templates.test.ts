import {
  TEMPLATE_CATEGORIES,
  allTemplates,
  categoryByKey,
  searchTemplates,
  templateToInput,
  type TemplateCategoryKey
} from '../templates'
import { iconEmoji, colorHex } from '../icons'
import { buildTracker } from '../factory'

/** True if a string contains a UTF-16 surrogate (non-BMP char / emoji). */
function hasSurrogate(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c >= 0xd800 && c <= 0xdfff) return true
  }
  return false
}

/** True if a string contains any non-ASCII char (i.e. it renders as a glyph). */
function isGlyph(s: string): boolean {
  return /[^\x20-\x7e]/.test(s)
}

const CATEGORY_KEYS: TemplateCategoryKey[] = [
  'health',
  'fitness',
  'wellness',
  'productivity',
  'money',
  'education',
  'hobbies',
  'relationships',
  'chores',
  'business'
]

describe('template catalog structure', () => {
  it('declares all ten categories, once each, in order', () => {
    expect(TEMPLATE_CATEGORIES.map((c) => c.key)).toEqual(CATEGORY_KEYS)
  })

  it('every category color resolves to a hex', () => {
    for (const cat of TEMPLATE_CATEGORIES) {
      expect(colorHex(cat.color)).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('template ids are unique within each category', () => {
    for (const cat of TEMPLATE_CATEGORIES) {
      const ids = cat.templates.map((t) => t.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('template values are valid', () => {
  it('every template icon is an ASCII keyword that renders a real glyph', () => {
    for (const t of allTemplates()) {
      expect(hasSurrogate(t.icon)).toBe(false)
      expect(isGlyph(iconEmoji(t.icon))).toBe(true)
    }
  })

  it('every template color resolves to a hex', () => {
    for (const t of allTemplates()) {
      expect(colorHex(t.color)).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('reminder times are well-formed HH:MM strings', () => {
    for (const t of allTemplates()) {
      for (const r of t.reminders ?? []) {
        expect(r).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/)
      }
    }
  })

  it('only habits carry a direction, and it is bad only for habits', () => {
    for (const t of allTemplates()) {
      if (t.direction) expect(t.type).toBe('habit')
    }
  })
})

describe('Health category (from reference screenshots)', () => {
  const health = categoryByKey('health')

  it('has all 20 templates', () => {
    expect(health?.templates).toHaveLength(20)
  })

  it('Drink Water is a daily habit, goal 8, reminders every 3 hours', () => {
    const water = health?.templates.find((t) => t.id === 'drink-water')
    expect(water).toMatchObject({
      type: 'habit',
      targetValue: 8,
      period: 'daily'
    })
    expect(water?.reminders).toEqual(['09:00', '12:00', '15:00', '18:00'])
  })

  it('quit habits are flagged as bad', () => {
    const badIds = [
      'no-sugar',
      'no-junk-food',
      'no-soda',
      'no-alcohol',
      'no-snacks',
      'dont-smoke',
      'dont-bite-nails'
    ]
    for (const id of badIds) {
      const t = health?.templates.find((x) => x.id === id)
      expect(t?.direction).toBe('bad')
    }
  })
})

describe('templateToInput → buildTracker', () => {
  it('builds a Drink Water habit that keeps its per-day goal and first reminder', () => {
    const water = categoryByKey('health')!.templates.find(
      (t) => t.id === 'drink-water'
    )!
    const tracker = buildTracker(templateToInput(water))
    expect(tracker.name).toBe('Drink Water')
    expect(tracker.type).toBe('habit')
    expect(tracker.targetValue).toBe(8)
    expect(tracker.period).toBe('daily')
    expect(tracker.direction).toBe('good')
    expect(tracker.reminderTime).toBe('09:00')
  })

  it('carries a bad-habit direction through to the tracker', () => {
    const noSugar = categoryByKey('health')!.templates.find(
      (t) => t.id === 'no-sugar'
    )!
    const tracker = buildTracker(templateToInput(noSugar))
    expect(tracker.type).toBe('habit')
    expect(tracker.direction).toBe('bad')
  })

  it('builds a weight target (latest accumulation, no reminder)', () => {
    const weight = categoryByKey('health')!.templates.find(
      (t) => t.id === 'weight'
    )!
    const tracker = buildTracker(templateToInput(weight))
    expect(tracker.type).toBe('target')
    expect(tracker.accumulation).toBe('latest')
    expect(tracker.reminderTime).toBeNull()
  })
})

describe('searchTemplates', () => {
  it('is case-insensitive and matches substrings', () => {
    const hits = searchTemplates('water')
    expect(hits.some((t) => t.id === 'drink-water')).toBe(true)
    expect(searchTemplates('WATER')).toEqual(hits)
  })

  it('returns nothing for a blank query', () => {
    expect(searchTemplates('   ')).toEqual([])
    expect(searchTemplates('')).toEqual([])
  })
})
