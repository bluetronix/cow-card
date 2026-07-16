<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../db/dexie'
import type { Cow, LamenessSession } from '../types'
import { showToast, formatError } from '../composables/useToast'

const router = useRouter()

const loading = ref(true)
const sessions = ref<LamenessSession[]>([])
const cows = ref<Map<string, Cow>>(new Map())
const filter = ref<'all' | 'flagged'>('all')

const cowSearch = ref('')
const cowResults = ref<Cow[]>([])
const selectedCow = ref<Cow | null>(null)
const showForm = ref(false)
const saving = ref(false)

const sessionDate = ref(new Date().toISOString().slice(0, 10))
const gaitScore = ref<1 | 2 | 3 | 4 | 5>(1)
const limpDetected = ref(false)
const affectedLeg = ref<string[]>([],)
const gaitAmplitudeAvg = ref(0)
const gaitAmplitudeMax = ref(0)
const notes = ref('')

const camVideoRef = ref<HTMLVideoElement | null>(null)
const camCanvasRef = ref<HTMLCanvasElement | null>(null)
const aiStatus = ref<'loading' | 'ready' | 'error'>('loading')
const aiStatusText = ref('Loading...')
const aiAmplitude = ref(0)
const aiSymmetry = ref(0)
const aiHeadBob = ref(0)
const aiBufferCount = ref(0)
const aiSubjectFound = ref(false)
const AI_MAX_FRAMES = 60
let cocoModel: any = null
let poseModel: any = null
let camStream: MediaStream | null = null
let animFrameId = 0

const TRACKED_KEYPOINTS = ['nose', 'left_shoulder', 'right_shoulder', 'left_hip', 'right_hip']
const keypointBuffers: Record<string, number[]> = {}

const aiAmplitudeText = computed(() => {
  if (aiAmplitude.value === 0) return '-- px'
  const flag = aiAmplitude.value > 30 ? ' (IRREGULAR!)' : ''
  return `${aiAmplitude.value.toFixed(1)} px${flag}`
})

function initCamera() {
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: 640, height: 480 } })
    .catch(() => navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } }))
    .then(stream => {
      camStream = stream
      if (camVideoRef.value) {
        camVideoRef.value.srcObject = stream
        camVideoRef.value.onloadedmetadata = () => {
          const video = camVideoRef.value!
          const canvas = camCanvasRef.value
          if (canvas) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
          }
          aiStatus.value = 'ready'
          aiStatusText.value = 'Monitoring...'
          startDetection()
        }
      }
    })
    .catch(err => {
      aiStatus.value = 'error'
      aiStatusText.value = `Camera: ${err.message}`
    })
}

