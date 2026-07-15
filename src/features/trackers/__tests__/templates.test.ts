import {
  TEMPLATE_CATEGORIES,
  allTemplates,
  findTemplate,
  categoryByKey,
  normalizeText
} from '../templates'
import { iconEmoji, colorHex, CATEGORY_ICON } from '../icons'
import enJson from '@i18n/locales/en.json'
import viJson from '@i18n/locales/vi.json'

type Loc = {
  template: {
    categories: Record<string, string>
    items: Record<string, string>
  }
}
const en = enJson as unknown as Loc
const vi = viJson as unknown as Loc

/** True if a string contains any non-ASCII char (renders as a glyph). */
function isGlyph(s: string): boolean {
  return /[^\x20-\x7e]/.test(s)
}

describe('template data layer', () => {
  const templates = allTemplates()

  it('lists the 10 categories in design order', () => {
    expect(TEMPLATE_CATEGORIES.map((c) => c.key)).toEqual([
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
    ])
  })

  it('Health ships 15 templates; other categories start empty', () => {
    expect(categoryByKey('health')?.templates.length).toBe(15)
    for (const c of TEMPLATE_CATEGORIES) {
      if (c.key !== 'health') expect(c.templates.length).toBe(0)
    }
  })

  it('every template icon renders a real emoji glyph', () => {
    for (const t of templates) expect(isGlyph(iconEmoji(t.icon))).toBe(true)
  })

  it('every template color resolves to a hex', () => {
    for (const t of templates)
      expect(colorHex(t.color)).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('every category color resolves to a hex', () => {
    for (const cat of TEMPLATE_CATEGORIES) {
      expect(colorHex(cat.color)).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('template keys are globally unique', () => {
    const keys = templates.map((t) => t.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('direction is set iff the template is a habit', () => {
    for (const t of templates) {
      if (t.type === 'habit') expect(t.direction).toBeDefined()
      else expect(t.direction).toBeUndefined()
    }
  })

  it('every category has EN + VI name and a lucide icon', () => {
    for (const c of TEMPLATE_CATEGORIES) {
      expect(en.template.categories[c.key]).toBeTruthy()
      expect(vi.template.categories[c.key]).toBeTruthy()
      expect(CATEGORY_ICON[c.key]).toBeDefined()
    }
  })

  it('every template has EN + VI name', () => {
    for (const t of templates) {
      expect(en.template.items[t.key]).toBeTruthy()
      expect(vi.template.items[t.key]).toBeTruthy()
    }
  })

  it('findTemplate / categoryByKey behave', () => {
    expect(findTemplate('weight')?.type).toBe('target')
    expect(findTemplate('nope')).toBeUndefined()
    expect(categoryByKey('health')?.key).toBe('health')
    expect(allTemplates().length).toBe(
      TEMPLATE_CATEGORIES.reduce((n, c) => n + c.templates.length, 0)
    )
  })

  it('normalizeText lowercases and trims', () => {
    expect(normalizeText('  Drink WATER ')).toBe('drink water')
  })
})
