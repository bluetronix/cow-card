<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { db } from '../db/dexie'
import { useAuth } from '../stores/auth'
import { uploadToImgbb } from '../utils/imgbb'
import { todayISO } from '../utils/age'
import type { Cow } from '../types'
import { BREEDS, COLOURS, LACTATION_OPTIONS, PD_GROUP_OPTIONS, MASTITIS_OPTIONS, HEALTH_STATUS_OPTIONS, FEEDING_GROUPS, MILKING_GROUPS, MILKING_MAP, BARN_NAMES } from '../types'
import { showToast, formatError } from '../composables/useToast'
import PhotoEditor from '../components/PhotoEditor.vue'

const router = useRouter()
const route = useRoute()
const { currentUser, fullName } = useAuth()

const isEdit = route.name === 'EditCow'
const cowId = route.params.id as string

const currentStep = ref(1)
const saving = ref(false)
const imageFile = ref<File | null>(null)
const imagePreview = ref('')
const showPhotoEditor = ref(false)
const collarNoError = ref('')
const collarNoDupCow = ref('')

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
  dam_breed: '',
  sire_id: '',
  sire_breed: '',
  lactations: 0,
  calving_date: '',
  pd_date: '',
  pd_group: '',
  pregnancy_result: 'Open',
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
  vet_recommendations: '',
  feeding_group: '',
  milking_group: '',
  barn_name: '',
  housing: 'Loose Housing',
  cull_status: '-',
  abortion_count: 0,
  remarks: '',
  issued_date: todayISO(),
  issued_by: '',
  image_url: '',
  lactation_history: '',
  created_at: '',
  updated_at: '',
  current_health_status: '',
  last_checkup_date: '',
  synced: 0,
})

const form = ref<Cow>(emptyCow())
const ageDecimal = ref<number | null>(null)

function computeBirthDateFromAge() {
  if (ageDecimal.value === null || ageDecimal.value === undefined) return
  const totalMonths = Math.round(ageDecimal.value * 12)
  const today = new Date()
  today.setMonth(today.getMonth() - totalMonths)
  form.value.birth_date = today.toISOString().split('T')[0]
}

function computeAgeFromBirthDate(bd: string) {
  if (!bd) { ageDecimal.value = null; return }
  const birth = new Date(bd)
  const today = new Date()
  const diffMonths = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth())
  ageDecimal.value = Math.round((diffMonths / 12) * 10) / 10
}

function onAgeInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  ageDecimal.value = val === '' ? null : parseFloat(val)
  computeBirthDateFromAge()
}

async function generateIdNo(): Promise<string> {
  const all = await db.cows.toArray()
  const nums = all.map(c => {
    const n = parseInt(c.id_no, 10)
    return isNaN(n) ? 0 : n
  })
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return String(max + 1).padStart(4, '0')
}

onMounted(async () => {
  if (isEdit && cowId) {
    const existing = await db.cows.get(cowId)
    if (existing) {
      form.value = existing
      imagePreview.value = existing.image_url
      computeAgeFromBirthDate(existing.birth_date)
      await computeMilkStatsFromRecords()
    }
  } else {
    form.value.issued_by = fullName.value || currentUser.value || ''
    form.value.id_no = await generateIdNo()
  }
})

const GESTATION_DAYS = 280
const DRY_PERIOD_DAYS = 60

function computeProjected305() {
  if (form.value.current_daily_milk_yield > 0 && form.value.sex === 'Female') {
    form.value.projected_305d_milk_yield = Math.round(form.value.current_daily_milk_yield * 305 * 10) / 10
  } else {
    form.value.projected_305d_milk_yield = 0
  }
}

async function computeMilkStatsFromRecords() {
  if (!form.value.id || form.value.sex !== 'Female') return
  try {
    const records = await db.dailyRecords
      .where('cow_id').equals(form.value.id)
      .toArray()
    if (records.length === 0) return
    const totals = records.map(r => r.milk_yield_total).filter(t => t > 0)
    if (totals.length > 0) {
      form.value.total_lactation_yield = Math.round(totals.reduce((a, b) => a + b, 0) * 10) / 10
      form.value.peak_milk_yield = Math.round(Math.max(...totals) * 10) / 10
    }
    const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const latest = sorted[0]
    if (latest && latest.milk_yield_total > 0) {
      form.value.current_daily_milk_yield = latest.milk_yield_total
      computeProjected305()
    }
  } catch { /* table may not exist */ }
}

