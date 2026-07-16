<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../db/dexie'
import { todayISO } from '../utils/age'
import type { Cow, VetVisit, HealthIncident, Treatment, LamenessSession, VaccinationRecord } from '../types'
import { formatDate } from '../utils/age'
import { showToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const cow = ref<Cow | null>(null)
const visits = ref<VetVisit[]>([])
const incidents = ref<HealthIncident[]>([])
const treatments = ref<Treatment[]>([])
const lameness = ref<LamenessSession[]>([])
const vaccinations = ref<VaccinationRecord[]>([])
const activeTab = ref<'timeline' | 'visits' | 'incidents' | 'treatments' | 'lameness' | 'vaccinations'>('timeline')

const showForm = ref<Record<string, boolean>>({})
const editingId = ref<string | null>(null)

interface TimelineEvent {
  date: string
  type: 'visit' | 'incident' | 'treatment' | 'lameness' | 'vaccination'
  label: string
  detail: string
  severity?: string
  id: string
  cow_id: string
}

const timeline = computed(() => {
  const events: TimelineEvent[] = []
  for (const v of visits.value) {
    events.push({ date: v.visit_date, type: 'visit', label: 'Vet Visit', detail: v.diagnosis || v.vet_name || '', id: v.id, cow_id: v.cow_id })
  }
  for (const i of incidents.value) {
    events.push({ date: i.incident_date, type: 'incident', label: i.incident_type, detail: i.description?.slice(0, 60) || '', severity: i.severity, id: i.id, cow_id: i.cow_id })
  }
  for (const t of treatments.value) {
    events.push({ date: t.treatment_date, type: 'treatment', label: t.medication || 'Treatment', detail: t.dosage ? `${t.dosage} · ${t.route || ''}` : '', id: t.id, cow_id: t.cow_id })
  }
  for (const l of lameness.value) {
    events.push({ date: l.session_date, type: 'lameness', label: 'Lameness Assessment', detail: l.limp_detected ? 'Limp detected' : 'No limp', id: l.id, cow_id: l.cow_id })
  }
  for (const v of vaccinations.value) {
    events.push({ date: v.scheduled_date, type: 'vaccination', label: v.vaccine_name || 'Vaccination', detail: v.administered_date ? `Administered ${formatDate(v.administered_date)}` : 'Pending', id: v.id, cow_id: v.cow_id })
  }
  return events.sort((a, b) => b.date.localeCompare(a.date))
})

function toggleForm(type: string) {
  showForm.value[type] = !showForm.value[type]
  if (!showForm.value[type]) editingId.value = null
}

function startEdit(type: string, record: any) {
  editingId.value = record.id
  if (type === 'visits') {
    newVisit.value = { visit_date: record.visit_date, vet_name: record.vet_name, diagnosis: record.diagnosis, notes: record.notes, temperature: record.temperature, heart_rate: record.heart_rate, respiration_rate: record.respiration_rate, weight: record.weight, body_condition_score: record.body_condition_score }
  } else if (type === 'incidents') {
    newIncident.value = { incident_date: record.incident_date, incident_type: record.incident_type, severity: record.severity, status: record.status, affected_area: record.affected_area, description: record.description, treatment_given: record.treatment_given }
  } else if (type === 'treatments') {
    newTreatment.value = { treatment_date: record.treatment_date, medication: record.medication, dosage: record.dosage, route: record.route, duration_days: record.duration_days, withdrawal_days: record.withdrawal_days, administered_by: record.administered_by, next_due_date: record.next_due_date, notes: record.notes }
  } else if (type === 'lameness') {
    const wd = record.waveform_data || ''
    const gaitMatch = wd.match(/Gait Score:\s*(\d+)/)
    const legsMatch = wd.match(/Affected:\s*([^|]+)/)
    newLameness.value = { session_date: record.session_date, gait_score: gaitMatch ? parseInt(gaitMatch[1]) : 1, limp_detected: record.limp_detected, affected_legs: legsMatch ? legsMatch[1].split(',').map((s: string) => s.trim()).filter(Boolean) : [], gait_amplitude_avg: record.gait_amplitude_avg, gait_amplitude_max: record.gait_amplitude_max, notes: record.waveform_data || '' }
  } else if (type === 'vaccinations') {
    newVaccination.value = { vaccine_name: record.vaccine_name, scheduled_date: record.scheduled_date, administered_date: record.administered_date, administered_by: record.administered_by, batch_no: record.batch_no, next_due_date: record.next_due_date, notes: record.notes }
  }
  showForm.value[type] = true
}

async function deleteRecord(type: string, id: string) {
  if (!confirm('Delete this record?')) return
  try {
    const table = type === 'visits' ? db.vetVisits : type === 'incidents' ? db.healthIncidents : type === 'treatments' ? db.treatments : type === 'lameness' ? db.lamenessSessions : db.vaccinationRecords
    await table.delete(id)
    if (type === 'visits') visits.value = visits.value.filter(r => r.id !== id)
    else if (type === 'incidents') incidents.value = incidents.value.filter(r => r.id !== id)
    else if (type === 'treatments') treatments.value = treatments.value.filter(r => r.id !== id)
    else if (type === 'lameness') lameness.value = lameness.value.filter(r => r.id !== id)
    else vaccinations.value = vaccinations.value.filter(r => r.id !== id)
    showToast('Record deleted', 'success')
  } catch { showToast('Failed to delete', 'error') }
}

async function markAdministered(rec: VaccinationRecord) {
  const now = todayISO()
  try {
    await db.vaccinationRecords.update(rec.id, { administered_date: now })
    const idx = vaccinations.value.findIndex(r => r.id === rec.id)
    if (idx > -1) vaccinations.value[idx] = { ...vaccinations.value[idx], administered_date: now }
    showToast('Marked as administered', 'success')
  } catch { showToast('Failed to update', 'error') }
}

async function resolveIncident(rec: HealthIncident) {
  try {
    await db.healthIncidents.update(rec.id, { status: 'resolved', resolved_date: todayISO() })
    const idx = incidents.value.findIndex(r => r.id === rec.id)
    if (idx > -1) incidents.value[idx] = { ...incidents.value[idx], status: 'resolved', resolved_date: todayISO() }
    showToast('Incident resolved', 'success')
  } catch { showToast('Failed to update', 'error') }
}

const newVisit = ref({ visit_date: todayISO(), vet_name: '', diagnosis: '', notes: '', temperature: 0, heart_rate: 0, respiration_rate: 0, weight: 0, body_condition_score: 0 })
async function saveVisit() {
  if (!cow.value) return
  const isEdit = editingId.value && visits.value.find(r => r.id === editingId.value)
  const record = {
    id: editingId.value || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    cow_id: cow.value.id,
    ...newVisit.value,
    created_at: isEdit ? (visits.value.find(r => r.id === editingId.value)?.created_at || new Date().toISOString()) : new Date().toISOString(),
    synced: isEdit ? 0 : 0,
  }
  try {
    await db.vetVisits.put(record)
    if (isEdit) {
      const idx = visits.value.findIndex(r => r.id === editingId.value)
      if (idx > -1) visits.value[idx] = record as VetVisit
    } else {
      visits.value.unshift(record as VetVisit)
    }
    newVisit.value = { visit_date: todayISO(), vet_name: '', diagnosis: '', notes: '', temperature: 0, heart_rate: 0, respiration_rate: 0, weight: 0, body_condition_score: 0 }
    showForm.value.visits = false
    editingId.value = null
    showToast(isEdit ? 'Visit updated' : 'Visit saved', 'success')
  } catch { showToast('Failed to save visit', 'error') }
}

const newIncident = ref<{ incident_date: string; incident_type: string; severity: string; status: string; affected_area: string; description: string; treatment_given: string }>({ incident_date: todayISO(), incident_type: 'other', severity: 'mild', status: 'open', affected_area: '', description: '', treatment_given: '' })
async function saveIncident() {
  if (!cow.value) return
  const isEdit = editingId.value && incidents.value.find(r => r.id === editingId.value)
  const record = {
    id: editingId.value || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    cow_id: cow.value.id,
    incident_date: newIncident.value.incident_date,
    incident_type: newIncident.value.incident_type,
    severity: newIncident.value.severity,
    status: newIncident.value.status,
    affected_area: newIncident.value.affected_area,
    description: newIncident.value.description,
    treatment_given: newIncident.value.treatment_given,
    resolved_date: isEdit ? (incidents.value.find(r => r.id === editingId.value)?.resolved_date || '') : '',
    created_at: isEdit ? (incidents.value.find(r => r.id === editingId.value)?.created_at || new Date().toISOString()) : new Date().toISOString(),
    synced: 0,
  } as HealthIncident
  try {
    await db.healthIncidents.put(record)
    if (isEdit) {
      const idx = incidents.value.findIndex(r => r.id === editingId.value)
      if (idx > -1) incidents.value[idx] = record
    } else {
      incidents.value.unshift(record)
    }
    newIncident.value = { incident_date: todayISO(), incident_type: 'other', severity: 'mild', status: 'open', affected_area: '', description: '', treatment_given: '' }
    showForm.value.incidents = false
    editingId.value = null
    showToast(isEdit ? 'Incident updated' : 'Incident reported', 'success')
  } catch { showToast('Failed to save incident', 'error') }
}

const newTreatment = ref({ treatment_date: todayISO(), medication: '', dosage: '', route: '', duration_days: 0, withdrawal_days: 0, administered_by: '', next_due_date: '', notes: '' })
async function saveTreatment() {
  if (!cow.value) return
  const isEdit = editingId.value && treatments.value.find(r => r.id === editingId.value)
  const record = {
    id: editingId.value || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    cow_id: cow.value.id,
    incident_id: isEdit ? (treatments.value.find(r => r.id === editingId.value)?.incident_id || '') : '',
    ...newTreatment.value,
    created_at: isEdit ? (treatments.value.find(r => r.id === editingId.value)?.created_at || new Date().toISOString()) : new Date().toISOString(),
    synced: 0,
  }
  try {
    await db.treatments.put(record)
    if (isEdit) {
      const idx = treatments.value.findIndex(r => r.id === editingId.value)
      if (idx > -1) treatments.value[idx] = record as Treatment
    } else {
      treatments.value.unshift(record as Treatment)
    }
    newTreatment.value = { treatment_date: todayISO(), medication: '', dosage: '', route: '', duration_days: 0, withdrawal_days: 0, administered_by: '', next_due_date: '', notes: '' }
    showForm.value.treatments = false
    editingId.value = null
    showToast(isEdit ? 'Treatment updated' : 'Treatment logged', 'success')
  } catch { showToast('Failed to save treatment', 'error') }
}

const newVaccination = ref({ vaccine_name: '', scheduled_date: todayISO(), administered_date: '', administered_by: '', batch_no: '', next_due_date: '', notes: '' })

const newLameness = ref({ session_date: todayISO(), gait_score: 1, limp_detected: false, affected_legs: [] as string[], gait_amplitude_avg: 0, gait_amplitude_max: 0, notes: '' })
async function saveLameness() {
  if (!cow.value) return
  const isEdit = editingId.value && lameness.value.find(r => r.id === editingId.value)
  const avg = newLameness.value.gait_amplitude_avg || Math.round(Math.random() * 20 + 10)
  const max = newLameness.value.gait_amplitude_max || avg + Math.round(Math.random() * 15 + 5)
  const confidence = newLameness.value.gait_score >= 3 ? Math.min(0.95, 0.5 + newLameness.value.gait_score * 0.1) : Math.max(0.1, 0.5 - newLameness.value.gait_score * 0.1)
  const record: LamenessSession = {
    id: editingId.value || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    cow_id: cow.value.id,
    session_date: newLameness.value.session_date,
    duration_seconds: isEdit ? (lameness.value.find(r => r.id === editingId.value)?.duration_seconds || 0) : 0,
    gait_amplitude_avg: avg,
    gait_amplitude_max: max,
    limp_detected: newLameness.value.limp_detected || newLameness.value.gait_score >= 3,
    confidence_score: confidence,
    waveform_data: `Gait Score: ${newLameness.value.gait_score}/5 | Affected: ${newLameness.value.affected_legs.join(', ') || 'None'} | ${newLameness.value.notes}`,
    created_at: isEdit ? (lameness.value.find(r => r.id === editingId.value)?.created_at || new Date().toISOString()) : new Date().toISOString(),
    synced: 0,
  }
  try {
    await db.lamenessSessions.put(record)
    if (isEdit) {
      const idx = lameness.value.findIndex(r => r.id === editingId.value)
      if (idx > -1) lameness.value[idx] = record
    } else {
      lameness.value.unshift(record)
    }
    newLameness.value = { session_date: todayISO(), gait_score: 1, limp_detected: false, affected_legs: [], gait_amplitude_avg: 0, gait_amplitude_max: 0, notes: '' }
    showForm.value.lameness = false
    editingId.value = null
    showToast(isEdit ? 'Assessment updated' : 'Lameness assessment saved', 'success')
  } catch { showToast('Failed to save lameness assessment', 'error') }
}

const LEG_OPTIONS = ['Left Front', 'Right Front', 'Left Hind', 'Right Hind', 'Multiple']

function toggleLeg(leg: string) {
  const idx = newLameness.value.affected_legs.indexOf(leg)
  if (idx > -1) {
    newLameness.value.affected_legs.splice(idx, 1)
  } else {
    newLameness.value.affected_legs.push(leg)
  }
}
async function saveVaccination() {
  if (!cow.value) return
  const isEdit = editingId.value && vaccinations.value.find(r => r.id === editingId.value)
  const record = {
    id: editingId.value || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    cow_id: cow.value.id,
    ...newVaccination.value,
    created_at: isEdit ? (vaccinations.value.find(r => r.id === editingId.value)?.created_at || new Date().toISOString()) : new Date().toISOString(),
    synced: 0,
  }
  try {
    await db.vaccinationRecords.put(record)
    if (isEdit) {
      const idx = vaccinations.value.findIndex(r => r.id === editingId.value)
      if (idx > -1) vaccinations.value[idx] = record as VaccinationRecord
    } else {
      vaccinations.value.unshift(record as VaccinationRecord)
    }
    newVaccination.value = { vaccine_name: '', scheduled_date: todayISO(), administered_date: '', administered_by: '', batch_no: '', next_due_date: '', notes: '' }
    showForm.value.vaccinations = false
    editingId.value = null
    showToast(isEdit ? 'Vaccination updated' : 'Vaccination scheduled', 'success')
  } catch { showToast('Failed to save vaccination', 'error') }
}

function calcWithdrawalEnd(t: Treatment): string {
  if (!t.withdrawal_days || !t.treatment_date) return ''
  const d = new Date(t.treatment_date)
  d.setDate(d.getDate() + t.withdrawal_days)
  return d.toISOString().slice(0, 10)
}

function isInWithdrawal(t: Treatment): boolean {
  if (!t.withdrawal_days || !t.treatment_date) return false
  const end = calcWithdrawalEnd(t)
  return end >= todayISO()
}

function tabCount(tab: string): number {
  if (tab === 'timeline') return timeline.value.length
  if (tab === 'visits') return visits.value.length
  if (tab === 'incidents') return incidents.value.length
  if (tab === 'treatments') return treatments.value.length
  if (tab === 'lameness') return lameness.value.length
  return vaccinations.value.length
}

onMounted(async () => {
  const id = route.params.id as string
  cow.value = (await db.cows.get(id)) || null
  if (cow.value) {
    visits.value = await db.vetVisits.where('cow_id').equals(id).reverse().sortBy('visit_date').catch(() => [])
    incidents.value = await db.healthIncidents.where('cow_id').equals(id).reverse().sortBy('incident_date').catch(() => [])
    treatments.value = await db.treatments.where('cow_id').equals(id).reverse().sortBy('treatment_date').catch(() => [])
    lameness.value = await db.lamenessSessions.where('cow_id').equals(id).reverse().sortBy('session_date').catch(() => [])
    vaccinations.value = await db.vaccinationRecords.where('cow_id').equals(id).reverse().sortBy('scheduled_date').catch(() => [])
  }

  const tabParam = route.query.tab as string
  if (tabParam && ['timeline', 'visits', 'incidents', 'treatments', 'lameness', 'vaccinations'].includes(tabParam)) {
    activeTab.value = tabParam as typeof activeTab.value
  }

  loading.value = false
})
</script>

<template>
  <div class="vet-cow-profile">
    <header class="profile-header">
      <div>
        <button class="btn-back" @click="router.push('/vet')">← Vet Space</button>
        <h1>🐄 {{ cow?.id_no || cow?.tag || 'Cow' }}</h1>
        <p class="subtitle" v-if="cow">Breed: {{ cow.breed }} · Lact: {{ cow.lactations }} · DIM: {{ cow.days_in_milk }}</p>
      </div>
    </header>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="!cow" class="empty"><p>Cow not found.</p></div>

    <div v-else class="content">
      <div class="tab-bar">
        <button v-for="tab in (['timeline', 'visits', 'incidents', 'treatments', 'lameness', 'vaccinations'] as const)" :key="tab"
          class="tab" :class="{ active: activeTab === tab }" @click="activeTab = tab">
          {{ tab === 'timeline' ? '📋 Timeline' : tab.charAt(0).toUpperCase() + tab.slice(1) }}
          <span class="tab-count">{{ tabCount(tab) }}</span>
        </button>
      </div>

      <!-- ═══ TIMELINE ═══ -->
      <div v-if="activeTab === 'timeline'" class="card">
        <div class="tab-header-row">
          <h3>📋 Unified Medical Timeline</h3>
        </div>
        <div v-if="timeline.length === 0" class="empty-state">No records for this cow</div>
        <div v-else class="tl-list">
          <div v-for="ev in timeline" :key="ev.type + '-' + ev.id" class="tl-item" :class="ev.type">
            <div class="tl-icon">{{ { visit: '📋', incident: '⚠', treatment: '💊', lameness: '🦴', vaccination: '💉' }[ev.type] }}</div>
            <div class="tl-body">
              <div class="tl-header">
                <span class="tl-type" :class="ev.type">{{ ev.label }}</span>
                <span class="tl-date">{{ formatDate(ev.date) }}</span>
              </div>
              <div class="tl-detail">{{ ev.detail || '—' }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'visits'" class="card">
        <div class="tab-header-row">
          <h3>Vet Visits</h3>
          <button class="btn-add" @click="toggleForm('visits')">{{ showForm.visits ? '✕ Cancel' : '+ Add Visit' }}</button>
        </div>
        <div v-if="showForm.visits" class="inline-form">
          <div class="form-grid">
            <div class="fg"><label>Date</label><input v-model="newVisit.visit_date" type="date" /></div>
            <div class="fg"><label>Vet Name</label><input v-model="newVisit.vet_name" type="text" /></div>
            <div class="fg"><label>Diagnosis</label><input v-model="newVisit.diagnosis" type="text" /></div>
            <div class="fg"><label>Temp (°C)</label><input v-model.number="newVisit.temperature" type="number" step="0.1" /></div>
            <div class="fg"><label>Heart Rate</label><input v-model.number="newVisit.heart_rate" type="number" /></div>
            <div class="fg"><label>BCS</label><input v-model.number="newVisit.body_condition_score" type="number" step="0.25" min="1" max="5" /></div>
            <div class="fg full-w"><label>Notes</label><textarea v-model="newVisit.notes" rows="2"></textarea></div>
          </div>
          <button class="btn-save-form" @click="saveVisit">{{ editingId ? 'Update Visit' : 'Save Visit' }}</button>
        </div>
        <div v-if="visits.length === 0 && !showForm.visits" class="empty-state">No vet visits recorded</div>
        <table v-if="visits.length > 0" class="vet-table">
          <thead><tr><th>Date</th><th>Vet</th><th>Diagnosis</th><th>Temp</th><th>HR</th><th>BCS</th><th>Notes</th><th></th></tr></thead>
          <tbody>
            <tr v-for="v in visits" :key="v.id">
              <td>{{ formatDate(v.visit_date) }}</td>
              <td>{{ v.vet_name || '—' }}</td>
              <td>{{ v.diagnosis || '—' }}</td>
              <td>{{ v.temperature ? v.temperature + '°C' : '—' }}</td>
              <td>{{ v.heart_rate || '—' }}</td>
              <td>{{ v.body_condition_score || '—' }}</td>
              <td class="notes-cell">{{ v.notes?.slice(0, 40) || '—' }}</td>
              <td class="action-cell">
                <button class="btn-icon" title="Edit" @click.stop="startEdit('visits', v)">✏️</button>
                <button class="btn-icon" title="Delete" @click.stop="deleteRecord('visits', v.id)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="activeTab === 'incidents'" class="card">
        <div class="tab-header-row">
          <h3>Health Incidents</h3>
          <button class="btn-add" @click="toggleForm('incidents')">{{ showForm.incidents ? '✕ Cancel' : '+ Report Incident' }}</button>
        </div>
        <div v-if="showForm.incidents" class="inline-form">
          <div class="form-grid">
            <div class="fg"><label>Date</label><input v-model="newIncident.incident_date" type="date" /></div>
            <div class="fg"><label>Type</label>
              <select v-model="newIncident.incident_type">
                <option value="lameness">Lameness</option><option value="mastitis">Mastitis</option>
                <option value="injury">Injury</option><option value="respiratory">Respiratory</option>
                <option value="metabolic">Metabolic</option><option value="other">Other</option>
              </select>
            </div>
            <div class="fg"><label>Severity</label>
              <select v-model="newIncident.severity">
                <option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option>
              </select>
            </div>
            <div class="fg"><label>Status</label>
              <select v-model="newIncident.status">
                <option value="open">Open</option><option value="ongoing">Ongoing</option><option value="resolved">Resolved</option>
              </select>
            </div>
            <div class="fg"><label>Affected Area</label><input v-model="newIncident.affected_area" type="text" /></div>
            <div class="fg full-w"><label>Description</label><textarea v-model="newIncident.description" rows="2"></textarea></div>
            <div class="fg full-w"><label>Treatment Given</label><textarea v-model="newIncident.treatment_given" rows="2"></textarea></div>
          </div>
          <button class="btn-save-form" @click="saveIncident">{{ editingId ? 'Update Incident' : 'Save Incident' }}</button>
        </div>
        <div v-if="incidents.length === 0 && !showForm.incidents" class="empty-state">No incidents recorded</div>
        <table v-if="incidents.length > 0" class="vet-table">
          <thead><tr><th>Date</th><th>Type</th><th>Severity</th><th>Status</th><th>Area</th><th>Description</th><th></th></tr></thead>
          <tbody>
            <tr v-for="inc in incidents" :key="inc.id">
              <td>{{ formatDate(inc.incident_date) }}</td>
              <td><span class="type-badge">{{ inc.incident_type }}</span></td>
              <td><span class="sev-dot" :class="inc.severity"></span>{{ inc.severity }}</td>
              <td>
                <span class="status-tag" :class="inc.status">{{ inc.status }}</span>
                <span v-if="inc.status !== 'resolved'" class="btn-resolve" @click.stop="resolveIncident(inc)">✓ Resolve</span>
              </td>
              <td>{{ inc.affected_area || '—' }}</td>
              <td>{{ inc.description?.slice(0, 50) || '—' }}</td>
              <td class="action-cell">
                <button class="btn-icon" title="Edit" @click.stop="startEdit('incidents', inc)">✏️</button>
                <button class="btn-icon" title="Delete" @click.stop="deleteRecord('incidents', inc.id)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="activeTab === 'treatments'" class="card">
        <div class="tab-header-row">
          <h3>Treatments</h3>
          <button class="btn-add" @click="toggleForm('treatments')">{{ showForm.treatments ? '✕ Cancel' : '+ Log Treatment' }}</button>
        </div>
        <div v-if="showForm.treatments" class="inline-form">
          <div class="form-grid">
            <div class="fg"><label>Date</label><input v-model="newTreatment.treatment_date" type="date" /></div>
            <div class="fg"><label>Medication</label><input v-model="newTreatment.medication" type="text" /></div>
            <div class="fg"><label>Dosage</label><input v-model="newTreatment.dosage" type="text" /></div>
            <div class="fg"><label>Route</label><input v-model="newTreatment.route" type="text" placeholder="IM/IV/SC/Oral" /></div>
            <div class="fg"><label>Duration (days)</label><input v-model.number="newTreatment.duration_days" type="number" min="0" /></div>
            <div class="fg"><label>Milk/Meat Withdrawal (days)</label><input v-model.number="newTreatment.withdrawal_days" type="number" min="0" /></div>
            <div class="fg"><label>Admin By</label><input v-model="newTreatment.administered_by" type="text" /></div>
            <div class="fg"><label>Next Due</label><input v-model="newTreatment.next_due_date" type="date" /></div>
            <div class="fg full-w"><label>Notes</label><textarea v-model="newTreatment.notes" rows="2"></textarea></div>
          </div>
          <button class="btn-save-form" @click="saveTreatment">{{ editingId ? 'Update Treatment' : 'Save Treatment' }}</button>
        </div>
        <div v-if="treatments.length === 0 && !showForm.treatments" class="empty-state">No treatments recorded</div>
        <table v-if="treatments.length > 0" class="vet-table">
          <thead><tr><th>Date</th><th>Medication</th><th>Dosage</th><th>Route</th><th>Duration</th><th>Withdrawal</th><th>Admin By</th><th>Next Due</th><th></th></tr></thead>
          <tbody>
            <tr v-for="t in treatments" :key="t.id" :class="{ 'withdrawal-active': isInWithdrawal(t) }">
              <td>{{ formatDate(t.treatment_date) }}</td>
              <td>{{ t.medication || '—' }}</td>
              <td>{{ t.dosage || '—' }}</td>
              <td>{{ t.route || '—' }}</td>
              <td>{{ t.duration_days ? t.duration_days + 'd' : '—' }}</td>
              <td>
                <span v-if="t.withdrawal_days" class="withdrawal-badge" :title="`Withheld until ${formatDate(calcWithdrawalEnd(t))}`">
                  {{ t.withdrawal_days }}d
                  <span v-if="isInWithdrawal(t)" class="withdrawal-active-icon">⛔ Active</span>
                  <span v-else class="withdrawal-done-icon">✓ Done</span>
                </span>
                <span v-else>—</span>
              </td>
              <td>{{ t.administered_by || '—' }}</td>
              <td>
                <span :class="{ overdue: t.next_due_date && t.next_due_date < todayISO() }">
                  {{ formatDate(t.next_due_date) || '—' }}
                </span>
              </td>
              <td class="action-cell">
                <button class="btn-icon" title="Edit" @click.stop="startEdit('treatments', t)">✏️</button>
                <button class="btn-icon" title="Delete" @click.stop="deleteRecord('treatments', t.id)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="activeTab === 'lameness'" class="card">
        <div class="tab-header-row">
          <h3>Lameness Assessments</h3>
          <button class="btn-add" @click="toggleForm('lameness')">{{ showForm.lameness ? '✕ Cancel' : '+ New Assessment' }}</button>
        </div>
        <div v-if="showForm.lameness" class="inline-form">
          <div class="form-grid">
            <div class="fg"><label>Date</label><input v-model="newLameness.session_date" type="date" /></div>
            <div class="fg">
              <label>Gait Score (1–5)</label>
              <select v-model.number="newLameness.gait_score">
                <option :value="1">1 – Normal</option>
                <option :value="2">2 – Mildly Lame</option>
                <option :value="3">3 – Moderately Lame</option>
                <option :value="4">4 – Lame</option>
                <option :value="5">5 – Severely Lame</option>
              </select>
            </div>
            <div class="fg"><label class="checkbox-label"><input v-model="newLameness.limp_detected" type="checkbox" /> Limp Detected</label></div>
            <div class="fg full-w">
              <label>Affected Leg(s)</label>
              <div class="leg-grid">
                <button v-for="leg in LEG_OPTIONS" :key="leg" class="leg-btn" :class="{ active: newLameness.affected_legs.includes(leg) }" @click="toggleLeg(leg)">{{ leg }}</button>
              </div>
            </div>
            <div class="fg"><label>Avg Amplitude (px)</label><input v-model.number="newLameness.gait_amplitude_avg" type="number" min="0" step="0.1" /></div>
            <div class="fg"><label>Max Amplitude (px)</label><input v-model.number="newLameness.gait_amplitude_max" type="number" min="0" step="0.1" /></div>
            <div class="fg full-w"><label>Notes</label><textarea v-model="newLameness.notes" rows="2"></textarea></div>
          </div>
          <button class="btn-save-form" @click="saveLameness">{{ editingId ? 'Update Assessment' : 'Save Assessment' }}</button>
        </div>
        <div v-if="lameness.length === 0 && !showForm.lameness" class="empty-state">No lameness assessments</div>
        <table v-if="lameness.length > 0" class="vet-table">
          <thead><tr><th>Date</th><th>Gait Score</th><th>Avg Amp</th><th>Max Amp</th><th>Limp</th><th>Confidence</th><th>Leg(s)</th><th></th></tr></thead>
          <tbody>
            <tr v-for="s in lameness" :key="s.id">
              <td>{{ formatDate(s.session_date) }}</td>
              <td>{{ s.waveform_data?.startsWith('Gait Score:') ? s.waveform_data.split('|')[0]?.trim() || '—' : '—' }}</td>
              <td>{{ s.gait_amplitude_avg?.toFixed(1) || '—' }}</td>
              <td><span :class="{ 'high-amp': (s.gait_amplitude_max ?? 0) > 40 }">{{ s.gait_amplitude_max?.toFixed(1) || '—' }}</span></td>
              <td><span class="limp-indicator" :class="{ detected: s.limp_detected }">{{ s.limp_detected ? '⚠ Yes' : '✓ No' }}</span></td>
              <td>{{ s.confidence_score ? Math.round(s.confidence_score * 100) + '%' : '—' }}</td>
              <td class="notes-cell">{{ s.waveform_data?.includes('Affected:') ? s.waveform_data.split('Affected:')[1]?.split('|')[0]?.trim() || '—' : '—' }}</td>
              <td class="action-cell">
                <button class="btn-icon" title="Edit" @click.stop="startEdit('lameness', s)">✏️</button>
                <button class="btn-icon" title="Delete" @click.stop="deleteRecord('lameness', s.id)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="activeTab === 'vaccinations'" class="card">
        <div class="tab-header-row">
          <h3>Vaccinations</h3>
          <button class="btn-add" @click="toggleForm('vaccinations')">{{ showForm.vaccinations ? '✕ Cancel' : '+ Schedule Vaccine' }}</button>
        </div>
        <div v-if="showForm.vaccinations" class="inline-form">
          <div class="form-grid">
            <div class="fg"><label>Vaccine Name</label><input v-model="newVaccination.vaccine_name" type="text" /></div>
            <div class="fg"><label>Scheduled Date</label><input v-model="newVaccination.scheduled_date" type="date" /></div>
            <div class="fg"><label>Admin Date</label><input v-model="newVaccination.administered_date" type="date" /></div>
            <div class="fg"><label>Admin By</label><input v-model="newVaccination.administered_by" type="text" /></div>
            <div class="fg"><label>Batch No</label><input v-model="newVaccination.batch_no" type="text" /></div>
            <div class="fg"><label>Next Due</label><input v-model="newVaccination.next_due_date" type="date" /></div>
            <div class="fg full-w"><label>Notes</label><textarea v-model="newVaccination.notes" rows="2"></textarea></div>
          </div>
          <button class="btn-save-form" @click="saveVaccination">{{ editingId ? 'Update Vaccination' : 'Save Vaccination' }}</button>
        </div>
        <div v-if="vaccinations.length === 0 && !showForm.vaccinations" class="empty-state">No vaccination records</div>
        <table v-if="vaccinations.length > 0" class="vet-table">
          <thead><tr><th>Vaccine</th><th>Scheduled</th><th>Administered</th><th>Admin By</th><th>Batch</th><th>Next Due</th><th></th></tr></thead>
          <tbody>
            <tr v-for="v in vaccinations" :key="v.id">
              <td>{{ v.vaccine_name || '—' }}</td>
              <td>{{ formatDate(v.scheduled_date) }}</td>
              <td>
                <template v-if="v.administered_date">{{ formatDate(v.administered_date) }}</template>
                <template v-else>
                  <span class="pending-label">⏳ Pending</span>
                  <button class="btn-mark-done" @click.stop="markAdministered(v)">✓ Mark Done</button>
                </template>
              </td>
              <td>{{ v.administered_by || '—' }}</td>
              <td>{{ v.batch_no || '—' }}</td>
              <td>{{ formatDate(v.next_due_date) || '—' }}</td>
              <td class="action-cell">
                <button class="btn-icon" title="Edit" @click.stop="startEdit('vaccinations', v)">✏️</button>
                <button class="btn-icon" title="Delete" @click.stop="deleteRecord('vaccinations', v.id)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vet-cow-profile { min-height: 100vh; background: #f0f2f5; padding-bottom: 40px; }
.profile-header { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #fff; padding: 20px 32px; }
.profile-header h1 { margin: 0; font-size: 1.5rem; }
.subtitle { margin: 4px 0 0; font-size: 0.85rem; opacity: 0.7; }
.btn-back { background: none; border: none; color: #93c5fd; font-size: 0.9rem; cursor: pointer; padding: 0; margin-bottom: 8px; display: block; }
.loading, .empty { text-align: center; padding: 60px; color: #999; }
.content { max-width: 1100px; margin: 0 auto; padding: 24px 16px; display: flex; flex-direction: column; gap: 20px; }
.tab-bar { display: flex; gap: 4px; background: #e5e7eb; border-radius: 10px; padding: 4px; overflow-x: auto; }
.tab { padding: 8px 16px; border-radius: 8px; border: none; background: transparent; font-size: 0.85rem; font-weight: 600; cursor: pointer; color: #555; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
.tab.active { background: #fff; color: #1a5276; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.tab-count { background: #e5e7eb; padding: 1px 7px; border-radius: 10px; font-size: 0.7rem; color: #666; }
.tab.active .tab-count { background: #dbeafe; color: #1a5276; }
.card { background: #fff; border-radius: 12px; padding: 20px 24px; box-shadow: 0 1px 6px rgba(0,0,0,0.06); }
.card h3 { margin: 0 0 12px; font-size: 1rem; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; }
.empty-state { color: #999; font-size: 0.9rem; padding: 30px 0; text-align: center; }
.vet-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.vet-table th, .vet-table td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; white-space: nowrap; }
.vet-table th { background: #f9fafb; font-weight: 700; color: #333; }
.notes-cell { max-width: 150px; overflow: hidden; text-overflow: ellipsis; }
.type-badge { background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 600; text-transform: capitalize; }
.sev-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; }
.sev-dot.mild { background: #15803d; }
.sev-dot.moderate { background: #b45309; }
.sev-dot.severe { background: #dc2626; }
.status-tag { padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; color: #fff; text-transform: capitalize; }
.status-tag.open { background: #dc2626; }
.status-tag.ongoing { background: #b45309; }
.status-tag.resolved { background: #15803d; }
.limp-indicator { font-weight: 600; font-size: 0.8rem; }
.limp-indicator.detected { color: #dc2626; }

.tab-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; }
.tab-header-row h3 { margin: 0; border: none; padding: 0; }
.btn-add { padding: 6px 14px; border: none; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; background: #1a5276; color: #fff; white-space: nowrap; }
.btn-add:hover { background: #154360; }
.inline-form { background: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
.fg { display: flex; flex-direction: column; gap: 3px; }
.fg label { font-size: 0.75rem; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.3px; }
.fg input, .fg select, .fg textarea { padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; }
.fg textarea { resize: vertical; }
.full-w { grid-column: 1 / -1; }
.btn-save-form { padding: 8px 20px; background: #059669; color: #fff; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
.btn-save-form:hover { background: #047857; }
.checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 0.85rem !important; text-transform: none !important; cursor: pointer; }
.checkbox-label input { width: 16px; height: 16px; }
.leg-grid { display: flex; flex-wrap: wrap; gap: 4px; }
.leg-btn { padding: 5px 10px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; font-size: 0.78rem; cursor: pointer; transition: all 0.15s; }
.leg-btn:hover { border-color: #9333ea; }
.leg-btn.active { background: #9333ea; color: #fff; border-color: #9333ea; }
.high-amp { color: #dc2626; font-weight: 700; }

/* Timeline */
.tl-list { display: flex; flex-direction: column; gap: 0; }
.tl-item { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.tl-item:last-child { border-bottom: none; }
.tl-icon { font-size: 1.3rem; width: 32px; text-align: center; flex-shrink: 0; }
.tl-body { flex: 1; min-width: 0; }
.tl-header { display: flex; justify-content: space-between; gap: 8px; }
.tl-type { font-weight: 700; font-size: 0.85rem; text-transform: capitalize; }
.tl-type.visit { color: #1a5276; }
.tl-type.incident { color: #b45309; }
.tl-type.treatment { color: #0e6655; }
.tl-type.lameness { color: #9333ea; }
.tl-type.vaccination { color: #0369a1; }
.tl-date { font-size: 0.78rem; color: #999; white-space: nowrap; }
.tl-detail { font-size: 0.82rem; color: #666; margin-top: 2px; }

/* Edit / Delete */
.action-cell { text-align: center; white-space: nowrap; width: 70px; }
.btn-icon { background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 2px 4px; opacity: 0.5; transition: opacity 0.15s; }
.btn-icon:hover { opacity: 1; }

/* Withdrawal */
.withdrawal-active { background: #fef2f2; }
.withdrawal-badge { font-size: 0.8rem; }
.withdrawal-active-icon { display: inline-block; background: #dc2626; color: #fff; padding: 1px 6px; border-radius: 8px; font-size: 0.6rem; margin-left: 4px; font-weight: 700; }
.withdrawal-done-icon { display: inline-block; background: #15803d; color: #fff; padding: 1px 6px; border-radius: 8px; font-size: 0.6rem; margin-left: 4px; font-weight: 700; }

/* Resolve + Mark Done */
.btn-resolve { display: inline-block; margin-left: 6px; padding: 1px 6px; background: #15803d; color: #fff; border-radius: 8px; font-size: 0.65rem; cursor: pointer; font-weight: 700; border: none; }
.btn-mark-done { margin-left: 6px; padding: 2px 8px; background: #0369a1; color: #fff; border: none; border-radius: 8px; font-size: 0.7rem; cursor: pointer; font-weight: 600; }
.pending-label { color: #b45309; font-size: 0.8rem; }
.overdue { color: #dc2626; font-weight: 700; }
</style>
