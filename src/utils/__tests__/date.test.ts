import { toISODate, daysBetween, isSameISODate, weekdayOf } from '@utils/date';

describe('date utils', () => {
  test('toISODate strips time', () => {
    expect(toISODate(new Date('2026-06-14T09:30:00Z'))).toBe('2026-06-14');
  });

  test('daysBetween counts whole days', () => {
    expect(daysBetween('2026-06-01', '2026-06-14')).toBe(13);
  });

  test('daysBetween is zero for same day', () => {
    expect(daysBetween('2026-06-14', '2026-06-14')).toBe(0);
  });

  test('isSameISODate compares date portion', () => {
    expect(isSameISODate('2026-06-14', '2026-06-14')).toBe(true);
    expect(isSameISODate('2026-06-14', '2026-06-15')).toBe(false);
  });

  test('weekdayOf returns 0..6 (Sun..Sat)', () => {
    expect(weekdayOf('2026-06-14')).toBe(0); // Sunday
  });
});
