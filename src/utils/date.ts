export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function daysBetween(fromISO: string, toISO: string): number {
  const ms =
    Date.parse(`${toISO.slice(0, 10)}T00:00:00Z`) -
    Date.parse(`${fromISO.slice(0, 10)}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}

/** Add calendar months to a `YYYY-MM-DD` date, clamping to the target
 *  month's last day (31 Jan + 1 month = 28/29 Feb). */
export function isoAddMonths(iso: string, months: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const first = new Date(Date.UTC(y, (m || 1) - 1 + months, 1))
  const lastDay = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)
  ).getUTCDate()
  first.setUTCDate(Math.min(d || 1, lastDay))
  return toISODate(first)
}

export function isSameISODate(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10)
}

export function weekdayOf(iso: string): number {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).getUTCDay()
}

/** Local-time `HH:mm` from a Date. */
export function toHHMM(d: Date): string {
  const h = `${d.getHours()}`.padStart(2, '0')
  const m = `${d.getMinutes()}`.padStart(2, '0')
  return `${h}:${m}`
}

/** A local `Date` carrying the given `HH:mm` (today's date; only time matters). */
export function fromHHMM(hhmm: string): Date {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number)
  const d = new Date()
  d.setHours(Number.isFinite(h) ? h : 18, Number.isFinite(m) ? m : 0, 0, 0)
  return d
}

/** Combine a `YYYY-MM-DD` date + `HH:mm` time into a full ISO datetime string. */
export function combineDateTime(dateISO: string, hhmm: string): string {
  const [y, mo, d] = dateISO.slice(0, 10).split('-').map(Number)
  const [h, mi] = hhmm.slice(0, 5).split(':').map(Number)
  return new Date(y, (mo || 1) - 1, d || 1, h || 0, mi || 0, 0, 0).toISOString()
}
