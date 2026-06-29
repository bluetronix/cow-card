<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../db/dexie'
import { generateSummaryCard, generateDetailedCard, downloadPdf } from '../utils/pdf'
import { exportCowSummaryCSV, exportCowDetailedCSV, exportDailyRecordsCSV } from '../utils/csv'
import type { Cow, DailyRecord } from '../types'

const router = useRouter()
const cows = ref<Cow[]>([])
const allDailyRecords = ref<DailyRecord[]>([])
const dateFrom = ref('')
const dateTo = ref('')
const selectedCow = ref('')
const message = ref('')

onMounted(async () => {
  cows.value = await db.cows.toArray()
  allDailyRecords.value = await db.dailyRecords.toArray()
})

function filteredCows(): Cow[] {
  let result = cows.value
  if (selectedCow.value) {
    result = result.filter(c => c.id === selectedCow.value || c.id_no?.includes(selectedCow.value))
  }
  return result
}

function filteredDailyRecords(): DailyRecord[] {
  let result = allDailyRecords.value
  if (dateFrom.value) {
    result = result.filter(r => r.date >= dateFrom.value)
  }
  if (dateTo.value) {
    result = result.filter(r => r.date <= dateTo.value)
  }
  if (selectedCow.value) {
    result = result.filter(r => r.cow_id === selectedCow.value)
  }
  return result
}

function downloadSummaryPDF() {
  const selected = filteredCows()
  if (selected.length === 0) {
    message.value = 'No cows match the filter'
    return
  }
  for (const cow of selected) {
    const doc = generateSummaryCard(cow)
    downloadPdf(doc, `cow_summary_${cow.id_no || cow.id}.pdf`)
  }
  message.value = `Downloaded ${selected.length} summary PDF(s)`
}

function downloadDetailedPDF() {
  const selected = filteredCows()
  if (selected.length === 0) {
    message.value = 'No cows match the filter'
    return
  }
  for (const cow of selected) {
    const records = allDailyRecords.value.filter(r => r.cow_id === cow.id)
    const doc = generateDetailedCard(cow, records)
    downloadPdf(doc, `cow_detailed_${cow.id_no || cow.id}.pdf`)
  }
  message.value = `Downloaded ${selected.length} detailed PDF(s)`
}

function downloadSummaryCSV() {
  const selected = filteredCows()
  if (selected.length === 0) {
    message.value = 'No cows match the filter'
    return
  }
  exportCowSummaryCSV(selected)
  message.value = 'Summary CSV downloaded'
}

function downloadDetailedCSV() {
  const selected = filteredCows()
  if (selected.length === 0) {
    message.value = 'No cows match the filter'
    return
  }
  exportCowDetailedCSV(selected)
  message.value = 'Detailed CSV downloaded'
}

function downloadDailyCSV() {
  const selected = filteredDailyRecords()
  if (selected.length === 0) {
    message.value = 'No daily records match the filter'
    return
  }
  exportDailyRecordsCSV(selected)
  message.value = 'Daily records CSV downloaded'
}

async function exportAllJSON() {
  const allCows = await db.cows.toArray()
  const allDaily = await db.dailyRecords.toArray()
  const data = { cows: allCows, dailyRecords: allDaily, exportedAt: new Date().toISOString() }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'cowcard_backup.json'
  a.click()
  URL.revokeObjectURL(url)
  message.value = 'JSON backup downloaded'
}

async function importJSON(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  const text = await file.text()
  const data = JSON.parse(text)
  if (data.cows) {
    for (const cow of data.cows) {
      await db.cows.put(cow)
    }
  }
  if (data.dailyRecords) {
    for (const rec of data.dailyRecords) {
      await db.dailyRecords.put(rec)
    }
  }
  cows.value = await db.cows.toArray()
  allDailyRecords.value = await db.dailyRecords.toArray()
  message.value = `Imported ${data.cows?.length || 0} cows and ${data.dailyRecords?.length || 0} daily records`
  input.value = ''
}
</script>

<template>
  <div class="export-page">
    <header class="page-header">
      <div>
        <button class="btn-back" @click="router.push('/')">← Dashboard</button>
        <h1>Exports</h1>
      </div>
    </header>

    <div class="export-content">
      <div class="card filter-card">
        <h3>🔍 Filters</h3>
        <div class="filter-grid">
          <div class="form-group">
            <label>Cow ID / Tag</label>
            <input v-model="selectedCow" type="text" placeholder="All cows" />
          </div>
          <div class="form-group">
            <label>Date From</label>
            <input v-model="dateFrom" type="date" />
          </div>
          <div class="form-group">
            <label>Date To</label>
            <input v-model="dateTo" type="date" />
          </div>
        </div>
      </div>

      <div class="card">
        <h3>📄 PDF — Cow Cards (Portrait)</h3>
        <div class="btn-group">
          <button class="btn-pdf" @click="downloadSummaryPDF">📄 Summary Card</button>
          <button class="btn-pdf detailed" @click="downloadDetailedPDF">📄 Detailed Card</button>
        </div>
      </div>

      <div class="card">
        <h3>📊 CSV — Data Export</h3>
        <div class="btn-group">
          <button class="btn-csv" @click="downloadSummaryCSV">📊 Summary CSV</button>
          <button class="btn-csv" @click="downloadDetailedCSV">📊 Detailed CSV</button>
          <button class="btn-csv" @click="downloadDailyCSV">📊 Daily Records CSV</button>
        </div>
      </div>

      <div class="card">
        <h3>💾 Bulk Data Transfer (Offline)</h3>
        <div class="btn-group">
          <button class="btn-json" @click="exportAllJSON">📦 Export All as JSON</button>
          <label class="btn-json import">
            📂 Import JSON
            <input type="file" accept=".json" hidden @change="importJSON" />
          </label>
        </div>
      </div>

      <p v-if="message" class="message">{{ message }}</p>
    </div>
  </div>
</template>

<style scoped>
.export-page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 40px;
}

.page-header {
  background: #fff;
  padding: 20px 32px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.page-header h1 {
  margin: 0;
  font-size: 1.4rem;
  color: #333;
}

.btn-back {
  background: none;
  border: none;
  color: #1a5276;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0;
  margin-bottom: 8px;
  display: block;
}

.export-content {
  max-width: 700px;
  margin: 0 auto;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
}

.card h3 {
  margin: 0 0 16px;
  color: #333;
  font-size: 1rem;
}

.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #555;
  text-transform: uppercase;
}

.form-group input {
  padding: 8px 10px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.9rem;
}

.form-group input:focus {
  border-color: #1a5276;
  outline: none;
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.btn-pdf,
.btn-csv,
.btn-json {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
}

.btn-pdf {
  background: #cb4335;
  color: #fff;
}

.btn-pdf.detailed {
  background: #6c3483;
}

.btn-csv {
  background: #0e6655;
  color: #fff;
}

.btn-json {
  background: #1a5276;
  color: #fff;
}

.btn-json.import {
  background: #b7950b;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.btn-pdf:hover,
.btn-csv:hover,
.btn-json:hover {
  opacity: 0.9;
}

.message {
  text-align: center;
  color: #0e6655;
  font-weight: 600;
  font-size: 0.9rem;
  margin: 0;
}
</style>