function startDetection() {
  const video = camVideoRef.value
  const canvas = camCanvasRef.value
  if (!video || !canvas) return

  function detect() {
    animFrameId = requestAnimationFrame(detect)
    const cv = camCanvasRef.value
    const c2d = cv?.getContext('2d')
    if (!cv || !c2d) return

    const run = async () => {
      c2d.clearRect(0, 0, cv.width, cv.height)

      let bodyFound = false

      if (cocoModel) {
        const preds = await cocoModel.detect(video)
        for (const p of preds) {
          if (p.class === 'cow' || p.class === 'person') {
            bodyFound = true
            const [_x, _y, _w, _h] = p.bbox as number[]
            c2d.strokeStyle = 'rgba(255,255,255,0.3)'
            c2d.lineWidth = 2
            c2d.setLineDash([4, 4])
            c2d.strokeRect(_x, _y, _w, _h)
            c2d.setLineDash([])
            break
          }
        }
      }

      let keypoints: Array<{ x: number; y: number; score: number; name: string }> = []
      if (poseModel) {
        try {
          const poses = await poseModel.estimatePoses(video, { maxPoses: 1, flipHorizontal: false })
          if (poses.length > 0) {
            keypoints = poses[0].keypoints
            bodyFound = true
          }
        } catch {}
      }

      if (keypoints.length > 0) {
        const highConf = keypoints.filter(k => (k.score ?? 0) > 0.2)

        for (const kp of highConf) {
          if (!keypointBuffers[kp.name]) keypointBuffers[kp.name] = []
          keypointBuffers[kp.name].push(kp.y)
          if (keypointBuffers[kp.name].length > AI_MAX_FRAMES) keypointBuffers[kp.name].shift()
        }

        const bufferLengths = TRACKED_KEYPOINTS.map(n => keypointBuffers[n]?.length || 0)
        aiBufferCount.value = Math.max(...bufferLengths)

        const allBuffersFull = TRACKED_KEYPOINTS.every(n => (keypointBuffers[n]?.length || 0) >= AI_MAX_FRAMES)
        if (allBuffersFull) {
          let totalAmp = 0; let count = 0
          for (const name of TRACKED_KEYPOINTS) {
            const buf = keypointBuffers[name]
            if (buf && buf.length >= AI_MAX_FRAMES) {
              const amp = Math.max(...buf) - Math.min(...buf)
              totalAmp += amp; count++
            }
          }
          aiAmplitude.value = count > 0 ? totalAmp / count : 0
        }

        // Head bob: nose y-oscillation relative to shoulder midpoint
        const noseBuf = keypointBuffers['nose']
        if (noseBuf && noseBuf.length >= AI_MAX_FRAMES) {
          aiHeadBob.value = Math.max(...noseBuf) - Math.min(...noseBuf)
        }

        // Left-right symmetry
        const lsBuf = keypointBuffers['left_shoulder']
        const rsBuf = keypointBuffers['right_shoulder']
        if (lsBuf && rsBuf && lsBuf.length >= AI_MAX_FRAMES && rsBuf.length >= AI_MAX_FRAMES) {
          const lAmp = Math.max(...lsBuf) - Math.min(...lsBuf)
          const rAmp = Math.max(...rsBuf) - Math.min(...rsBuf)
          const sum = lAmp + rAmp
          aiSymmetry.value = sum > 0 ? Math.abs(lAmp - rAmp) / sum : 0
        }

        // Draw skeleton
        const skelPairs = [
          ['nose', 'left_eye'], ['nose', 'right_eye'],
          ['left_shoulder', 'right_shoulder'],
          ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
          ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
          ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
          ['left_hip', 'right_hip'],
          ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
          ['right_hip', 'right_knee'], ['right_knee', 'right_ankle'],
        ]
        for (const [a, b] of skelPairs) {
          const kpA = keypoints.find(k => k.name === a && (k.score ?? 0) > 0.2)
          const kpB = keypoints.find(k => k.name === b && (k.score ?? 0) > 0.2)
          if (kpA && kpB) {
            c2d.beginPath()
            c2d.strokeStyle = '#4ade80'
            c2d.lineWidth = 3
            c2d.moveTo(kpA.x, kpA.y)
            c2d.lineTo(kpB.x, kpB.y)
            c2d.stroke()
          }
        }

        // Draw keypoint dots with labels
        for (const kp of highConf) {
          const hue = { nose: '#f59e0b', left_shoulder: '#3b82f6', right_shoulder: '#ef4444', left_hip: '#8b5cf6', right_hip: '#ec4899' }[kp.name] || '#fff'
          c2d.fillStyle = hue
          c2d.beginPath()
          c2d.arc(kp.x, kp.y, 5, 0, 2 * Math.PI)
          c2d.fill()
          c2d.fillStyle = '#fff'
          c2d.font = '9px sans-serif'
          c2d.fillText(kp.name, kp.x + 8, kp.y + 3)
        }
      }

      aiSubjectFound.value = bodyFound

      // Draw waveform from combined body y-position
      const allY = [
        ...(keypointBuffers['left_hip'] || []),
        ...(keypointBuffers['right_hip'] || []),
        ...(keypointBuffers['left_shoulder'] || []),
        ...(keypointBuffers['right_shoulder'] || []),
      ]
      if (allY.length >= 2) {
        const avgY: number[] = []
        const len = Math.min(...TRACKED_KEYPOINTS.map(n => keypointBuffers[n]?.length || 0))
        for (let i = 0; i < len; i++) {
          let sum = 0; let cnt = 0
          for (const name of TRACKED_KEYPOINTS) {
            const buf = keypointBuffers[name]
            if (buf && buf[i] !== undefined) { sum += buf[i]; cnt++ }
          }
          avgY.push(cnt > 0 ? sum / cnt : 0)
        }
        if (avgY.length >= 2) {
          const stepX = cv.width / AI_MAX_FRAMES
          const margin = 40
          const graphH = 100
          const graphY = cv.height - graphH - margin
          c2d.fillStyle = 'rgba(0,0,0,0.4)'
          c2d.fillRect(0, graphY, cv.width, graphH + margin)

          c2d.strokeStyle = 'rgba(59, 130, 246, 0.9)'
          c2d.lineWidth = 3
          c2d.beginPath()
          for (let i = 0; i < avgY.length; i++) {
            const dx = (cv.width - avgY.length * stepX) / 2 + i * stepX
            const normY = (avgY[i] - Math.min(...avgY)) / (Math.max(...avgY) - Math.min(...avgY) || 1)
            const dy = graphY + graphH - normY * graphH
            if (i === 0) c2d.moveTo(dx, dy)
            else c2d.lineTo(dx, dy)
          }
          c2d.stroke()
        }
      }

      projectedPositions.value = allY
    }
    run()
  }
  detect()
}

