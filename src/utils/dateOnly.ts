function toISODate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function startOfMonthISO(base: string = todayISO()): string {
  return `${base.slice(0, 7)}-01`
}

export function addDaysISO(base: string, days: number): string {
  const d = new Date(`${base}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function isBefore(date: string | undefined | null, reference: string = todayISO()): boolean {
  if (!date) return false
  return date.slice(0, 10) < reference
}

export function isOnOrAfter(date: string | undefined | null, reference: string = todayISO()): boolean {
  if (!date) return true
  return date.slice(0, 10) >= reference
}

export function isOnOrBefore(date: string | undefined | null, reference: string): boolean {
  if (!date) return false
  return date.slice(0, 10) <= reference
}

export function isDueWithin(date: string | undefined | null, days: number): boolean {
  if (!date) return false
  const today = todayISO()
  return date.slice(0, 10) >= today && date.slice(0, 10) <= addDaysISO(today, days)
}
