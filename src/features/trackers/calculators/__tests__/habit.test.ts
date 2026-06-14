import { calculateHabit } from '../habit';
import type { Tracker, Entry } from '@features/trackers/types';

const habit: Tracker = {
  id: 'h1', name: 'Meditate', type: 'habit', icon: 'lotus', color: 'blue',
  unit: null, direction: 'good', targetValue: null, startValue: null,
  accumulation: null, startDate: '2026-06-01', deadline: null,
  period: 'daily', repeatDays: [0,1,2,3,4,5,6],
  createdAt: '2026-06-01T00:00:00Z', archived: false,
};
const done = (date: string): Entry => ({ id: date, trackerId: 'h1', date, value: 1, note: null });

describe('calculateHabit', () => {
  test('counts consecutive recent days as streak', () => {
    const p = calculateHabit(habit, [done('2026-06-12'), done('2026-06-13'), done('2026-06-14')], '2026-06-14');
    expect(p.streak).toBe(3);
  });

  test('streak breaks on a missed due day', () => {
    const p = calculateHabit(habit, [done('2026-06-12'), done('2026-06-14')], '2026-06-14');
    expect(p.streak).toBe(1);
  });

  test('success rate = done days / due days', () => {
    const p = calculateHabit(habit, [done('2026-06-12'), done('2026-06-14')], '2026-06-14');
    expect(p.successRate).toBeCloseTo(2 / 14);
  });

  test('pace status is none for habits', () => {
    const p = calculateHabit(habit, [done('2026-06-14')], '2026-06-14');
    expect(p.paceStatus).toBe('none');
  });

  test('today unlogged does not wipe the streak', () => {
    // done 06-12 and 06-13, today 06-14 unlogged → streak stays 2
    const p = calculateHabit(habit, [done('2026-06-12'), done('2026-06-13')], '2026-06-14');
    expect(p.streak).toBe(2);
  });

  test('a missed PAST due day still breaks the streak', () => {
    // 06-14 done, 06-13 missed (past due day) → streak 1
    const p = calculateHabit(habit, [done('2026-06-12'), done('2026-06-14')], '2026-06-14');
    expect(p.streak).toBe(1);
  });
});
