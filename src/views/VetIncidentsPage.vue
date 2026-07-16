<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../db/dexie'
import { formatDate, todayISO } from '../utils/age'
import type { HealthIncident, Cow } from '../types'
import { showToast } from '../composables/useToast'

const router = useRouter()
const loading = ref(true)
const incidents = ref<HealthIncident[]>([])
const cows = ref<Map<string, Cow>>(new Map())
const filter = ref<'all' | 'open' | 'resolved'>('all')

onMounted(async () => {
  const all = await db.healthIncidents.toArray().catch(() => [] as HealthIncident[])
  incidents.value = all.sort((a, b) => b.incident_date.localeCompare(a.incident_date))
  for (const inc of incidents.value) {
    if (!cows.value.has(inc.cow_id)) {
      const cow = await db.cows.get(inc.cow_id)
      if (cow) cows.value.set(inc.cow_id, cow)
    }
  }
  loading.value = false
})

const filtered = computed(() => {
  if (filter.value === 'all') return incidents.value
  return incidents.value.filter(i => i.status === filter.value)
})

function getCowLabel(cowId: string): string {
  const c = cows.value.get(cowId)
  return c ? `${c.id_no || c.tag}` : cowId
}

async function deleteIncident(id: string) {
  if (!confirm('Delete this incident record?')) return
  try {
    await db.healthIncidents.delete(id)
    incidents.value = incidents.value.filter(i => i.id !== id)
    showToast('Incident deleted', 'success')
  } catch { showToast('Failed to delete', 'error') }
}

async function resolveIncident(rec: HealthIncident) {
  try {
    await db.healthIncidents.update(rec.id, { status: 'resolved', resolved_date: todayISO() })
    const idx = incidents.value.findIndex(r => r.id === rec.id)
    if (idx > -1) incidents.value[idx] = { ...incidents.value[idx], status: 'resolved', resolved_date: todayISO() }
    showToast('Incident resolved', 'success')
  } catch { showToast('Failed to update', 'error') }
}
</script>

<template>
  <div class="vet-incidents">
    <header class="page-header">
      <div>
        <button class="btn-back" @click="router.push('/vet')">← Vet Space</button>
        <h1>⚠ Health Incidents</h1>
        <p class="subtitle">All health issues register</p>
      </div>
      <div class="filter-bar">
        <button class="filter-btn" :class="{ active: filter === 'all' }" @click="filter = 'all'">All</button>
        <button class="filter-btn" :class="{ active: filter === 'open' }" @click="filter = 'open'">Open</button>
        <button class="filter-btn" :class="{ active: filter === 'resolved' }" @click="filter = 'resolved'">Resolved</button>
      </div>
    </header>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else class="content">
      <div class="card">
        <div v-if="filtered.length === 0" class="empty-state">No incidents found</div>
        <table v-else class="data-table">
          <thead><tr><th>Date</th><th>Cow</th><th>Type</th><th>Severity</th><th>Status</th><th>Area</th><th>Description</th><th>Treatment</th><th></th></tr></thead>
          <tbody>
            <tr v-for="inc in filtered" :key="inc.id">
              <td @click="router.push(`/vet/cows/${inc.cow_id}`)">{{ formatDate(inc.incident_date) }}</td>
              <td @click="router.push(`/vet/cows/${inc.cow_id}`)"><strong>{{ getCowLabel(inc.cow_id) }}</strong></td>
              <td @click="router.push(`/vet/cows/${inc.cow_id}`)"><span class="type-badge">{{ inc.incident_type }}</span></td>
              <td @click="router.push(`/vet/cows/${inc.cow_id}`)"><span class="sev-tag" :class="inc.severity">{{ inc.severity }}</span></td>
              <td @click="router.push(`/vet/cows/${inc.cow_id}`)">
                <span class="status-tag" :class="inc.status">{{ inc.status }}</span>
                <span v-if="inc.status !== 'resolved'" class="resolve-btn" @click.stop="resolveIncident(inc)">✓ Resolve</span>
              </td>
              <td @click="router.push(`/vet/cows/${inc.cow_id}`)">{{ inc.affected_area || '—' }}</td>
              <td class="desc-cell" @click="router.push(`/vet/cows/${inc.cow_id}`)">{{ inc.description?.slice(0, 50) || '—' }}</td>
              <td class="desc-cell" @click="router.push(`/vet/cows/${inc.cow_id}`)">{{ inc.treatment_given?.slice(0, 40) || '—' }}</td>
              <td class="action-cell">
                <button class="btn-icon" title="Delete" @click.stop="deleteIncident(inc.id)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="table-count">{{ filtered.length }} incident(s)</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vet-incidents { min-height: 100vh; background: #f0f2f5; padding-bottom: 40px; }
.page-header { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #fff; padding: 20px 32px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.page-header h1 { margin: 0; font-size: 1.5rem; }
.subtitle { margin: 4px 0 0; font-size: 0.85rem; opacity: 0.7; }
.btn-back { background: none; border: none; color: #93c5fd; font-size: 0.9rem; cursor: pointer; padding: 0; margin-bottom: 8px; display: block; }
.filter-bar { display: flex; gap: 6px; }
.filter-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.3); background: transparent; color: #fff; font-size: 0.8rem; cursor: pointer; }
.filter-btn.active { background: #fff; color: #1a1a2e; }
.loading { text-align: center; padding: 60px; color: #999; }
.content { max-width: 1100px; margin: 0 auto; padding: 24px 16px; }
.card { background: #fff; border-radius: 12px; padding: 20px 24px; box-shadow: 0 1px 6px rgba(0,0,0,0.06); }
.empty-state { color: #999; font-size: 0.9rem; padding: 30px 0; text-align: center; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.data-table th, .data-table td { border: 1px solid #e5e7eb; padding: 5px 8px; text-align: left; white-space: nowrap; }
.data-table th { background: #f9fafb; font-weight: 700; color: #333; }
.data-table tbody tr { cursor: pointer; }
.data-table tbody tr:hover { background: #f5f5f5; }
.desc-cell { max-width: 150px; overflow: hidden; text-overflow: ellipsis; }
.type-badge { background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 600; text-transform: capitalize; }
.sev-tag { padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; color: #fff; text-transform: capitalize; }
.sev-tag.mild { background: #15803d; }
.sev-tag.moderate { background: #b45309; }
.sev-tag.severe { background: #dc2626; }
.status-tag { padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; color: #fff; text-transform: capitalize; }
.status-tag.open { background: #dc2626; }
.status-tag.ongoing { background: #b45309; }
.status-tag.resolved { background: #15803d; }
.resolve-btn { display: inline-block; margin-left: 6px; padding: 1px 6px; background: #15803d; color: #fff; border-radius: 8px; font-size: 0.65rem; cursor: pointer; font-weight: 700; border: none; }
.table-count { margin-top: 8px; font-size: 0.8rem; color: #999; }
.action-cell { text-align: center; white-space: nowrap; width: 40px; cursor: default; }
.btn-icon { background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 2px 4px; opacity: 0.5; transition: opacity 0.15s; }
.btn-icon:hover { opacity: 1; }
</style>
