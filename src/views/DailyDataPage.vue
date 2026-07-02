<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../db/dexie'
import { todayISO, formatDate } from '../utils/age'
import type { Cow, DailyRecord, HealthStatus } from '../types'
import { showToast, formatError } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const cow = ref<Cow | null>(null)
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const records = ref<DailyRecord[]>([])
const search = ref('')
const searchResults = ref<Cow[]>([])

const date = ref(todayISO())
const milkAm = ref(0)
const milkPm = ref(0)
const milkTotal = computed(() => milkAm.value + milkPm.value)
const healthStatus = ref<HealthStatus>('')
const temp = ref(0)
const symptoms = ref('')
const treatment = ref('')
const healthNotes = ref('')
const notes = ref('')

onMounted(async () => {
  const id = route.query.cowId as string
  if (id) {
    cow.value = (await db.cows.get(id)) || null
    if (cow.value) await loadRecords()
  }
  loading.value = false
})

async function doSearch() {
  const q = search.value.toLowerCase().trim()
  if (!q) { searchResults.value = []; return }
  const all = await db.cows.toArray()
  searchResults.value = all.filter(c =>
    c.id_no?.toLowerCase().includes(q) ||
    c.tag?.toLowerCase().includes(q) ||
    c.name?.toLowerCase().includes(q) ||
    c.rfid_no?.toLowerCase().includes(q) ||
    c.collar_no?.toLowerCase().includes(q)
  )
}

function selectCow(c: Cow) {
  cow.value = c
  search.value = ''
  searchResults.value = []
  loadRecords()
}

async function loadRecords() {
  if (!cow.value) return
  try {
    records.value = await db.dailyRecords
      .where('cow_id').equals(cow.value.id)
      .reverse().sortBy('date')
    records.value = records.value.slice(0, 30)
    } catch {
      records.value = []
      showToast('Failed to load daily records', 'warning')
    }
}

