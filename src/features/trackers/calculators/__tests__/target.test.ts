import { calculateTarget } from '../target';
import type { Tracker, Entry } from '@features/trackers/types';

const base: Tracker = {
  id: 't1', name: 'Save', type: 'target', icon: 'piggy', color: 'green',
  unit: '$', direction: null, targetValue: 2000, startValue: 0,
  accumulation: 'sum', startDate: '2026-01-01', deadline: '2026-12-31',
  period: null, repeatDays: null, createdAt: '2026-01-01T00:00:00Z', archived: false,
};
const entry = (date: string, value: number): Entry =>
  ({ id: date, trackerId: 't1', date, value, note: null });

describe('calculateTarget', () => {
  test('sum mode adds entries to start', () => {
    const p = calculateTarget(base, [entry('2026-01-02', 100), entry('2026-01-03', 50)], '2026-01-03');
    expect(p.current).toBe(150);
    expect(p.goal).toBe(2000);
    expect(p.percent).toBeCloseTo(150 / 2000);
  });

  test('latest mode uses last entry value', () => {
    const t = { ...base, accumulation: 'latest' as const, startValue: 80, targetValue: 65 };
    const p = calculateTarget(t, [entry('2026-01-02', 78), entry('2026-01-05', 74)], '2026-01-05');
    expect(p.current).toBe(74);
  });

  test('behind when current below expected pace', () => {
    const p = calculateTarget(base, [entry('2026-07-01', 100)], '2026-07-02');
    expect(p.paceStatus).toBe('behind');
  });

  test('on_track when current meets expected pace', () => {
    const p = calculateTarget(base, [entry('2026-07-01', 1100)], '2026-07-02');
    expect(['on_track', 'ahead']).toContain(p.paceStatus);
  });
});
