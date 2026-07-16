<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../stores/auth'
import { db } from '../db/dexie'
import { fetchCowById } from '../db/turso'
import { generateSummaryCard, generateDetailedCard, downloadPdf } from '../utils/pdf'
import { calculateAge, formatDate } from '../utils/age'
import type { Cow, DailyRecord, HealthIncident, VetVisit, Treatment, VaccinationRecord } from '../types'
import { showToast, formatError } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const { isLoggedIn } = useAuth()
const authenticated = ref(false)
const cow = ref<Cow | null>(null)
const loading = ref(true)
const downloadingSummary = ref(false)
const downloadingDetailed = ref(false)
const dailyRecords = ref<DailyRecord[]>([])
const vetVisits = ref<VetVisit[]>([])
const healthIncidents = ref<HealthIncident[]>([])
const activeTreatments = ref<Treatment[]>([])
const pendingVaccinations = ref<VaccinationRecord[]>([])

onMounted(async () => {
  authenticated.value = isLoggedIn()
  const id = route.params.id as string
  cow.value = (await db.cows.get(id)) || null
  if (!cow.value) {
    cow.value = await fetchCowById(id)
  }
  if (cow.value) {
    try {
      dailyRecords.value = await db.dailyRecords
        .where('cow_id').equals(cow.value.id)
        .reverse().sortBy('date')
      dailyRecords.value = dailyRecords.value.slice(0, 10)
    } catch {}

    try {
      vetVisits.value = await db.vetVisits
        .where('cow_id').equals(cow.value.id)
        .reverse().sortBy('visit_date')
      vetVisits.value = vetVisits.value.slice(0, 5)
    } catch {}

    try {
      healthIncidents.value = await db.healthIncidents
        .where('cow_id').equals(cow.value.id)
        .reverse().sortBy('incident_date')
      healthIncidents.value = healthIncidents.value.slice(0, 5)
    } catch {}

    try {
      const all = await db.treatments
        .where('cow_id').equals(cow.value.id).toArray()
      activeTreatments.value = all
        .filter(t => !t.next_due_date || t.next_due_date >= new Date().toISOString())
        .slice(0, 3)
    } catch {}

    try {
      const all = await db.vaccinationRecords
        .where('cow_id').equals(cow.value.id).toArray()
      pendingVaccinations.value = all
        .filter(v => !v.administered_date)
        .slice(0, 3)
    } catch {}
  }
  loading.value = false
})

async function downloadSummary() {
  if (!cow.value || downloadingSummary.value) return
  downloadingSummary.value = true
  try {
    const doc = await generateSummaryCard(cow.value)
    downloadPdf(doc, `cow_summary_${cow.value.id_no || cow.value.id}.pdf`)
    showToast('Summary PDF downloaded', 'success')
  } catch (e) {
    showToast(formatError(e, 'Failed to generate summary PDF'), 'error')
  } finally {
    setTimeout(() => { downloadingSummary.value = false }, 1500)
  }
}

async function downloadDetailed() {
  if (!cow.value || downloadingDetailed.value) return
  downloadingDetailed.value = true
  try {
    const doc = await generateDetailedCard(cow.value)
    downloadPdf(doc, `cow_detailed_${cow.value.id_no || cow.value.id}.pdf`)
    showToast('Detailed PDF downloaded', 'success')
  } catch (e) {
    showToast(formatError(e, 'Failed to generate detailed PDF'), 'error')
  } finally {
    setTimeout(() => { downloadingDetailed.value = false }, 1500)
  }
}
</script>

