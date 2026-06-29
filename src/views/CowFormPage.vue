<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { db } from '../db/dexie'
import { useAuth } from '../stores/auth'
import { uploadToImgbb } from '../utils/imgbb'
import { todayISO } from '../utils/age'
import type { Cow } from '../types'

const router = useRouter()
const route = useRoute()
const { currentUser, fullName } = useAuth()

const isEdit = route.name === 'EditCow'
const cowId = route.params.id as string

const currentStep = ref(1)
const saving = ref(false)
const imageFile = ref<File | null>(null)
const imagePreview = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function openFileInput() {
  fileInput.value?.click()
}

const emptyCow = (): Cow => ({
  id: '',
  user_id: '',
  id_no: '',
  tag: '',
  collar_no: '',
  rfid_no: '',
  name: '',
  sex: '',
  breed: '',
  colour: '',
  origin: '',
  birth_date: '',
  group_name: '',
  dam_id: '',
  bull_name: '',
  lactations: 0,
  calving_date: '',
  pd_date: '',
  pd_group: '',
  pregnancy_result: '',
  ai_service_date: '',
  expected_dry_off_date: '',
  expected_calving_date: '',
  days_in_milk: 0,
  peak_milk_yield: 0,
  current_daily_milk_yield: 0,
  total_lactation_yield: 0,
  fat_percent: 0,
  protein_percent: 0,
  projected_305d_milk_yield: 0,
  vaccinations: '',
  deworming_dates: '',
  mastitis_history: '',
  body_condition_score: 0,
  dead_qtr_teat: '',
  quarter_teat_status: '',
  medical_records: '',
  feeding_group: '',
  milking_group: '',
  pen_barn_no: '',
  housing: '',
  remarks: '',
  issued_date: todayISO(),
  issued_by: '',
  image_url: '',
  created_at: '',
  updated_at: '',
  synced: 0,
})

const form = ref<Cow>(emptyCow())

onMounted(async () => {
  if (isEdit && cowId) {
    const existing = await db.cows.get(cowId)
    if (existing) {
      form.value = existing
      imagePreview.value = existing.image_url
    }
  } else {
    form.value.issued_by = fullName.value || currentUser.value || ''
  }
})

const steps = [
  { num: 1, title: 'Identity & General', color: '#1a5276', icon: '🐄' },
  { num: 2, title: 'Breeding & Reproduction', color: '#0e6655', icon: '🧬' },
  { num: 3, title: 'Health & Medical', color: '#cb4335', icon: '💉' },
  { num: 4, title: 'Milk Production', color: '#b7950b', icon: '🥛' },
  { num: 5, title: 'Issuance & Scoring', color: '#6c3483', icon: '📝' },
]

const currentStepData = computed(() => steps.find(s => s.num === currentStep.value))

async function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    imageFile.value = input.files[0]
    const reader = new FileReader()
    reader.onload = e => {
      imagePreview.value = e.target?.result as string
    }
    reader.readAsDataURL(input.files[0])
  }
}

async function saveStep() {
  if (!form.value.id) {
    form.value.id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    form.value.user_id = currentUser.value || ''
    form.value.created_at = new Date().toISOString()
  }
  form.value.updated_at = new Date().toISOString()

  if (imageFile.value) {
    try {
      form.value.image_url = await uploadToImgbb(imageFile.value)
    } catch {
      // keep local preview if upload fails
    }
  }

  const plainCow = JSON.parse(JSON.stringify(form.value))
  await db.cows.put(plainCow)
}

async function nextStep() {
  await saveStep()
  if (currentStep.value < 5) {
    currentStep.value++
  }
}

async function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

async function submitForm() {
  saving.value = true
  try {
    await saveStep()
    router.push('/daily?cow=' + form.value.id)
  } finally {
    saving.value = false
  }
}

function getAgeDisplay(): string {
  if (!form.value.birth_date) return ''
  const birth = new Date(form.value.birth_date)
  const today = new Date()
  let years = today.getFullYear() - birth.getFullYear()
  let months = today.getMonth() - birth.getMonth()
  if (months < 0) { years--; months += 12 }
  return `${years}y ${months}m`
}
</script>

