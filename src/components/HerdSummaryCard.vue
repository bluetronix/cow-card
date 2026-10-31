<script setup lang="ts">
import { computed } from 'vue'
import type { HerdStats } from '../utils/herdStats'
import { FARM } from '../config/farm'

const props = defineProps<{ summary: HerdStats; dateLabel?: string }>()

const dateLabel = computed(
  () =>
    props.dateLabel ||
    new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
)

const breedTotal = computed(() => props.summary.total || 1)
</script>

<template>
  <div class="herd-summary-card">
    <div class="card header-card">
      <div class="header-row">
        <div class="header-info">
          <span class="header-icon">🐄</span>
          <span class="header-title">Herd Summary</span>
          <span class="header-meta">{{ FARM.name }} · {{ summary.total }} cows · {{ dateLabel }}</span>
        </div>
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
      <table class="health-table">
        <thead>
          <tr><th>Status</th><th>Count</th></tr>
        </thead>
        <tbody>
          <tr><td><span class="dot healthy"></span> Healthy</td><td>{{ summary.healthCounts.healthy }}</td></tr>
          <tr><td><span class="dot treatment"></span> On Treatment</td><td>{{ summary.healthCounts.onTreatment }}</td></tr>
          <tr><td><span class="dot sick"></span> Sick</td><td>{{ summary.healthCounts.sick }}</td></tr>
          <tr><td><span class="dot freq"></span> Frequently Sick</td><td>{{ summary.healthCounts.frequentlySick }}</td></tr>
        </tbody>
      </table>
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
            <div class="breed-fill" :style="{ width: ((b.count / breedTotal) * 100) + '%' }"></div>
          </div>
          <span class="breed-count">{{ b.count }}</span>
          <span class="breed-pct">{{ ((b.count / breedTotal) * 100).toFixed(0) }}%</span>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Daily Records Summary</h3>
      <div class="info-grid">
        <div><strong>Total Records Logged:</strong> {{ summary.totalMilkRecords }}</div>
        <div><strong>Average Temperature:</strong> {{ summary.avgTemperature ? summary.avgTemperature + '°C' : '—' }}</div>
        <div><strong>Open Vet Incidents:</strong> {{ summary.vetOpenIncidents }}</div>
        <div><strong>Active Treatments:</strong> {{ summary.vetActiveTreatments }}</div>
        <div><strong>Overdue Vaccinations:</strong> {{ summary.vetOverdueVaccinations }}</div>
        <div><strong>Lameness Flags:</strong> {{ summary.vetLamenessFlagged }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.herd-summary-card {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  font-family: Arial, Helvetica, sans-serif;
  color: #333;
}

.card {
  background: #fff;
  border: 1px solid #e5e7eb;
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
  flex-wrap: wrap;
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

.health-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
  font-size: 0.9rem;
}

.health-table th {
  text-align: left;
  padding: 6px 10px;
  background: #f8f9fa;
  color: #555;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border-bottom: 2px solid #e0e0e0;
}

.health-table td {
  padding: 7px 10px;
  border-bottom: 1px solid #f0f0f0;
  color: #444;
}

.health-table td:last-child {
  font-weight: 700;
  color: #333;
}

.health-table tr:last-child td {
  border-bottom: none;
}

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

@media (max-width: 640px) {
  .card {
    padding: 14px 16px;
  }

  .header-row {
    padding: 14px 16px;
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
