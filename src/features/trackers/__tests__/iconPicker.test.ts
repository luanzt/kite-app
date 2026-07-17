import { ICONSET, defaultIcon } from '../iconSets'
import { iconEmoji, iconKey } from '../icons'
import { QUICK_STARTS } from '../quickStarts'
import { allTemplates } from '../templates'

/** True if a string contains a UTF-16 surrogate (i.e. a non-BMP char/emoji). */
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

/**
 * op-sqlite v16 corrupts string bind params containing non-BMP characters
 * (emoji) — both executeSync and async execute mangle the surrogate pair on
 * write. So a tracker's stored `icon` MUST be an ASCII-safe keyword
 * ("lotus", "pill"), never a raw emoji. `iconEmoji()` maps keyword → glyph for
 * display; the form's picker stores keywords via `iconKey()`.
 */
describe('icon storage is ASCII-safe (no emoji persisted)', () => {
  it('every ICONSET entry is an ASCII keyword, not an emoji', () => {
    for (const type of ['habit', 'target', 'average', 'project'] as const) {
      for (const key of ICONSET[type]) {
        expect(hasSurrogate(key)).toBe(false)
      }
    }
  })

  it("each type's default icon is an ASCII keyword in its ICONSET", () => {
    for (const type of ['habit', 'target', 'average', 'project'] as const) {
      const d = defaultIcon(type)
      expect(hasSurrogate(d)).toBe(false)
      expect(ICONSET[type]).toContain(d)
    }
  })

  it('every quick-start icon keyword is ASCII and renders an emoji glyph', () => {
    for (const qs of QUICK_STARTS) {
      expect(hasSurrogate(qs.icon)).toBe(false)
      // Display still produces a real (non-ASCII) glyph for the keyword.
      expect(isGlyph(iconEmoji(qs.icon))).toBe(true)
    }
  })

  it('every ICONSET keyword maps to a distinct emoji glyph for display', () => {
    for (const type of ['habit', 'target', 'average', 'project'] as const) {
      const glyphs = ICONSET[type].map((k) => iconEmoji(k))
      // Each keyword resolves to a real glyph (not the ASCII fallback).
      for (const g of glyphs) expect(isGlyph(g)).toBe(true)
      // No two tiles in a type collide on the same glyph.
      expect(new Set(glyphs).size).toBe(glyphs.length)
    }
  })

  it('iconKey() maps a picked emoji glyph back to its ASCII keyword (round-trip)', () => {
    for (const type of ['habit', 'target', 'average', 'project'] as const) {
      for (const key of ICONSET[type]) {
        const glyph = iconEmoji(key)
        expect(iconKey(glyph)).toBe(key)
      }
    }
  })

  it('iconKey() passes an already-keyword value through unchanged', () => {
    expect(iconKey('lotus')).toBe('lotus')
    expect(iconKey('pill')).toBe('pill')
  })

  it("every template icon is offered in its type's ICONSET picker", () => {
    for (const tpl of allTemplates()) {
      expect(ICONSET[tpl.type]).toContain(tpl.icon)
    }
  })
})
