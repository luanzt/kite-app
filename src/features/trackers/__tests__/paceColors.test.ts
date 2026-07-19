import {
  PACE_COLOR,
  PACE_COLOR_DARK,
  PACE_WEAK,
  PACE_WEAK_DARK,
  paceColorsFor,
  progressFill
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

describe('unified pace palette: "good" is a single green', () => {
  it('ahead renders the same green as on_track (light)', () => {
    expect(PACE_COLOR.ahead).toBe(PACE_COLOR.on_track)
    expect(PACE_WEAK.ahead).toBe(PACE_WEAK.on_track)
  })

  it('ahead renders the same green as on_track (dark)', () => {
    expect(PACE_COLOR_DARK.ahead).toBe(PACE_COLOR_DARK.on_track)
    expect(PACE_WEAK_DARK.ahead).toBe(PACE_WEAK_DARK.on_track)
  })
})

describe('progressFill: in-progress fill is brand blue, not gray', () => {
  const brand = '#2456b5'

  it('maps none to the brand color (in progress / no baseline)', () => {
    expect(progressFill('none', PACE_COLOR, brand)).toBe(brand)
  })

  it('passes real pace statuses straight through', () => {
    expect(progressFill('behind', PACE_COLOR, brand)).toBe(PACE_COLOR.behind)
    expect(progressFill('on_track', PACE_COLOR, brand)).toBe(
      PACE_COLOR.on_track
    )
    expect(progressFill('ahead', PACE_COLOR, brand)).toBe(PACE_COLOR.ahead)
  })
})
