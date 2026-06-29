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
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}
