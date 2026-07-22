import {
  QUICK_START_KEYS,
  quickStartTemplates,
  findTemplate
} from '../templates'
import enJson from '@i18n/locales/en.json'
import viJson from '@i18n/locales/vi.json'

type Loc = { template: { items: Record<string, string> } }
const en = enJson as unknown as Loc
const vi = viJson as unknown as Loc

describe('quickStartTemplates', () => {
  it('returns one template per QUICK_START_KEYS entry, in order', () => {
    const list = quickStartTemplates()
    expect(list).toHaveLength(QUICK_START_KEYS.length)
    expect(list.map((tpl) => tpl.key)).toEqual([...QUICK_START_KEYS])
  })

  it('resolves every featured key to a real template (none dropped)', () => {
    for (const key of QUICK_START_KEYS) {
      expect(findTemplate(key)).toBeDefined()
    }
  })

  it('has a template.items name for every featured key in en and vi', () => {
    for (const key of QUICK_START_KEYS) {
      expect(en.template.items[key]).toBeTruthy()
      expect(vi.template.items[key]).toBeTruthy()
    }
  })

  it('no featured average template carries a unit', () => {
    for (const tpl of quickStartTemplates()) {
      if (tpl.type === 'average') {
        expect(tpl.unit).toBeUndefined()
      }
    }
  })
})
