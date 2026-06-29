import Papa from 'papaparse'
import type { Cow } from '../types'

export function exportCowSummaryCSV(cows: Cow[]): void {
  const data = cows.map(c => ({
    'ID No': c.id_no,
    Tag: c.tag,
    Name: c.name,
    Breed: c.breed,
    Sex: c.sex,
    Colour: c.colour,
    Age: c.birth_date,
    Origin: c.origin,
    Group: c.group_name,
    Lactations: c.lactations,
    'Pregnancy Result': c.pregnancy_result,
    'Peak Milk Yield': c.peak_milk_yield,
    'Current Daily Yield': c.current_daily_milk_yield,
    'Total Lactation Yield': c.total_lactation_yield,
    'Body Condition Score': c.body_condition_score,
    'Issued Date': c.issued_date,
    'Issued By': c.issued_by,
  }))
  const csv = Papa.unparse(data)
  downloadBlob(csv, 'cow_summary.csv', 'text/csv')
}

export function exportCowDetailedCSV(cows: Cow[]): void {
  const data = cows.map(c => ({
    ...c,
    age: undefined
  }))
  const csv = Papa.unparse(data)
  downloadBlob(csv, 'cow_detailed.csv', 'text/csv')
}
function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
