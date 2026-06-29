<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../db/dexie'
import { todayISO } from '../utils/age'
import type { DailyRecord } from '../types'

const route = useRoute()
const router = useRouter()

const cowIdInput = ref('')
const cowInfo = ref('')
const date = ref(todayISO())
const milkYield = ref(0)
const bodyScore = ref(0)
const notes = ref('')
const savedRecords = ref<DailyRecord[]>([])
const message = ref('')

onMounted(async () => {
  const cowParam = route.query.cow as string
  if (cowParam) {
    cowIdInput.value = cowParam
    await loadCow()
  }
})

async function loadCow() {
  const cow = await db.cows.get(cowIdInput.value)
  if (cow) {
    cowInfo.value = `${cow.id_no} — ${cow.name || 'Unnamed'} (${cow.breed})`
    savedRecords.value = await db.dailyRecords
      .where('cow_id')
      .equals(cowIdInput.value)
      .reverse()
      .toArray()
    message.value = ''
  } else {
    cowInfo.value = ''
    savedRecords.value = []
    message.value = 'Cow not found. Check the ID.'
  }
}

async function lookupCow() {
  if (!cowIdInput.value) return
  await loadCow()
}

async function saveDaily() {
  if (!cowIdInput.value) return
  const cow = await db.cows.get(cowIdInput.value)
  if (!cow) {
    message.value = 'Cow not found'
    return
  }

  const record: DailyRecord = {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    cow_id: cowIdInput.value,
    date: date.value,
    milk_yield: milkYield.value,
    body_condition_score: bodyScore.value,
    notes: notes.value,
    created_at: new Date().toISOString(),
    synced: 0,
  }

  await db.dailyRecords.put(record)
  milkYield.value = 0
  bodyScore.value = 0
  notes.value = ''
  message.value = 'Record saved!'
  await loadCow()
}
</script>

<template>
  <div class="daily-page">
    <header class="page-header">
      <div>
        <button class="btn-back" @click="router.push('/')">← Dashboard</button>
        <h1>Daily Cow Recording</h1>
      </div>
    </header>

    <div class="daily-content">
      <div class="card lookup-card">
        <h3>🔍 Find Cow</h3>
        <div class="lookup-row">
          <input
            v-model="cowIdInput"
            type="text"
            placeholder="Enter Cow ID or Tag number"
            class="input-lg"
            @keyup.enter="lookupCow"
          />
          <button class="btn-primary" @click="lookupCow">Look Up</button>
        </div>
        <p v-if="cowInfo" class="cow-info">{{ cowInfo }}</p>
      </div>

      <div v-if="cowInfo" class="card form-card">
        <h3>📋 Record Daily Data</h3>
        <div class="daily-form">
          <div class="form-group">
            <label>Date</label>
            <input v-model="date" type="date" />
          </div>
          <div class="form-group">
            <label>Milk Yield (L)</label>
            <input v-model.number="milkYield" type="number" step="0.1" min="0" placeholder="0.0" />
          </div>
          <div class="form-group">
            <label>Body Condition Score (1-5)</label>
            <input v-model.number="bodyScore" type="number" step="0.25" min="1" max="5" placeholder="3.0" />
          </div>
          <div class="form-group full-width">
            <label>Notes</label>
            <textarea v-model="notes" rows="2" placeholder="Any observations..."></textarea>
          </div>
        </div>
        <button class="btn-primary save-btn" @click="saveDaily">Save Record</button>
        <p v-if="message" class="message" :class="{ error: !cowInfo }">{{ message }}</p>
      </div>

      <div v-if="savedRecords.length > 0" class="card history-card">
        <h3>📊 Recent Records ({{ savedRecords.length }})</h3>
        <table class="records-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Milk (L)</th>
              <th>BCS</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rec in savedRecords.slice(0, 20)" :key="rec.id">
              <td>{{ new Date(rec.date).toLocaleDateString() }}</td>
              <td>{{ rec.milk_yield ?? '—' }}</td>
              <td>{{ rec.body_condition_score ?? '—' }}</td>
              <td>{{ rec.notes || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.daily-page {
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

.daily-content {
  max-width: 700px;
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
  margin: 0 0 16px;
  color: #333;
  font-size: 1rem;
}

.lookup-row {
  display: flex;
  gap: 12px;
}

.input-lg {
  flex: 1;
  padding: 10px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
}

.input-lg:focus {
  border-color: #1a5276;
  outline: none;
}

.cow-info {
  margin: 12px 0 0;
  color: #0e6655;
  font-weight: 600;
  font-size: 0.95rem;
}

.btn-primary {
  padding: 10px 24px;
  background: #1a5276;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.daily-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.full-width {
  grid-column: 1 / -1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #555;
  text-transform: uppercase;
}

.form-group input,
.form-group textarea {
  padding: 8px 10px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #1a5276;
  outline: none;
}

.form-group textarea {
  resize: vertical;
}

.save-btn {
  margin-top: 16px;
  width: 100%;
  background: #0e6655;
}

.message {
  margin: 12px 0 0;
  font-size: 0.9rem;
  color: #0e6655;
  font-weight: 600;
}

.message.error {
  color: #cb4335;
}

.records-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.records-table th {
  text-align: left;
  padding: 8px;
  border-bottom: 2px solid #f0f0f0;
  color: #555;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.records-table td {
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.history-card h3 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