<template>
  <div class="form-page">
    <header class="form-header">
      <button class="btn-back" @click="router.push('/')">← Dashboard</button>
      <h1>{{ isEdit ? 'Edit Cow' : 'New Cow Registration' }}</h1>
    </header>

    <div class="stepper">
      <div
        v-for="step in steps"
        :key="step.num"
        class="step-indicator"
        :class="{ active: currentStep === step.num, completed: currentStep > step.num }"
        :style="{ '--step-color': step.color }"
        @click="currentStep = step.num"
      >
        <div class="step-circle">{{ currentStep > step.num ? '✓' : step.num }}</div>
        <span class="step-label">{{ step.title }}</span>
      </div>
    </div>

    <div class="form-card" :style="{ borderTopColor: currentStepData?.color }">
      <div class="step-header" :style="{ background: currentStepData?.color }">
        <span class="step-icon">{{ currentStepData?.icon }}</span>
        <h2>{{ currentStepData?.title }}</h2>
      </div>

      <div class="step-body">
        <!-- Step 1: Identity & General -->
        <div v-if="currentStep === 1" class="fields-grid">
          <div class="image-upload-section">
            <div class="image-preview" @click="openFileInput">
              <img v-if="imagePreview" :src="imagePreview" alt="Preview" />
              <span v-else>Click to add photo</span>
            </div>
            <input ref="fileInput" type="file" accept="image/*" hidden @change="handleImageUpload" />
          </div>
          <div class="form-group"><label>ID No</label><input v-model="form.id_no" type="text" /></div>
          <div class="form-group"><label>Tag</label><input v-model="form.tag" type="text" /></div>
          <div class="form-group"><label>Collar No</label><input v-model="form.collar_no" type="text" /></div>
          <div class="form-group"><label>RFID No</label><input v-model="form.rfid_no" type="text" /></div>
          <div class="form-group"><label>Name</label><input v-model="form.name" type="text" /></div>
          <div class="form-group">
            <label>Sex</label>
            <select v-model="form.sex">
              <option value="">— Select —</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>
          </div>
          <div class="form-group"><label>Breed / Type</label><input v-model="form.breed" type="text" /></div>
          <div class="form-group"><label>Colour</label><input v-model="form.colour" type="text" /></div>
          <div class="form-group"><label>Origin</label><input v-model="form.origin" type="text" /></div>
          <div class="form-group"><label>Birth Date</label><input v-model="form.birth_date" type="date" /></div>
          <div class="form-group"><label>Age (auto)</label><input :value="getAgeDisplay()" disabled /></div>
          <div class="form-group"><label>Group</label><input v-model="form.group_name" type="text" /></div>
        </div>

        <!-- Step 2: Breeding & Reproduction -->
        <div v-if="currentStep === 2" class="fields-grid">
          <div class="form-group"><label>Dam (Mother ID)</label><input v-model="form.dam_id" type="text" /></div>
          <div class="form-group"><label>Bull Name</label><input v-model="form.bull_name" type="text" /></div>
          <template v-if="form.sex === 'Female'">
            <div class="form-group"><label>Lactations</label><input v-model.number="form.lactations" type="number" min="0" /></div>
            <div class="form-group"><label>Calving Date</label><input v-model="form.calving_date" type="date" /></div>
            <div class="form-group"><label>PD (Pregnancy Diagnosis) Date</label><input v-model="form.pd_date" type="date" /></div>
            <div class="form-group"><label>PD Group</label><input v-model="form.pd_group" type="text" placeholder="e.g. PG (60-90 DIM)" /></div>
            <div class="form-group">
              <label>Pregnancy Result</label>
              <select v-model="form.pregnancy_result">
                <option value="">— Select —</option>
                <option value="Pregnant">Pregnant</option>
                <option value="Open">Open</option>
              </select>
            </div>
            <div class="form-group"><label>Expected Dry-off Date</label><input v-model="form.expected_dry_off_date" type="date" /></div>
            <div class="form-group"><label>AI / Service Date</label><input v-model="form.ai_service_date" type="date" /></div>
            <div class="form-group"><label>Expected Calving Date</label><input v-model="form.expected_calving_date" type="date" /></div>
          </template>
          <div v-if="form.sex === 'Male'" class="full-width sex-notice">
            ⚠️ Breeding & reproduction fields are only relevant for females.
          </div>
        </div>

        <!-- Step 3: Health & Medical -->
        <div v-if="currentStep === 3" class="fields-grid">
          <div class="form-group full-width"><label>Vaccinations</label><textarea v-model="form.vaccinations" rows="3"></textarea></div>
          <div class="form-group full-width"><label>Deworming Dates</label><textarea v-model="form.deworming_dates" rows="3" placeholder="List dates and treatments"></textarea></div>
          <div class="form-group full-width"><label>Mastitis History</label><textarea v-model="form.mastitis_history" rows="3" placeholder="Dates, quarters affected, treatment"></textarea></div>
          <div class="form-group"><label>Dead Qtr-Teat</label><input v-model="form.dead_qtr_teat" type="text" placeholder="e.g. RR Front" /></div>
          <div class="form-group full-width"><label>Medical Records</label><textarea v-model="form.medical_records" rows="4"></textarea></div>
        </div>

        <!-- Step 4: Milk Production -->
        <div v-if="currentStep === 4" class="fields-grid">
          <template v-if="form.sex === 'Female'">
            <div class="form-group"><label>Days in Milk</label><input v-model.number="form.days_in_milk" type="number" min="0" /></div>
            <div class="form-group"><label>Peak Milk Yield (L)</label><input v-model.number="form.peak_milk_yield" type="number" step="0.1" min="0" /></div>
            <div class="form-group"><label>Current Daily Milk Yield (L)</label><input v-model.number="form.current_daily_milk_yield" type="number" step="0.1" min="0" /></div>
            <div class="form-group"><label>Total Lactation Yield (L)</label><input v-model.number="form.total_lactation_yield" type="number" step="0.1" min="0" /></div>
            <div class="form-group"><label>Fat % (Last Test)</label><input v-model.number="form.fat_percent" type="number" step="0.1" min="0" /></div>
            <div class="form-group"><label>Protein % (Last Test)</label><input v-model.number="form.protein_percent" type="number" step="0.1" min="0" /></div>
            <div class="form-group"><label>305-Day Projected Yield (L)</label><input v-model.number="form.projected_305d_milk_yield" type="number" step="0.1" min="0" /></div>
          </template>
          <div v-if="form.sex === 'Male'" class="full-width sex-notice">
            ⚠️ Milk production tracking is only for female cows.
          </div>
        </div>

        <!-- Step 5: Issuance & Scoring -->
        <div v-if="currentStep === 5" class="fields-grid">
          <div class="form-group"><label>Body Condition Score (1-5)</label><input v-model.number="form.body_condition_score" type="number" step="0.25" min="1" max="5" /></div>
          <div class="form-group"><label>Feeding Group</label><input v-model="form.feeding_group" type="text" /></div>
          <div class="form-group"><label>Milking Group</label><input v-model="form.milking_group" type="text" /></div>
          <div class="form-group"><label>Pen / Barn No</label><input v-model="form.pen_barn_no" type="text" /></div>
          <div class="form-group"><label>Housing</label><input v-model="form.housing" type="text" placeholder="e.g. Free Stall" /></div>
          <div class="form-group"><label>Quarter / Teat Status</label><input v-model="form.quarter_teat_status" type="text" placeholder="e.g. All OK" /></div>
          <div class="form-group full-width"><label>Remarks / Notes</label><textarea v-model="form.remarks" rows="3"></textarea></div>
          <div class="form-group"><label>Issued Date</label><input v-model="form.issued_date" type="date" /></div>
          <div class="form-group"><label>Issued By</label><input v-model="form.issued_by" type="text" /></div>
        </div>
      </div>

      <div class="step-actions">
        <button v-if="currentStep > 1" class="btn-secondary" @click="prevStep">← Previous</button>
        <div class="flex-grow"></div>
        <button v-if="currentStep < 5" class="btn-primary" :style="{ background: currentStepData?.color }" @click="nextStep">
          Next →
        </button>
        <button v-else class="btn-primary" style="background: #0e6655" :disabled="saving" @click="submitForm">
          {{ saving ? 'Saving...' : isEdit ? 'Update & Finish' : 'Save & Go to Daily' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 40px;
}

.form-header {
  background: #fff;
  padding: 20px 32px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.form-header h1 {
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

.stepper {
  display: flex;
  justify-content: center;
  gap: 4px;
  padding: 24px 32px 0;
  max-width: 800px;
  margin: 0 auto;
}

.step-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  flex: 1;
}

.step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  background: #e0e0e0;
  color: #999;
  transition: all 0.3s;
}

.step-indicator.active .step-circle {
  background: var(--step-color);
  color: #fff;
}

.step-indicator.completed .step-circle {
  background: #0e6655;
  color: #fff;
}

.step-label {
  font-size: 0.7rem;
  text-align: center;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.step-indicator.active .step-label {
  color: var(--step-color);
  font-weight: 600;
}

.form-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  max-width: 800px;
  margin: 20px auto 0;
  overflow: hidden;
  border-top: 4px solid #1a5276;
}

.step-header {
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-icon {
  font-size: 1.5rem;
}

.step-header h2 {
  margin: 0;
  color: #fff;
  font-size: 1.1rem;
}

.step-body {
  padding: 24px;
}

.fields-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.full-width {
  grid-column: 1 / -1;
}

.sex-notice {
  padding: 16px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  color: #856404;
  font-size: 0.9rem;
  text-align: center;
}

.image-upload-section {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.image-preview {
  width: 160px;
  height: 160px;
  border: 2px dashed #ccc;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  background: #fafafa;
  color: #999;
  font-size: 0.85rem;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  letter-spacing: 0.3px;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 8px 10px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: #1a5276;
  outline: none;
}

.form-group textarea {
  resize: vertical;
}

.form-group input:disabled {
  background: #f5f5f5;
  color: #999;
}

.step-actions {
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-top: 1px solid #f0f0f0;
}

.flex-grow {
  flex: 1;
}

.btn-primary {
  padding: 10px 24px;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 10px 24px;
  background: #fff;
  color: #555;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: border-color 0.2s;
}

.btn-secondary:hover {
  border-color: #999;
}
</style>