<template>
  <div class="detail-page">
    <header class="detail-header">
      <div>
        <button class="btn-back" @click="router.push('/cows')">← All Cows</button>
        <h1>{{ cow?.id_no || 'Cow Details' }}</h1>
      </div>
      <div v-if="authenticated" class="header-actions">
        <button class="btn-pdf" :disabled="downloadingSummary" @click="downloadSummary">{{ downloadingSummary ? '⏳ Downloading...' : 'Summary PDF' }}</button>
        <button class="btn-pdf detailed" :disabled="downloadingDetailed" @click="downloadDetailed">{{ downloadingDetailed ? '⏳ Downloading...' : 'Detailed PDF' }}</button>
        <button class="btn-daily" @click="router.push(`/daily?cowId=${cow?.id}`)">Daily Record</button>
        <button class="btn-edit" @click="router.push(`/cows/${cow?.id}/edit`)">Edit</button>
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
          <div><strong>Card Number:</strong> {{ cow.id_no }}</div>
          <div><strong>Tag:</strong> {{ cow.tag }}</div>
          <div><strong>Collar No:</strong> {{ cow.collar_no || '—' }}</div>
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
          <div><strong>Dam ID:</strong> {{ cow.dam_id || '—' }}</div>
          <div><strong>Dam Breed:</strong> {{ cow.dam_breed || '—' }}</div>
          <div><strong>Sire ID:</strong> {{ cow.sire_id || '—' }}</div>
          <div><strong>Sire Breed:</strong> {{ cow.sire_breed || '—' }}</div>
          <div><strong>Lactations:</strong> {{ cow.lactations ?? '—' }}</div>
          <div><strong>Calving Date:</strong> {{ formatDate(cow.calving_date) || '—' }}</div>
          <div><strong>PD Date:</strong> {{ formatDate(cow.pd_date) || '—' }}</div>
          <div><strong>PD Group:</strong> {{ cow.pd_group || '—' }}</div>
          <div><strong>Pregnancy:</strong> {{ cow.pregnancy_result || 'Open' }}</div>
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
          <div><strong>Barn Name:</strong> {{ cow.barn_name || '—' }}</div>
          <div><strong>Housing:</strong> {{ cow.housing || '—' }}</div>
          <div><strong>BCS:</strong> {{ cow.body_condition_score ?? '—' }}</div>
          <div><strong>Cull Status:</strong> {{ cow.cull_status || '—' }}</div>
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
          <div><strong>Abortions:</strong> {{ cow.abortion_count ?? '—' }}</div>
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

      <div v-if="cow.vet_recommendations" class="card">
        <h3>Doctor Recommendations</h3>
        <p class="medical-text">{{ cow.vet_recommendations }}</p>
      </div>

      <div v-if="cow.current_health_status" class="card health-status-card">
        <h3>Current Health Status</h3>
        <span class="status-badge" :class="cow.current_health_status.toLowerCase().replace(' ', '-')">{{ cow.current_health_status }}</span>
        <span v-if="cow.last_checkup_date" class="checkup-date">Last checkup: {{ formatDate(cow.last_checkup_date) }}</span>
      </div>

      <div v-if="dailyRecords.length > 0" class="card">
        <h3>Recent Daily Records</h3>
        <div class="daily-mini-table">
          <table>
            <thead><tr>
              <th>Date</th><th>Milk AM</th><th>Milk PM</th><th>Total</th><th>Status</th><th>Temp</th>
            </tr></thead>
            <tbody>
              <tr v-for="r in dailyRecords" :key="r.id">
                <td>{{ formatDate(r.date) || r.date }}</td>
                <td>{{ r.milk_yield_morning || '—' }}</td>
                <td>{{ r.milk_yield_evening || '—' }}</td>
                <td><strong>{{ r.milk_yield_total || '—' }}</strong></td>
                <td><span v-if="r.health_status" class="status-badge mini" :class="r.health_status.toLowerCase().replace(' ', '-')">{{ r.health_status }}</span><span v-else>—</span></td>
                <td>{{ r.temperature ? r.temperature + '°C' : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card vet-summary-card">
        <div class="vet-summary-header">
          <h3>🐾 Vet Space Overview</h3>
          <button class="btn-vet-link" @click="router.push(`/vet/cows/${cow.id}`)">View Full Medical Timeline →</button>
        </div>
        <div class="vet-summary-grid">
          <div class="vet-stat">
            <span class="vet-stat-value">{{ vetVisits.length }}</span>
            <span class="vet-stat-label">Vet Visits</span>
          </div>
          <div class="vet-stat">
            <span class="vet-stat-value">{{ healthIncidents.length }}</span>
            <span class="vet-stat-label">Incidents</span>
          </div>
          <div class="vet-stat">
            <span class="vet-stat-value">{{ activeTreatments.length }}</span>
            <span class="vet-stat-label">Active TX</span>
          </div>
          <div class="vet-stat">
            <span class="vet-stat-value">{{ pendingVaccinations.length }}</span>
            <span class="vet-stat-label">Pending Vax</span>
          </div>
        </div>
        <div v-if="healthIncidents.length > 0" class="vet-mini-list">
          <div v-for="inc in healthIncidents" :key="inc.id" class="vet-mini-row">
            <span class="sev-badge" :class="inc.severity">{{ inc.severity }}</span>
            <span class="vet-mini-type">{{ inc.incident_type }}</span>
            <span class="vet-mini-date">{{ formatDate(inc.incident_date) }}</span>
          </div>
        </div>
        <div v-else class="vet-no-data">No vet records yet</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-page { min-height: 100vh; background: #f0f2f5; padding-bottom: 40px; }
.detail-header { background: #fff; padding: 20px 32px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
.detail-header h1 { margin: 0; font-size: 1.4rem; color: #333; }
.btn-back { background: none; border: none; color: #1a5276; font-size: 0.9rem; cursor: pointer; padding: 0; margin-bottom: 8px; display: block; }
.header-actions { display: flex; gap: 8px; }
.btn-pdf, .btn-edit, .btn-daily { padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-weight: 600; border: none; }
.btn-pdf { background: #cb4335; color: #fff; }
.btn-pdf.detailed { background: #6c3483; }
.btn-edit { background: #1a5276; color: #fff; }
.btn-daily { background: #0e6655; color: #fff; }
.detail-content { max-width: 900px; margin: 0 auto; padding: 24px 16px; display: flex; flex-direction: column; gap: 20px; }
.card { background: #fff; border-radius: 12px; padding: 20px 24px; box-shadow: 0 1px 6px rgba(0,0,0,0.06); }
.card h3 { margin: 0 0 12px; color: #333; font-size: 1rem; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 0.9rem; }
.full-width { grid-column: 1 / -1; }
.info-grid strong { color: #555; }
.photo-card { display: flex; justify-content: center; }
.cow-photo { width: 200px; height: 200px; border-radius: 12px; object-fit: cover; }
.no-photo { width: 200px; height: 200px; background: #f5f5f5; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #bbb; }
.medical-text { font-size: 0.9rem; color: #555; line-height: 1.6; white-space: pre-wrap; margin: 0; }
.health-status-card { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.health-status-card h3 { margin: 0; border: none; padding: 0; font-size: 0.9rem; }
.status-badge { display: inline-block; padding: 3px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 700; color: #fff; }
.status-badge.mini { padding: 2px 8px; font-size: 0.7rem; }
.healthy { background: #15803d; }
.sick { background: #d62828; }
.under-treatment { background: #b45309; }
.checkup-date { font-size: 0.85rem; color: #666; }
.daily-mini-table { overflow-x: auto; }
.daily-mini-table table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.daily-mini-table th, .daily-mini-table td { border: 1px solid #e5e7eb; padding: 5px 8px; text-align: left; white-space: nowrap; }
.daily-mini-table th { background: #f9fafb; font-weight: 700; color: #333; }
.loading, .empty { text-align: center; padding: 60px; color: #999; }

.vet-summary-card { border-left: 4px solid #dc2626; }
.vet-summary-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; }
.vet-summary-header h3 { margin: 0; border: none; padding: 0; }
.btn-vet-link { padding: 6px 14px; background: #dc2626; color: #fff; border: none; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
.btn-vet-link:hover { background: #b91c1c; }
.vet-summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px; }
.vet-stat { text-align: center; background: #f9fafb; border-radius: 8px; padding: 10px; }
.vet-stat-value { display: block; font-size: 1.5rem; font-weight: 800; color: #333; }
.vet-stat-label { display: block; font-size: 0.7rem; color: #666; margin-top: 2px; }
.vet-mini-list { display: flex; flex-direction: column; gap: 4px; }
.vet-mini-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 0.82rem; }
.sev-badge { padding: 1px 7px; border-radius: 8px; font-size: 0.65rem; font-weight: 700; color: #fff; text-transform: uppercase; }
.sev-badge.mild { background: #15803d; }
.sev-badge.moderate { background: #b45309; }
.sev-badge.severe { background: #dc2626; }
.vet-mini-type { font-weight: 600; color: #333; text-transform: capitalize; min-width: 70px; }
.vet-mini-date { color: #999; font-size: 0.78rem; }
.vet-no-data { color: #999; font-size: 0.85rem; text-align: center; padding: 12px 0; }
</style>
