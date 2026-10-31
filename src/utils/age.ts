export function calculateAge(birthDate: string): string {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  const today = new Date()
  let years = today.getFullYear() - birth.getFullYear()
  let months = today.getMonth() - birth.getMonth()
  if (months < 0) {
    years--
    months += 12
  }
  const days = today.getDate() - birth.getDate()
  if (days < 0) {
    months--
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0)
    const daysInPrevMonth = prevMonth.getDate()
    const adjustedDays = days + daysInPrevMonth
    if (months < 0) {
      months += 12
      years--
    }
    return `${years}y ${months}m ${adjustedDays}d`
  }
  return `${years}y ${months}m ${days}d`
}

export function formatDate(date: string): string {
  if (!date) return ''
  const d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function cowLifeStage(birthDate: string, sex: string): string {
  if (!birthDate) return ''
  const age = calculateAge(birthDate)
  const years = parseInt(age.split('y')[0])
  if (sex !== 'Female') return 'bull'
  if (years < 1) return 'calf'
  if (years < 2) return 'heifer'
  return 'mature_cow'
}

export { todayISO } from './dateOnly'