async function handleSave() {
  if (!cow.value) return
  saving.value = true
  saved.value = false
  try {
    const record: DailyRecord = {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      cow_id: cow.value.id,
      date: date.value,
      milk_yield_morning: milkAm.value,
      milk_yield_evening: milkPm.value,
      milk_yield_total: milkTotal.value,
      health_status: healthStatus.value,
      last_checkup_date: healthStatus.value ? todayISO() : '',
      temperature: temp.value,
      symptoms: symptoms.value,
      treatment_given: treatment.value,
      health_notes: healthNotes.value,
      notes: notes.value,
      created_at: new Date().toISOString(),
      synced: 0,
    }
    try {
      await db.dailyRecords.put(record)
    } catch (e) {
      showToast(formatError(e, 'Failed to save daily record'), 'error')
      return
    }

    if (cow.value) {
      const update: Partial<Cow> = {
        current_health_status: healthStatus.value,
        last_checkup_date: healthStatus.value ? todayISO() : cow.value.last_checkup_date,
      }
      if (milkTotal.value > 0) {
        update.current_daily_milk_yield = milkTotal.value
      }
      await db.cows.update(cow.value.id, update)
      cow.value = { ...cow.value, ...update }
    }

    milkAm.value = 0
    milkPm.value = 0
    healthStatus.value = ''
    temp.value = 0
    symptoms.value = ''
    treatment.value = ''
    healthNotes.value = ''
    notes.value = ''
    saved.value = true
    await loadRecords()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="daily-page">
    <header class="daily-header">
      <div>
        <button class="btn-back" @click="router.push('/')">← Dashboard</button>
        <h1>Daily Recording</h1>
      </div>
    </header>

    <div v-if="loading" class="loading">Loading...</div>

    <div v-else class="daily-content">
      <!-- Cow Search -->
      <div class="search-card" v-if="!cow">
        <h3>Find Cow</h3>
        <div class="search-row">
          <input
            v-model="search"
            class="search-input"
            type="text"
            placeholder="Search by ID No, Tag, Name, RFID..."
            @input="doSearch"
          />
        </div>
        <div v-if="searchResults.length > 0" class="search-results">
          <div
            v-for="c in searchResults"
            :key="c.id"
            class="search-result-row"
            @click="selectCow(c)"
          >
            <strong>{{ c.id_no || '—' }}</strong>
            <span>{{ c.name || 'Unnamed' }}</span>
            <span class="tag">{{ c.tag || '' }}</span>
            <span class="breed">{{ c.breed || '' }}</span>
          </div>
        </div>
        <div v-if="search && searchResults.length === 0" class="no-results">
          No cows found
        </div>
      </div>

      <!-- Selected Cow Banner -->
      <div v-if="cow" class="cow-banner">
        <div class="cow-banner-info">
          <strong>{{ cow.id_no || '—' }}</strong>
          <span>{{ cow.name || 'Unnamed' }}</span>
          <span v-if="cow.tag" class="tag">Tag: {{ cow.tag }}</span>
          <span class="breed">{{ cow.breed || '' }}</span>
        </div>
        <button class="btn-change" @click="cow = null; records = []">Change Cow</button>
      </div>

      <!-- Daily Form (only when cow is selected) -->
      <template v-if="cow">
        <div class="date-bar">
          <label>Date</label>
          <input v-model="date" type="date" class="date-input" />
        </div>

        <div class="two-panel">
          <div class="panel milk-panel">
            <h3>Milk Production</h3>
            <div class="form-group">
              <label>Morning Yield (L)</label>
              <input v-model.number="milkAm" type="number" step="0.1" min="0" />
            </div>
            <div class="form-group">
              <label>Evening Yield (L)</label>
              <input v-model.number="milkPm" type="number" step="0.1" min="0" />
            </div>
            <div class="form-group total-row">
              <label>Total</label>
              <span class="total-value">{{ milkTotal.toFixed(1) }} L</span>
            </div>
          </div>

          <div class="panel health-panel">
            <h3>Health / Checkup</h3>
            <div class="form-group">
              <label>Health Status</label>
              <select v-model="healthStatus">
                <option value="">— Select —</option>
                <option value="Healthy">Healthy</option>
                <option value="On Treatment">On Treatment</option>
                <option value="Sick">Sick</option>
                <option value="Frequently Sick">Frequently Sick</option>
              </select>
            </div>
            <div class="form-group">
              <label>Temperature (°C)</label>
              <input v-model.number="temp" type="number" step="0.1" min="0" />
            </div>
            <div class="form-group">
              <label>Symptoms</label>
              <input v-model="symptoms" type="text" placeholder="e.g. cough, diarrhea, swollen" />
            </div>
            <div class="form-group">
              <label>Treatment Given</label>
              <input v-model="treatment" type="text" placeholder="e.g. antibiotics 10ml" />
            </div>
            <div class="form-group">
              <label>Health Notes</label>
              <textarea v-model="healthNotes" rows="2"></textarea>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>General Notes</label>
          <textarea v-model="notes" rows="2" class="full-width"></textarea>
        </div>

        <div class="actions">
          <button class="btn-save" :disabled="saving" @click="handleSave">
            {{ saving ? 'Saving...' : 'Save Record' }}
          </button>
          <span v-if="saved" class="saved-msg">Saved!</span>
        </div>

        <div v-if="records.length > 0" class="recent-section">
          <h3>Recent Records</h3>
          <div class="table-wrap">
            <table class="records-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Milk AM</th>
                  <th>Milk PM</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Temp</th>
                  <th>Treatment</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in records" :key="r.id">
                  <td>{{ formatDate(r.date) || r.date }}</td>
                  <td>{{ r.milk_yield_morning || '—' }}</td>
                  <td>{{ r.milk_yield_evening || '—' }}</td>
                  <td><strong>{{ r.milk_yield_total || '—' }}</strong></td>
                  <td>
                    <span v-if="r.health_status" class="status-badge" :class="r.health_status.toLowerCase().replace(' ', '-')">{{ r.health_status }}</span>
                    <span v-else>—</span>
                  </td>
                  <td>{{ r.temperature ? r.temperature + '°C' : '—' }}</td>
                  <td>{{ r.treatment_given || '—' }}</td>
                  <td class="notes-cell">{{ r.notes || r.health_notes || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.daily-page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 40px;
}
.daily-header {
  background: #fff;
  padding: 20px 32px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.daily-header h1 { margin: 0; font-size: 1.4rem; color: #333; }
.btn-back {
  background: none; border: none; color: #1a5276;
  font-size: 0.9rem; cursor: pointer; padding: 0; margin-bottom: 8px; display: block;
}
.daily-content { max-width: 960px; margin: 0 auto; padding: 24px 16px; display: flex; flex-direction: column; gap: 20px; }

.search-card { background: #fff; border-radius: 12px; padding: 20px 24px; box-shadow: 0 1px 6px rgba(0,0,0,0.06); }
.search-card h3 { margin: 0 0 12px; color: #333; font-size: 1rem; }
.search-row { display: flex; gap: 8px; }
.search-input {
  flex: 1; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px;
  font-size: 0.95rem; outline: none;
}
.search-input:focus { border-color: #1a5276; }
.search-results { margin-top: 8px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
.search-result-row {
  display: flex; align-items: center; gap: 12px; padding: 10px 14px;
  cursor: pointer; border-bottom: 1px solid #f0f0f0; font-size: 0.9rem;
}
.search-result-row:last-child { border-bottom: none; }
.search-result-row:hover { background: #f0f7ff; }
.search-result-row .tag { color: #666; font-size: 0.8rem; }
.search-result-row .breed { color: #999; font-size: 0.8rem; margin-left: auto; }
.no-results { margin-top: 8px; color: #999; text-align: center; padding: 20px; }

.cow-banner {
  display: flex; justify-content: space-between; align-items: center;
  background: #fff; border-radius: 12px; padding: 14px 20px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.06);
}
.cow-banner-info { display: flex; align-items: center; gap: 12px; font-size: 0.95rem; }
.cow-banner-info .tag { color: #666; font-size: 0.85rem; }
.cow-banner-info .breed { color: #999; font-size: 0.85rem; }
.btn-change {
  padding: 6px 16px; background: #f0f2f5; border: 1px solid #d1d5db;
  border-radius: 6px; font-size: 0.8rem; cursor: pointer; color: #333;
}

.date-bar { display: flex; align-items: center; gap: 12px; background: #fff; padding: 12px 20px; border-radius: 12px; box-shadow: 0 1px 6px rgba(0,0,0,0.06); }
.date-bar label { font-weight: 700; color: #333; font-size: 0.95rem; }
.date-input { padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.95rem; }
.two-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 6px rgba(0,0,0,0.06); }
.panel h3 { margin: 0 0 12px; color: #333; font-size: 1rem; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; }
.milk-panel h3 { border-bottom-color: #085482; }
.health-panel h3 { border-bottom-color: #BA3232; }
.form-group { margin-bottom: 10px; }
.form-group label { display: block; font-size: 0.8rem; font-weight: 600; color: #555; margin-bottom: 3px; }
.form-group input, .form-group select, .form-group textarea {
  width: 100%; padding: 7px 10px; border: 1px solid #d1d5db; border-radius: 6px;
  font-size: 0.9rem; box-sizing: border-box;
}
.form-group textarea { resize: vertical; }
.total-row { display: flex; align-items: center; gap: 12px; }
.total-row label { margin-bottom: 0; }
.total-value { font-size: 1.2rem; font-weight: 900; color: #085482; }
.actions { display: flex; align-items: center; gap: 12px; }
.btn-save {
  padding: 10px 28px; background: #0A4B29; color: #fff; border: none;
  border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer;
}
.btn-save:disabled { opacity: 0.6; }
.saved-msg { color: #0A4B29; font-weight: 700; font-size: 0.9rem; }
.recent-section { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 6px rgba(0,0,0,0.06); }
.recent-section h3 { margin: 0 0 12px; color: #333; font-size: 1rem; }
.table-wrap { overflow-x: auto; }
.records-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.records-table th, .records-table td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; white-space: nowrap; }
.records-table th { background: #f9fafb; font-weight: 700; color: #333; }
.notes-cell { max-width: 150px; white-space: normal; word-break: break-word; }
.status-badge {
  display: inline-block; padding: 2px 8px; border-radius: 10px;
  font-size: 0.75rem; font-weight: 700; color: #fff;
}
.healthy { background: #15803d; }
.sick { background: #d62828; }
.under-treatment { background: #b45309; }
.loading, .empty { text-align: center; padding: 60px; color: #999; }
</style>
