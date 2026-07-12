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

  it('applies repeatDays and reminderTimes to a target', () => {
    const t = buildTracker({
      name: 'Save',
      type: 'target',
      targetValue: 2000,
      repeatDays: [1, 3, 5],
      reminderTimes: ['08:00', '18:00']
    })
    expect(t.repeatDays).toEqual([1, 3, 5])
    expect(t.reminderTimes).toEqual(['08:00', '18:00'])
  })

  it("defaults reminderTimes to ['18:00'] for habit/target/average", () => {
    const habit = buildTracker({ name: 'Meditate', type: 'habit' })
    const target = buildTracker({
      name: 'Save',
      type: 'target',
      targetValue: 1
    })
    const avg = buildTracker({ name: 'Water', type: 'average', targetValue: 8 })
    expect(habit.reminderTimes).toEqual(['18:00'])
    expect(target.reminderTimes).toEqual(['18:00'])
    expect(avg.reminderTimes).toEqual(['18:00'])
    expect(target.routine).toBeNull()
  })

  it('gives a project no reminders by default', () => {
    expect(
      buildTracker({ name: 'Ship', type: 'project' }).reminderTimes
    ).toEqual([])
  })

  it('keeps an explicit empty reminderTimes (reminders switched off)', () => {
    const t = buildTracker({
      name: 'Meditate',
      type: 'habit',
      reminderTimes: []
    })
    expect(t.reminderTimes).toEqual([])
  })

  it('defaults target repeatDays to every day when omitted', () => {
    const t = buildTracker({ name: 'Save', type: 'target', targetValue: 2000 })
    expect(t.repeatDays).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('does not give a non-target/non-habit type a startValue or repeatDays', () => {
    const t = buildTracker({ name: 'Avg', type: 'average', targetValue: 8 })
    expect(t.startValue).toBeNull()
    expect(t.repeatDays).toBeNull()
  })
})

describe('buildTracker — average Strides options', () => {
  it('defaults the four average fields for an average tracker', () => {
    const t = buildTracker({ name: 'Water', type: 'average', targetValue: 8 })
    expect(t.averageWindow).toBe('since_start')
    expect(t.rollingDays).toBeNull() // only set when rolling
    expect(t.doneRule).toBe('when_logged')
    expect(t.progressBasis).toBe('overall_avg')
  })

  it('rolling window defaults rollingDays to 7 and keeps explicit values', () => {
    const t = buildTracker({
      name: 'Water',
      type: 'average',
      averageWindow: 'rolling'
    })
    expect(t.averageWindow).toBe('rolling')
    expect(t.rollingDays).toBe(7)
    const t14 = buildTracker({
      name: 'Water',
      type: 'average',
      averageWindow: 'rolling',
      rollingDays: 14
    })
    expect(t14.rollingDays).toBe(14)
  })

  it('non-average types get null for all four fields', () => {
    const h = buildTracker({ name: 'Meditate', type: 'habit' })
    expect(h.averageWindow).toBeNull()
    expect(h.rollingDays).toBeNull()
    expect(h.doneRule).toBeNull()
    expect(h.progressBasis).toBeNull()
  })
})
