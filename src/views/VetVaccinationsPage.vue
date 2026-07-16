<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../db/dexie'
import { formatDate, todayISO } from '../utils/age'
import type { VaccinationRecord, Cow } from '../types'
import { showToast } from '../composables/useToast'

const router = useRouter()
const loading = ref(true)
const records = ref<VaccinationRecord[]>([])
const cows = ref<Map<string, Cow>>(new Map())
const filter = ref<'all' | 'pending' | 'done'>('all')

onMounted(async () => {
  const all = await db.vaccinationRecords.toArray().catch(() => [] as VaccinationRecord[])
  records.value = all.sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date))
  for (const r of records.value) {
    if (!cows.value.has(r.cow_id)) {
      const cow = await db.cows.get(r.cow_id)
      if (cow) cows.value.set(r.cow_id, cow)
    }
  }
  loading.value = false
})

const filtered = computed(() => {
  if (filter.value === 'all') return records.value
  if (filter.value === 'pending') return records.value.filter(r => !r.administered_date)
  return records.value.filter(r => r.administered_date)
})

const overdueCount = computed(() =>
  records.value.filter(r => !r.administered_date && r.scheduled_date < new Date().toISOString()).length
)

function getCowLabel(cowId: string): string {
  const c = cows.value.get(cowId)
  return c ? `${c.id_no || c.tag}` : cowId
}

async function deleteRecord(id: string) {
  if (!confirm('Delete this vaccination record?')) return
  try {
    await db.vaccinationRecords.delete(id)
    records.value = records.value.filter(r => r.id !== id)
    showToast('Record deleted', 'success')
  } catch { showToast('Failed to delete', 'error') }
}

async function markAdministered(rec: VaccinationRecord) {
  const now = todayISO()
  try {
    await db.vaccinationRecords.update(rec.id, { administered_date: now })
    const idx = records.value.findIndex(r => r.id === rec.id)
    if (idx > -1) records.value[idx] = { ...records.value[idx], administered_date: now }
    showToast('Marked as administered', 'success')
  } catch { showToast('Failed to update', 'error') }
}
</script>

<template>
  <div class="vet-vaccinations">
    <header class="page-header">
      <div>
        <button class="btn-back" @click="router.push('/vet')">← Vet Space</button>
        <h1>💉 Vaccination Tracker</h1>
        <p class="subtitle">{{ overdueCount }} overdue vaccination(s)</p>
      </div>
      <div class="filter-bar">
        <button class="filter-btn" :class="{ active: filter === 'all' }" @click="filter = 'all'">All</button>
        <button class="filter-btn" :class="{ active: filter === 'pending' }" @click="filter = 'pending'">Pending</button>
        <button class="filter-btn" :class="{ active: filter === 'done' }" @click="filter = 'done'">Completed</button>
      </div>
    </header>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else class="content">
      <div class="card">
        <div v-if="filtered.length === 0" class="empty-state">No vaccination records found</div>
        <table v-else class="data-table">
          <thead><tr><th>Vaccine</th><th>Cow</th><th>Scheduled</th><th>Administered</th><th>Admin By</th><th>Batch</th><th>Next Due</th><th>Notes</th><th></th></tr></thead>
          <tbody>
            <tr v-for="r in filtered" :key="r.id">
              <td @click="router.push(`/vet/cows/${r.cow_id}`)"><strong>{{ r.vaccine_name || '—' }}</strong></td>
              <td @click="router.push(`/vet/cows/${r.cow_id}`)">{{ getCowLabel(r.cow_id) }}</td>
              <td @click="router.push(`/vet/cows/${r.cow_id}`)" :class="{ overdue: !r.administered_date && r.scheduled_date < new Date().toISOString() }">
                {{ formatDate(r.scheduled_date) }}
                <span v-if="!r.administered_date && r.scheduled_date < new Date().toISOString()" class="overdue-badge">OVERDUE</span>
              </td>
              <td @click="router.push(`/vet/cows/${r.cow_id}`)">
                <template v-if="r.administered_date">{{ formatDate(r.administered_date) }}</template>
                <template v-else>
                  <span class="pending-label">⏳</span>
                </template>
              </td>
              <td @click="router.push(`/vet/cows/${r.cow_id}`)">{{ r.administered_by || '—' }}</td>
              <td @click="router.push(`/vet/cows/${r.cow_id}`)">{{ r.batch_no || '—' }}</td>
              <td @click="router.push(`/vet/cows/${r.cow_id}`)">{{ formatDate(r.next_due_date) || '—' }}</td>
              <td class="notes-cell" @click="router.push(`/vet/cows/${r.cow_id}`)">{{ r.notes?.slice(0, 30) || '—' }}</td>
              <td class="action-cell">
                <button v-if="!r.administered_date" class="btn-mark-done" title="Mark administered" @click.stop="markAdministered(r)">✓</button>
                <button class="btn-icon" title="Delete" @click.stop="deleteRecord(r.id)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="table-count">{{ filtered.length }} record(s)</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vet-vaccinations { min-height: 100vh; background: #f0f2f5; padding-bottom: 40px; }
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
.notes-cell { max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
.overdue { color: #dc2626; font-weight: 700; }
.overdue-badge { background: #dc2626; color: #fff; padding: 1px 6px; border-radius: 8px; font-size: 0.6rem; margin-left: 4px; font-weight: 700; }
.table-count { margin-top: 8px; font-size: 0.8rem; color: #999; }
.action-cell { text-align: center; white-space: nowrap; width: 60px; cursor: default; display: flex; gap: 4px; align-items: center; justify-content: center; }
.btn-icon { background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 2px 4px; opacity: 0.5; transition: opacity 0.15s; }
.btn-icon:hover { opacity: 1; }
.btn-mark-done { padding: 2px 8px; background: #0369a1; color: #fff; border: none; border-radius: 8px; font-size: 0.7rem; cursor: pointer; font-weight: 600; white-space: nowrap; }
.btn-mark-done:hover { background: #075985; }
.pending-label { color: #b45309; font-size: 0.8rem; }
</style>
