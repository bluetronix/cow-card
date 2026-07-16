<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../db/dexie'
import { useAuth } from '../stores/auth'
import { syncPendingRecords, pullFromTurso, getPendingCount } from '../utils/sync'
import { showToast, formatError } from '../composables/useToast'
import { useAutoSync } from '../composables/useAutoSync'
import { todayISO } from '../utils/age'
import type { Cow, HealthIncident, Treatment, VaccinationRecord, LamenessSession } from '../types'

const router = useRouter()
const { fullName } = useAuth()
const loading = ref(true)
const data = ref({
  openIncidents: 0, totalIncidents: 0,
  totalVaccinations: 0, overdueVaccinations: 0, dueThisWeek: 0,
  lamenessFlagged: 0, lamenessToday: 0,
  totalVisits: 0, visitsThisMonth: 0,
  activeTreatments: 0,
  recentIncidents: [] as HealthIncident[],
  criticalAlerts: [] as { cowId: string; idNo: string; message: string }[],
})
const syncing = ref(false)
const pulling = ref(false)
const pendingCount = ref({ cows: 0, daily: 0, vetVisits: 0, incidents: 0, treatments: 0, lameness: 0, vaccinations: 0 })

const cowSearch = ref('')
const cowResults = ref<Cow[]>([])
const selectedCow = ref<Cow | null>(null)
const showCowSearch = ref(true)

const { lastSynced, isOnline, startAutoSync } = useAutoSync()

// Attention items
const attentionItems = ref<{ type: string; label: string; cowId: string; idNo: string; date: string; action: string }[]>([])

async function searchCows() {
  const q = cowSearch.value.toLowerCase().trim()
  if (!q) { cowResults.value = []; return }
  const all = await db.cows.toArray()
  cowResults.value = all.filter(c =>
    c.id_no?.toLowerCase().includes(q) ||
    c.tag?.toLowerCase().includes(q) ||
    c.name?.toLowerCase().includes(q) ||
    c.collar_no?.toLowerCase().includes(q) ||
    c.rfid_no?.toLowerCase().includes(q)
  )
}

function selectCow(cow: Cow) {
  selectedCow.value = cow
  showCowSearch.value = false
  cowSearch.value = ''
  cowResults.value = []
}

function clearSelectedCow() {
  selectedCow.value = null
  showCowSearch.value = true
}

onMounted(async () => {
  loading.value = true
  await loadData()
  pendingCount.value = await getPendingCount()
  startAutoSync()
  loading.value = false
})

