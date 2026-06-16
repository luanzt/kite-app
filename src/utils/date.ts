export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function daysBetween(fromISO: string, toISO: string): number {
  const ms =
    Date.parse(`${toISO.slice(0, 10)}T00:00:00Z`) -
    Date.parse(`${fromISO.slice(0, 10)}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}

export function isSameISODate(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10)
}

export function weekdayOf(iso: string): number {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).getUTCDay()
}
