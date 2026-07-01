<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../db/dexie'
import { generateSummaryCard, generateDetailedCard, downloadPdf } from '../utils/pdf'
import { exportCowSummaryCSV, exportCowDetailedCSV, exportDailyRecordsCSV, exportAllCowsCSV } from '../utils/csv'
import { calculateAge } from '../utils/age'
import type { Cow } from '../types'

const router = useRouter()
const cows = ref<Cow[]>([])
const search = ref('')
const selectedCow = ref<Cow | null>(null)
const message = ref('')

onMounted(async () => {
  cows.value = await db.cows.toArray()
})

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return cows.value
  return cows.value.filter(c =>
    c.id_no?.toLowerCase().includes(q) ||
    c.tag?.toLowerCase().includes(q) ||
    c.name?.toLowerCase().includes(q) ||
    c.rfid_no?.toLowerCase().includes(q) ||
    c.collar_no?.toLowerCase().includes(q)
  )
})

function selectCow(cow: Cow) {
  selectedCow.value = cow
  message.value = ''
}

function clearSelection() {
  selectedCow.value = null
}

async function downloadSummaryPDF() {
  if (!selectedCow.value) return
  const doc = await generateSummaryCard(selectedCow.value)
  downloadPdf(doc, `cow_summary_${selectedCow.value.id_no || selectedCow.value.id}.pdf`)
  message.value = 'Summary PDF downloaded'
}

async function downloadDetailedPDF() {
  if (!selectedCow.value) return
  const doc = await generateDetailedCard(selectedCow.value)
  downloadPdf(doc, `cow_detailed_${selectedCow.value.id_no || selectedCow.value.id}.pdf`)
  message.value = 'Detailed PDF downloaded'
}

function downloadSummaryCSV() {
  if (!selectedCow.value) return
  exportCowSummaryCSV([selectedCow.value])
  message.value = 'Summary CSV downloaded'
}

function downloadDetailedCSV() {
  if (!selectedCow.value) return
  exportCowDetailedCSV([selectedCow.value])
  message.value = 'Detailed CSV downloaded'
}

async function downloadDailyRecordsCSV() {
  if (!selectedCow.value) return
  const records = await db.dailyRecords
    .where('cow_id').equals(selectedCow.value.id)
    .reverse().sortBy('date')
  exportDailyRecordsCSV(records)
  message.value = 'Daily records CSV downloaded'
}

async function downloadAllCowsCSV() {
  const allCows = await db.cows.toArray()
  exportAllCowsCSV(allCows)
  message.value = 'All cows CSV downloaded'
}

const downloadingDetailed = ref(false)
const downloadingSummary = ref(false)