async function loadData() {
  const incidents = await db.healthIncidents.toArray().catch(() => [] as HealthIncident[])
  const treatments = await db.treatments.toArray().catch(() => [] as Treatment[])
  const vaccinations = await db.vaccinationRecords.toArray().catch(() => [] as VaccinationRecord[])
  const lameness = await db.lamenessSessions.toArray().catch(() => [] as LamenessSession[])
  const visits = await db.vetVisits.toArray().catch(() => [] as any[])
  const cows = await db.cows.toArray().catch(() => [] as Cow[])

  const now = new Date()
  const today = todayISO()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  data.value.openIncidents = incidents.filter(i => i.status === 'open' || i.status === 'ongoing').length
  data.value.totalIncidents = incidents.length
  data.value.totalVaccinations = vaccinations.length
  data.value.overdueVaccinations = vaccinations.filter(v =>
    !v.administered_date && v.scheduled_date && v.scheduled_date < today
  ).length
  const weekFromNow = new Date(now.getTime() + 7 * 86400000).toISOString()
  data.value.dueThisWeek = vaccinations.filter(v =>
    !v.administered_date && v.scheduled_date >= today && v.scheduled_date <= weekFromNow
  ).length
  data.value.lamenessFlagged = lameness.filter(l => l.limp_detected).length
  data.value.lamenessToday = lameness.filter(l => l.session_date?.startsWith(today)).length
  data.value.totalVisits = visits.length
  data.value.visitsThisMonth = visits.filter(v => v.visit_date >= monthStart).length
  data.value.activeTreatments = treatments.filter(t => !t.next_due_date || t.next_due_date >= today).length

  data.value.recentIncidents = incidents
    .sort((a, b) => b.incident_date.localeCompare(a.incident_date))
    .slice(0, 5)

  const critical: { cowId: string; idNo: string; message: string }[] = []
  for (const l of lameness.filter(l => l.limp_detected && l.confidence_score > 0.7)) {
    const cow = cows.find(c => c.id === l.cow_id)
    if (cow) critical.push({ cowId: cow.id, idNo: cow.id_no || cow.tag, message: `Lameness detected (${Math.round(l.confidence_score * 100)}% confidence)` })
  }
  for (const inc of incidents.filter(i => i.status === 'open' && i.severity === 'severe')) {
    const cow = cows.find(c => c.id === inc.cow_id)
    if (cow) critical.push({ cowId: cow.id, idNo: cow.id_no || cow.tag, message: `Severe ${inc.incident_type} — ${inc.affected_area}` })
  }
  data.value.criticalAlerts = critical.slice(0, 5)

  const items: { type: string; label: string; cowId: string; idNo: string; date: string; action: string }[] = []

  for (const v of vaccinations.filter(v => !v.administered_date)) {
    const cow = cows.find(c => c.id === v.cow_id)
    if (!cow) continue
    const isOverdue = v.scheduled_date < today
    items.push({
      type: isOverdue ? 'overdue-vaccination' : 'due-vaccination',
      label: isOverdue ? `Overdue: ${v.vaccine_name}` : `Due: ${v.vaccine_name}`,
      cowId: v.cow_id, idNo: cow.id_no || cow.tag,
      date: v.scheduled_date,
      action: `/vet/cows/${v.cow_id}?tab=vaccinations`
    })
  }

  for (const t of treatments.filter(t => t.withdrawal_days && t.treatment_date)) {
    const endDate = new Date(t.treatment_date)
    endDate.setDate(endDate.getDate() + t.withdrawal_days)
    if (endDate.toISOString().slice(0, 10) >= today) {
      const cow = cows.find(c => c.id === t.cow_id)
      if (!cow) continue
      items.push({
        type: 'withdrawal',
        label: `Withdrawal: ${t.medication || 'treatment'}`,
        cowId: t.cow_id, idNo: cow.id_no || cow.tag,
        date: endDate.toISOString().slice(0, 10),
        action: `/vet/cows/${t.cow_id}?tab=treatments`
      })
    }
  }

  for (const inc of incidents.filter(i => i.status !== 'resolved')) {
    const cow = cows.find(c => c.id === inc.cow_id)
    if (!cow) continue
    items.push({
      type: 'open-incident',
      label: `${inc.severity} ${inc.incident_type}`,
      cowId: inc.cow_id, idNo: cow.id_no || cow.tag,
      date: inc.incident_date,
      action: `/vet/cows/${inc.cow_id}?tab=incidents`
    })
  }

  for (const t of treatments.filter(t => t.next_due_date && t.next_due_date <= weekFromNow)) {
    const cow = cows.find(c => c.id === t.cow_id)
    if (!cow) continue
    items.push({
      type: 'treatment-due',
      label: `Treatment due: ${t.medication || ''}`,
      cowId: t.cow_id, idNo: cow.id_no || cow.tag,
      date: t.next_due_date,
      action: `/vet/cows/${t.cow_id}?tab=treatments`
    })
  }

  items.sort((a, b) => a.date.localeCompare(b.date))
  attentionItems.value = items.slice(0, 20)
}

async function handleSync() {
  syncing.value = true
  try {
    const res = await syncPendingRecords()
    const total = res.cows + res.daily + res.vetVisits + res.incidents + res.treatments + res.lameness + res.vaccinations
    if (total > 0) showToast(`Synced ${total} items to cloud`, 'success')
    else showToast('No pending records to sync', 'info')
    pendingCount.value = await getPendingCount()
  } catch (e) {
    showToast(formatError(e, 'Sync failed'), 'error')
  } finally { syncing.value = false }
}

async function handlePull() {
  pulling.value = true
  try {
    const res = await pullFromTurso()
    const total = res.cows + res.daily + res.vetVisits + res.incidents + res.treatments + res.lameness + res.vaccinations
    if (total > 0) showToast(`Pulled ${total} items from cloud`, 'success')
    else showToast('Cloud data is up to date', 'info')
    await loadData()
  } catch (e) {
    showToast(formatError(e, 'Pull failed'), 'error')
  } finally { pulling.value = false }
}

const totalPending = computed(() =>
  pendingCount.value.cows + pendingCount.value.daily + pendingCount.value.vetVisits +
  pendingCount.value.incidents + pendingCount.value.treatments +
  pendingCount.value.lameness + pendingCount.value.vaccinations
)

