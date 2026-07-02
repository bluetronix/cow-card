<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useHerdSummary } from '../composables/useHerdSummary'
import { generateHerdSummaryPdf, downloadPdf } from '../utils/pdf'
import { showToast, formatError } from '../composables/useToast'

const router = useRouter()
const { summary, loading, error, compute } = useHerdSummary()
const downloading = ref(false)

onMounted(compute)

async function handleDownloadPdf() {
  downloading.value = true
  try {
    const doc = await generateHerdSummaryPdf()
    downloadPdf(doc, `herd_summary_${new Date().toISOString().split('T')[0]}.pdf`)
    showToast('Herd summary PDF downloaded', 'success')
  } catch (e) {
    showToast(formatError(e, 'Failed to generate herd summary PDF'), 'error')
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <div class="summary-page">
    <header class="page-header">
      <div>
        <button class="btn-back" @click="router.push('/')">← Dashboard</button>
        <h1>Herd Summary</h1>
      </div>
    </header>

    <div v-if="loading" class="loading-state">Loading herd data...</div>
    <div v-else-if="error" class="loading-state"><p>{{ error }}</p></div>
    <div v-else-if="summary.total === 0" class="loading-state">
      <p>No cows registered yet.</p>
    </div>

    <div v-else class="page-content">
      <div class="card header-card">
        <div class="header-row">
          <div class="header-info">
            <span class="header-icon">🐄</span>
            <span class="header-title">Herd Summary</span>
            <span class="header-meta">{{ summary.total }} cows · {{ new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }}</span>
          </div>
          <button class="btn-emerald" :disabled="downloading" @click="handleDownloadPdf">
            {{ downloading ? '⏳ Downloading...' : 'Download PDF' }}
          </button>
        </div>
      </div>

      <div class="card">
        <h3>Herd Overview</h3>
        <div class="kpi-row">
          <div class="kpi-item"><span class="kpi-num">{{ summary.total }}</span><span class="kpi-lbl">Total Cows</span></div>
          <div class="kpi-item"><span class="kpi-num">{{ summary.females }}</span><span class="kpi-lbl">Females</span></div>
          <div class="kpi-item"><span class="kpi-num">{{ summary.males }}</span><span class="kpi-lbl">Males</span></div>
          <div class="kpi-item"><span class="kpi-num">{{ summary.lactating }}</span><span class="kpi-lbl">Lactating</span></div>
          <div class="kpi-item"><span class="kpi-num">{{ summary.dry }}</span><span class="kpi-lbl">Dry</span></div>
          <div class="kpi-item"><span class="kpi-num">{{ summary.pregnant }}</span><span class="kpi-lbl">Pregnant</span></div>
          <div class="kpi-item"><span class="kpi-num">{{ summary.open }}</span><span class="kpi-lbl">Open</span></div>
        </div>
      </div>

      <div class="card">
        <h3>Reproduction</h3>
        <div class="info-grid">
          <div><strong>Pregnant:</strong> <span class="badge badge-success">{{ summary.pregnant }}</span></div>
          <div><strong>Open:</strong> <span class="badge badge-danger">{{ summary.open }}</span></div>
          <div><strong>Average Lactations:</strong> {{ summary.avgLactations }}</div>
          <div><strong>Upcoming Calvings (30d):</strong> <span class="badge" :class="summary.upcomingCalvings > 0 ? 'badge-warning' : 'badge-success'">{{ summary.upcomingCalvings }}</span></div>
          <div class="full-width"><strong>Total Lactating Females:</strong> {{ summary.lactating }}</div>
        </div>
      </div>

      <div class="card">
        <h3>Milk Production</h3>
        <div class="info-grid">
          <div><strong>Total Daily Yield:</strong> {{ summary.totalDailyYield.toFixed(0) }} L</div>
          <div><strong>Average per Cow:</strong> {{ summary.avgDailyYield }} L</div>
          <div><strong>Total Lactation Yield:</strong> {{ summary.totalLactationYield.toFixed(0) }} L</div>
          <div><strong>Average Peak Yield:</strong> {{ summary.peakAvg }} L</div>
          <div><strong>Average Fat:</strong> {{ summary.avgFat }}%</div>
          <div><strong>Average Protein:</strong> {{ summary.avgProtein }}%</div>
        </div>
      </div>

      <div class="card">
        <h3>Health Status</h3>
        <div class="health-strip">
          <div class="health-pill"><span class="dot healthy"></span> Healthy <strong>{{ summary.healthCounts.healthy }}</strong></div>
          <div class="health-pill"><span class="dot treatment"></span> On Treatment <strong>{{ summary.healthCounts.onTreatment }}</strong></div>
          <div class="health-pill"><span class="dot sick"></span> Sick <strong>{{ summary.healthCounts.sick }}</strong></div>
          <div class="health-pill"><span class="dot freq"></span> Frequently Sick <strong>{{ summary.healthCounts.frequentlySick }}</strong></div>
        </div>
        <div class="alert-bar">
          <span>🚩 <strong>{{ summary.cullCandidates }}</strong> cull candidate(s)</span>
          <span class="alert-sep">·</span>
          <span>💊 <strong>{{ summary.totalAbortions }}</strong> abortion(s)</span>
          <span class="alert-sep">·</span>
          <span>📋 <strong>{{ summary.recentHealthIssues }}</strong> health issue record(s)</span>
        </div>
      </div>

      <div class="card">
        <h3>Breed Distribution</h3>
        <div v-if="summary.breedBreakdown.length === 0" class="empty-note">No breed data recorded</div>
        <div v-else class="breed-list">
          <div v-for="b in summary.breedBreakdown" :key="b.breed" class="breed-row">
            <span class="breed-name">{{ b.breed }}</span>
            <div class="breed-track">
              <div class="breed-fill" :style="{ width: ((b.count / summary.total) * 100) + '%' }"></div>
            </div>
            <span class="breed-count">{{ b.count }}</span>
            <span class="breed-pct">{{ ((b.count / summary.total) * 100).toFixed(0) }}%</span>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>Daily Records Summary</h3>
        <div class="info-grid">
          <div><strong>Total Records Logged:</strong> {{ summary.totalMilkRecords }}</div>
          <div><strong>Average Temperature:</strong> {{ summary.avgTemperature ? summary.avgTemperature + '°C' : '—' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.summary-page {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 40px;
}

.page-header {
  background: #fff;
  padding: 20px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.page-content {
  max-width: 900px;
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
  margin: 0 0 12px;
  color: #333;
  font-size: 1rem;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 8px;
}

.header-card {
  padding: 0;
  overflow: hidden;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(135deg, #0b2b3e, #1a5276);
  color: #fff;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon {
  font-size: 1.5rem;
}

.header-title {
  font-size: 1.1rem;
  font-weight: 700;
}

.header-meta {
  font-size: 0.8rem;
  opacity: 0.7;
  margin-left: 4px;
}

.btn-emerald {
  padding: 8px 20px;
  background: #059669;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}

.btn-emerald:hover {
  background: #047857;
}

.btn-emerald:disabled {
  background: #64748b;
  cursor: not-allowed;
}

.kpi-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.kpi-item {
  flex: 1;
  min-width: 90px;
  text-align: center;
  padding: 12px 4px;
  background: #f8f9fa;
  border-radius: 8px;
}

.kpi-num {
  display: block;
  font-size: 1.4rem;
  font-weight: 800;
  color: #1a5276;
  line-height: 1.2;
}

.kpi-lbl {
  display: block;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #888;
  margin-top: 3px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
  font-size: 0.9rem;
}

.info-grid strong {
  color: #555;
}

.full-width {
  grid-column: 1 / -1;
}

.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 700;
}

.badge-success {
  background: #d4edda;
  color: #155724;
}

.badge-danger {
  background: #f8d7da;
  color: #721c24;
}

.badge-warning {
  background: #fff3cd;
  color: #856404;
}

.health-strip {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.health-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f8f9fa;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #555;
}

.health-pill strong {
  color: #333;
  font-size: 1rem;
  margin-left: 2px;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.healthy { background: #15803d; }
.sick { background: #d62828; }
.treatment { background: #b45309; }
.freq { background: #7c3aed; }

.alert-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: #555;
  padding: 10px 14px;
  background: #fef3cd;
  border-radius: 8px;
}

.alert-sep {
  color: #ccc;
}

.breed-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.breed-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.breed-name {
  min-width: 140px;
  font-size: 0.9rem;
  color: #444;
  font-weight: 600;
}

.breed-track {
  flex: 1;
  height: 10px;
  background: #e9ecef;
  border-radius: 5px;
  overflow: hidden;
}

.breed-fill {
  height: 100%;
  background: linear-gradient(90deg, #1a5276, #2e86c1);
  border-radius: 5px;
  min-width: 4px;
  transition: width 0.4s ease;
}

.breed-count {
  min-width: 28px;
  text-align: right;
  font-weight: 700;
  font-size: 0.9rem;
  color: #333;
}

.breed-pct {
  min-width: 34px;
  text-align: right;
  font-size: 0.8rem;
  color: #888;
}

.empty-note {
  color: #999;
  font-size: 0.9rem;
  text-align: center;
  padding: 12px;
}

.loading-state {
  text-align: center;
  padding: 60px;
  color: #999;
}

@media (max-width: 640px) {
  .page-header {
    padding: 12px 16px;
  }

  .page-header h1 {
    font-size: 1.1rem;
  }

  .page-content {
    padding: 12px;
  }

  .header-row {
    flex-wrap: wrap;
    gap: 10px;
    padding: 14px 16px;
  }

  .header-info {
    flex-wrap: wrap;
  }

  .btn-emerald {
    width: 100%;
    text-align: center;
  }

  .kpi-item {
    min-width: calc(33% - 8px);
  }

  .kpi-num {
    font-size: 1.1rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .breed-name {
    min-width: 100px;
    font-size: 0.8rem;
  }
}
</style>
