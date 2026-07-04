import {
  PACE_COLOR,
  PACE_COLOR_DARK,
  paceColorsFor
} from '@features/trackers/icons'

describe('paceColorsFor', () => {
  it('returns the light palette for light', () => {
    expect(paceColorsFor('light').color.on_track).toBe(PACE_COLOR.on_track)
  })

  it('returns the dark palette for dark', () => {
    expect(paceColorsFor('dark').color.on_track).toBe(PACE_COLOR_DARK.on_track)
  })

  it('dark on_track differs from light on_track', () => {
    expect(PACE_COLOR_DARK.on_track).not.toBe(PACE_COLOR.on_track)
  })
})
