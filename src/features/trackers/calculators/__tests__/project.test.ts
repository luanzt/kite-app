import { calculateProject } from '../project'
import type { Tracker, Milestone } from '@features/trackers/types'

const proj: Tracker = {
  id: 'p1',
  name: 'Launch app',
  type: 'project',
  icon: 'rocket',
  color: 'purple',
  unit: null,
  direction: null,
  targetValue: null,
  startValue: null,
  accumulation: null,
  startDate: '2026-01-01',
  deadline: '2026-12-31',
  period: null,
  repeatDays: null,
  routine: null,
  reminderTime: null,
  createdAt: '2026-01-01T00:00:00Z',
  archived: false
}
const m = (id: string, progress: number): Milestone => ({
  id,
  trackerId: 'p1',
  title: id,
  dueDate: null,
  progress,
  orderIndex: 0
})

describe('calculateProject', () => {
  test('overall progress is mean of milestone progress', () => {
    const p = calculateProject(proj, [m('a', 1), m('b', 0)], '2026-06-30')
    expect(p.percent).toBe(0.5)
  })

  test('no milestones → 0 percent', () => {
    const p = calculateProject(proj, [], '2026-06-30')
    expect(p.percent).toBe(0)
  })

  test('behind when progress below time pace', () => {
    const p = calculateProject(proj, [m('a', 0.1)], '2026-07-02')
    expect(p.paceStatus).toBe('behind')
  })

  test('on_track when progress meets time pace', () => {
    const p = calculateProject(proj, [m('a', 0.6)], '2026-07-02')
    expect(['on_track', 'ahead']).toContain(p.paceStatus)
  })
})