function predictDates() {
  const pregnant = form.value.pregnancy_result === 'Pregnant'
  const aiDate = form.value.ai_service_date
  if (!pregnant || !aiDate) return
  const ai = new Date(aiDate)
  if (isNaN(ai.getTime())) return
  if (!form.value.expected_calving_date) {
    const calving = new Date(ai)
    calving.setDate(calving.getDate() + GESTATION_DAYS)
    form.value.expected_calving_date = calving.toISOString().split('T')[0]
  }
  if (!form.value.expected_dry_off_date && form.value.expected_calving_date) {
    const calving = new Date(form.value.expected_calving_date)
    calving.setDate(calving.getDate() - DRY_PERIOD_DAYS)
    form.value.expected_dry_off_date = calving.toISOString().split('T')[0]
  } else if (!form.value.expected_dry_off_date) {
    const calving = new Date(ai)
    calving.setDate(calving.getDate() + GESTATION_DAYS - DRY_PERIOD_DAYS)
    form.value.expected_dry_off_date = calving.toISOString().split('T')[0]
  }
}

function clearPredicted() {
  const pregnant = form.value.pregnancy_result === 'Pregnant'
  const aiDate = form.value.ai_service_date
  if (pregnant || !aiDate) return
  const ai = new Date(aiDate)
  if (isNaN(ai.getTime())) return
  const predictedCalving = new Date(ai)
  predictedCalving.setDate(predictedCalving.getDate() + GESTATION_DAYS)
  const predictedCalvingStr = predictedCalving.toISOString().split('T')[0]
  const predictedDry = new Date(ai)
  predictedDry.setDate(predictedDry.getDate() + GESTATION_DAYS - DRY_PERIOD_DAYS)
  const predictedDryStr = predictedDry.toISOString().split('T')[0]
  if (form.value.expected_calving_date === predictedCalvingStr) {
    form.value.expected_calving_date = ''
  }
  if (form.value.expected_dry_off_date === predictedDryStr) {
    form.value.expected_dry_off_date = ''
  }
}

watch(() => form.value.ai_service_date, () => {
  predictDates()
})

watch(() => form.value.pregnancy_result, (val) => {
  if (val === 'Pregnant') {
    predictDates()
  } else {
    clearPredicted()
  }
})

watch(() => form.value.current_daily_milk_yield, () => {
  computeProjected305()
})

watch(() => form.value.calving_date, (val) => {
  if (val) {
    const calving = new Date(val)
    if (!isNaN(calving.getTime())) {
      const diff = new Date().getTime() - calving.getTime()
      form.value.days_in_milk = Math.max(0, Math.floor(diff / 86400000))
    }
  } else {
    form.value.days_in_milk = 0
  }
})

