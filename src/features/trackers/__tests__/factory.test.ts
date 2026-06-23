import { buildTracker } from '@features/trackers/factory'

describe('buildTracker — target startValue / schedule / reminders', () => {
  it('keeps an explicit startValue for a target', () => {
    const t = buildTracker({
      name: 'Save',
      type: 'target',
      targetValue: 2000,
      startValue: 500
    })
    expect(t.startValue).toBe(500)
  })

  it('defaults target startValue to 0 when omitted', () => {
    const t = buildTracker({ name: 'Save', type: 'target', targetValue: 2000 })
    expect(t.startValue).toBe(0)
  })

  it('keeps a startValue of 0 (not null) for a target', () => {
    const t = buildTracker({
      name: 'Save',
      type: 'target',
      targetValue: 2000,
      startValue: 0
    })
    expect(t.startValue).toBe(0)
  })

  it('applies repeatDays and reminderTime to a target', () => {
    const t = buildTracker({
      name: 'Save',
      type: 'target',
      targetValue: 2000,
      repeatDays: [1, 3, 5],
      reminderTime: '18:00'
    })
    expect(t.repeatDays).toEqual([1, 3, 5])
    expect(t.reminderTime).toBe('18:00')
  })

  it('defaults target repeatDays to every day when omitted', () => {
    const t = buildTracker({ name: 'Save', type: 'target', targetValue: 2000 })
    expect(t.repeatDays).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('leaves target reminderTime null and routine null when omitted', () => {
    const t = buildTracker({ name: 'Save', type: 'target', targetValue: 2000 })
    expect(t.reminderTime).toBeNull()
    expect(t.routine).toBeNull()
  })

  it('does not give a non-target/non-habit type a startValue or repeatDays', () => {
    const t = buildTracker({ name: 'Avg', type: 'average', targetValue: 8 })
    expect(t.startValue).toBeNull()
    expect(t.repeatDays).toBeNull()
  })
})
