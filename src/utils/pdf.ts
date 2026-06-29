import { jsPDF } from 'jspdf'
import type { Cow, DailyRecord } from '../types'
import { calculateAge, formatDate } from './age'
import logoPath from '../assets/logo.png'
import QRCode from 'qrcode'

const C_GREEN: [number, number, number] = [0, 86, 59]
const C_BLUE: [number, number, number] = [0, 91, 159]
const C_ORANGE: [number, number, number] = [160, 90, 44]
const C_RED: [number, number, number] = [201, 48, 44]

const R = 1.5

interface CardLayout {
  pw: number
  ph: number
  m: number
  cw: number
  g: number
  cx: number[]
  headerH: number
  footerY: number
}

function getLayout(orientation: 'portrait' | 'landscape'): CardLayout {
  if (orientation === 'landscape') {
    const pw = 297, ph = 210, m = 10, cw = 67, g = 3
    return {
      pw, ph, m, cw, g,
      cx: [m, m + cw + g, m + (cw + g) * 2, m + (cw + g) * 3],
      headerH: 28,
      footerY: ph - 12,
    }
  }
  const pw = 210, ph = 297, m = 10, cw = 48, g = 3
  return {
    pw, ph, m, cw, g,
    cx: [m, m + cw + g, m + (cw + g) * 2, m + (cw + g) * 3],
    headerH: 28,
    footerY: 280,
  }
}

function getBaseUrl(): string {
  return import.meta.env.VITE_APP_URL || window.location.origin
}

