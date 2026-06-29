import { jsPDF } from 'jspdf'
import type { Cow, DailyRecord } from '../types'
import { calculateAge, formatDate } from './age'

const C_GREEN: [number, number, number] = [0, 86, 59]
const C_BLUE: [number, number, number] = [0, 91, 159]
const C_ORANGE: [number, number, number] = [160, 90, 44]
const C_RED: [number, number, number] = [201, 48, 44]

const M = 10
const PW = 210
const CW = 46
const G = 2
const CX = [M, M + CW + G, M + (CW + G) * 2, M + (CW + G) * 3]

function drawHeader(doc: jsPDF, cow: Cow): void {
  doc.setFillColor(C_GREEN[0], C_GREEN[1], C_GREEN[2])
  doc.rect(0, 0, PW, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('BASHE DAIRY FARM', M, 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Healthy Cows, Quality Milk, Better Future', M, 21)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.text('COW CARD', PW / 2, 19, { align: 'center' })

  doc.setFillColor(180, 180, 180)
  doc.rect(PW - M - 44, 6, 14, 16, 'F')
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(5)
  doc.setFont('helvetica', 'normal')
  doc.text('QR', PW - M - 37, 14.5, { align: 'center' })

  const boxX = PW - M - 44 - 8 - 46
  doc.setFillColor(255, 255, 255)
  doc.rect(boxX, 4, 46, 20, 'F')
  doc.setTextColor(C_GREEN[0], C_GREEN[1], C_GREEN[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('ANIMAL ID (BDF)', boxX + 23, 10, { align: 'center' })
  doc.setFontSize(12)
  const padded = (cow.id_no || '0001').padStart(4, '0')
  const animalId = `BDF-${new Date().getFullYear()}-${padded}`
  doc.text(animalId, boxX + 23, 19, { align: 'center' })
}

function drawImagePlaceholder(doc: jsPDF, x: number, y: number, w: number, h: number): void {
  doc.setFillColor(240, 240, 240)
  doc.rect(x + 0.3, y + 0.3, w - 0.6, h - 0.6, 'F')
  doc.setTextColor(180, 180, 180)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('COW PHOTO', x + w / 2, y + h / 2 + 2, { align: 'center' })
}

function drawModule(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  title: string,
  fields: [string, string][],
  color: [number, number, number],
  h?: number
): number {
  const hh = 7
  const lh = 4.5
  const rows = Math.ceil(fields.length / 2)
  const bh = h ?? (rows * lh + 4)
  const mh = hh + bh

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.rect(x, y, w, mh)

  doc.setFillColor(color[0], color[1], color[2])
  doc.rect(x + 0.3, y + 0.3, w - 0.6, hh - 0.3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text(title, x + 1.5, y + 5.5)

  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)

  let cy = y + hh + 2
  const colW = (w - 4) / 2

  for (let i = 0; i < fields.length; i++) {
    const col = i % 2
    if (col === 0 && i > 0) cy += lh
    const fx = x + 1.5 + col * colW
    doc.text(`${fields[i][0]}: ${fields[i][1]}`, fx, cy)
  }

  return y + mh
}

function drawHealthModule(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  fields: [string, string][],
  quarterStatus: string
): number {
  const hh = 7
  const lh = 4.5
  const rows = fields.length
  const bh = rows * lh + 4
  const mh = hh + bh

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.rect(x, y, w, mh)

  doc.setFillColor(C_RED[0], C_RED[1], C_RED[2])
  doc.rect(x + 0.3, y + 0.3, w - 0.6, hh - 0.3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('HEALTH RECORD', x + 1.5, y + 5.5)

  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  let cy = y + hh + 2
  for (let i = 0; i < fields.length; i++) {
    doc.text(`${fields[i][0]}: ${fields[i][1]}`, x + 1.5, cy)
    cy += lh
  }

  const divX = x + w * 0.55
  doc.setDrawColor(200, 200, 200)
  doc.line(divX, y + hh, divX, y + mh)

  const rx = divX + 1.5
  const rw = w * 0.45 - 3
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('QUARTER / TEAT STATUS', rx + rw / 2, y + hh + 5, { align: 'center' })
  doc.setTextColor(0, 128, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(quarterStatus || 'All OK', rx + rw / 2, y + hh + 15, { align: 'center' })

  return y + mh
}

export function generateSummaryCard(cow: Cow): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  drawHeader(doc, cow)

  let y = 33
  const imgH = 55

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.rect(CX[0], y, CW, imgH)
  if (cow.image_url) {
    try {
      doc.addImage(cow.image_url, 'JPEG', CX[0] + 0.3, y + 0.3, CW - 0.6, imgH - 0.6)
    } catch {
      drawImagePlaceholder(doc, CX[0], y, CW, imgH)
    }
  } else {
    drawImagePlaceholder(doc, CX[0], y, CW, imgH)
  }

  const bodyH = imgH - 7

  drawModule(doc, CX[1], y, CW, 'IDENTIFICATION', [
    ['ID No', cow.id_no || '—'],
    ['Tag No', cow.tag || '—'],
    ['Collar No', cow.collar_no || '—'],
    ['RFID No', cow.rfid_no || '—'],
    ['Date of Birth', formatDate(cow.birth_date) || '—'],
    ['Age', cow.birth_date ? calculateAge(cow.birth_date) : '—'],
  ], C_GREEN, bodyH)

  drawModule(doc, CX[2], y, CW, 'ANIMAL INFORMATION', [
    ['Breed / Type', cow.breed || '—'],
    ['Colour', cow.colour || '—'],
    ['Sire (Bull Name)', cow.bull_name || '—'],
    ['Dam (Mother ID)', cow.dam_id || '—'],
    ['Origin', cow.origin || '—'],
  ], C_GREEN, bodyH)

  const reproFields: [string, string][] = [
    ['Calving Date', formatDate(cow.calving_date) || '—'],
    ['Lactation No', String(cow.lactations ?? '—')],
    ['Days in Milk', String(cow.days_in_milk ?? '—')],
    ['PD (Group)', cow.pd_group || '—'],
    ['Pregnancy Status', cow.pregnancy_result || '—'],
  ]
  if (cow.ai_service_date) reproFields.push(['AI / Service Date', formatDate(cow.ai_service_date)])
  if (cow.expected_calving_date) reproFields.push(['Expected Calving', formatDate(cow.expected_calving_date)])
  drawModule(doc, CX[3], y, CW, 'REPRODUCTION', reproFields, C_GREEN, bodyH)

  y += imgH + 3

  drawModule(doc, CX[0], y, CW, 'MILK PRODUCTION', [
    ['Current Daily Yield', cow.current_daily_milk_yield ? `${cow.current_daily_milk_yield} L` : '—'],
    ['Peak Milk Yield', cow.peak_milk_yield ? `${cow.peak_milk_yield} L` : '—'],
    ['Total Lactation', cow.total_lactation_yield ? `${cow.total_lactation_yield} L` : '—'],
    ['305d Projected', cow.projected_305d_milk_yield ? `${cow.projected_305d_milk_yield} L` : '—'],
    ['Fat % (Last Test)', cow.fat_percent ? `${cow.fat_percent} %` : '—'],
    ['Protein % (Last Test)', cow.protein_percent ? `${cow.protein_percent} %` : '—'],
  ], C_BLUE)

  drawModule(doc, CX[1], y, CW, 'MANAGEMENT', [
    ['Feeding Group', cow.feeding_group || '—'],
    ['Milking Group', cow.milking_group || '—'],
    ['Pen / Barn No', cow.pen_barn_no || '—'],
    ['Housing', cow.housing || '—'],
    ['Body Condition Score', cow.body_condition_score ? `${cow.body_condition_score} / 5` : '—'],
    ['Remarks', cow.remarks || '—'],
  ], C_ORANGE)

  drawHealthModule(doc, CX[2], y, CW * 2 + G, [
    ['Mastitis History', cow.mastitis_history || 'None'],
    ['Vaccination', cow.vaccinations || '—'],
    ['Deworming', cow.deworming_dates || '—'],
    ['Last Health Check', formatDate(cow.updated_at) || '—'],
  ], cow.quarter_teat_status || 'All OK')

  const footerY = 280
  doc.setFillColor(C_GREEN[0], C_GREEN[1], C_GREEN[2])
  doc.rect(0, footerY, PW, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.text('Bashe Dairy Farm, P.O. Box 123', M + 2, footerY + 5)
  doc.text('+254 700 123 456', M + 82, footerY + 5)
  doc.text('info@bashedairyfarm.com', M + 122, footerY + 5)
  doc.text('www.bashedairyfarm.com', M + 160, footerY + 5)

  doc.setTextColor(150, 150, 150)
  doc.setFontSize(6)
  doc.text(`Generated: ${new Date().toLocaleString()} | Cow Card v2.0`, M, footerY - 3)

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
