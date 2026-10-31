<template>
  <div class="card a4">
    <div class="header">
      <div class="title-block">
        <h1 v-if="isPregnant">PREGNANT COW CARD</h1>
        <h1 v-else>MILKING COW CARD</h1>
        <div class="farm">{{ FARM.shortName }}</div>
        <p v-if="isPregnant">Pregnancy &amp; Reproduction Record</p>
        <p v-else>Milk Production &amp; Lactation Record</p>
      </div>
      <div class="header-right">
        <div class="badges">
          <span v-if="isPregnant">🤰 Pregnant</span>
          <span v-else>🥛 Milking</span>
          <span>🐄 Dairy</span>
          <span>📊 Production Tracked</span>
        </div>
        <div v-if="qrDataUrl" class="qr-block">
          <img :src="qrDataUrl" alt="Scan for full record" class="qr-img" />
          <span>SCAN FOR RECORD</span>
        </div>
      </div>
    </div>

    <div class="main">
      <div class="photo-col">
        <div class="photo-box">
          <img v-if="cow.image_url" :src="cow.image_url" alt="Cow" class="photo" />
          <div v-else class="no-image-placeholder">NO PHOTO</div>
        </div>
      </div>
      <div class="info-col">
        <div class="section">
          <div class="section-title">IDENTIFICATION</div>
          <table>
            <tr><td>Animal ID / Tag No.</td><td>: {{ cow.id_no || '—' }}</td></tr>
            <tr><td>Breed</td><td>: {{ cow.breed || '—' }}</td></tr>
            <tr><td>Sex</td><td>: Female (Cow)</td></tr>
            <tr><td>Date of Birth</td><td>: {{ formatDate(cow.birth_date) || '—' }}</td></tr>
            <tr><td>Age</td><td>: {{ age }}</td></tr>
            <tr><td>Colour</td><td>: {{ cow.colour || '—' }}</td></tr>
            <tr><td>Dam ID</td><td>: {{ cow.dam_id || '—' }}</td></tr>
            <tr><td>Sire ID</td><td>: {{ cow.sire_id || '—' }}</td></tr>
            <tr><td>Source / Farm</td><td>: {{ cow.origin || 'Bashe Dairy Farm' }}</td></tr>
            <tr><td>Location</td><td>: Tanzania</td></tr>
            <tr><td>Owner</td><td>: {{ cow.issued_by || '—' }}</td></tr>
          </table>
        </div>
      </div>
    </div>

    <div class="bottom">
      <div class="section production">
        <div class="section-title">{{ isPregnant ? 'REPRODUCTION' : 'MILK PRODUCTION' }}</div>
        <table>
          <tr v-if="isPregnant"><td>Calving Date</td><td>: {{ formatDate(cow.calving_date) || '—' }}</td></tr>
          <tr v-if="isPregnant"><td>PD Date</td><td>: {{ formatDate(cow.pd_date) || '—' }}</td></tr>
          <tr v-if="isPregnant"><td>PD Group</td><td>: {{ cow.pd_group || '—' }}</td></tr>
          <tr v-if="isPregnant"><td>Pregnancy Result</td><td>: {{ cow.pregnancy_result || 'Open' }}</td></tr>
          <tr v-if="isPregnant"><td>AI / Service Date</td><td>: {{ formatDate(cow.ai_service_date) || '—' }}</td></tr>
          <tr v-if="isPregnant"><td>Expected Calving</td><td>: {{ formatDate(cow.expected_calving_date) || '—' }}</td></tr>
          <tr v-if="isPregnant"><td>Expected Dry-off</td><td>: {{ formatDate(cow.expected_dry_off_date) || '—' }}</td></tr>
          <tr v-if="!isPregnant"><td>Days in Milk</td><td>: {{ cow.days_in_milk ?? '—' }}</td></tr>
          <tr v-if="!isPregnant"><td>Current Daily Yield</td><td>: {{ cow.current_daily_milk_yield ? cow.current_daily_milk_yield + ' L' : '—' }}</td></tr>
          <tr v-if="!isPregnant"><td>Peak Milk Yield</td><td>: {{ cow.peak_milk_yield ? cow.peak_milk_yield + ' L' : '—' }}</td></tr>
          <tr v-if="!isPregnant"><td>Total Lactation Yield</td><td>: {{ cow.total_lactation_yield ? cow.total_lactation_yield + ' L' : '—' }}</td></tr>
          <tr v-if="!isPregnant"><td>Fat %</td><td>: {{ cow.fat_percent ? cow.fat_percent + ' %' : '—' }}</td></tr>
          <tr v-if="!isPregnant"><td>Protein %</td><td>: {{ cow.protein_percent ? cow.protein_percent + ' %' : '—' }}</td></tr>
          <tr v-if="!isPregnant"><td>305-Day Projected</td><td>: {{ cow.projected_305d_milk_yield ? cow.projected_305d_milk_yield + ' L' : '—' }}</td></tr>
          <tr v-if="isPregnant"><td>Lactations</td><td>: {{ cow.lactations ?? '—' }}</td></tr>
        </table>
      </div>
      <div class="section health">
        <div class="section-title">HEALTH STATUS</div>
        <table>
          <tr><td>Vaccinations</td><td>: {{ cow.vaccinations || 'Up to date' }}</td></tr>
          <tr><td>Deworming</td><td>: {{ cow.deworming_dates || 'Regular (Every 6 months)' }}</td></tr>
          <tr><td>Mastitis History</td><td>: {{ cow.mastitis_history || 'None' }}</td></tr>
          <tr><td>Overall Health</td><td>: {{ cow.current_health_status || 'Good' }}</td></tr>
          <tr><td>Veterinary Record</td><td>: {{ cow.medical_records || 'Available' }}</td></tr>
        </table>
      </div>
    </div>

    <div class="views">
      <div class="view">
        <div class="view-title">FRONT VIEW</div>
        <div class="view-box">
          <img v-if="cow.front_image_url" :src="cow.front_image_url" alt="Front" class="view-photo" />
          <div v-else class="no-image-placeholder">NO PHOTO</div>
        </div>
      </div>
      <div class="view">
        <div class="view-title">SIDE VIEW</div>
        <div class="view-box">
          <img v-if="cow.side_image_url" :src="cow.side_image_url" alt="Side" class="view-photo" />
          <div v-else class="no-image-placeholder">NO PHOTO</div>
        </div>
      </div>
      <div class="view">
        <div class="view-title">REAR VIEW</div>
        <div class="view-box">
          <img v-if="cow.rear_image_url" :src="cow.rear_image_url" alt="Rear" class="view-photo" />
          <div v-else class="no-image-placeholder">NO PHOTO</div>
        </div>
      </div>
      <div class="view">
        <div class="view-title">CLOSE UP (HEAD)</div>
        <div class="view-box">
          <img v-if="cow.head_image_url" :src="cow.head_image_url" alt="Head" class="view-photo" />
          <div v-else class="no-image-placeholder">NO PHOTO</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div>📍 {{ FARM.name }}, {{ FARM.country }}</div>
      <div>📞 {{ FARM.phone }}</div>
      <div>✉️ {{ FARM.email }}</div>
      <div>🌐 {{ FARM.website }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatDate, calculateAge } from '../../utils/age'
