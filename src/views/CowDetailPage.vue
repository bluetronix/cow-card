<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../db/dexie'
import { generateSummaryCard, generateDetailedCard, downloadPdf } from '../utils/pdf'
import { calculateAge, formatDate } from '../utils/age'
import type { Cow, DailyRecord } from '../types'

const route = useRoute()
const router = useRouter()
const cow = ref<Cow | null>(null)
const dailyRecords = ref<DailyRecord[]>([])
const loading = ref(true)

onMounted(async () => {
  const id = route.params.id as string
  cow.value = (await db.cows.get(id)) || null
  if (cow.value) {
    dailyRecords.value = await db.dailyRecords
      .where('cow_id')
      .equals(id)
      .reverse()
      .toArray()
  }
  loading.value = false
})

function downloadSummary() {
  if (!cow.value) return
  const doc = generateSummaryCard(cow.value)
  downloadPdf(doc, `cow_summary_${cow.value.id_no || cow.value.id}.pdf`)
}

function downloadDetailed() {
  if (!cow.value) return
  const doc = generateDetailedCard(cow.value, dailyRecords.value)
  downloadPdf(doc, `cow_detailed_${cow.value.id_no || cow.value.id}.pdf`)
}
</script>

<template>
  <div class="detail-page">
    <header class="detail-header">
      <div>
        <button class="btn-back" @click="router.push('/cows')">← All Cows</button>
        <h1>{{ cow?.id_no || 'Cow Details' }}</h1>
      </div>
      <div class="header-actions">
        <button class="btn-pdf" @click="downloadSummary">📄 Summary PDF</button>
        <button class="btn-pdf detailed" @click="downloadDetailed">📄 Detailed PDF</button>
        <button class="btn-edit" @click="router.push(`/cows/${cow?.id}/edit`)">Edit</button>
        <button class="btn-daily" @click="router.push(`/cows/${cow?.id}/daily`)">+ Daily</button>
      </div>
    </header>

    <div v-if="loading" class="loading">Loading...</div>

    <div v-else-if="!cow" class="empty">
      <p>Cow not found.</p>
      <button class="btn-back" @click="router.push('/cows')">Go back</button>
    </div>

    <div v-else class="detail-content">
      <div class="card photo-card">
        <img v-if="cow.image_url" :src="cow.image_url" alt="Cow photo" class="cow-photo" />
        <div v-else class="no-photo">No photo</div>
      </div>

      <div class="card">
        <h3>Identity & General</h3>
        <div class="info-grid">
          <div><strong>ID No:</strong> {{ cow.id_no }}</div>
          <div><strong>Tag:</strong> {{ cow.tag }}</div>
          <div><strong>Collar No:</strong> {{ cow.collar_no || '—' }}</div>
          <div><strong>RFID No:</strong> {{ cow.rfid_no || '—' }}</div>
          <div><strong>Name:</strong> {{ cow.name || '—' }}</div>
          <div><strong>Breed:</strong> {{ cow.breed }}</div>
          <div><strong>Sex:</strong> {{ cow.sex || '—' }}</div>
          <div><strong>Colour:</strong> {{ cow.colour }}</div>
          <div><strong>Age:</strong> {{ cow.birth_date ? calculateAge(cow.birth_date) : '—' }}</div>
          <div><strong>Origin:</strong> {{ cow.origin || '—' }}</div>
          <div><strong>Group:</strong> {{ cow.group_name || '—' }}</div>
        </div>
      </div>

      <div v-if="cow.sex !== 'Male'" class="card">
        <h3>Breeding & Reproduction</h3>
        <div class="info-grid">
          <div><strong>Dam (Mother):</strong> {{ cow.dam_id || '—' }}</div>
          <div><strong>Bull:</strong> {{ cow.bull_name || '—' }}</div>
          <div><strong>Lactations:</strong> {{ cow.lactations ?? '—' }}</div>
          <div><strong>Calving Date:</strong> {{ formatDate(cow.calving_date) || '—' }}</div>
          <div><strong>PD Date:</strong> {{ formatDate(cow.pd_date) || '—' }}</div>
          <div><strong>PD Group:</strong> {{ cow.pd_group || '—' }}</div>
          <div><strong>Pregnancy:</strong> {{ cow.pregnancy_result || '—' }}</div>
          <div><strong>AI/Service Date:</strong> {{ formatDate(cow.ai_service_date) || '—' }}</div>
          <div><strong>Dry-off:</strong> {{ formatDate(cow.expected_dry_off_date) || '—' }}</div>
          <div><strong>Expected Calving:</strong> {{ formatDate(cow.expected_calving_date) || '—' }}</div>
        </div>
      </div>

      <div v-if="cow.sex !== 'Male'" class="card">
        <h3>Milk Production</h3>
        <div class="info-grid">
          <div><strong>Days in Milk:</strong> {{ cow.days_in_milk ?? '—' }}</div>
          <div><strong>Peak Yield:</strong> {{ cow.peak_milk_yield ? `${cow.peak_milk_yield} L` : '—' }}</div>
          <div><strong>Current Daily:</strong> {{ cow.current_daily_milk_yield ? `${cow.current_daily_milk_yield} L` : '—' }}</div>
          <div><strong>Total Lactation:</strong> {{ cow.total_lactation_yield ? `${cow.total_lactation_yield} L` : '—' }}</div>
          <div><strong>Fat %:</strong> {{ cow.fat_percent ? `${cow.fat_percent} %` : '—' }}</div>
          <div><strong>Protein %:</strong> {{ cow.protein_percent ? `${cow.protein_percent} %` : '—' }}</div>
          <div class="full-width"><strong>305-Day Projected:</strong> {{ cow.projected_305d_milk_yield ? `${cow.projected_305d_milk_yield} L` : '—' }}</div>
        </div>
      </div>

      <div class="card">
        <h3>Management</h3>
        <div class="info-grid">
          <div><strong>Feeding Group:</strong> {{ cow.feeding_group || '—' }}</div>
          <div><strong>Milking Group:</strong> {{ cow.milking_group || '—' }}</div>
          <div><strong>Pen / Barn No:</strong> {{ cow.pen_barn_no || '—' }}</div>
          <div><strong>Housing:</strong> {{ cow.housing || '—' }}</div>
          <div><strong>BCS:</strong> {{ cow.body_condition_score ?? '—' }}</div>
          <div class="full-width"><strong>Remarks:</strong> {{ cow.remarks || '—' }}</div>
        </div>
      </div>

      <div class="card">
        <h3>Health & Medical</h3>
        <div class="info-grid">
          <div class="full-width"><strong>Vaccinations:</strong> {{ cow.vaccinations || 'None' }}</div>
          <div class="full-width"><strong>Deworming:</strong> {{ cow.deworming_dates || 'None' }}</div>
          <div class="full-width"><strong>Mastitis History:</strong> {{ cow.mastitis_history || 'None' }}</div>
          <div><strong>Dead Qtr-Teat:</strong> {{ cow.dead_qtr_teat || '—' }}</div>
          <div><strong>Quarter/Teat Status:</strong> {{ cow.quarter_teat_status || '—' }}</div>
          <div><strong>BCS:</strong> {{ cow.body_condition_score ?? '—' }}</div>
        </div>
      </div>

      <div class="card">
        <h3>Issuance</h3>
        <div class="info-grid">
          <div><strong>Issued Date:</strong> {{ formatDate(cow.issued_date) || '—' }}</div>
          <div><strong>Issued By:</strong> {{ cow.issued_by || '—' }}</div>
        </div>
      </div>

      <div class="card">
        <h3>Medical Records</h3>
        <p class="medical-text">{{ cow.medical_records || 'No records' }}</p>
      </div>

      <div class="card">
        <h3>Daily Records ({{ dailyRecords.length }})</h3>
        <table v-if="dailyRecords.length > 0" class="daily-table">
          <thead>
            <tr><th>Date</th><th>Milk (L)</th><th>BCS</th><th>Notes</th></tr>
          </thead>
          <tbody>
            <tr v-for="rec in dailyRecords" :key="rec.id">
              <td>{{ formatDate(rec.date) }}</td>
              <td>{{ rec.milk_yield ?? '—' }}</td>
              <td>{{ rec.body_condition_score ?? '—' }}</td>
              <td>{{ rec.notes || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="no-data">No daily records yet. <a @click="router.push(`/cows/${cow.id}/daily`)">Add one</a></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 40px;
}

.detail-header {
  background: #fff;
  padding: 20px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.detail-header h1 {
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

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-pdf,
.btn-edit,
.btn-daily {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  font-weight: 600;
  border: none;
}

.btn-pdf {
  background: #cb4335;
  color: #fff;
}

.btn-pdf.detailed {
  background: #6c3483;
}

.btn-edit {
  background: #1a5276;
  color: #fff;
}

.btn-daily {
  background: #0e6655;
  color: #fff;
}

.detail-content {
  max-width: 900px;
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
  margin: 0 0 12px;
  color: #333;
  font-size: 1rem;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 8px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
  font-size: 0.9rem;
}

.full-width {
  grid-column: 1 / -1;
}

.info-grid strong {
  color: #555;
}

.photo-card {
  display: flex;
  justify-content: center;
}

.cow-photo {
  max-width: 200px;
  max-height: 200px;
  border-radius: 12px;
  object-fit: cover;
}

.no-photo {
  width: 200px;
  height: 200px;
  background: #f5f5f5;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bbb;
}

.medical-text {
  font-size: 0.9rem;
  color: #555;
  line-height: 1.6;
  white-space: pre-wrap;
  margin: 0;
}

.daily-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.daily-table th {
  text-align: left;
  padding: 8px;
  border-bottom: 2px solid #f0f0f0;
  color: #555;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.daily-table td {
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.no-data {
  color: #999;
  font-size: 0.9rem;
}

.no-data a {
  color: #1a5276;
  cursor: pointer;
  text-decoration: underline;
}

.loading, .empty {
  text-align: center;
  padding: 60px;
  color: #999;
}
</style>