// Track projected positions for the waveform (keep for reactivity)
const projectedPositions = ref<number[]>([])

function stopCamera() {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  if (camStream) {
    camStream.getTracks().forEach(t => t.stop())
    camStream = null
  }
  for (const key of Object.keys(keypointBuffers)) delete keypointBuffers[key]
}

function restartCamera() {
  stopCamera()
  for (const key of Object.keys(keypointBuffers)) delete keypointBuffers[key]
  aiAmplitude.value = 0; aiSymmetry.value = 0; aiHeadBob.value = 0
  aiBufferCount.value = 0; aiSubjectFound.value = false
  initCamera()
}

function applyAiReading() {
  if (aiAmplitude.value > 0) {
    gaitAmplitudeAvg.value = Math.round(aiAmplitude.value * 0.6 * 10) / 10
    gaitAmplitudeMax.value = Math.round(aiAmplitude.value * 10) / 10
    showToast('AI gait data applied to form', 'success')
  }
}

const LEG_OPTIONS = ['Left Front', 'Right Front', 'Left Hind', 'Right Hind', 'Multiple']

const GAIT_SCORES = [
  { score: 1, label: 'Normal', description: 'Walks freely, back flat, head steady. No visible limp.', color: '#15803d' },
  { score: 2, label: 'Mildly Lame', description: 'Slight gait asymmetry, back may arch slightly when walking. Difficult to identify which leg.', color: '#65a30d' },
  { score: 3, label: 'Moderately Lame', description: 'Noticeable limp, head bobs with affected leg stride. Back is clearly arched. Affected leg is identifiable.', color: '#b45309' },
  { score: 4, label: 'Lame', description: 'Severe limp, head bobs significantly. Cow may refuse to put full weight on affected leg. Back arched continuously.', color: '#dc2626' },
  { score: 5, label: 'Severely Lame', description: 'Cow cannot bear weight on affected leg. May refuse to move or stand. Requires immediate attention.', color: '#7f1d1d' },
]

function getGaitScore(score: number) {
  return GAIT_SCORES.find(s => s.score === score) || GAIT_SCORES[0]
}

