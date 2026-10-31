import { jsPDF } from 'jspdf'
import type { Cow, DailyRecord, HealthIncident, Treatment, VaccinationRecord, LamenessSession } from '../types'
import { formatDate } from './age'
import { db } from '../db/dexie'
import { computeHerdStats } from './herdStats'
import { canvasToPdf, renderComponentToCanvas, renderCowCardPdf } from './renderCard'
import HerdSummaryCard from '../components/HerdSummaryCard.vue'


export async function generateSummaryCard(cow: Cow, orientation?: 'portrait' | 'landscape'): Promise<jsPDF> {
  return renderCowCardPdf(cow, undefined, orientation)
}

export async function generateDetailedCard(cow: Cow, orientation?: 'portrait' | 'landscape'): Promise<jsPDF> {
  const doc = await generateSummaryCard(cow, orientation)
  const margin = 15
  const pw = doc.internal.pageSize.getWidth()
  let y = margin + 5

  // Daily Records section
  doc.addPage()
  doc.setFillColor(10, 75, 41)
  doc.roundedRect(margin, y - 4, pw - margin * 2, 8, 1.5, 1.5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('DAILY RECORDS', margin + 2, y + 1)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(7)
  y += 14

  const records = await db.dailyRecords
    .where('cow_id').equals(cow.id)
    .reverse().sortBy('date')

  if (records.length === 0) {
    doc.setFontSize(8)
    doc.text('No daily records recorded.', margin + 2, y)
  } else {
    const cols = ['Date', 'Milk AM', 'Milk PM', 'Total', 'Status', 'Temp', 'Treatment', 'Notes']
    const colW = (pw - margin * 2) / cols.length
    doc.setFillColor(240, 242, 245)
    doc.rect(margin, y - 3, pw - margin * 2, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    cols.forEach((h, i) => doc.text(h, margin + i * colW + 1, y + 1))
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    y += 10
    for (const r of records) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage()
        y = margin + 5
      }
      const vals = [
        formatDate(r.date) || r.date,
        r.milk_yield_morning ? `${r.milk_yield_morning}L` : '—',
        r.milk_yield_evening ? `${r.milk_yield_evening}L` : '—',
        r.milk_yield_total ? `${r.milk_yield_total}L` : '—',
        r.health_status || '—',
        r.temperature ? `${r.temperature}°C` : '—',
        r.treatment_given || '—',
        (r.notes || r.health_notes || '—').slice(0, 20),
      ]
      vals.forEach((v, i) => doc.text(v, margin + i * colW + 1, y))
      y += 5
    }
  }

  // Medical Records page
  doc.addPage()
  y = margin + 5
  doc.setFillColor(102, 51, 153)
  doc.roundedRect(margin, y - 4, pw - margin * 2, 8, 1.5, 1.5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('MEDICAL RECORDS', margin + 2, y + 1)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(8)
  y += 14
  doc.text(cow.medical_records || 'No medical records recorded.', margin + 2, y)
  return doc
}

export function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename)
}

export async function generateHerdSummaryPdf(orientation: 'portrait' | 'landscape' = 'portrait'): Promise<jsPDF> {
  const [cows, dailyRecords, incidents, treatments, vaccinations, lameness] = await Promise.all([
    db.cows.toArray(),
    db.dailyRecords.toArray().catch(() => [] as DailyRecord[]),
    db.healthIncidents.toArray().catch(() => [] as HealthIncident[]),
    db.treatments.toArray().catch(() => [] as Treatment[]),
    db.vaccinationRecords.toArray().catch(() => [] as VaccinationRecord[]),
    db.lamenessSessions.toArray().catch(() => [] as LamenessSession[]),
  ])

  const summary = computeHerdStats({
    cows,
    dailyRecords,
    incidents,
    treatments,
    vaccinations,
    lameness,
  })

  const canvas = await renderComponentToCanvas(HerdSummaryCard, { summary }, 900)
  return canvasToPdf(canvas, orientation)
}
