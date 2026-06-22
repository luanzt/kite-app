import { calculateAverage } from '../average'
import type { Tracker, Entry } from '@features/trackers/types'

const avg: Tracker = {
  id: 'a1',
  name: 'Water',
  type: 'average',
  icon: 'drop',
  color: 'cyan',
  unit: 'glasses',
  direction: null,
  targetValue: 8,
  startValue: null,
  accumulation: null,
  startDate: '2026-06-01',
  deadline: null,
  period: 'daily',
  repeatDays: null,
  routine: null,
  reminderTime: null,
  goalNote: null,
  createdAt: '2026-06-01T00:00:00Z',
  archived: false
}
const e = (date: string, value: number): Entry => ({
  id: date,
  trackerId: 'a1',
  date,
  value,
  note: null,
  createdAt: `${date}T00:00:00Z`
})

describe('calculateAverage', () => {
  test('current is the mean of entry values', () => {
    const p = calculateAverage(
      avg,
      [e('2026-06-12', 6), e('2026-06-13', 10)],
      '2026-06-13'
    )
    expect(p.current).toBe(8)
    expect(p.goal).toBe(8)
  })

  test('on_track when average meets target', () => {
    const p = calculateAverage(
      avg,
      [e('2026-06-12', 8), e('2026-06-13', 9)],
      '2026-06-13'
    )
    expect(p.paceStatus).toBe('on_track')
  })

  test('behind when average below target', () => {
    const p = calculateAverage(avg, [e('2026-06-12', 3)], '2026-06-13')
    expect(p.paceStatus).toBe('behind')
  })

  test('no entries → current 0, behind', () => {
    const p = calculateAverage(avg, [], '2026-06-13')
    expect(p.current).toBe(0)
    expect(p.paceStatus).toBe('behind')
  })
})
