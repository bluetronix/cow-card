import type {
  Cow,
  DailyRecord,
  HealthIncident,
  Treatment,
  VaccinationRecord,
  LamenessSession,
} from '../types'
import { addDaysISO, isBefore, isOnOrAfter, isOnOrBefore, todayISO } from './dateOnly'

export interface HerdStats {
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

export interface HerdData {
  cows: Cow[]
  dailyRecords: DailyRecord[]
  incidents: HealthIncident[]
  treatments: Treatment[]
  vaccinations: VaccinationRecord[]
  lameness: LamenessSession[]
}

export const emptyHerdData = (): HerdData => ({
  cows: [],
  dailyRecords: [],
  incidents: [],
  treatments: [],
  vaccinations: [],
  lameness: [],
})

const round1 = (n: number): number => Math.round(n * 10) / 10

export function computeHerdStats(data: HerdData): HerdStats {
  const { cows, dailyRecords, incidents, treatments, vaccinations, lameness } = data
  const today = todayISO()
  const weekAhead = addDaysISO(today, 30)

  let males = 0
  let females = 0
  let lactating = 0
  let dry = 0
  let pregnant = 0
  let open = 0
  let totalDailyYield = 0
  let totalLactationYield = 0
  let peakSum = 0
  let peakCount = 0
  let lactSum = 0
  let fatSum = 0
  let fatCount = 0
  let proteinSum = 0
  let proteinCount = 0
  let cullCandidates = 0
  let totalAbortions = 0
  let upcomingCalvings = 0
  const healthCounts = { healthy: 0, onTreatment: 0, sick: 0, frequentlySick: 0 }
  const breedMap = new Map<string, number>()

  for (const cow of cows) {
    if (cow.sex === 'Male') males++
    else if (cow.sex === 'Female') females++

    if (cow.sex === 'Female') {
      const isLactating = (cow.days_in_milk ?? 0) > 0 || (cow.current_daily_milk_yield ?? 0) > 0
      if (isLactating) lactating++
      else dry++

      if (cow.pregnancy_result === 'Pregnant') pregnant++
      else open++

      totalDailyYield += cow.current_daily_milk_yield || 0
      totalLactationYield += cow.total_lactation_yield || 0
      lactSum += cow.lactations || 0

      if ((cow.peak_milk_yield ?? 0) > 0) {
        peakSum += cow.peak_milk_yield!
        peakCount++
      }

      if (
        cow.expected_calving_date &&
        isOnOrAfter(cow.expected_calving_date, today) &&
        isOnOrBefore(cow.expected_calving_date, weekAhead)
      ) {
        upcomingCalvings++
      }
    }

    if (cow.fat_percent && cow.fat_percent > 0) { fatSum += cow.fat_percent; fatCount++ }
    if (cow.protein_percent && cow.protein_percent > 0) { proteinSum += cow.protein_percent; proteinCount++ }

    if (cow.current_health_status === 'Healthy') healthCounts.healthy++
    else if (cow.current_health_status === 'On Treatment') healthCounts.onTreatment++
    else if (cow.current_health_status === 'Sick') healthCounts.sick++
    else if (cow.current_health_status === 'Frequently Sick') healthCounts.frequentlySick++

    if (cow.cull_status === '+') cullCandidates++
    totalAbortions += cow.abortion_count || 0

    if (cow.breed) breedMap.set(cow.breed, (breedMap.get(cow.breed) || 0) + 1)
  }

  let tempSum = 0
  let tempCount = 0
  let recentHealthIssues = 0
  for (const record of dailyRecords) {
    if (record.temperature && record.temperature > 0) {
      tempSum += record.temperature
      tempCount++
    }
    if (record.health_status && record.health_status !== 'Healthy') recentHealthIssues++
  }

  return {
    total: cows.length,
    males,
    females,
    lactating,
    dry,
    pregnant,
    open,
    totalDailyYield,
    avgDailyYield: females > 0 ? round1(totalDailyYield / females) : 0,
    avgFat: fatCount > 0 ? round1(fatSum / fatCount) : 0,
    avgProtein: proteinCount > 0 ? round1(proteinSum / proteinCount) : 0,
    totalLactationYield,
    peakAvg: peakCount > 0 ? round1(peakSum / peakCount) : 0,
    healthCounts,
    cullCandidates,
    totalAbortions,
    upcomingCalvings,
    breedBreakdown: Array.from(breedMap.entries())
      .map(([breed, count]) => ({ breed, count }))
      .sort((a, b) => b.count - a.count),
    avgLactations: females > 0 ? round1(lactSum / females) : 0,
    totalMilkRecords: dailyRecords.length,
    avgTemperature: tempCount > 0 ? round1(tempSum / tempCount) : 0,
    recentHealthIssues,
    vetOpenIncidents: incidents.filter(i => i.status === 'open' || i.status === 'ongoing').length,
    vetActiveTreatments: treatments.filter(t => isOnOrAfter(t.next_due_date)).length,
    vetOverdueVaccinations: vaccinations.filter(v => !v.administered_date && isBefore(v.scheduled_date)).length,
    vetLamenessFlagged: lameness.filter(l => l.limp_detected).length,
  }
}
