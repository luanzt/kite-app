import type { Tracker, Entry } from '@features/trackers/types'

const HEADER = ['Date', 'Tracker', 'Type', 'Value', 'Unit', 'Note', 'Logged At']
const BOM = '﻿'

/** RFC 4180: quote a field iff it contains a comma, quote, CR or LF; double internal quotes. */
function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) return '"' + value.replace(/"/g, '""') + '"'
  return value
}

function line(cells: string[]): string {
  return cells.map(csvField).join(',')
}

/**
 * Serialize every entry to one CSV row, joining its tracker's name/type/unit.
 * BOM-prefixed so Excel opens it as UTF-8. Rows sorted by date then createdAt.
 * A missing tracker (defensive) yields blank Tracker/Type/Unit cells.
 */
export function entriesToCsv(trackers: Tracker[], entries: Entry[]): string {
  const byId = new Map(trackers.map((t) => [t.id, t]))
  const sorted = [...entries].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
  )
  const rows = sorted.map((e) => {
    const t = byId.get(e.trackerId)
    return line([
      e.date,
      t?.name ?? '',
      t?.type ?? '',
      String(e.value),
      t?.unit ?? '',
      e.note ?? '',
      e.createdAt
    ])
  })
  return BOM + [line(HEADER), ...rows].join('\n')
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** kite-export-YYYY-MM-DD.csv (local date). */
export function exportFilename(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = pad(now.getMonth() + 1)
  const d = pad(now.getDate())
  return `kite-export-${y}-${m}-${d}.csv`
}