async function loadImage(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url)
    const blob = await resp.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function drawHeader(doc: jsPDF, cow: Cow, lo: CardLayout, qrDataUrl?: string, logoDataUrl?: string): void {
  doc.setFillColor(C_GREEN[0], C_GREEN[1], C_GREEN[2])
  doc.rect(0, 0, lo.pw, lo.headerH, 'F')

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', lo.m, 5, 45, 14)
    } catch { /* skip logo */ }
  }

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('BASHE DAIRY FARM', lo.m + 50, 11)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Healthy Cows, Quality Milk, Better Future', lo.m + 50, 18)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.text('COW CARD', lo.pw / 2, 17, { align: 'center' })

  const padded = (cow.id_no || '0001').padStart(4, '0')
  const animalId = `BDF-${new Date().getFullYear()}-${padded}`

  // QR Card
  const qrCardW = 26
  const qrCardH = 22
  const qrCardX = lo.pw - lo.m - qrCardW
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(qrCardX, 3, qrCardW, qrCardH, R, R, 'F')
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.roundedRect(qrCardX, 3, qrCardW, qrCardH, R, R, 'S')
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', qrCardX + 4, 5, 18, 18)
    } catch {
      doc.setFillColor(180, 180, 180)
      doc.roundedRect(qrCardX + 4, 5, 18, 18, 1, 1, 'F')
    }
  } else {
    doc.setFillColor(180, 180, 180)
    doc.roundedRect(qrCardX + 4, 5, 18, 18, 1, 1, 'F')
  }

  // Animal ID box
  const boxX = qrCardX - 6 - 48
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(boxX, 5, 48, 18, R, R, 'F')
  doc.setTextColor(C_GREEN[0], C_GREEN[1], C_GREEN[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('ANIMAL ID (BDF)', boxX + 24, 10.5, { align: 'center' })
  doc.setFontSize(11)
  doc.text(animalId, boxX + 24, 19, { align: 'center' })
}

function drawImagePlaceholder(doc: jsPDF, x: number, y: number, w: number, h: number): void {
  doc.setFillColor(240, 240, 240)
  doc.roundedRect(x + 0.3, y + 0.3, w - 0.6, h - 0.6, R, R, 'F')
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
  const hh = 8
  const lh = 5
  const vh = 3.5
  const rowH = lh + vh
  const rows = Math.ceil(fields.length / 2)
  const bh = h ?? (rows * rowH + 1)
  const mh = hh + bh

  doc.setFillColor(255, 255, 255)
  doc.roundedRect(x, y, w, mh, R, R, 'F')

  doc.setFillColor(color[0], color[1], color[2])
  doc.roundedRect(x + 0.3, y + 0.3, w - 0.6, hh - 0.3, R, R, 'F')

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.roundedRect(x, y, w, mh, R, R, 'S')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(title, x + 1.5, y + 6)

  doc.setTextColor(80, 80, 80)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)

  let cy = y + hh + 2.5
  const colW = (w - 4) / 2

  for (let i = 0; i < fields.length; i++) {
    const col = i % 2
    if (col === 0 && i > 0) cy += rowH
    const fx = x + 1.5 + col * colW

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(80, 80, 80)
    doc.text(fields[i][0], fx, cy + 0.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    doc.text(fields[i][1], fx, cy + lh)

    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.15)
    doc.line(fx, cy + lh + 0.5, fx + colW, cy + lh + 0.5)
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
  const hh = 8
  const lh = 5
  const vh = 3.5
  const rowH = lh + vh
  const rows = fields.length
  const bh = rows * rowH + 1
  const mh = hh + bh

  doc.setFillColor(255, 255, 255)
  doc.roundedRect(x, y, w, mh, R, R, 'F')

  doc.setFillColor(C_RED[0], C_RED[1], C_RED[2])
  doc.roundedRect(x + 0.3, y + 0.3, w - 0.6, hh - 0.3, R, R, 'F')

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.roundedRect(x, y, w, mh, R, R, 'S')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('HEALTH RECORD', x + 1.5, y + 6)

  let cy = y + hh + 2.5
  for (let i = 0; i < fields.length; i++) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(80, 80, 80)
    doc.text(fields[i][0], x + 1.5, cy + 0.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    doc.text(fields[i][1], x + 1.5, cy + lh)

    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.15)
    doc.line(x + 1.5, cy + lh + 0.5, x + w * 0.55 - 0.5, cy + lh + 0.5)

    cy += rowH
  }

  const divX = x + w * 0.55
  doc.setDrawColor(200, 200, 200)
  doc.line(divX, y + hh, divX, y + mh)

  const rx = divX + 1.5
  const rw = w * 0.45 - 3
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('QUARTER / TEAT STATUS', rx + rw / 2, y + hh + 5, { align: 'center' })
  doc.setTextColor(0, 128, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(quarterStatus || 'All OK', rx + rw / 2, y + hh + 16, { align: 'center' })

  return y + mh
}

export async function generateSummaryCard(cow: Cow, orientation: 'portrait' | 'landscape' = 'landscape'): Promise<jsPDF> {
  const lo = getLayout(orientation)
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' })

  const [qrDataUrl, logoDataUrl] = await Promise.all([
    QRCode.toDataURL(`${getBaseUrl()}/cows/${cow.id}`, { width: 100, margin: 0 }).catch(() => undefined),
    loadImage(logoPath),
  ])

  drawHeader(doc, cow, lo, qrDataUrl, logoDataUrl || undefined)

  let y = lo.headerH + 4
  const imgH = 55

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.roundedRect(lo.cx[0], y, lo.cw, imgH, R, R, 'S')
  if (cow.image_url) {
    try {
      doc.addImage(cow.image_url, 'JPEG', lo.cx[0] + 0.3, y + 0.3, lo.cw - 0.6, imgH - 0.6)
    } catch {
      drawImagePlaceholder(doc, lo.cx[0], y, lo.cw, imgH)
    }
  } else {
    drawImagePlaceholder(doc, lo.cx[0], y, lo.cw, imgH)
  }

  const bodyH = imgH - 7

  drawModule(doc, lo.cx[1], y, lo.cw, 'IDENTIFICATION', [
    ['ID No', cow.id_no || '—'],
    ['Tag No', cow.tag || '—'],
    ['Collar No', cow.collar_no || '—'],
    ['RFID No', cow.rfid_no || '—'],
    ['Date of Birth', formatDate(cow.birth_date) || '—'],
    ['Age', cow.birth_date ? calculateAge(cow.birth_date) : '—'],
  ], C_GREEN, bodyH)

  drawModule(doc, lo.cx[2], y, lo.cw, 'ANIMAL INFORMATION', [
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
  drawModule(doc, lo.cx[3], y, lo.cw, 'REPRODUCTION', reproFields, C_GREEN, bodyH)

  y += imgH + 3

  drawModule(doc, lo.cx[0], y, lo.cw, 'MILK PRODUCTION', [
    ['Current Daily Yield', cow.current_daily_milk_yield ? `${cow.current_daily_milk_yield} L` : '—'],
    ['Peak Milk Yield', cow.peak_milk_yield ? `${cow.peak_milk_yield} L` : '—'],
    ['Total Lactation', cow.total_lactation_yield ? `${cow.total_lactation_yield} L` : '—'],
    ['305d Projected', cow.projected_305d_milk_yield ? `${cow.projected_305d_milk_yield} L` : '—'],
    ['Fat % (Last Test)', cow.fat_percent ? `${cow.fat_percent} %` : '—'],
    ['Protein % (Last Test)', cow.protein_percent ? `${cow.protein_percent} %` : '—'],
  ], C_BLUE)

  drawModule(doc, lo.cx[1], y, lo.cw, 'MANAGEMENT', [
    ['Feeding Group', cow.feeding_group || '—'],
    ['Milking Group', cow.milking_group || '—'],
    ['Pen / Barn No', cow.pen_barn_no || '—'],
    ['Housing', cow.housing || '—'],
    ['Body Condition Score', cow.body_condition_score ? `${cow.body_condition_score} / 5` : '—'],
    ['Remarks', cow.remarks || '—'],
  ], C_ORANGE)

  drawHealthModule(doc, lo.cx[2], y, lo.cw * 2 + lo.g, [
    ['Mastitis History', cow.mastitis_history || 'None'],
    ['Vaccination', cow.vaccinations || '—'],
    ['Deworming', cow.deworming_dates || '—'],
    ['Last Health Check', formatDate(cow.updated_at) || '—'],
  ], cow.quarter_teat_status || 'All OK')

  const footerY = lo.footerY
  doc.setFillColor(C_GREEN[0], C_GREEN[1], C_GREEN[2])
  doc.roundedRect(0, footerY, lo.pw, 12, R, R, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.text('Bashe Dairy Farm, P.O. Box 123', lo.m + 2, footerY + 5)
  doc.text('+254 700 123 456', lo.m + 82, footerY + 5)
  doc.text('info@bashedairyfarm.com', lo.m + 122, footerY + 5)
  doc.text('www.bashedairyfarm.com', lo.m + 160, footerY + 5)

  doc.setTextColor(150, 150, 150)
  doc.setFontSize(6)
  doc.text(`Generated: ${new Date().toLocaleString()} | Cow Card v2.0`, lo.m, footerY - 3)

  return doc
}

export async function generateDetailedCard(cow: Cow, dailyRecords: DailyRecord[], orientation: 'portrait' | 'landscape' = 'landscape'): Promise<jsPDF> {
  const doc = await generateSummaryCard(cow, orientation)
  doc.addPage()
  const margin = 15
  const pw = doc.internal.pageSize.getWidth()
  let y = margin + 5

  doc.setFillColor(102, 51, 153)
  doc.roundedRect(margin, y - 4, pw - margin * 2, 8, R, R, 'F')
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
  doc.roundedRect(margin, y - 4, pw - margin * 2, 8, R, R, 'F')
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
