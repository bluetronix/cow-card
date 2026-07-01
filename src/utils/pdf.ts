import { jsPDF } from 'jspdf'
import type { Cow, LactationEntry } from '../types'
import { calculateAge, formatDate } from './age'
import { db } from '../db/dexie'
import logoPath from '../assets/logo.png'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'

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

function esc(s: string | number | undefined | null): string {
  if (s === undefined || s === null) return '—'
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const PADDED = (id_no: string) => {
  const p = (id_no || '0001').padStart(4, '0')
  return `BDF-${new Date().getFullYear()}-${p}`
}

function buildCardHtml(cow: Cow, qrDataUrl: string, logoDataUrl: string): string {
  const animalId = PADDED(cow.id_no)

  let lactEntries: LactationEntry[] = []
  try {
    const p = JSON.parse(cow.lactation_history || '[]')
    lactEntries = Array.isArray(p) ? p : []
  } catch { /* empty */ }

  const lactRows = lactEntries.length > 0
    ? lactEntries.map(e => `
      <tr>
        <td>${esc(e.number)}</td>
        <td>${esc(formatDate(e.calving_date))}</td>
        <td>${esc(e.yield_305d || '—')}</td>
        <td>${esc(e.peak_yield || '—')}</td>
        <td>${esc(e.total_yield || '—')}</td>
        <td>${esc(e.remarks || '—')}</td>
      </tr>`).join('')
    : `<tr><td colspan="6" style="text-align:center;color:#999;padding:8px;font-size:11px">No lactation history recorded</td></tr>`

  const imgTag = cow.image_url
    ? `<img src="${esc(cow.image_url)}" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0" />`
    : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.5);font-size:12px;font-weight:700">COW IMAGE</div>`

  const earTag = cow.id_no
    ? `<div style="position:absolute;top:12px;left:12px;background:#facc15;color:#000;font-weight:900;font-size:10px;padding:2px 6px;border-radius:2px;transform:rotate(-12deg);box-shadow:0 1px 2px rgba(0,0,0,0.2);z-index:10">${esc(cow.id_no)}</div>`
    : ''

  const pregBadge = cow.pregnancy_result === 'Pregnant'
    ? '<span style="background:#5ea154;color:#fff;padding:2px 8px;border-radius:12px;font-size:9px;font-weight:700">PREGNANT</span>'
    : cow.pregnancy_result === 'Open'
    ? '<span style="background:#d62828;color:#fff;padding:2px 8px;border-radius:12px;font-size:9px;font-weight:700">OPEN</span>'
    : esc(cow.pregnancy_result || '—')

  const milkFields = [
    ['Current Daily Milk Yield', cow.current_daily_milk_yield ? `${cow.current_daily_milk_yield} L` : '—'],
    ['Peak Milk Yield', cow.peak_milk_yield ? `${cow.peak_milk_yield} L` : '—'],
    ['Total Lactation Yield', cow.total_lactation_yield ? `${cow.total_lactation_yield} L` : '—'],
    ['Milk (305 Days) Projected', cow.projected_305d_milk_yield ? `${cow.projected_305d_milk_yield} L` : '—'],
    ['Fat % (Last Test)', cow.fat_percent ? `${cow.fat_percent} %` : '—'],
    ['Protein % (Last Test)', cow.protein_percent ? `${cow.protein_percent} %` : '—'],
    ['Last Milk Test Date', '—'],
  ].map(([label, val]) =>
    `<tr><th>${esc(label)}</th><td>${val}</td></tr>`).join('')

  const mgmtFields = [
    ['Feeding Group', cow.feeding_group],
    ['Milking Group', cow.milking_group],
    ['Pen / Barn No.', cow.pen_barn_no],
    ['Housing', cow.housing],
    ['Cull Status', '—'],
    ['Body Condition Score (BCS)', cow.body_condition_score ? `${cow.body_condition_score} / 5` : '—'],
    ['Remarks / Notes', cow.remarks],
  ].map(([label, val]) =>
    `<tr><th>${esc(label)}</th><td>${esc(val || '—')}</td></tr>`).join('')

  const healthFieldsLeft = [
    ['Medical Records', cow.medical_records],
    ['Dead Qtr / Teat', cow.dead_qtr_teat],
    ['Mastitis History', cow.mastitis_history],
    ['Vaccination', cow.vaccinations],
    ['Deworming', cow.deworming_dates],
    ['Last Health Check', formatDate(cow.last_checkup_date) || formatDate(cow.updated_at)],
    ['Next Due', '—'],
  ].map(([label, val]) =>
    `<tr><th>${esc(label)}</th><td>${esc(val || '—')}</td></tr>`).join('')

  const quarterStatus = cow.quarter_teat_status || 'All OK'

  const isPregnant = cow.pregnancy_result === 'Pregnant'
  const isLactating = cow.days_in_milk > 0
  const isDry = cow.sex === 'Female' && cow.days_in_milk === 0
  const isSick = cow.current_health_status === 'Sick' || cow.current_health_status === 'Under Treatment'

  const legendItem = (color: string, label: string, active: boolean) =>
    `<div style="display:flex;align-items:center;gap:6px;opacity:${active ? 1 : 0.35}">
      <div style="width:12px;height:12px;border-radius:50%;background:${active ? color : '#d1d5db'}"></div>
      <span style="font-weight:${active ? 700 : 500}">${label}</span>
    </div>`

  const impDates = [
    ['Last Calving', formatDate(cow.calving_date)],
    ['Next Calving (Expected)', formatDate(cow.expected_calving_date)],
    ['Dry-off (Expected)', formatDate(cow.expected_dry_off_date)],
    ['Last Checkup', formatDate(cow.last_checkup_date)],
  ].map(([label, val]) =>
    `<tr><th style="width:60%">${esc(label)}</th><td>${esc(val || '—')}</td></tr>`).join('')

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;background:#e5e7eb}
.card{width:1050px;margin:0 auto;background:#fff;border:1px solid #d1d5db;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1)}
.header{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1px solid #d1d5db}
.body{padding:12px;display:flex;flex-direction:column;gap:10px}
.grid{display:grid;gap:10px}
.cols-4{grid-template-columns:repeat(4,1fr)}
.cols-12{grid-template-columns:repeat(12,1fr)}
.s3{grid-column:span 3}
.s4{grid-column:span 4}
.s5{grid-column:span 5}
.s2{grid-column:span 2}
.module{border:1px solid #d1d5db;border-radius:6px;overflow:hidden;background:#fff;display:flex;flex-direction:column}
.module-header{display:flex;align-items:center;gap:6px;padding:4px 8px;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase}
.module-header svg{width:16px;height:16px;fill:currentColor;flex-shrink:0}
.data-table{width:100%;border-collapse:collapse;flex:1}
.data-table th,.data-table td{border:1px solid #d1d5db;padding:3px 8px;font-size:10px;text-align:left;color:#111827}
.data-table th{font-weight:700;width:45%;background:#fff}
.data-table td{font-weight:500;background:#fff}
.data-table tr:last-child th,.data-table tr:last-child td{border-bottom:none}
.img-wrap{position:relative;border:1px solid #d1d5db;border-radius:6px;overflow:hidden;min-height:155px;background:#7bae37}
.footer{background:#09441D;color:#fff;padding:10px 24px;display:flex;justify-content:space-between;align-items:center;font-size:10px}
</style>
</head><body style="padding:8px;display:flex;justify-content:center">
<div class="card">
  <div class="header">
    <div style="flex:1;display:flex;align-items:center">
      ${logoDataUrl ? `<img src="${logoDataUrl}" style="height:52px;object-fit:contain" />` : `<div style="color:#0A4B29;font-weight:900;font-size:18px">BASHE DAIRY FARM</div>`}
    </div>
    <div style="text-align:center;flex:1">
      <div style="font-family:'Arial Black',Arial,sans-serif;font-size:36px;font-weight:900;color:#0A4B29;letter-spacing:2px;line-height:1">COW CARD</div>
      <div style="display:flex;align-items:center;justify-content:center;margin-top:4px"><div style="height:1px;width:48px;background:#0A4B29"></div><svg width="20" height="20" fill="#0A4B29" viewBox="0 0 24 24"><path d="M20 9h-2V7c0-1.1-.9-2-2-2h-3V4c0-1.1-.9-2-2-2h-2C7.9 2 7 2.9 7 4v1H4c-1.1 0-2 .9-2 2v2H0v2h2v5c0 1.1.9 2 2 2h1v3h2v-3h10v3h2v-3h1c1.1 0 2-.9 2-2v-5h2V9h-2z"/></svg><div style="height:1px;width:48px;background:#0A4B29"></div></div>
    </div>
    <div style="display:flex;align-items:center;justify-content:flex-end;gap:12px;flex:1">
      <div style="width:64px;height:64px;border:2px solid #333;border-radius:6px;padding:4px;background:#fff">
        ${qrDataUrl ? `<img src="${qrDataUrl}" style="width:100%;height:100%" />` : `<div style="width:100%;height:100%;background:#ddd"></div>`}
      </div>
      <div style="border-radius:8px;overflow:hidden;border:1px solid #0A4B29;width:160px">
        <div style="background:#1A3A25;color:#fff;font-size:8px;font-weight:700;padding:2px 0;text-align:center;text-transform:uppercase;letter-spacing:1px">ANIMAL ID (BDF)</div>
        <div style="background:#0A4B29;color:#fff;text-align:center;padding:6px 0;font-family:'Arial Black',Arial,sans-serif;font-size:18px;font-weight:900;letter-spacing:1px">${esc(animalId)}</div>
        <div style="background:#fff;color:#333;text-align:center;font-size:8px;font-weight:700;padding:2px 0">Scan QR for full record</div>
      </div>
    </div>
  </div>

  <div class="body">
    <div class="grid cols-4">
      <div class="img-wrap">${earTag}${imgTag}</div>
      <div class="module">
        <div class="module-header" style="background:#0A4B29"><svg viewBox="0 0 24 24"><path d="M3 5v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.11 0-2 .9-2 2zm12 4c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3zm-9 8c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1H6v-1z"/></svg>IDENTIFICATION</div>
        <table class="data-table"><tbody>
          <tr><th>ID No.</th><td>${esc(cow.id_no)}</td></tr>
          <tr><th>Tag No.</th><td>${esc(cow.tag)}</td></tr>
          <tr><th>Collar No.</th><td>${esc(cow.collar_no || '—')}</td></tr>
          <tr><th>RFID No.</th><td>${esc(cow.rfid_no || '—')}</td></tr>
          <tr><th>Date of Birth</th><td>${esc(formatDate(cow.birth_date) || '—')}</td></tr>
          <tr><th>Age</th><td>${cow.birth_date ? esc(calculateAge(cow.birth_date)) : '—'}</td></tr>
        </tbody></table>
      </div>
      <div class="module">
        <div class="module-header" style="background:#0A4B29"><svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 9h-2V7h2v5zm0 4h-2v-2h2v2z"/></svg>ANIMAL INFORMATION</div>
        <table class="data-table"><tbody>
          <tr><th>Breed / Type</th><td>${esc(cow.breed)}</td></tr>
          <tr><th>Colour</th><td>${esc(cow.colour)}</td></tr>
          <tr><th>Sire (Bull Name)</th><td>${esc(cow.bull_name || '—')}</td></tr>
          <tr><th>Dam (Mother Name)</th><td>${esc(cow.dam_id || '—')}</td></tr>
          <tr><th>Origin</th><td>${esc(cow.origin || '—')}</td></tr>
          <tr><th></th><td></td></tr>
        </tbody></table>
      </div>
      <div class="module">
        <div class="module-header" style="background:#0A4B29"><svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>REPRODUCTION</div>
        <table class="data-table"><tbody>
          <tr><th>Calving Date</th><td>${esc(formatDate(cow.calving_date) || '—')}</td></tr>
          <tr><th>Lactation No.</th><td>${esc(cow.lactations ?? '—')}</td></tr>
          <tr><th>Days in Milk</th><td>${esc(cow.days_in_milk ?? '—')}</td></tr>
          <tr><th>PD (Group)</th><td>${esc(cow.pd_group || '—')}</td></tr>
          <tr><th>Pregnancy Status</th><td>${pregBadge}</td></tr>
          <tr><th>AI / Service Date</th><td>${esc(formatDate(cow.ai_service_date) || '—')}</td></tr>
          <tr><th>Expected Calving Date</th><td>${esc(formatDate(cow.expected_calving_date) || '—')}</td></tr>
          <tr><th>Expected Dry-off Date</th><td>${esc(formatDate(cow.expected_dry_off_date) || '—')}</td></tr>
        </tbody></table>
      </div>
    </div>

    <div class="grid cols-12">
      <div class="s3 module">
        <div class="module-header" style="background:#085482"><svg viewBox="0 0 24 24"><path d="M7 2v20h10V2H7zm8 18H9v-2h6v2zm0-4H9V6h6v10z"/></svg>MILK PRODUCTION</div>
        <table class="data-table"><tbody>${milkFields}</tbody></table>
      </div>
      <div class="s4 module">
        <div class="module-header" style="background:#895A2A"><svg viewBox="0 0 24 24"><path d="M12 3L4 9v12h16V9l-8-6zm0 2.5l6 4.5v9h-12v-9l6-4.5z"/></svg>MANAGEMENT</div>
        <table class="data-table"><tbody>${mgmtFields}</tbody></table>
      </div>
      <div class="s5 module">
        <div class="module-header" style="background:#BA3232"><svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>HEALTH RECORD</div>
        <div style="display:flex;flex:1">
          <div style="width:60%"><table class="data-table" style="border-right:none"><tbody>${healthFieldsLeft}</tbody></table></div>
          <div style="width:40%;border-left:1px solid #d1d5db;display:flex;flex-direction:column;align-items:center;padding:4px;position:relative">
            <div style="font-size:9px;font-weight:700;color:#333;text-transform:uppercase;margin-top:2px;text-align:center">Quarter / Teat Status</div>
            <div style="position:relative;flex:1;display:flex;align-items:center;justify-content:center;width:100%">
              <svg viewBox="0 0 100 100" style="width:75px;height:75px">
                <path d="M 10 30 C 10 70, 90 70, 90 30 Z" fill="#FFCCD5" stroke="#333" stroke-width="2"/>
                <path d="M 22 55 L 22 80 C 22 85, 30 85, 30 80 L 30 65" fill="#FFCCD5" stroke="#333" stroke-width="2"/>
                <path d="M 40 65 L 40 85 C 40 90, 48 90, 48 85 L 48 70" fill="#FFCCD5" stroke="#333" stroke-width="2"/>
                <path d="M 52 70 L 52 85 C 52 90, 60 90, 60 85 L 60 65" fill="#FFCCD5" stroke="#333" stroke-width="2"/>
                <path d="M 70 65 L 70 80 C 70 85, 78 85, 78 80 L 78 55" fill="#FFCCD5" stroke="#333" stroke-width="2"/>
              </svg>
              <div style="position:absolute;top:2px;left:6px;display:flex;flex-direction:column;align-items:center"><span style="font-size:7px;font-weight:700;margin-bottom:1px">LF</span><svg width="10" height="10" viewBox="0 0 20 20" fill="#15803d"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg></div>
              <div style="position:absolute;top:2px;right:6px;display:flex;flex-direction:column;align-items:center"><span style="font-size:7px;font-weight:700;margin-bottom:1px">RF</span><svg width="10" height="10" viewBox="0 0 20 20" fill="#15803d"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg></div>
              <div style="position:absolute;bottom:14px;left:6px;display:flex;flex-direction:column;align-items:center"><span style="font-size:7px;font-weight:700;margin-bottom:1px">LR</span><svg width="10" height="10" viewBox="0 0 20 20" fill="#15803d"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg></div>
              <div style="position:absolute;bottom:14px;right:6px;display:flex;flex-direction:column;align-items:center"><span style="font-size:7px;font-weight:700;margin-bottom:1px">RR</span><svg width="10" height="10" viewBox="0 0 20 20" fill="#15803d"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg></div>
            </div>
            <div style="color:#0A4B29;font-weight:900;font-size:10px;padding-bottom:2px">${esc(quarterStatus)}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid cols-12">
      <div class="s5 module">
        <div class="module-header" style="background:#0A4B29">LACTATION HISTORY (SUMMARY)</div>
        <table style="width:100%;border-collapse:collapse;text-align:center;font-size:10px">
          <thead><tr style="background:#f9fafb;color:#333;font-weight:700">
            <th style="border:1px solid #d1d5db;padding:4px">Lactation No.</th>
            <th style="border:1px solid #d1d5db;padding:4px">Calving Date</th>
            <th style="border:1px solid #d1d5db;padding:4px">305 Days Yield (L)</th>
            <th style="border:1px solid #d1d5db;padding:4px">Peak Yield (L)</th>
            <th style="border:1px solid #d1d5db;padding:4px">Total Yield (L)</th>
            <th style="border:1px solid #d1d5db;padding:4px">Remarks</th>
          </tr></thead>
          <tbody style="color:#333;font-weight:500">${lactRows}</tbody>
        </table>
      </div>
      <div class="s2 module">
        <div class="module-header" style="background:#3B5B28">STATUS LEGEND</div>
        <div style="padding:8px;flex:1;display:flex;flex-direction:column;justify-content:center;gap:6px;font-size:10px;font-weight:500;color:#333">
          ${legendItem('#1e7b41', 'Pregnant', isPregnant)}
          ${legendItem('#1069b3', 'Lactating', isLactating)}
          ${legendItem('#ffb612', 'Dry', isDry)}
          ${legendItem('#d62828', 'Sick / Treatment', isSick)}
        </div>
      </div>
      <div class="s3 module">
        <div class="module-header" style="background:#1A4524"><svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>IMPORTANT DATES</div>
        <table class="data-table"><tbody>${impDates}</tbody></table>
      </div>
      <div class="s2" style="border:1px solid #d1d5db;border-radius:6px;padding:8px;display:flex;flex-direction:column;justify-content:space-between;background:#fff">
        <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;margin-bottom:4px"><span style="font-weight:500;color:#333">Card Issued</span><span>${esc(formatDate(cow.issued_date))}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700"><span style="font-weight:500;color:#333">Card Updated</span><span>${esc(formatDate(cow.updated_at))}</span></div>
        <div style="margin-top:auto;border-top:1px solid #d1d5db;padding-top:4px">
          <div style="font-size:9px;font-weight:500;color:#333;margin-bottom:2px">By</div>
          <div style="font-weight:700;font-size:10px">${esc(cow.issued_by || '—')}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div style="display:flex;align-items:center;gap:8px">
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
      <div style="line-height:1.3"><div style="font-weight:700;font-size:11px">Bashe Dairy Farm</div><div style="color:#B3D8C4">P.O. Box 74, Tabora, Tanzania</div></div>
    </div>
    <div style="display:flex;gap:16px;align-items:center;font-size:10px">
      <div style="display:flex;align-items:center;gap:4px"><svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>+255 612 297 675</div>
      <div style="display:flex;align-items:center;gap:4px"><svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>info@bdf.co.tz</div>
      <div style="display:flex;align-items:center;gap:4px"><svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.22.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.52c-.22-.72-1.07-1.31-1.9-1.41V15c0-1.1-.9-2-2-2h-2v-2h2c1.1 0 2-.9 2-2V7.41c1.8 1.48 3 3.75 3 6.59 0 1.5-.4 2.92-1.1 4.08z"/></svg>www.bdf.co.tz</div>
    </div>
    <div style="display:flex;align-items:center;gap:6px;font-style:italic;color:#B3D8C4">
      <div style="text-align:right;line-height:1.2;font-size:11px">Thank you for<br>caring for our animals!</div>
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/></svg>
    </div>
  </div>
</div>
</body></html>`
}

export async function generateSummaryCard(cow: Cow, orientation: 'portrait' | 'landscape' = 'landscape'): Promise<jsPDF> {
  const [qrDataUrl, logoDataUrl] = await Promise.all([
    QRCode.toDataURL(`${getBaseUrl()}/cows/${cow.id}`, { width: 100, margin: 0 }).catch(() => ''),
    loadImage(logoPath),
  ])

  const html = buildCardHtml(cow, qrDataUrl || '', logoDataUrl || '')

  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '1050px'
  container.style.zIndex = '-1'
  container.innerHTML = html
  document.body.appendChild(container)

  const cardEl = container.querySelector('.card') as HTMLElement
  if (!cardEl) {
    document.body.removeChild(container)
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
    doc.text('Error generating card', 10, 10)
    return doc
  }

  await new Promise(r => setTimeout(r, 300))

  const canvas = await html2canvas(cardEl, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    width: 1050,
  })

  document.body.removeChild(container)

  const imgData = canvas.toDataURL('image/jpeg', 0.92)
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
  const pw = orientation === 'landscape' ? 297 : 210
  const ph = orientation === 'landscape' ? 210 : 297

  const margin = 5
  const imgWidth = pw - margin * 2
  const imgHeight = (canvas.height / canvas.width) * imgWidth
  const maxHeight = ph - margin * 2

  if (imgHeight > maxHeight) {
    const s = maxHeight / imgHeight
    doc.addImage(imgData, 'JPEG', margin, margin, imgWidth * s, imgHeight * s)
  } else {
    const yOffset = margin + (maxHeight - imgHeight) / 2
    doc.addImage(imgData, 'JPEG', margin, yOffset, imgWidth, imgHeight)
  }

  return doc
}

export async function generateDetailedCard(cow: Cow, orientation: 'portrait' | 'landscape' = 'landscape'): Promise<jsPDF> {
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