watch(() => form.value.sex, () => {
  if (form.value.sex !== 'Female') {
    form.value.days_in_milk = 0
    form.value.peak_milk_yield = 0
    form.value.current_daily_milk_yield = 0
    form.value.total_lactation_yield = 0
    form.value.fat_percent = 0
    form.value.protein_percent = 0
    form.value.projected_305d_milk_yield = 0
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

function openPhotoEditor() {
  showPhotoEditor.value = true
}

function handlePhotoCrop(croppedFile: File) {
  imageFile.value = croppedFile
  imagePreview.value = URL.createObjectURL(croppedFile)
  showPhotoEditor.value = false
}

function handlePhotoCancel() {
  showPhotoEditor.value = false
}

function handlePhotoRemove() {
  showPhotoEditor.value = false
  imageFile.value = null
  imagePreview.value = ''
  form.value.image_url = ''
}

async function checkCollarNo() {
  collarNoError.value = ''
  collarNoDupCow.value = ''
  const val = form.value.collar_no?.trim()
  if (!val) return
  const dup = await db.cows.filter(c => c.collar_no === val && c.id !== form.value.id).toArray()
  if (dup.length > 0) {
    collarNoError.value = `Collar No "${val}" already assigned to ${dup[0].id_no || dup[0].tag || dup[0].name || 'another cow'}`
    collarNoDupCow.value = dup[0].id
  }
}

async function saveStep() {
  if (!form.value.id) {
    form.value.id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    form.value.user_id = currentUser.value || ''
    form.value.created_at = new Date().toISOString()
  }
  form.value.updated_at = new Date().toISOString()
  form.value.issued_by = fullName.value || currentUser.value || ''

  await checkCollarNo()
  if (collarNoError.value) return

  if (imageFile.value) {
    try {
      form.value.image_url = await uploadToImgbb(imageFile.value)
    } catch {
      showToast('Image upload failed. Using local preview.', 'warning')
    }
  }

  form.value.synced = 0
  const plainCow = JSON.parse(JSON.stringify(form.value))
  await db.cows.put(plainCow)
}

async function nextStep() {
  saving.value = true
  try {
    await saveStep()
    if (currentStep.value < 5) {
      currentStep.value++
    }
  } catch (e) {
    showToast(formatError(e, 'Failed to save cow. Please try again.'), 'error')
  } finally {
    saving.value = false
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
    showToast(isEdit ? 'Cow updated successfully' : 'Cow registered successfully', 'success')
    router.push('/cows')
  } catch (e) {
    showToast(formatError(e, 'Failed to save cow. Please try again.'), 'error')
  } finally {
    saving.value = false
  }
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
            <div class="image-preview" @click="openPhotoEditor">
              <img v-if="imagePreview" :src="imagePreview" alt="Preview" />
              <span v-else>Click to add photo</span>
              <div class="preview-overlay">
                <span class="camera-icon">📷</span>
              </div>
            </div>
          </div>
          <div class="form-group"><label>Card Number <!-- column: id_no --></label><input v-model="form.id_no" type="text" disabled /></div>
          <div class="form-group"><label>Tag</label><input v-model="form.tag" type="text" /></div>
          <div class="form-group"><label>Collar No</label><input v-model="form.collar_no" type="text" @blur="checkCollarNo" placeholder="Unique per cow" /><span v-if="collarNoError" class="field-error">{{ collarNoError }}</span></div>
          <div class="form-group"><label>Name</label><input v-model="form.name" type="text" /></div>
          <div class="form-group">
            <label>Sex</label>
            <select v-model="form.sex">
              <option value="">— Select —</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>
          </div>
          <div class="form-group">
            <label>Breed / Type <!-- column: breed --></label>
            <select v-model="form.breed">
              <option value="">— Select —</option>
              <option v-for="b in BREEDS" :key="b" :value="b">{{ b }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Colour <!-- column: colour --></label>
            <select v-model="form.colour">
              <option value="">— Select —</option>
              <option v-for="c in COLOURS" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div class="form-group"><label>Origin</label><input v-model="form.origin" type="text" /></div>
          <div class="form-group"><label>Age (Years)</label><input :value="ageDecimal ?? ''" type="number" step="0.1" min="0" placeholder="e.g. 3.5" @input="onAgeInput" /></div>
          <div class="form-group"><label>Birth Date</label><input v-model="form.birth_date" type="date" @change="computeAgeFromBirthDate(form.birth_date)" /></div>
          <div class="form-group"><label>Group</label><input v-model="form.group_name" type="text" /></div>
        </div>

        <!-- Step 2: Breeding & Reproduction -->
        <div v-if="currentStep === 2" class="fields-grid">
          <div class="form-group"><label>Dam ID <!-- column: dam_id --></label><input v-model="form.dam_id" type="text" placeholder="tag-DOB (e.g. 1296-2023-07-02)" /></div>
          <div class="form-group">
            <label>Dam Breed <!-- column: dam_breed --></label>
            <select v-model="form.dam_breed">
              <option value="">— Select —</option>
              <option v-for="b in BREEDS" :key="b" :value="b">{{ b }}</option>
            </select>
          </div>
          <div class="form-group"><label>Sire ID <!-- column: sire_id (was bull_name) --></label><input v-model="form.sire_id" type="text" placeholder="tag-DOB (e.g. 1296-2023-07-02)" /></div>
          <div class="form-group">
            <label>Sire Breed <!-- column: sire_breed --></label>
            <select v-model="form.sire_breed">
              <option value="">— Select —</option>
              <option v-for="b in BREEDS" :key="b" :value="b">{{ b }}</option>
            </select>
          </div>
          <template v-if="form.sex === 'Female'">
            <div class="form-group">
              <label>Lactations <!-- column: lactations --></label>
              <select v-model.number="form.lactations">
                <option :value="0">— Select —</option>
                <option v-for="n in LACTATION_OPTIONS" :key="n" :value="n">{{ n }}</option>
              </select>
            </div>
            <div class="form-group"><label>Calving Date</label><input v-model="form.calving_date" type="date" /></div>
            <div class="form-group"><label>PD (Pregnancy Diagnosis) Date</label><input v-model="form.pd_date" type="date" /></div>
            <div class="form-group">
              <label>PD Group <!-- column: pd_group --></label>
              <select v-model="form.pd_group">
                <option value="">— Select —</option>
                <option v-for="g in PD_GROUP_OPTIONS" :key="g" :value="g">{{ g }}</option>
              </select>
            </div>
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
          <div class="form-group">
            <label>Mastitis History <!-- column: mastitis_history --></label>
            <select v-model="form.mastitis_history">
              <option value="">— Select —</option>
              <option v-for="m in MASTITIS_OPTIONS" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <div class="form-group"><label>Dead Qtr-Teat</label><input v-model="form.dead_qtr_teat" type="text" placeholder="e.g. RR Front" /></div>
          <div class="form-group full-width"><label>Medical Records</label><textarea v-model="form.medical_records" rows="4"></textarea></div>
          <div class="form-group full-width"><label>Doctor Recommendations <!-- column: vet_recommendations --></label><textarea v-model="form.vet_recommendations" rows="3" placeholder="Vet notes, treatment plans, follow-up recommendations"></textarea></div>
          <div class="form-group">
            <label>Health Status <!-- column: current_health_status --></label>
            <select v-model="form.current_health_status">
              <option value="">— None —</option>
              <option v-for="h in HEALTH_STATUS_OPTIONS" :key="h" :value="h">{{ h }}</option>
            </select>
          </div>
          <div class="form-group"><label>Last Checkup Date</label><input v-model="form.last_checkup_date" type="date" /></div>
          <div class="form-group"><label>Abortions Count <!-- column: abortion_count --></label><input v-model.number="form.abortion_count" type="number" min="0" /></div>
        </div>

        <!-- Step 4: Milk Production -->
        <div v-if="currentStep === 4" class="fields-grid">
          <template v-if="form.sex === 'Female'">
            <div class="form-group"><label>Days in Milk</label><input v-model.number="form.days_in_milk" type="number" min="0" /></div>
            <div class="form-group">
              <label>Peak Milk Yield (L) <span class="auto-badge">auto</span></label>
              <input v-model.number="form.peak_milk_yield" type="number" step="0.1" min="0" />
            </div>
            <div class="form-group">
              <label>Current Daily Milk Yield (L) <span class="auto-badge">auto</span></label>
              <input v-model.number="form.current_daily_milk_yield" type="number" step="0.1" min="0" />
            </div>
            <div class="form-group">
              <label>Total Lactation Yield (L) <span class="auto-badge">auto</span></label>
              <input v-model.number="form.total_lactation_yield" type="number" step="0.1" min="0" />
            </div>
            <div class="form-group"><label>Fat % (Last Test)</label><input v-model.number="form.fat_percent" type="number" step="0.1" min="0" /></div>
            <div class="form-group"><label>Protein % (Last Test)</label><input v-model.number="form.protein_percent" type="number" step="0.1" min="0" /></div>
            <div class="form-group">
              <label>305-Day Projected (L) <span class="auto-badge">auto</span></label>
              <input v-model.number="form.projected_305d_milk_yield" type="number" step="0.1" min="0" />
            </div>
          </template>
          <div v-if="form.sex === 'Male'" class="full-width sex-notice">
            ⚠️ Milk production tracking is only for female cows.
          </div>
        </div>

        <!-- Step 5: Issuance & Scoring -->
        <div v-if="currentStep === 5" class="fields-grid">
          <div class="form-group"><label>Body Condition Score (1-5)</label><input v-model.number="form.body_condition_score" type="number" step="0.25" min="1" max="5" /></div>
          <div class="form-group">
            <label>Feeding Group</label>
            <select v-model="form.feeding_group" @change="form.milking_group = MILKING_MAP[form.feeding_group] || ''">
              <option value="">— Select —</option>
              <option v-for="g in FEEDING_GROUPS" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Milking Group</label>
            <select v-model="form.milking_group">
              <option value="">— Select —</option>
              <option v-for="g in MILKING_GROUPS" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Barn Name <!-- column: barn_name (was pen_barn_no) --></label>
            <select v-model="form.barn_name">
              <option value="">— Select —</option>
              <option v-for="b in BARN_NAMES" :key="b" :value="b">{{ b }}</option>
            </select>
          </div>
          <div class="form-group"><label>Housing</label><input v-model="form.housing" type="text" placeholder="e.g. Free Stall" /></div>
          <div class="form-group">
            <label>Cull Status <!-- column: cull_status --></label>
            <select v-model="form.cull_status">
              <option value="-">-</option>
              <option value="+">+</option>
            </select>
          </div>
          <div class="form-group"><label>Quarter / Teat Status</label><input v-model="form.quarter_teat_status" type="text" placeholder="e.g. All OK" /></div>
          <div class="form-group full-width"><label>Remarks / Notes</label><textarea v-model="form.remarks" rows="3"></textarea></div>
          <div class="form-group"><label>Issued Date</label><input v-model="form.issued_date" type="date" /></div>
          <div class="form-group"><label>Issued By</label><input v-model="form.issued_by" type="text" /></div>
        </div>
      </div>

      <div class="step-actions">
        <button v-if="currentStep > 1" class="btn-secondary" @click="prevStep">← Previous</button>
        <div class="flex-grow"></div>
        <button v-if="currentStep < 5" class="btn-primary" :style="{ background: currentStepData?.color }" :disabled="saving" @click="nextStep">
          {{ saving ? '⏳ Saving...' : 'Next →' }}
        </button>
        <button v-else class="btn-primary" style="background: #0e6655" :disabled="saving" @click="submitForm">
          {{ saving ? 'Saving...' : isEdit ? 'Update & Finish' : 'Save & Finish' }}
        </button>
      </div>
    </div>
  </div>

  <PhotoEditor
    v-if="showPhotoEditor"
    :image-src="imagePreview || ''"
    :has-existing-image="!!form.image_url"
    @crop="handlePhotoCrop"
    @cancel="handlePhotoCancel"
    @remove="handlePhotoRemove"
  />
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
  position: relative;
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

.preview-overlay {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}
.image-preview:hover .preview-overlay { opacity: 1; }
.preview-overlay .camera-icon { font-size: 1rem; }

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
  color: #666;
}

.auto-badge {
  display: inline-block;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #059669;
  color: #fff;
  padding: 1px 6px;
  border-radius: 4px;
  vertical-align: middle;
  margin-left: 4px;
}

.field-error {
  display: block; font-size: 0.75rem; color: #d62828; margin-top: 3px; font-weight: 600;
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

@media (max-width: 640px) {
  .form-header {
    padding: 12px 16px;
  }
  .form-header h1 {
    font-size: 1.1rem;
  }
  .stepper {
    gap: 2px;
    padding: 16px 12px 0;
  }
  .step-label {
    display: none;
  }
  .step-circle {
    width: 26px;
    height: 26px;
    font-size: 0.8rem;
  }
  .form-card {
    margin: 12px;
    border-radius: 12px;
  }
  .step-body {
    padding: 12px;
  }
  .fields-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 10px 12px;
    font-size: 16px;
  }
  .image-preview {
    width: 120px;
    height: 120px;
  }
  .step-header {
    padding: 12px 16px;
  }
  .step-header h2 {
    font-size: 0.95rem;
  }
  .step-actions {
    padding: 12px;
    flex-wrap: wrap;
  }
  .step-actions .btn-primary,
  .step-actions .btn-secondary {
    flex: 1;
    text-align: center;
    padding: 12px 16px;
  }
}
</style>
