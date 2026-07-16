import { ref, type Ref } from 'vue'
import { db } from '../db/dexie'
import type { DailyRecord } from '../types'

export interface HerdSummary {
  total: number
  males: number
  females: number
  lactating: number
  dry: number
  pregnant: number
  open: number
  totalDailyYield: number
  avgDailyYield: number
  avgFat: number
  avgProtein: number
  totalLactationYield: number
  peakAvg: number
  healthCounts: { healthy: number; onTreatment: number; sick: number; frequentlySick: number }
  cullCandidates: number
  totalAbortions: number
  upcomingCalvings: number
  breedBreakdown: { breed: string; count: number }[]
  avgLactations: number
  totalMilkRecords: number
  avgTemperature: number
  recentHealthIssues: number
  vetOpenIncidents: number
  vetActiveTreatments: number
  vetOverdueVaccinations: number
  vetLamenessFlagged: number
}

const emptySummary = (): HerdSummary => ({
  total: 0,
  males: 0,
  females: 0,
  lactating: 0,
  dry: 0,
  pregnant: 0,
  open: 0,
  totalDailyYield: 0,
  avgDailyYield: 0,
  avgFat: 0,
  avgProtein: 0,
  totalLactationYield: 0,
  peakAvg: 0,
  healthCounts: { healthy: 0, onTreatment: 0, sick: 0, frequentlySick: 0 },
  cullCandidates: 0,
  totalAbortions: 0,
  upcomingCalvings: 0,
  breedBreakdown: [],
  avgLactations: 0,
  totalMilkRecords: 0,
  avgTemperature: 0,
  recentHealthIssues: 0,
  vetOpenIncidents: 0,
  vetActiveTreatments: 0,
  vetOverdueVaccinations: 0,
  vetLamenessFlagged: 0,
})

export function useHerdSummary() {
  const summary: Ref<HerdSummary> = ref(emptySummary())
  const loading = ref(false)
  const error = ref('')

  async function compute() {
    loading.value = true
    error.value = ''
    try {
      const cows = await db.cows.toArray()
      const s: HerdSummary = emptySummary()
      s.total = cows.length

      const breedMap = new Map<string, number>()
      let fatSum = 0
      let fatCount = 0
      let proteinSum = 0
      let proteinCount = 0
      let lactSum = 0

      for (const cow of cows) {
        if (cow.sex === 'Male') s.males++
        else if (cow.sex === 'Female') s.females++

        if (cow.sex === 'Female') {
          const isLactating = (cow.days_in_milk ?? 0) > 0 || (cow.current_daily_milk_yield ?? 0) > 0
          if (isLactating) s.lactating++
          else s.dry++

          if (cow.pregnancy_result === 'Pregnant') s.pregnant++
          else if (cow.sex === 'Female') s.open++

          s.totalDailyYield += cow.current_daily_milk_yield || 0
          s.totalLactationYield += cow.total_lactation_yield || 0

          if ((cow.peak_milk_yield ?? 0) > 0) {
            s.peakAvg += cow.peak_milk_yield!
          }
          lactSum += cow.lactations || 0

          if (cow.expected_calving_date) {
            const days = (new Date(cow.expected_calving_date).getTime() - Date.now()) / 86400000
            if (days >= 0 && days <= 30) s.upcomingCalvings++
          }
        }

        if (cow.fat_percent && cow.fat_percent > 0) { fatSum += cow.fat_percent; fatCount++ }
        if (cow.protein_percent && cow.protein_percent > 0) { proteinSum += cow.protein_percent; proteinCount++ }

        const status = cow.current_health_status
        if (status === 'Healthy') s.healthCounts.healthy++
        else if (status === 'On Treatment') s.healthCounts.onTreatment++
        else if (status === 'Sick') s.healthCounts.sick++
        else if (status === 'Frequently Sick') s.healthCounts.frequentlySick++

        if (cow.cull_status === '+') s.cullCandidates++
        s.totalAbortions += cow.abortion_count || 0

        if (cow.breed) {
          breedMap.set(cow.breed, (breedMap.get(cow.breed) || 0) + 1)
        }
      }

      s.avgDailyYield = s.females > 0 ? Math.round((s.totalDailyYield / s.females) * 10) / 10 : 0
      s.peakAvg = s.females > 0 ? Math.round((s.peakAvg / s.females) * 10) / 10 : 0
      s.avgFat = fatCount > 0 ? Math.round((fatSum / fatCount) * 10) / 10 : 0
      s.avgProtein = proteinCount > 0 ? Math.round((proteinSum / proteinCount) * 10) / 10 : 0
      s.avgLactations = s.females > 0 ? Math.round((lactSum / s.females) * 10) / 10 : 0
      s.breedBreakdown = Array.from(breedMap.entries())
        .map(([breed, count]) => ({ breed, count }))
        .sort((a, b) => b.count - a.count)

      let records: DailyRecord[] = []
      try {
        records = await db.dailyRecords.toArray()
      } catch {}
      s.totalMilkRecords = records.length

      let tempSum = 0
      let tempCount = 0
      let healthIssueCount = 0
      for (const r of records) {
        if (r.milk_yield_total && r.milk_yield_total > 0) {
          s.totalDailyYield += r.milk_yield_total
        }
        if (r.temperature && r.temperature > 0) { tempSum += r.temperature; tempCount++ }
        if (r.health_status && r.health_status !== 'Healthy') healthIssueCount++
      }
      s.avgTemperature = tempCount > 0 ? Math.round((tempSum / tempCount) * 10) / 10 : 0
      s.recentHealthIssues = healthIssueCount

      try {
        const incidents = await db.healthIncidents.toArray()
        s.vetOpenIncidents = incidents.filter(i => i.status === 'open' || i.status === 'ongoing').length
      } catch {}

      try {
        const treatments = await db.treatments.toArray()
        const now = new Date().toISOString()
        s.vetActiveTreatments = treatments.filter(t => !t.next_due_date || t.next_due_date >= now).length
      } catch {}

      try {
        const vaccinations = await db.vaccinationRecords.toArray()
        const now = new Date().toISOString()
        s.vetOverdueVaccinations = vaccinations.filter(v => !v.administered_date && v.scheduled_date < now).length
      } catch {}

      try {
        const lameness = await db.lamenessSessions.toArray()
        s.vetLamenessFlagged = lameness.filter(l => l.limp_detected).length
      } catch {}

      summary.value = s
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to compute herd summary'
    } finally {
      loading.value = false
    }
  }

  return { summary, loading, error, compute }
}
