import i18next, { type TFunction } from 'i18next'
import { reminderBody } from '../reminderBody'
import type { Tracker, Entry } from '../types'
import en from '@i18n/locales/en.json'
import vi from '@i18n/locales/vi.json'

function makeT(lng: 'en' | 'vi'): TFunction {
  const inst = i18next.createInstance()
  inst.init({
    resources: { en: { translation: en }, vi: { translation: vi } },
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  })
  return inst.getFixedT(lng)
}
const tEn = makeT('en')
const tVi = makeT('vi')

const base: Tracker = {
  id: 't1',
  name: 'Tracker',
  type: 'habit',
  icon: 'run',
  color: 'blue',
  unit: null,
  direction: 'good',
  targetValue: 1,
  startValue: null,
  accumulation: null,
  startDate: '2026-07-16',
  deadline: null,
  period: 'daily',
  repeatDays: null,
  routine: null,
  reminderTimes: ['09:00'],
  goalNote: null,
  averageWindow: null,
  rollingDays: null,
  doneRule: null,
  progressBasis: null,
  createdAt: '2026-07-16T00:00:00Z',
  archived: false
}
const e = (date: string, value: number): Entry => ({
  id: `${date}-${value}-${Math.random()}`,
  trackerId: 't1',
  date,
  value,
  note: null,
  createdAt: `${date}T00:00:00Z`
})
const TODAY = '2026-07-18'

describe('reminderBody — daily habit', () => {
  test('done today / per-day goal / streak in days (singular + plural)', () => {
    const t = { ...base, targetValue: 1 }
    expect(
      reminderBody(
        t,
        [e('2026-07-16', 1), e('2026-07-17', 1), e('2026-07-18', 1)],
        tEn,
        'en',
        TODAY
      )
    ).toBe('Done: 1/1 today · Streak: 3 days')
  })

  test('per-day goal 5, not done → streak 0, done is today total', () => {
    const t = { ...base, targetValue: 5, startDate: '2026-07-18' }
    expect(
      reminderBody(
        t,
        [e('2026-07-18', 1), e('2026-07-18', 1)],
        tEn,
        'en',
        TODAY
      )
    ).toBe('Done: 2/5 today · Streak: 0 days')
  })
})

describe('reminderBody — non-daily habit (period-aware)', () => {
  test('weekly habit → total/goal this week + streak in weeks, not days', () => {
    const t = {
      ...base,
      period: 'weekly' as const,
      targetValue: 5,
      startDate: '2026-07-13' // Monday of the current week
    }
    // 3 logs this week (Mon–Wed), goal 5/week, current week not yet met → 0 weeks
    expect(
      reminderBody(
        t,
        [e('2026-07-13', 1), e('2026-07-14', 1), e('2026-07-15', 1)],
        tEn,
        'en',
        TODAY
      )
    ).toBe('Done: 3/5 this week · Streak: 0 weeks')
  })
})

describe('reminderBody — bad habit', () => {
  test('clean-days streak', () => {
    const t = { ...base, direction: 'bad' as const, targetValue: 0 }
    expect(reminderBody(t, [], tEn, 'en', TODAY)).toBe('Streak: 3 days clean')
  })
})

describe('reminderBody — target', () => {
  const target: Tracker = {
    ...base,
    type: 'target',
    direction: null,
    accumulation: 'sum',
    targetValue: 30000,
    startValue: 5000,
    period: null
  }

  test('with deadline → compact goal/current/progress + dated (year forced)', () => {
    const t = { ...target, deadline: '2026-11-29' }
    expect(reminderBody(t, [], tEn, 'en', TODAY)).toBe(
      'Goal: 30K by 29 Nov 2026 · Current: 5K · Progress: 0'
    )
  })

  test('progress = current − startValue after logging', () => {
    const t = { ...target, deadline: '2026-11-29' }
    expect(
      reminderBody(t, [e('2026-07-18', 172000)], tEn, 'en', TODAY)
    ).toContain('Current: 177K · Progress: 172K')
  })

  test('no deadline → no date', () => {
    const t = { ...target, deadline: null }
    expect(reminderBody(t, [], tEn, 'en', TODAY)).toBe(
      'Goal: 30K · Current: 5K · Progress: 0'
    )
  })
})

describe('reminderBody — average (period-aware)', () => {
  const avg: Tracker = {
    ...base,
    type: 'average',
    direction: null,
    targetValue: 8,
    period: 'daily',
    startDate: '2026-07-16'
  }

  test('daily → per day, avg with up to 2 decimals', () => {
    expect(
      reminderBody(
        avg,
        [e('2026-07-16', 1), e('2026-07-17', 1), e('2026-07-18', 8)],
        tEn,
        'en',
        TODAY
      )
    ).toBe('Goal: 8 per day · Average: 3.33')
  })

  test('weekly → per week, not per day', () => {
    const t = { ...avg, period: 'weekly' as const, startDate: '2026-07-13' }
    expect(reminderBody(t, [e('2026-07-13', 8)], tEn, 'en', TODAY)).toBe(
      'Goal: 8 per week · Average: 8'
    )
  })
})

describe('reminderBody — Vietnamese', () => {
  test('daily habit', () => {
    const t = { ...base, targetValue: 1 }
    expect(
      reminderBody(
        t,
        [e('2026-07-16', 1), e('2026-07-17', 1), e('2026-07-18', 1)],
        tVi,
        'vi',
        TODAY
      )
    ).toBe('Đã làm: 1/1 hôm nay · Chuỗi: 3 ngày')
  })

  test('weekly habit uses week words', () => {
    const t = {
      ...base,
      period: 'weekly' as const,
      targetValue: 5,
      startDate: '2026-07-13'
    }
    expect(
      reminderBody(
        t,
        [e('2026-07-13', 1), e('2026-07-14', 1)],
        tVi,
        'vi',
        TODAY
      )
    ).toBe('Đã làm: 2/5 tuần này · Chuỗi: 0 tuần')
  })
})