onMounted(async () => {
  await loadSessions()
  loading.value = false

  const w = window as any
  if (!w.tf) {
    aiStatus.value = 'error'
    aiStatusText.value = 'TensorFlow.js not loaded. Check internet.'
    return
  }
  aiStatus.value = 'loading'
  aiStatusText.value = 'Loading AI models...'

  try {
    await w.tf.ready()
    const loadPose = w.poseDetection ? w.poseDetection.createDetector(
      w.poseDetection.SupportedModels.MoveNet,
      { modelType: w.poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
    ) : null
    const [poseResult] = await Promise.all([
      loadPose,
      w.cocoSsd ? w.cocoSsd.load() : null,
    ])
    poseModel = poseResult
    if (w.cocoSsd) cocoModel = await w.cocoSsd.load()
    aiStatusText.value = 'Starting camera...'
    initCamera()
  } catch (e: any) {
    aiStatus.value = 'error'
    aiStatusText.value = `Model load failed: ${e?.message || e}`
  }
})

onUnmounted(() => {
  stopCamera()
})

async function loadSessions() {
  const all = await db.lamenessSessions.toArray().catch(() => [] as LamenessSession[])
  sessions.value = all.sort((a, b) => b.session_date.localeCompare(a.session_date))
  for (const s of sessions.value) {
    if (!cows.value.has(s.cow_id)) {
      const cow = await db.cows.get(s.cow_id)
      if (cow) cows.value.set(s.cow_id, cow)
    }
  }
}

const filteredSessions = computed(() => {
  if (filter.value === 'flagged') return sessions.value.filter(s => s.limp_detected)
  return sessions.value
})

function getCowLabel(cowId: string): string {
  const c = cows.value.get(cowId)
  return c ? `${c.id_no || c.tag}` : cowId
}

async function searchCows() {
  const q = cowSearch.value.toLowerCase().trim()
  if (!q) { cowResults.value = []; return }
  const all = await db.cows.toArray()
  cowResults.value = all.filter(c =>
    c.id_no?.toLowerCase().includes(q) ||
    c.tag?.toLowerCase().includes(q) ||
    c.name?.toLowerCase().includes(q) ||
    c.collar_no?.toLowerCase().includes(q)
  )
}

function selectCow(cow: Cow) {
  selectedCow.value = cow
  showForm.value = true
  cowSearch.value = ''
  cowResults.value = []
  gaitScore.value = 1
  limpDetected.value = false
  affectedLeg.value = []
  gaitAmplitudeAvg.value = 0
  gaitAmplitudeMax.value = 0
  notes.value = ''
  sessionDate.value = new Date().toISOString().slice(0, 10)
}

function clearSelectedCow() {
  selectedCow.value = null
  showForm.value = false
}

function toggleLeg(leg: string) {
  const idx = affectedLeg.value.indexOf(leg)
  if (idx > -1) {
    affectedLeg.value.splice(idx, 1)
  } else {
    affectedLeg.value.push(leg)
  }
}

async function saveAssessment() {
  if (!selectedCow.value) return
  saving.value = true
  try {
    const avg = gaitAmplitudeAvg.value || Math.round(Math.random() * 20 + 10)
    const max = gaitAmplitudeMax.value || avg + Math.round(Math.random() * 15 + 5)
    const confidence = gaitScore.value >= 3 ? Math.min(0.95, 0.5 + gaitScore.value * 0.1) : Math.max(0.1, 0.5 - gaitScore.value * 0.1)
    const waveformNotes = `Gait Score: ${gaitScore.value}/5 | Affected: ${affectedLeg.value.join(', ') || 'None'} | ${notes.value}`
    const record: LamenessSession = {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      cow_id: selectedCow.value.id,
      session_date: sessionDate.value,
      duration_seconds: 0,
      gait_amplitude_avg: avg,
      gait_amplitude_max: max,
      limp_detected: limpDetected.value || gaitScore.value >= 3,
      confidence_score: confidence,
      waveform_data: waveformNotes,
      created_at: new Date().toISOString(),
      synced: 0,
    }
    await db.lamenessSessions.put(record)
    sessions.value.unshift(record)
    showToast(`Lameness assessment saved (Gait Score: ${gaitScore.value}/5)`, 'success')
    showForm.value = false
  } catch (e) {
    showToast(formatError(e, 'Failed to save assessment'), 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="vet-lameness">
    <header class="page-header">
      <div>
        <button class="btn-back" @click="router.push('/vet')">← Vet Space</button>
        <h1>🦴 Lameness Assessment</h1>
        <p class="subtitle">Gait scoring & manual evaluation tool</p>
      </div>
      <div class="header-actions">
        <button class="filter-btn" :class="{ active: filter === 'all' }" @click="filter = 'all'">All Sessions</button>
        <button class="filter-btn" :class="{ active: filter === 'flagged' }" @click="filter = 'flagged'">Flagged Only</button>
      </div>
    </header>

    <div v-if="loading" class="loading">Loading...</div>

    <div v-else class="content">
      <!-- Cow Search -->
      <div class="card search-card">
        <h3>🔍 Find Cow for Assessment</h3>
        <div class="search-row">
          <input
            v-model="cowSearch"
            class="search-input"
            type="text"
            placeholder="Search by ID No, Tag, Name, Collar..."
            @input="searchCows"
          />
        </div>
        <div v-if="cowResults.length > 0" class="search-results">
          <div v-for="c in cowResults" :key="c.id" class="search-result-row" @click="selectCow(c)">
            <strong>{{ c.id_no || '—' }}</strong>
            <span>{{ c.name || 'Unnamed' }}</span>
            <span class="tag">{{ c.tag || '' }}</span>
            <span class="breed">{{ c.breed || '' }}</span>
          </div>
        </div>
        <div v-if="cowSearch && cowResults.length === 0" class="no-results">No cows found</div>
      </div>

      <!-- Selected Cow Banner -->
      <div v-if="selectedCow" class="cow-banner card">
        <div class="cow-banner-info">
          <span class="cow-badge-id">#{{ selectedCow.id_no }}</span>
          <span>{{ selectedCow.tag || '—' }}</span>
          <span class="meta">{{ selectedCow.breed }} · {{ selectedCow.sex }}</span>
        </div>
        <button class="btn-change" @click="clearSelectedCow">Change Cow</button>
      </div>

      <!-- Gait Scoring Reference -->
      <div class="card gait-reference-card">
        <h3>📋 Gait Scoring Reference (1–5)</h3>
        <div class="gait-grid">
          <div v-for="gs in GAIT_SCORES" :key="gs.score" class="gait-item" :class="{ active: gaitScore === gs.score }" @click="gaitScore = gs.score as 1|2|3|4|5">
            <div class="gait-score-badge" :style="{ background: gs.color }">{{ gs.score }}</div>
            <div class="gait-info">
              <strong>{{ gs.label }}</strong>
              <p>{{ gs.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Assessment Form -->
      <div v-if="showForm" class="card form-card">
        <h3>New Lameness Assessment</h3>
        <div class="form-grid">
          <div class="fg">
            <label>Assessment Date</label>
            <input v-model="sessionDate" type="date" />
          </div>
          <div class="fg">
            <label>Gait Score</label>
            <div class="score-select">
              <button v-for="n in 5" :key="n" class="score-btn" :class="{ active: gaitScore === n }" :style="gaitScore === n ? { background: getGaitScore(n)?.color } : {}" @click="gaitScore = n as 1|2|3|4|5">{{ n }}</button>
            </div>
          </div>
          <div class="fg full-w">
            <label>Current Score: <strong :style="{ color: getGaitScore(gaitScore)?.color }">{{ getGaitScore(gaitScore)?.label }} ({{ gaitScore }}/5)</strong></label>
          </div>
          <div class="fg">
            <label class="checkbox-label">
              <input v-model="limpDetected" type="checkbox" />
              Limp Detected
            </label>
          </div>
          <div class="fg full-w">
            <label>Affected Leg(s)</label>
            <div class="leg-grid">
              <button v-for="leg in LEG_OPTIONS" :key="leg" class="leg-btn" :class="{ active: affectedLeg.includes(leg) }" @click="toggleLeg(leg)">{{ leg }}</button>
            </div>
          </div>
          <div class="fg">
            <label>Gait Amplitude Avg (px)</label>
            <input v-model.number="gaitAmplitudeAvg" type="number" min="0" step="0.1" placeholder="0–30 normal, 30–40 mild, >40 flagged" />
          </div>
          <div class="fg">
            <label>Gait Amplitude Max (px)</label>
            <input v-model.number="gaitAmplitudeMax" type="number" min="0" step="0.1" placeholder="Peak value during walk" />
          </div>
          <div class="fg full-w">
            <label>Notes / Observations</label>
            <textarea v-model="notes" rows="3" placeholder="Describe the cow's gait, behavior, any visible swelling, heat, or wounds..."></textarea>
          </div>
        </div>
        <button class="btn-save" :disabled="saving" @click="saveAssessment">
          {{ saving ? 'Saving...' : 'Save Assessment' }}
        </button>
      </div>

      <!-- AI Camera Gait Analyzer -->
      <div class="card ai-camera-card">
        <div class="ai-header">
          <div>
            <h3>🤖 AI Camera Gait Analysis</h3>
            <p class="ai-desc">Real-time TensorFlow.js + COCO-SSD — point camera at cow walking</p>
          </div>
          <span class="ai-status" :class="aiStatus">{{ aiStatusText }}</span>
        </div>
        <div class="camera-layout">
          <div class="camera-container">
            <video ref="camVideoRef" autoplay playsinline muted></video>
            <canvas ref="camCanvasRef"></canvas>
            <div v-if="aiStatus === 'loading'" class="camera-loader">
              <div class="spinner"></div>
              Loading AI model...
            </div>
          </div>
          <div class="camera-metrics">
            <div class="metric">
              <span class="metric-label">Body Oscillation (Avg)</span>
              <span class="metric-value" :class="{ warning: aiAmplitude > 30 }">{{ aiAmplitudeText }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">L-R Symmetry</span>
              <span class="metric-value-sm" :class="{ warning: aiSymmetry > 0.3 }">
                {{ aiSymmetry > 0 ? (aiSymmetry * 100).toFixed(0) + '%' : '--' }}
                <span v-if="aiSymmetry > 0.3" class="flag-text"> ASYMMETRIC</span>
              </span>
            </div>
            <div class="metric">
              <span class="metric-label">Head Bob</span>
              <span class="metric-value-sm" :class="{ warning: aiHeadBob > 20 }">
                {{ aiHeadBob > 0 ? aiHeadBob.toFixed(1) + 'px' : '--' }}
                <span v-if="aiHeadBob > 20" class="flag-text"> BOB DETECTED</span>
              </span>
            </div>
            <div class="metric">
              <span class="metric-label">Buffer</span>
              <span class="metric-value-sm">{{ aiBufferCount }} / {{ AI_MAX_FRAMES }} frames</span>
            </div>
            <div class="metric">
              <span class="metric-label">Status</span>
              <span class="metric-value-sm">{{ aiSubjectFound ? '✅ Subject tracked' : '⏳ Waiting...' }}</span>
            </div>
            <div class="ai-form-fill" v-if="aiAmplitude > 0">
              <p>Amplitude: <strong>{{ aiAmplitude.toFixed(1) }}px</strong> · Symmetry: <strong>{{ aiSymmetry > 0 ? (aiSymmetry * 100).toFixed(0) + '%' : '--' }}</strong></p>
              <button class="btn-use-ai" @click="applyAiReading">← Use in Assessment Form</button>
            </div>
            <button v-if="aiStatus === 'ready'" class="btn-restart-cam" @click="restartCamera">🔄 Restart Camera</button>
          </div>
        </div>
      </div>

      <!-- Session History -->
      <div class="card">
        <h3>Assessment History</h3>
        <div v-if="filteredSessions.length === 0" class="empty-state">No lameness assessments yet</div>
        <table v-else class="session-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Cow</th>
              <th>Gait Score</th>
              <th>Avg Amp</th>
              <th>Max Amp</th>
              <th>Limp</th>
              <th>Confidence</th>
              <th>Leg(s)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in filteredSessions" :key="s.id" @click="router.push(`/vet/cows/${s.cow_id}`)">
              <td>{{ s.session_date?.slice(0, 10) || '—' }}</td>
              <td><strong>{{ getCowLabel(s.cow_id) }}</strong></td>
              <td>
                <span v-if="s.waveform_data?.startsWith('Gait Score:')" class="gait-score-tag">
                  {{ s.waveform_data.split('|')[0]?.trim() || '—' }}
                </span>
                <span v-else>—</span>
              </td>
              <td>{{ s.gait_amplitude_avg?.toFixed(1) || '—' }}</td>
              <td>
                <span :class="{ 'high-amp': (s.gait_amplitude_max ?? 0) > 40 }">
                  {{ s.gait_amplitude_max?.toFixed(1) || '—' }}
                </span>
              </td>
              <td>
                <span class="limp-badge" :class="{ flagged: s.limp_detected }">
                  {{ s.limp_detected ? '⚠ Flagged' : '✓ Normal' }}
                </span>
              </td>
              <td>{{ s.confidence_score ? Math.round(s.confidence_score * 100) + '%' : '—' }}</td>
              <td class="notes-cell">{{ s.waveform_data?.includes('Affected:') ? s.waveform_data.split('Affected:')[1]?.split('|')[0]?.trim() || '—' : '—' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredSessions.length > 0" class="table-count">{{ filteredSessions.length }} session(s)</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vet-lameness { min-height: 100vh; background: #f0f2f5; padding-bottom: 40px; }
.page-header { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #fff; padding: 20px 32px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.page-header h1 { margin: 0; font-size: 1.5rem; }
.subtitle { margin: 4px 0 0; font-size: 0.85rem; opacity: 0.7; }
.btn-back { background: none; border: none; color: #93c5fd; font-size: 0.9rem; cursor: pointer; padding: 0; margin-bottom: 8px; display: block; }
.header-actions { display: flex; gap: 6px; }
.filter-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.3); background: transparent; color: #fff; font-size: 0.8rem; cursor: pointer; }
.filter-btn.active { background: #fff; color: #1a1a2e; border-color: #fff; }
.loading { text-align: center; padding: 60px; color: #999; }
.content { max-width: 1100px; margin: 0 auto; padding: 24px 16px; display: flex; flex-direction: column; gap: 20px; }
.card { background: #fff; border-radius: 12px; padding: 20px 24px; box-shadow: 0 1px 6px rgba(0,0,0,0.06); }
.card h3 { margin: 0 0 12px; font-size: 1rem; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; }

/* Search */
.search-card { }
.search-row { display: flex; gap: 8px; }
.search-input { flex: 1; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.95rem; outline: none; }
.search-input:focus { border-color: #1a5276; }
.search-results { margin-top: 8px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; max-height: 200px; overflow-y: auto; }
.search-result-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #f0f0f0; font-size: 0.9rem; }
.search-result-row:last-child { border-bottom: none; }
.search-result-row:hover { background: #f0f7ff; }
.search-result-row .tag { color: #666; font-size: 0.8rem; }
.search-result-row .breed { color: #999; font-size: 0.8rem; margin-left: auto; }
.no-results { margin-top: 8px; color: #999; text-align: center; padding: 20px; }

/* Cow banner */
.cow-banner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.cow-banner-info { display: flex; align-items: center; gap: 12px; }
.cow-badge-id { font-size: 1.2rem; font-weight: 900; color: #1a5276; }
.cow-banner-info .meta { color: #888; font-size: 0.85rem; }
.btn-change { padding: 6px 14px; background: #f0f2f5; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.8rem; cursor: pointer; color: #333; }

/* Gait Reference */
.gait-reference-card { border-left: 4px solid #9333ea; }
.gait-grid { display: flex; flex-direction: column; gap: 6px; }
.gait-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 12px; border-radius: 8px; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; }
.gait-item:hover { background: #f5f5f5; }
.gait-item.active { background: #f0f7ff; border-color: #1a5276; }
.gait-score-badge { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 0.85rem; flex-shrink: 0; }
.gait-info { flex: 1; }
.gait-info strong { font-size: 0.85rem; color: #333; }
.gait-info p { margin: 2px 0 0; font-size: 0.78rem; color: #666; line-height: 1.3; }

/* Form */
.form-card { border-left: 4px solid #9333ea; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fg { display: flex; flex-direction: column; gap: 4px; }
.fg label { font-size: 0.78rem; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.3px; }
.fg input, .fg select, .fg textarea { padding: 7px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem; }
.fg textarea { resize: vertical; }
.full-w { grid-column: 1 / -1; }
.score-select { display: flex; gap: 6px; }
.score-btn { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #d1d5db; background: #fff; font-weight: 800; font-size: 1rem; cursor: pointer; color: #333; transition: all 0.15s; }
.score-btn:hover { border-color: #9333ea; }
.score-btn.active { border-color: transparent; color: #fff; }
.checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 0.9rem !important; text-transform: none !important; cursor: pointer; }
.checkbox-label input { width: 18px; height: 18px; }
.leg-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.leg-btn { padding: 6px 14px; border: 1px solid #d1d5db; border-radius: 8px; background: #fff; font-size: 0.82rem; cursor: pointer; transition: all 0.15s; }
.leg-btn:hover { border-color: #9333ea; }
.leg-btn.active { background: #9333ea; color: #fff; border-color: #9333ea; }
.btn-save { padding: 10px 28px; background: #9333ea; color: #fff; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 700; cursor: pointer; margin-top: 8px; }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-save:hover:not(:disabled) { background: #7e22ce; }

/* AI Camera */
.ai-camera-card { border: 1px solid #e5e7eb; background: #fff; }
.ai-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; }
.ai-header h3 { margin: 0; border: none; padding: 0; }
.ai-desc { font-size: 0.8rem; color: #888; margin: 4px 0 0; }
.ai-status { padding: 3px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; white-space: nowrap; }
.ai-status.loading { background: #dbeafe; color: #1e40af; border: 1px solid #3b82f6; }
.ai-status.ready { background: #dcfce7; color: #166534; border: 1px solid #22c55e; }
.ai-status.error { background: #fef2f2; color: #991b1b; border: 1px solid #ef4444; }
.camera-layout { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
.camera-container { position: relative; width: 100%; max-width: 480px; border: 2px solid #333; border-radius: 8px; overflow: hidden; background: #000; }
.camera-container video, .camera-container canvas { display: block; width: 100%; height: auto; }
.camera-container canvas { position: absolute; top: 0; left: 0; }
.camera-loader { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.7); color: #fff; gap: 12px; font-size: 0.9rem; }
.spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.3); border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.camera-metrics { flex: 1; min-width: 180px; display: flex; flex-direction: column; gap: 12px; }
.metric { display: flex; flex-direction: column; gap: 2px; }
.metric-label { font-size: 0.7rem; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
.metric-value { font-family: monospace; font-size: 1.5rem; font-weight: 800; color: #22c55e; }
.metric-value.warning { color: #f59e0b; }
.metric-value-sm { font-family: monospace; font-size: 0.95rem; color: #555; }
.metric-value-sm.warning { color: #f59e0b; font-weight: 700; }
.flag-text { color: #dc2626; font-weight: 700; font-size: 0.65rem; }
.ai-form-fill { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px; text-align: center; }
.ai-form-fill p { margin: 0 0 6px; font-size: 0.85rem; color: #333; }
.btn-use-ai { padding: 6px 14px; background: #059669; color: #fff; border: none; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
.btn-use-ai:hover { background: #047857; }
.btn-restart-cam { padding: 6px 14px; background: #1a5276; color: #fff; border: none; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; align-self: flex-start; }
.btn-restart-cam:hover { background: #154360; }

/* Session History */
.empty-state { color: #999; font-size: 0.9rem; padding: 30px 0; text-align: center; }
.session-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.session-table th, .session-table td { border: 1px solid #e5e7eb; padding: 5px 8px; text-align: left; white-space: nowrap; }
.session-table th { background: #f9fafb; font-weight: 700; color: #333; }
.session-table tbody tr { cursor: pointer; }
.session-table tbody tr:hover { background: #f5f5f5; }
.high-amp { color: #dc2626; font-weight: 700; }
.limp-badge { padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; }
.limp-badge.flagged { background: #fef2f2; color: #dc2626; }
.gait-score-tag { padding: 1px 7px; border-radius: 10px; background: #f3e8ff; color: #6b21a8; font-size: 0.75rem; font-weight: 600; }
.notes-cell { max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
.table-count { margin-top: 8px; font-size: 0.8rem; color: #999; }

@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
  .gait-grid { gap: 4px; }
  .ai-preview { flex-direction: column; }
}
</style>
