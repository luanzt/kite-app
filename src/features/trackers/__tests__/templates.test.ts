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

  it('every category is populated (149 templates total)', () => {
    expect(categoryByKey('health')?.templates.length).toBe(20)
    for (const c of TEMPLATE_CATEGORIES) {
      expect(c.templates.length).toBeGreaterThan(0)
    }
    expect(templates.length).toBe(149)
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

  it('schedule/average fields are well-formed and type-appropriate', () => {
    for (const t of templates) {
      for (const hm of t.reminderTimes ?? []) {
        expect(hm).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/)
      }
      if (t.repeatDays != null) {
        // Due weekdays only make sense for the habit engine (isDueOn).
        expect(t.type).toBe('habit')
        expect(t.repeatDays.length).toBeGreaterThan(0)
        expect(new Set(t.repeatDays).size).toBe(t.repeatDays.length)
        for (const d of t.repeatDays) {
          expect(d).toBeGreaterThanOrEqual(0)
          expect(d).toBeLessThanOrEqual(6)
        }
      }
      if (t.deadlineMonths != null) {
        expect(t.type).toBe('target')
        expect(t.deadlineMonths).toBeGreaterThan(0)
      }
      if (t.averageWindow != null || t.rollingDays != null) {
        expect(t.type).toBe('average')
      }
      if (t.rollingDays != null) expect(t.averageWindow).toBe('rolling')
      if (t.goalDirection != null) expect(t.type).toBe('average')
    }
  })

  it('matches the Strides reference screenshots (spot checks)', () => {
    expect(findTemplate('drinkWater')).toMatchObject({
      targetValue: 8,
      reminderTimes: ['09:00']
    })
    expect(findTemplate('protein')).toMatchObject({
      targetValue: 50,
      reminderTimes: ['07:30', '12:00', '17:30']
    })
    expect(findTemplate('pomodoro')).toMatchObject({
      reminderTimes: ['09:00', '13:00', '16:00']
    })
    expect(findTemplate('inBedBy10')).toMatchObject({
      reminderTimes: ['21:30', '21:45']
    })
    expect(findTemplate('pushUps')).toMatchObject({ targetValue: 25 })
    expect(findTemplate('reviewNotes')).toMatchObject({
      period: 'weekly',
      targetValue: 5,
      repeatDays: [0, 1, 2, 3, 4]
    })
    expect(findTemplate('planTheWeek')).toMatchObject({
      period: 'weekly',
      repeatDays: [0],
      reminderTimes: ['16:00']
    })
    expect(findTemplate('volunteer')).toMatchObject({ repeatDays: [6] })
    expect(findTemplate('budget')).toMatchObject({
      targetValue: 1000,
      goalDirection: 'at_most',
      period: 'monthly',
      averageWindow: 'rolling',
      rollingDays: 90
    })
    expect(findTemplate('expenses')).toMatchObject({
      goalDirection: 'at_most'
    })
    expect(findTemplate('noAlcohol')).toMatchObject({
      type: 'habit',
      direction: 'bad',
      reminderTimes: ['19:00']
    })
    expect(findTemplate('takeMedicine')).toMatchObject({
      type: 'habit',
      direction: 'good'
    })
    expect(findTemplate('walkDog')).toMatchObject({
      reminderTimes: ['19:00']
    })
    expect(findTemplate('weight')).toMatchObject({
      accumulation: 'latest',
      deadlineMonths: 1,
      reminderTimes: ['07:00']
    })
    // "Add to Total" is OFF in the reference → log the running total (latest).
    expect(findTemplate('saveMoney')).toMatchObject({
      accumulation: 'latest',
      deadlineMonths: 3
    })
    expect(findTemplate('revenue')).toMatchObject({
      accumulation: 'latest',
      deadlineMonths: 12
    })
    expect(findTemplate('retirementFund')).toMatchObject({
      deadlineMonths: 240
    })
    expect(findTemplate('limitTv')).toMatchObject({
      direction: 'bad',
      targetValue: 1
    })
    expect(findTemplate('mopFloors')).toMatchObject({
      period: 'monthly',
      targetValue: 2,
      repeatDays: [0, 6]
    })
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
