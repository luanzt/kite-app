import { decideToggleAction } from '@features/trackers/notificationToggle'

describe('decideToggleAction', () => {
  it('OS granted, currently off → toggle (turn on)', () => {
    expect(decideToggleAction(true, false)).toBe('toggle')
  })
  it('OS granted, currently on → toggle (turn off)', () => {
    expect(decideToggleAction(true, true)).toBe('toggle')
  })
  it('OS denied, currently on → toggle (allow turning off)', () => {
    expect(decideToggleAction(false, true)).toBe('toggle')
  })
  it('OS denied, currently off → request permission', () => {
    expect(decideToggleAction(false, false)).toBe('request')
  })
})
