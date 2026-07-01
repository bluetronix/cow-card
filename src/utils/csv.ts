import Papa from 'papaparse'
import type { Cow, DailyRecord } from '../types'

export function exportAllCowsCSV(cows: Cow[]): void {
  const csv = Papa.unparse(cows.map(c => ({
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
    'Health Status': c.current_health_status,
    'Last Checkup': c.last_checkup_date,
    'Peak Milk Yield': c.peak_milk_yield,
    'Current Daily Yield': c.current_daily_milk_yield,
    'Total Lactation Yield': c.total_lactation_yield,
    'Days in Milk': c.days_in_milk,
    'Body Condition Score': c.body_condition_score,
    'Feeding Group': c.feeding_group,
    'Milking Group': c.milking_group,
    'Pen/Barn': c.pen_barn_no,
    Housing: c.housing,
    Remarks: c.remarks,
    'Issued Date': c.issued_date,
    'Issued By': c.issued_by,
  })))
  downloadBlob(csv, 'all_cows.csv', 'text/csv')
}

export function exportDailyRecordsCSV(records: DailyRecord[]): void {
  const data = records.map(r => ({
    'Cow ID': r.cow_id,
    Date: r.date,
    'Milk AM (L)': r.milk_yield_morning,
    'Milk PM (L)': r.milk_yield_evening,
    'Milk Total (L)': r.milk_yield_total,
    'Health Status': r.health_status,
    'Last Checkup': r.last_checkup_date,
    'Temperature (°C)': r.temperature,
    Symptoms: r.symptoms,
    'Treatment Given': r.treatment_given,
    'Health Notes': r.health_notes,
    Notes: r.notes,
  }))
  const csv = Papa.unparse(data)
  downloadBlob(csv, 'daily_records.csv', 'text/csv')
}

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
