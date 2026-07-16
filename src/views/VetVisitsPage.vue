<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../db/dexie'
import { formatDate } from '../utils/age'
import type { VetVisit, Cow } from '../types'
import { showToast } from '../composables/useToast'

const router = useRouter()
const loading = ref(true)
const visits = ref<VetVisit[]>([])
const cows = ref<Map<string, Cow>>(new Map())
const search = ref('')

onMounted(async () => {
  const all = await db.vetVisits.toArray().catch(() => [] as VetVisit[])
  visits.value = all.sort((a, b) => b.visit_date.localeCompare(a.visit_date))
  for (const v of visits.value) {
    if (!cows.value.has(v.cow_id)) {
      const cow = await db.cows.get(v.cow_id)
      if (cow) cows.value.set(v.cow_id, cow)
    }
  }
  loading.value = false
})

const filtered = computed(() => {
  if (!search.value) return visits.value
  const q = search.value.toLowerCase()
  return visits.value.filter(v => {
    const cow = cows.value.get(v.cow_id)
    return (cow?.id_no?.toLowerCase().includes(q)) ||
           (cow?.tag?.toLowerCase().includes(q)) ||
           (v.vet_name?.toLowerCase().includes(q)) ||
           (v.diagnosis?.toLowerCase().includes(q))
  })
})

function getCowLabel(cowId: string): string {
  const c = cows.value.get(cowId)
  return c ? `${c.id_no || c.tag}` : cowId
}

async function deleteVisit(id: string) {
  if (!confirm('Delete this visit record?')) return
  try {
    await db.vetVisits.delete(id)
    visits.value = visits.value.filter(v => v.id !== id)
    showToast('Visit deleted', 'success')
  } catch { showToast('Failed to delete', 'error') }
}
</script>

<template>
  <div class="vet-visits">
    <header class="page-header">
      <div>
        <button class="btn-back" @click="router.push('/vet')">← Vet Space</button>
        <h1>📋 Vet Visits</h1>
        <p class="subtitle">All veterinary visit records</p>
      </div>
      <input v-model="search" class="search-input" placeholder="Search cow, vet, diagnosis..." />
    </header>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else class="content">
      <div class="card">
        <div v-if="filtered.length === 0" class="empty-state">No vet visits found</div>
        <table v-else class="data-table">
          <thead><tr><th>Date</th><th>Cow</th><th>Vet</th><th>Diagnosis</th><th>Temp</th><th>HR</th><th>RR</th><th>Weight</th><th>BCS</th><th>Notes</th><th></th></tr></thead>
          <tbody>
            <tr v-for="v in filtered" :key="v.id">
              <td @click="router.push(`/vet/cows/${v.cow_id}`)">{{ formatDate(v.visit_date) }}</td>
              <td @click="router.push(`/vet/cows/${v.cow_id}`)"><strong>{{ getCowLabel(v.cow_id) }}</strong></td>
              <td @click="router.push(`/vet/cows/${v.cow_id}`)">{{ v.vet_name || '—' }}</td>
              <td @click="router.push(`/vet/cows/${v.cow_id}`)">{{ v.diagnosis || '—' }}</td>
              <td @click="router.push(`/vet/cows/${v.cow_id}`)">{{ v.temperature ? v.temperature + '°C' : '—' }}</td>
              <td @click="router.push(`/vet/cows/${v.cow_id}`)">{{ v.heart_rate || '—' }}</td>
              <td @click="router.push(`/vet/cows/${v.cow_id}`)">{{ v.respiration_rate || '—' }}</td>
              <td @click="router.push(`/vet/cows/${v.cow_id}`)">{{ v.weight ? v.weight + 'kg' : '—' }}</td>
              <td @click="router.push(`/vet/cows/${v.cow_id}`)">{{ v.body_condition_score || '—' }}</td>
              <td class="notes-cell" @click="router.push(`/vet/cows/${v.cow_id}`)">{{ v.notes?.slice(0, 30) || '—' }}</td>
              <td class="action-cell">
                <button class="btn-icon" title="Delete" @click.stop="deleteVisit(v.id)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="table-count">{{ filtered.length }} visit(s)</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vet-visits { min-height: 100vh; background: #f0f2f5; padding-bottom: 40px; }
.page-header { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #fff; padding: 20px 32px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.page-header h1 { margin: 0; font-size: 1.5rem; }
.subtitle { margin: 4px 0 0; font-size: 0.85rem; opacity: 0.7; }
.btn-back { background: none; border: none; color: #93c5fd; font-size: 0.9rem; cursor: pointer; padding: 0; margin-bottom: 8px; display: block; }
.search-input { padding: 8px 14px; border-radius: 8px; border: none; font-size: 0.85rem; min-width: 220px; }
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
.table-count { margin-top: 8px; font-size: 0.8rem; color: #999; }
.action-cell { text-align: center; white-space: nowrap; width: 40px; cursor: default; }
.btn-icon { background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 2px 4px; opacity: 0.5; transition: opacity 0.15s; }
.btn-icon:hover { opacity: 1; }
</style>