async function downloadAllPDFs(type: 'detailed' | 'summary') {
  const loading = type === 'detailed' ? downloadingDetailed : downloadingSummary
  loading.value = true
  message.value = ''
  try {
    const allCows = await db.cows.toArray()
    const gen = type === 'detailed' ? generateDetailedCard : generateSummaryCard
    const label = type === 'detailed' ? 'Detailed' : 'Summary'
    for (let i = 0; i < allCows.length; i++) {
      const cow = allCows[i]
      message.value = `Generating ${label} PDF ${i + 1} of ${allCows.length}...`
      const doc = await gen(cow)
      downloadPdf(doc, `${label.toLowerCase()}_${cow.id_no || cow.id}_${cow.tag || cow.name || 'unknown'}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_'))
      await new Promise(r => setTimeout(r, 300))
    }
    message.value = `Downloaded ${allCows.length} ${label} PDFs`
  } finally {
    loading.value = false
  }
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

const cowDefaults: Record<string, unknown> = {
  current_health_status: '',
  last_checkup_date: '',
  lactation_history: '[]',
  sire_no: '',
  sire_breed: '',
  dam_no: '',
  dam_breed: '',
  breed_type: '',
  previous_breeding_records: '',
  expected_dry_off_date: '',
  ai_service_date: '',
  expected_calving_date: '',
  days_in_milk: 0,
  peak_milk_yield: 0,
  current_daily_milk_yield: 0,
  total_lactation_yield: 0,
  fat_percent: 0,
  protein_percent: 0,
  vaccinations: '',
  deworming_dates: '',
  mastitis_history: '',
  dead_qtr_teat: '',
  medical_records: '',
}

async function importJSON(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  const text = await file.text()
  const data = JSON.parse(text)
  if (data.cows) {
    for (const cow of data.cows) {
      await db.cows.put({ ...cowDefaults, ...cow })
    }
  }
  if (data.dailyRecords) {
    for (const record of data.dailyRecords) {
      await db.dailyRecords.put(record)
    }
  }
  cows.value = await db.cows.toArray()
  message.value = `Imported ${data.cows?.length || 0} cows, ${data.dailyRecords?.length || 0} daily records`
  input.value = ''
}
</script>

<template>
  <div class="export-page">
    <header class="page-header">
      <div>
        <button class="btn-back" @click="router.push('/')">← Dashboard</button>
        <h1>Search &amp; Export</h1>
      </div>
    </header>

    <div class="export-content">
      <!-- Search -->
      <div class="card">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input
            v-model="search"
            class="search-input"
            type="text"
            placeholder="Search by ID No, Tag, Name, RFID, Collar..."
          />
          <span v-if="search" class="search-count">{{ filtered.length }} result(s)</span>
        </div>
      </div>

      <!-- Results list + Detail -->
      <div class="flex-layout">
        <div class="results-panel">
          <div
            v-for="cow in filtered"
            :key="cow.id"
            class="cow-row"
            :class="{ active: selectedCow?.id === cow.id }"
            @click="selectCow(cow)"
          >
            <div class="cow-row-main">
              <strong>{{ cow.id_no || '—' }}</strong>
              <span class="cow-row-name">{{ cow.name || 'Unnamed' }}</span>
            </div>
            <div class="cow-row-meta">
              <span>{{ cow.tag || '—' }}</span>
              <span>{{ cow.sex || '—' }}</span>
              <span>{{ cow.breed || '—' }}</span>
            </div>
          </div>
          <div v-if="filtered.length === 0" class="empty-state">
            No cows found
          </div>
        </div>

        <!-- Detail Panel -->
        <div v-if="selectedCow" class="detail-panel">
          <div class="detail-header-bar">
            <h2>Cow {{ selectedCow.id_no || selectedCow.id }}</h2>
            <button class="btn-close" @click="clearSelection">✕</button>
          </div>

          <div class="detail-body">
            <div class="info-blocks">
              <div class="info-block">
                <label>Name</label>
                <span>{{ selectedCow.name || '—' }}</span>
              </div>
              <div class="info-block">
                <label>Tag</label>
                <span>{{ selectedCow.tag || '—' }}</span>
              </div>
              <div class="info-block">
                <label>RFID No</label>
                <span>{{ selectedCow.rfid_no || '—' }}</span>
              </div>
              <div class="info-block">
                <label>Collar No</label>
                <span>{{ selectedCow.collar_no || '—' }}</span>
              </div>
              <div class="info-block">
                <label>Breed</label>
                <span>{{ selectedCow.breed || '—' }}</span>
              </div>
              <div class="info-block">
                <label>Sex</label>
                <span>{{ selectedCow.sex || '—' }}</span>
              </div>
              <div class="info-block">
                <label>Age</label>
                <span>{{ selectedCow.birth_date ? calculateAge(selectedCow.birth_date) : '—' }}</span>
              </div>
              <div class="info-block">
                <label>Colour</label>
                <span>{{ selectedCow.colour || '—' }}</span>
              </div>
              <div class="info-block">
                <label>Origin</label>
                <span>{{ selectedCow.origin || '—' }}</span>
              </div>
              <div class="info-block">
                <label>Group</label>
                <span>{{ selectedCow.group_name || '—' }}</span>
              </div>
            </div>

            <!-- Export buttons -->
            <div class="export-section">
              <h3>📄 PDF</h3>
              <div class="btn-row">
                <button class="btn-pdf" @click="downloadSummaryPDF">Summary Card</button>
                <button class="btn-pdf detailed" @click="downloadDetailedPDF">Detailed Card</button>
              </div>
            </div>

            <div class="export-section">
              <h3>📊 CSV</h3>
              <div class="btn-row">
                <button class="btn-csv" @click="downloadSummaryCSV">Summary</button>
                <button class="btn-csv" @click="downloadDetailedCSV">Detailed</button>
                <button class="btn-csv daily" @click="downloadDailyRecordsCSV">Daily Records</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bulk tools -->
      <div class="card bulk-card">
        <h3>💾 Bulk Data Transfer</h3>
        <div class="btn-row">
          <button class="btn-csv bulk" @click="downloadAllCowsCSV">Export All as CSV</button>
          <button class="btn-json" @click="exportAllJSON">Export All as JSON</button>
          <label class="btn-json import">
            Import JSON
            <input type="file" accept=".json" hidden @change="importJSON" />
          </label>
        </div>
        <div class="btn-row" style="margin-top: 10px">
          <button class="btn-pdf bulk" :disabled="downloadingDetailed" @click="downloadAllPDFs('detailed')">{{ downloadingDetailed ? '⏳ Generating...' : '📄 All Detailed PDFs' }}</button>
          <button class="btn-pdf bulk summary" :disabled="downloadingSummary" @click="downloadAllPDFs('summary')">{{ downloadingSummary ? '⏳ Generating...' : '📄 All Summary PDFs' }}</button>
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
  max-width: 960px;
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

/* Search */
.search-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-icon {
  font-size: 1.2rem;
}

.search-input {
  flex: 1;
  padding: 10px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #1a5276;
  outline: none;
}

.search-count {
  font-size: 0.8rem;
  color: #999;
  white-space: nowrap;
}

/* Flex layout */
.flex-layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.results-panel {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
  max-height: 600px;
  overflow-y: auto;
}

.cow-row {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.15s;
}

.cow-row:hover {
  background: #f5f8ff;
}

.cow-row.active {
  background: #e8f0fe;
  border-left: 3px solid #1a5276;
}

.cow-row-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cow-row-main strong {
  font-size: 0.95rem;
  color: #1a5276;
}

.cow-row-name {
  font-size: 0.85rem;
  color: #666;
}

.cow-row-meta {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  font-size: 0.78rem;
  color: #999;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #999;
  font-size: 0.9rem;
}

/* Detail Panel */
.detail-panel {
  width: 420px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.detail-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-header-bar h2 {
  margin: 0;
  font-size: 1rem;
  color: #333;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #999;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.btn-close:hover {
  color: #333;
}

.detail-body {
  padding: 16px 20px;
}

.info-blocks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;
}

.info-block label {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 2px;
}

.info-block span {
  font-size: 0.9rem;
  color: #333;
}

.export-section {
  margin-bottom: 16px;
}

.export-section h3 {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: #555;
}

.btn-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn-pdf,
.btn-csv,
.btn-json {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.82rem;
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

.btn-pdf.summary {
  background: #0e6655;
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

.bulk-card h3 {
  margin: 0 0 12px;
  font-size: 1rem;
  color: #333;
}

.message {
  text-align: center;
  color: #0e6655;
  font-weight: 600;
  font-size: 0.9rem;
  margin: 0;
}
</style>
