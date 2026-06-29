import { jsPDF } from 'jspdf'
import type { Cow, DailyRecord } from '../types'
import { calculateAge, formatDate } from './age'

function drawSection(
  doc: jsPDF,
  y: number,
  title: string,
  fields: [string, string][],
  color: [number, number, number]
): number {
  const margin = 15
  const pageWidth = doc.internal.pageSize.getWidth()
  const left = margin
  const right = pageWidth - margin
  const lineH = 6.5

  doc.setFillColor(color[0], color[1], color[2])
  doc.rect(left, y, right - left, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(title, left + 2, y + 6)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)

  let cy = y + 11
  const colW = (right - left - 4) / 2
  for (let i = 0; i < fields.length; i++) {
    const col = i % 2
    if (col === 0 && i > 0) {
      cy += lineH
    }
    const x = left + 2 + col * colW
    doc.text(`${fields[i][0]}: ${fields[i][1]}`, x, cy)
  }
  return cy + lineH + 3
}

export function generateSummaryCard(cow: Cow): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw = doc.internal.pageSize.getWidth()
  const margin = 15

  doc.setFillColor(0, 102, 204)
  doc.rect(0, 0, pw, 25, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('COW SUMMARY CARD', pw / 2, 16, { align: 'center' })
  doc.setFontSize(9)
  doc.text(`Issued: ${formatDate(cow.issued_date || new Date().toISOString())} | By: ${cow.issued_by || '—'}`, pw / 2, 22, { align: 'center' })

  if (cow.image_url) {
    try {
      doc.addImage(cow.image_url, 'JPEG', pw - 55, 30, 40, 40)
    } catch {}
  }

  let y = 33
  y = drawSection(doc, y, 'IDENTITY', [
    ['ID No', cow.id_no || '—'],
    ['Tag', cow.tag || '—'],
    ['Collar No', cow.collar_no || '—'],
    ['Name', cow.name || '—'],
    ['Breed', cow.breed || '—'],
    ['Sex', cow.sex || '—'],
    ['Colour', cow.colour || '—'],
    ['Age', cow.birth_date ? calculateAge(cow.birth_date) : '—'],
    ['Origin', cow.origin || '—'],
    ['Group', cow.group_name || '—'],
  ], [0, 102, 204])

  y = drawSection(doc, y, 'BREEDING & REPRODUCTION', [
    ['Dam ID', cow.dam_id || '—'],
    ['Bull Name', cow.bull_name || '—'],
    ['Lactations', String(cow.lactations ?? '—')],
    ['Calving Date', formatDate(cow.calving_date) || '—'],
    ['PD Date', formatDate(cow.pd_date) || '—'],
    ['Pregnancy', cow.pregnancy_result || '—'],
    ['Dry-off Date', formatDate(cow.expected_dry_off_date) || '—'],
    ['Calving (Expected)', formatDate(cow.expected_calving_date) || '—'],
  ], [0, 153, 76])

  y = drawSection(doc, y, 'MILK PRODUCTION', [
    ['Days in Milk', String(cow.days_in_milk ?? '—')],
    ['Peak Yield', cow.peak_milk_yield ? `${cow.peak_milk_yield} L` : '—'],
    ['Current Daily', cow.current_daily_milk_yield ? `${cow.current_daily_milk_yield} L` : '—'],
    ['Total Lactation', cow.total_lactation_yield ? `${cow.total_lactation_yield} L` : '—'],
  ], [204, 153, 0])

  y = drawSection(doc, y, 'HEALTH & SCORING', [
    ['Body Condition Score', String(cow.body_condition_score ?? '—')],
    ['Dead Qtr-Teat', cow.dead_qtr_teat || '—'],
    ['Mastitis History', cow.mastitis_history || '—'],
    ['Vaccinations', cow.vaccinations || '—'],
    ['Deworming', cow.deworming_dates || '—'],
  ], [204, 51, 0])

  doc.setFontSize(7)
  doc.setTextColor(128, 128, 128)
  doc.text(`Generated: ${new Date().toLocaleString()} | Cow Card v1.0`, margin, doc.internal.pageSize.getHeight() - 10)

  return doc
}

export function generateDetailedCard(cow: Cow, dailyRecords: DailyRecord[]): jsPDF {
  const doc = generateSummaryCard(cow)
  doc.addPage()
  const margin = 15
  const pw = doc.internal.pageSize.getWidth()
  let y = margin + 5

  doc.setFillColor(102, 51, 153)
  doc.rect(margin, y - 4, pw - margin * 2, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('MEDICAL RECORDS', margin + 2, y + 1)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(8)
  y += 12
  doc.text(cow.medical_records || 'No medical records recorded.', margin + 2, y)

  y += 12
  doc.setFillColor(0, 153, 76)
  doc.rect(margin, y - 4, pw - margin * 2, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('DAILY RECORDS', margin + 2, y + 1)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(8)
  y += 12

  if (dailyRecords.length === 0) {
    doc.text('No daily records recorded yet.', margin + 2, y)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.text('Date', margin + 2, y)
    doc.text('Milk Yield (L)', margin + 50, y)
    doc.text('BCS', margin + 90, y)
    doc.text('Notes', margin + 110, y)
    doc.setFont('helvetica', 'normal')
    y += 5
    doc.line(margin, y, pw - margin, y)

    for (const rec of dailyRecords) {
      y += 6
      if (y > 280) {
        doc.addPage()
        y = margin + 5
      }
      doc.text(formatDate(rec.date), margin + 2, y)
      doc.text(String(rec.milk_yield ?? '—'), margin + 50, y)
      doc.text(String(rec.body_condition_score ?? '—'), margin + 90, y)
      doc.text(rec.notes || '—', margin + 110, y)
    }
  }

  return doc
}

export function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename)
}
