import { entriesToCsv, exportFilename } from '../csv'
import type { Tracker, Entry } from '@features/trackers/types'

const BOM = '﻿'
const HEADER = 'Date,Tracker,Type,Value,Unit,Note,Logged At'

function tracker(over: Partial<Tracker>): Tracker {
  return {
    id: 't1',
    name: 'Water',
    type: 'target',
    icon: 'drop',
    color: 'blue',
    unit: 'ml',
    direction: null,
    targetValue: null,
    startValue: null,
    accumulation: null,
    startDate: '2026-01-01',
    deadline: null,
    period: null,
    repeatDays: null,
    reminderTimes: [],
    goalNote: null,
    averageWindow: null,
    rollingDays: null,
    doneRule: null,
    progressBasis: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    archived: false,
    ...over
  }
}

function entry(over: Partial<Entry>): Entry {
  return {
    id: 'e1',
    trackerId: 't1',
    date: '2026-07-01',
    value: 500,
    note: null,
    createdAt: '2026-07-01T08:00:00.000Z',
    ...over
  }
}

describe('entriesToCsv', () => {
  it('emits a BOM + header row when there are no entries', () => {
    expect(entriesToCsv([], [])).toBe(BOM + HEADER)
  })

  it('joins tracker info and lays out columns in order', () => {
    const csv = entriesToCsv([tracker({})], [entry({})])
    const lines = csv.replace(BOM, '').split('\n')
    expect(lines[0]).toBe(HEADER)
    expect(lines[1]).toBe(
      '2026-07-01,Water,target,500,ml,,2026-07-01T08:00:00.000Z'
    )
  })

  it('leaves Unit blank when the tracker unit is null', () => {
    const csv = entriesToCsv([tracker({ unit: null })], [entry({ value: 1 })])
    const row = csv.replace(BOM, '').split('\n')[1]
    expect(row).toBe('2026-07-01,Water,target,1,,,2026-07-01T08:00:00.000Z')
  })

  it('sorts by date then createdAt', () => {
    const csv = entriesToCsv(
      [tracker({})],
      [
        entry({
          id: 'b',
          date: '2026-07-02',
          createdAt: '2026-07-02T09:00:00.000Z',
          value: 2
        }),
        entry({
          id: 'a',
          date: '2026-07-01',
          createdAt: '2026-07-01T20:00:00.000Z',
          value: 1
        }),
        entry({
          id: 'c',
          date: '2026-07-01',
          createdAt: '2026-07-01T06:00:00.000Z',
          value: 3
        })
      ]
    )
    const vals = csv
      .replace(BOM, '')
      .split('\n')
      .slice(1)
      .map((l) => l.split(',')[3])
    expect(vals).toEqual(['3', '1', '2'])
  })

  it('escapes commas, quotes and newlines per RFC 4180', () => {
    const csv = entriesToCsv(
      [tracker({ name: 'A, Inc "x"' })],
      [entry({ note: 'line1\nline2' })]
    )
    const row = csv.replace(BOM, '').split('\n').slice(1).join('\n')
    expect(row).toContain('"A, Inc ""x"""')
    expect(row).toContain('"line1\nline2"')
  })

  it('preserves UTF-8 note content', () => {
    const csv = entriesToCsv([tracker({})], [entry({ note: 'Chạy bộ 🏃' })])
    expect(csv).toContain('Chạy bộ 🏃')
  })

  it('emits a blank tracker cell when the tracker is missing', () => {
    const csv = entriesToCsv([], [entry({ trackerId: 'gone' })])
    const row = csv.replace(BOM, '').split('\n')[1]
    expect(row).toBe('2026-07-01,,,500,,,2026-07-01T08:00:00.000Z')
  })
})

describe('exportFilename', () => {
  it('formats as kite-export-YYYY-MM-DD.csv', () => {
    expect(exportFilename(new Date('2026-07-19T10:54:00.000Z'))).toBe(
      'kite-export-2026-07-19.csv'
    )
  })
})