const kpiCards = [
  { label: 'Open Incidents', value: data.value.openIncidents, color: '#dc2626', icon: '⚠', route: '/vet/incidents' },
  { label: 'Vaccinations Due', value: data.value.overdueVaccinations + data.value.dueThisWeek, color: '#b45309', icon: '💉', route: '/vet/vaccinations' },
  { label: 'Lameness Flagged', value: data.value.lamenessFlagged, color: '#9333ea', icon: '🦴', route: '/vet/lameness' },
  { label: 'Visits (This Month)', value: data.value.visitsThisMonth, color: '#1a5276', icon: '📋', route: '/vet/visits' },
  { label: 'Active Treatments', value: data.value.activeTreatments, color: '#0e6655', icon: '💊', route: '/vet/treatments' },
  { label: 'Total Incidents', value: data.value.totalIncidents, color: '#6c3483', icon: '📊', route: '/vet/incidents' },
]
</script>

<template>
  <div class="vet-dashboard">
    <header class="vet-header">
      <div>
        <button class="btn-back" @click="router.push('/')">← Dashboard</button>
        <h1>🐾 Vet Space</h1>
        <p class="subtitle">Health & medical management — {{ fullName }}</p>
      </div>
      <div class="header-actions">
        <span class="conn-status" :class="{ online: isOnline, offline: !isOnline }">{{ isOnline ? '🟢' : '🔴' }} {{ isOnline ? 'Online' : 'Offline' }}</span>
        <span v-if="lastSynced" class="last-sync-info">Last sync: {{ new Date(lastSynced).toLocaleTimeString() }}</span>
        <span v-if="pendingCount" class="pending-badge">{{ totalPending }} pending</span>
        <button class="btn-sync" :disabled="syncing" @click="handleSync">
          {{ syncing ? '⏳ Syncing...' : `Sync (${totalPending})` }}
        </button>
        <button class="btn-pull" :disabled="pulling" @click="handlePull">
          {{ pulling ? '⏳ Pulling...' : 'Pull from Cloud' }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="loading">Loading...</div>

    <div v-else class="content">
      <!-- Cow Search Panel -->
      <div v-if="showCowSearch" class="cow-search-card card">
        <h3>🔍 Find a Cow</h3>
        <p class="search-hint">Search by ID No, Tag, Name, Collar, or RFID to start a vet session</p>
        <div class="search-row">
          <input
            v-model="cowSearch"
            class="search-input"
            type="text"
            placeholder="Type to search cows..."
            @input="searchCows"
          />
        </div>
        <div v-if="cowResults.length > 0" class="search-results">
          <div
            v-for="c in cowResults" :key="c.id"
            class="search-result-row"
            @click="selectCow(c)"
          >
            <strong>{{ c.id_no || '—' }}</strong>
            <span>{{ c.name || 'Unnamed' }}</span>
            <span class="tag">{{ c.tag || '' }}</span>
            <span class="breed">{{ c.breed || '' }}</span>
            <span class="sex">{{ c.sex || '' }}</span>
          </div>
        </div>
        <div v-if="cowSearch && cowResults.length === 0" class="no-results">No cows found</div>
      </div>

      <!-- Selected Cow Panel -->
      <div v-if="selectedCow" class="selected-cow-card card">
        <div class="selected-cow-header">
          <div class="selected-cow-info">
            <span class="cow-badge-id">#{{ selectedCow.id_no }}</span>
            <span class="cow-badge-tag">{{ selectedCow.tag || '—' }}</span>
            <span class="cow-badge-meta">{{ selectedCow.breed }} · {{ selectedCow.sex }} · {{ selectedCow.birth_date ? `${selectedCow.birth_date.slice(0, 10)}` : '—' }}</span>
          </div>
          <div class="selected-cow-actions">
            <button class="btn-change-cow" @click="clearSelectedCow">Change Cow</button>
            <button class="btn-view-profile" @click="router.push(`/vet/cows/${selectedCow.id}`)">View Full Profile →</button>
          </div>
        </div>
        <div class="selected-cow-body">
          <div class="vet-action-grid">
            <button class="vet-action-btn" @click="router.push(`/vet/cows/${selectedCow.id}?tab=visits`)">
              <span class="vat-icon">📋</span>
              <span class="vat-label">New Visit</span>
            </button>
            <button class="vet-action-btn" @click="router.push(`/vet/cows/${selectedCow.id}?tab=incidents`)">
              <span class="vat-icon">⚠</span>
              <span class="vat-label">Report Incident</span>
            </button>
            <button class="vet-action-btn" @click="router.push(`/vet/cows/${selectedCow.id}?tab=treatments`)">
              <span class="vat-icon">💊</span>
              <span class="vat-label">Log Treatment</span>
            </button>
            <button class="vet-action-btn" @click="router.push(`/vet/cows/${selectedCow.id}?tab=vaccinations`)">
              <span class="vat-icon">💉</span>
              <span class="vat-label">Schedule Vaccine</span>
            </button>
            <button class="vet-action-btn" @click="router.push(`/vet/cows/${selectedCow.id}?tab=lameness`)">
              <span class="vat-icon">🦴</span>
              <span class="vat-label">Lameness Check</span>
            </button>
          </div>
        </div>
      </div>

      <!-- What Needs Attention -->
      <div class="card attention-card">
        <h3>⚠ What Needs Attention</h3>
        <div v-if="attentionItems.length === 0" class="empty-state">All clear — nothing needs attention</div>
        <div v-else class="attention-list">
          <div
            v-for="item in attentionItems" :key="item.type + '-' + item.cowId + '-' + item.date"
            class="attention-row"
            :class="item.type"
            @click="router.push(item.action)"
          >
            <span class="att-icon">
              <template v-if="item.type === 'withdrawal'">⛔</template>
              <template v-else-if="item.type === 'overdue-vaccination'">🔴</template>
              <template v-else-if="item.type === 'due-vaccination'">💉</template>
              <template v-else-if="item.type === 'open-incident'">⚠</template>
              <template v-else-if="item.type === 'treatment-due'">💊</template>
              <template v-else>🔔</template>
            </span>
            <span class="att-cow">{{ item.idNo }}</span>
            <span class="att-label">{{ item.label }}</span>
            <span class="att-date">{{ item.date }}</span>
          </div>
        </div>
        <div v-if="attentionItems.length > 0" class="attention-count">{{ attentionItems.length }} item(s) need attention</div>
      </div>

      <div class="kpi-grid">
        <div
          v-for="k in kpiCards" :key="k.label"
          class="kpi-card"
          :style="{ '--kpi-color': k.color }"
          @click="router.push(k.route)"
        >
          <div class="kpi-icon">{{ k.icon }}</div>
          <div class="kpi-value">{{ k.value }}</div>
          <div class="kpi-label">{{ k.label }}</div>
        </div>
      </div>

      <div class="two-col">
        <div class="card">
          <h3>📋 Recent Health Incidents</h3>
          <div v-if="data.recentIncidents.length === 0" class="empty-state">No incidents recorded</div>
          <div v-else class="incident-list">
            <div v-for="inc in data.recentIncidents" :key="inc.id" class="incident-row" @click="router.push(`/vet/cows/${inc.cow_id}`)">
              <span class="sev-badge" :class="inc.severity">{{ inc.severity }}</span>
              <span class="inc-type">{{ inc.incident_type }}</span>
              <span class="inc-desc">{{ inc.affected_area || inc.description?.slice(0, 40) }}</span>
              <span class="inc-date">{{ inc.incident_date?.slice(0, 10) }}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <h3>🚨 Critical Alerts</h3>
          <div v-if="data.criticalAlerts.length === 0" class="empty-state">No critical alerts</div>
          <div v-else class="alert-list">
            <div v-for="alert in data.criticalAlerts" :key="alert.cowId" class="alert-row" @click="router.push(`/vet/cows/${alert.cowId}`)">
              <span class="alert-cow">{{ alert.idNo }}</span>
              <span class="alert-msg">{{ alert.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vet-dashboard { min-height: 100vh; background: #f0f2f5; padding-bottom: 40px; }
.vet-header { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #fff; padding: 20px 32px; display: flex; justify-content: space-between; align-items: center; }
.vet-header h1 { margin: 0; font-size: 1.5rem; }
.subtitle { margin: 4px 0 0; font-size: 0.85rem; opacity: 0.7; }
.btn-back { background: none; border: none; color: #93c5fd; font-size: 0.9rem; cursor: pointer; padding: 0; margin-bottom: 8px; display: block; }
.header-actions { display: flex; gap: 8px; align-items: center; }
.conn-status { font-size: 0.75rem; font-weight: 600; }
.conn-status.online { color: #4ade80; }
.conn-status.offline { color: #f87171; }
.last-sync-info { font-size: 0.7rem; color: #93c5fd; opacity: 0.8; }
.pending-badge { background: #ef4444; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; }
.btn-sync, .btn-pull { padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-weight: 600; border: none; }
.btn-sync { background: #dc2626; color: #fff; }
.btn-pull { background: #1a5276; color: #fff; }
.btn-sync:disabled, .btn-pull:disabled { opacity: 0.6; cursor: not-allowed; }
.content { max-width: 1100px; margin: 0 auto; padding: 24px 16px; display: flex; flex-direction: column; gap: 24px; }
.loading { text-align: center; padding: 60px; color: #999; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }
.kpi-card { background: #fff; border-radius: 12px; padding: 20px; cursor: pointer; text-align: center; border-left: 4px solid var(--kpi-color); box-shadow: 0 1px 6px rgba(0,0,0,0.06); transition: transform 0.2s; }
.kpi-card:hover { transform: translateY(-2px); }
.kpi-icon { font-size: 2rem; }
.kpi-value { font-size: 2rem; font-weight: 800; color: #333; margin: 8px 0 4px; }
.kpi-label { font-size: 0.85rem; color: #666; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.card { background: #fff; border-radius: 12px; padding: 20px 24px; box-shadow: 0 1px 6px rgba(0,0,0,0.06); }
.card h3 { margin: 0 0 12px; font-size: 1rem; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; }
.empty-state { color: #999; font-size: 0.9rem; padding: 20px 0; text-align: center; }
.incident-list, .alert-list { display: flex; flex-direction: column; gap: 6px; }
.incident-row, .alert-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; cursor: pointer; transition: background 0.15s; font-size: 0.85rem; }
.incident-row:hover, .alert-row:hover { background: #f5f5f5; }
.sev-badge { padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; color: #fff; text-transform: uppercase; }
.sev-badge.mild { background: #15803d; }
.sev-badge.moderate { background: #b45309; }
.sev-badge.severe { background: #dc2626; }
.inc-type { font-weight: 600; color: #333; min-width: 80px; text-transform: capitalize; }
.inc-desc { color: #666; flex: 1; }
.inc-date { color: #999; font-size: 0.8rem; }
.alert-cow { font-weight: 700; color: #dc2626; min-width: 60px; }
.alert-msg { color: #555; }

/* Attention */
.attention-card { border-left: 4px solid #b45309; }
.attention-list { display: flex; flex-direction: column; gap: 4px; }
.attention-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; cursor: pointer; transition: background 0.15s; font-size: 0.85rem; }
.attention-row:hover { background: #f5f5f5; }
.attention-row.withdrawal { background: #fef2f2; }
.attention-row.overdue-vaccination { background: #fff7ed; }
.attention-row.open-incident { background: #f0fdf4; }
.attention-row.treatment-due { background: #f0f9ff; }
.att-icon { font-size: 1rem; width: 24px; text-align: center; }
.att-cow { font-weight: 700; color: #333; min-width: 60px; }
.att-label { flex: 1; color: #555; }
.att-date { color: #999; font-size: 0.78rem; white-space: nowrap; }
.attention-count { margin-top: 6px; font-size: 0.8rem; color: #999; }

/* Cow Search Panel */
.cow-search-card { }
.search-hint { font-size: 0.85rem; color: #888; margin: -6px 0 12px; }
.search-row { display: flex; gap: 8px; }
.search-input { flex: 1; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; outline: none; }
.search-input:focus { border-color: #1a5276; }
.search-results { margin-top: 8px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; max-height: 240px; overflow-y: auto; }
.search-result-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #f0f0f0; font-size: 0.9rem; }
.search-result-row:last-child { border-bottom: none; }
.search-result-row:hover { background: #f0f7ff; }
.search-result-row .tag { color: #666; font-size: 0.8rem; }
.search-result-row .breed { color: #999; font-size: 0.8rem; }
.search-result-row .sex { color: #999; font-size: 0.8rem; margin-left: auto; }
.no-results { margin-top: 8px; color: #999; text-align: center; padding: 20px; }

/* Selected Cow Panel */
.selected-cow-card { border-left: 4px solid #dc2626; }
.selected-cow-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
.selected-cow-info { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.cow-badge-id { font-size: 1.2rem; font-weight: 900; color: #1a5276; }
.cow-badge-tag { font-size: 0.9rem; color: #555; }
.cow-badge-meta { font-size: 0.85rem; color: #888; }
.selected-cow-actions { display: flex; gap: 8px; }
.btn-change-cow { padding: 6px 14px; background: #f0f2f5; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.8rem; cursor: pointer; color: #333; }
.btn-change-cow:hover { background: #e5e7eb; }
.btn-view-profile { padding: 6px 14px; background: #dc2626; color: #fff; border: none; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
.btn-view-profile:hover { background: #b91c1c; }
.vet-action-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
.vet-action-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #f9fafb; cursor: pointer; transition: all 0.15s; }
.vet-action-btn:hover { background: #fff; border-color: #1a5276; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transform: translateY(-2px); }
.vat-icon { font-size: 1.6rem; }
.vat-label { font-size: 0.8rem; font-weight: 600; color: #333; }
@media (max-width: 768px) { .two-col { grid-template-columns: 1fr; } }
</style>
