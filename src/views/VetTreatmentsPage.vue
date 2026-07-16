<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../db/dexie'
import { formatDate, todayISO } from '../utils/age'
import type { Treatment, Cow } from '../types'
import { showToast } from '../composables/useToast'

const router = useRouter()
const loading = ref(true)
const treatments = ref<Treatment[]>([])
const cows = ref<Map<string, Cow>>(new Map())
const filter = ref<'all' | 'active' | 'past'>('all')

onMounted(async () => {
  const all = await db.treatments.toArray().catch(() => [] as Treatment[])
  treatments.value = all.sort((a, b) => b.treatment_date.localeCompare(a.treatment_date))
  for (const t of treatments.value) {
    if (!cows.value.has(t.cow_id)) {
      const cow = await db.cows.get(t.cow_id)
      if (cow) cows.value.set(t.cow_id, cow)
    }
  }
  loading.value = false
})

const filtered = computed(() => {
  if (filter.value === 'all') return treatments.value
  const now = new Date().toISOString()
  if (filter.value === 'active') return treatments.value.filter(t => !t.next_due_date || t.next_due_date >= now)
  return treatments.value.filter(t => t.next_due_date && t.next_due_date < now)
})

const upcomingCount = computed(() =>
  treatments.value.filter(t => t.next_due_date && t.next_due_date >= new Date().toISOString()).length
)

function getCowLabel(cowId: string): string {
  const c = cows.value.get(cowId)
  return c ? `${c.id_no || c.tag}` : cowId
}

async function deleteTreatment(id: string) {
  if (!confirm('Delete this treatment record?')) return
  try {
    await db.treatments.delete(id)
    treatments.value = treatments.value.filter(t => t.id !== id)
    showToast('Treatment deleted', 'success')
  } catch { showToast('Failed to delete', 'error') }
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
</script>

<template>
  <div class="vet-treatments">
    <header class="page-header">
      <div>
        <button class="btn-back" @click="router.push('/vet')">← Vet Space</button>
        <h1>💊 Treatment Log</h1>
        <p class="subtitle">{{ upcomingCount }} upcoming treatment(s)</p>
      </div>
      <div class="filter-bar">
        <button class="filter-btn" :class="{ active: filter === 'all' }" @click="filter = 'all'">All</button>
        <button class="filter-btn" :class="{ active: filter === 'active' }" @click="filter = 'active'">Active</button>
        <button class="filter-btn" :class="{ active: filter === 'past' }" @click="filter = 'past'">Past Due</button>
      </div>
    </header>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else class="content">
      <div class="card">
        <div v-if="filtered.length === 0" class="empty-state">No treatments found</div>
        <table v-else class="data-table">
          <thead><tr><th>Date</th><th>Cow</th><th>Medication</th><th>Dosage</th><th>Route</th><th>Duration</th><th>Withdrawal</th><th>Admin By</th><th>Next Due</th><th>Notes</th><th></th></tr></thead>
          <tbody>
            <tr v-for="t in filtered" :key="t.id" :class="{ 'withdrawal-active': isInWithdrawal(t) }">
              <td @click="router.push(`/vet/cows/${t.cow_id}`)">{{ formatDate(t.treatment_date) }}</td>
              <td @click="router.push(`/vet/cows/${t.cow_id}`)"><strong>{{ getCowLabel(t.cow_id) }}</strong></td>
              <td @click="router.push(`/vet/cows/${t.cow_id}`)">{{ t.medication || '—' }}</td>
              <td @click="router.push(`/vet/cows/${t.cow_id}`)">{{ t.dosage || '—' }}</td>
              <td @click="router.push(`/vet/cows/${t.cow_id}`)">{{ t.route || '—' }}</td>
              <td @click="router.push(`/vet/cows/${t.cow_id}`)">{{ t.duration_days ? t.duration_days + 'd' : '—' }}</td>
              <td @click="router.push(`/vet/cows/${t.cow_id}`)">
                <span v-if="t.withdrawal_days" :title="`Withheld until ${formatDate(calcWithdrawalEnd(t))}`">
                  {{ t.withdrawal_days }}d
                  <span v-if="isInWithdrawal(t)" class="withdrawal-badge-active">⛔</span>
                  <span v-else class="withdrawal-badge-done">✓</span>
                </span>
                <span v-else>—</span>
              </td>
              <td @click="router.push(`/vet/cows/${t.cow_id}`)">{{ t.administered_by || '—' }}</td>
              <td @click="router.push(`/vet/cows/${t.cow_id}`)">
                <span :class="{ overdue: t.next_due_date && t.next_due_date < new Date().toISOString() }">
                  {{ formatDate(t.next_due_date) || '—' }}
                </span>
              </td>
              <td class="notes-cell" @click="router.push(`/vet/cows/${t.cow_id}`)">{{ t.notes?.slice(0, 30) || '—' }}</td>
              <td class="action-cell">
                <button class="btn-icon" title="Delete" @click.stop="deleteTreatment(t.id)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="table-count">{{ filtered.length }} treatment(s)</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vet-treatments { min-height: 100vh; background: #f0f2f5; padding-bottom: 40px; }
.page-header { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #fff; padding: 20px 32px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.page-header h1 { margin: 0; font-size: 1.5rem; }
.subtitle { margin: 4px 0 0; font-size: 0.85rem; opacity: 0.7; }
.btn-back, .btn-back2 { background: none; border: none; color: #93c5fd; font-size: 0.9rem; cursor: pointer; padding: 0; margin-bottom: 8px; display: block; }
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
.table-count { margin-top: 8px; font-size: 0.8rem; color: #999; }
.action-cell { text-align: center; white-space: nowrap; width: 40px; cursor: default; }
.btn-icon { background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 2px 4px; opacity: 0.5; transition: opacity 0.15s; }
.btn-icon:hover { opacity: 1; }
.withdrawal-active { background: #fef2f2; }
.withdrawal-badge-active { display: inline-block; background: #dc2626; color: #fff; padding: 1px 6px; border-radius: 8px; font-size: 0.6rem; margin-left: 4px; }
.withdrawal-badge-done { display: inline-block; background: #15803d; color: #fff; padding: 1px 6px; border-radius: 8px; font-size: 0.6rem; margin-left: 4px; }
</style>
