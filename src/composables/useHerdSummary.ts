import { ref, type Ref } from 'vue'
import { db } from '../db/dexie'
import type { DailyRecord, HealthIncident, Treatment, VaccinationRecord, LamenessSession } from '../types'
import { computeHerdStats, emptyHerdData, type HerdStats } from '../utils/herdStats'

export type { HerdStats } from '../utils/herdStats'

export function useHerdSummary() {
  const summary: Ref<HerdStats> = ref(computeHerdStats(emptyHerdData()))
  const loading = ref(false)
  const error = ref('')

  async function compute() {
    loading.value = true
    error.value = ''
    try {
      const [cows, dailyRecords, incidents, treatments, vaccinations, lameness] = await Promise.all([
        db.cows.toArray(),
        db.dailyRecords.toArray().catch(() => [] as DailyRecord[]),
        db.healthIncidents.toArray().catch(() => [] as HealthIncident[]),
        db.treatments.toArray().catch(() => [] as Treatment[]),
        db.vaccinationRecords.toArray().catch(() => [] as VaccinationRecord[]),
        db.lamenessSessions.toArray().catch(() => [] as LamenessSession[]),
      ])

      summary.value = computeHerdStats({
        cows,
        dailyRecords,
        incidents,
        treatments,
        vaccinations,
        lameness,
      })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to compute herd summary'
    } finally {
      loading.value = false
    }
  }

  return { summary, loading, error, compute }
}