import { FARM } from '../../config/farm'
import type { Cow } from '../../types'

const props = defineProps<{ cow: Cow; qrDataUrl?: string }>()

const isPregnant = computed(() => props.cow.pregnancy_result === 'Pregnant')
const age = computed(() => {
  if (!props.cow.birth_date) return '—'
  return calculateAge(props.cow.birth_date) || '—'
})
</script>

<style scoped>
.card.a4 {
  width: 794px;
  min-height: 1123px;
  background: #fff;
  border: 4px solid #14452f;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  box-sizing: border-box;
  padding: 16px;
  font-family: Arial, Helvetica, sans-serif;
  color: #333;
}
.header {
  background: #14452f;
  color: #fff;
  padding: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 6px;
  margin-bottom: 14px;
}
.title-block h1 {
  margin: 0;
  font-size: 22px;
  color: #f9c74f;
}
.farm {
  font-size: 16px;
  font-weight: 700;
  color: #ffeb3b;
}
.title-block p {
  margin: 4px 0 0;
  font-size: 11px;
  color: #d8e8d8;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.badges {
  display: flex;
  gap: 10px;
  font-size: 10px;
}
.badges span {
  background: rgba(255,255,255,0.15);
  padding: 2px 8px;
  border-radius: 8px;
  color: #fff;
}
.qr-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.qr-img {
  width: 66px;
  height: 66px;
  border: 2px solid #fff;
  border-radius: 6px;
  padding: 3px;
  background: #fff;
}
.qr-block span {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #fff;
}
.main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 14px;
}
.photo-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.photo-box {
  background: #e2e8f0;
  border: 2px dashed #94a3b8;
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-weight: 700;
  color: #475569;
  text-align: center;
  font-size: 12px;
}
.photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}
.info-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.section {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.section-title {
  background: #14452f;
  color: #fff;
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 700;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
table td {
  padding: 5px 10px;
  border-bottom: 1px solid #f1f5f9;
}
table td:first-child {
  font-weight: 700;
  width: 45%;
  color: #334155;
}
.bottom {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
.views {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}
.view {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.view-title {
  background: #14452f;
  color: #fff;
  font-size: 10px;
  padding: 3px;
  border-radius: 4px 4px 0 0;
  margin-bottom: -2px;
}
.view-box {
  background: #e2e8f0;
  border: 2px dashed #94a3b8;
  height: 80px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #475569;
  font-size: 10px;
}
.view-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}
.no-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #9ca3af;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.footer {
  background: #0f2c1f;
  color: #fff;
  padding: 9px 16px;
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  border-radius: 0 0 6px 6px;
}
</style>
