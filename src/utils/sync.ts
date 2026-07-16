import { db } from '../db/dexie'
import {
  syncCow, fetchCows,
  syncDailyRecord, fetchDailyRecordsFromTurso,
  syncVetVisit, fetchVetVisitsFromTurso,
  syncHealthIncident, fetchHealthIncidentsFromTurso,
  syncTreatment, fetchTreatmentsFromTurso,
  syncLamenessSession, fetchLamenessSessionsFromTurso,
  syncVaccinationRecord, fetchVaccinationRecordsFromTurso,
} from '../db/turso'
import { showToast, formatError } from '../composables/useToast'

export async function syncPendingRecords(): Promise<{
  cows: number; daily: number; vetVisits: number; incidents: number
  treatments: number; lameness: number; vaccinations: number
}> {
  let cowsSynced = 0
  let dailySynced = 0
  let vetVisitsSynced = 0
  let incidentsSynced = 0
  let treatmentsSynced = 0
  let lamenessSynced = 0
  let vaccinationsSynced = 0

  try {
    const unsyncedCows = await db.cows.where('synced').equals(0).toArray()
    for (const cow of unsyncedCows) {
      const ok = await syncCow(cow)
      if (ok) { await db.cows.update(cow.id, { synced: 1 }); cowsSynced++ }
    }
  } catch (e) {
    showToast(formatError(e, 'Failed to sync cows. Data saved locally.'), 'error')
  }

  try {
    const unsyncedDaily = await db.dailyRecords.where('synced').equals(0).toArray()
    for (const record of unsyncedDaily) {
      const ok = await syncDailyRecord(record)
      if (ok) { await db.dailyRecords.update(record.id, { synced: 1 }); dailySynced++ }
    }
  } catch (e) {
    showToast(formatError(e, 'Failed to sync daily records. Data saved locally.'), 'error')
  }

  try {
    const items = await db.vetVisits.where('synced').equals(0).toArray()
    for (const item of items) {
      const ok = await syncVetVisit(item)
      if (ok) { await db.vetVisits.update(item.id, { synced: 1 }); vetVisitsSynced++ }
    }
  } catch (e) {
    showToast(formatError(e, 'Failed to sync vet visits.'), 'error')
  }

  try {
    const items = await db.healthIncidents.where('synced').equals(0).toArray()
    for (const item of items) {
      const ok = await syncHealthIncident(item)
      if (ok) { await db.healthIncidents.update(item.id, { synced: 1 }); incidentsSynced++ }
    }
  } catch (e) {
    showToast(formatError(e, 'Failed to sync health incidents.'), 'error')
  }

  try {
    const items = await db.treatments.where('synced').equals(0).toArray()
    for (const item of items) {
      const ok = await syncTreatment(item)
      if (ok) { await db.treatments.update(item.id, { synced: 1 }); treatmentsSynced++ }
    }
  } catch (e) {
    showToast(formatError(e, 'Failed to sync treatments.'), 'error')
  }

  try {
    const items = await db.lamenessSessions.where('synced').equals(0).toArray()
    for (const item of items) {
      const ok = await syncLamenessSession(item)
      if (ok) { await db.lamenessSessions.update(item.id, { synced: 1 }); lamenessSynced++ }
    }
  } catch (e) {
    showToast(formatError(e, 'Failed to sync lameness sessions.'), 'error')
  }

  try {
    const items = await db.vaccinationRecords.where('synced').equals(0).toArray()
    for (const item of items) {
      const ok = await syncVaccinationRecord(item)
      if (ok) { await db.vaccinationRecords.update(item.id, { synced: 1 }); vaccinationsSynced++ }
    }
  } catch (e) {
    showToast(formatError(e, 'Failed to sync vaccination records.'), 'error')
  }

  return {
    cows: cowsSynced, daily: dailySynced, vetVisits: vetVisitsSynced,
    incidents: incidentsSynced, treatments: treatmentsSynced,
    lameness: lamenessSynced, vaccinations: vaccinationsSynced,
  }
}

export async function pullFromTurso(): Promise<{
  cows: number; daily: number; vetVisits: number; incidents: number
  treatments: number; lameness: number; vaccinations: number
}> {
  let cowsImported = 0
  let dailyImported = 0
  let vetVisitsImported = 0
  let incidentsImported = 0
  let treatmentsImported = 0
  let lamenessImported = 0
  let vaccinationsImported = 0

  try {
    const remoteCows = await fetchCows()
    for (const cow of remoteCows) {
      const local = await db.cows.get(cow.id)
      if (local && local.synced === 0) continue
      await db.cows.put({ ...cow, synced: 1 })
      cowsImported++
    }
  } catch (e) {
    showToast(formatError(e, 'Failed to pull cows from cloud.'), 'error')
  }

  try {
    const remoteDaily = await fetchDailyRecordsFromTurso()
    for (const record of remoteDaily) {
      const local = await db.dailyRecords.get(record.id)
      if (local && local.synced === 0) continue
      await db.dailyRecords.put({ ...record, synced: 1 })
      dailyImported++
    }
  } catch (e) {
    showToast(formatError(e, 'Failed to pull daily records from cloud.'), 'error')
  }

  try {
    const items = await fetchVetVisitsFromTurso()
    for (const item of items) {
      const local = await db.vetVisits.get(item.id)
      if (local && local.synced === 0) continue
      await db.vetVisits.put({ ...item, synced: 1 })
      vetVisitsImported++
    }
  } catch (e) {
    showToast(formatError(e, 'Failed to pull vet visits.'), 'error')
  }

  try {
    const items = await fetchHealthIncidentsFromTurso()
    for (const item of items) {
      const local = await db.healthIncidents.get(item.id)
      if (local && local.synced === 0) continue
      await db.healthIncidents.put({ ...item, synced: 1 })
      incidentsImported++
    }
  } catch (e) {
    showToast(formatError(e, 'Failed to pull health incidents.'), 'error')
  }

  try {
    const items = await fetchTreatmentsFromTurso()
    for (const item of items) {
      const local = await db.treatments.get(item.id)
      if (local && local.synced === 0) continue
      await db.treatments.put({ ...item, synced: 1 })
      treatmentsImported++
    }
  } catch (e) {
    showToast(formatError(e, 'Failed to pull treatments.'), 'error')
  }

  try {
    const items = await fetchLamenessSessionsFromTurso()
    for (const item of items) {
      const local = await db.lamenessSessions.get(item.id)
      if (local && local.synced === 0) continue
      await db.lamenessSessions.put({ ...item, synced: 1 })
      lamenessImported++
    }
  } catch (e) {
    showToast(formatError(e, 'Failed to pull lameness sessions.'), 'error')
  }

  try {
    const items = await fetchVaccinationRecordsFromTurso()
    for (const item of items) {
      const local = await db.vaccinationRecords.get(item.id)
      if (local && local.synced === 0) continue
      await db.vaccinationRecords.put({ ...item, synced: 1 })
      vaccinationsImported++
    }
  } catch (e) {
    showToast(formatError(e, 'Failed to pull vaccination records.'), 'error')
  }

  return {
    cows: cowsImported, daily: dailyImported, vetVisits: vetVisitsImported,
    incidents: incidentsImported, treatments: treatmentsImported,
    lameness: lamenessImported, vaccinations: vaccinationsImported,
  }
}

export async function getPendingCount(): Promise<{
  cows: number; daily: number; vetVisits: number; incidents: number
  treatments: number; lameness: number; vaccinations: number
}> {
  const cows = await db.cows.where('synced').equals(0).count()
  const daily = await db.dailyRecords.where('synced').equals(0).count()
  const vetVisits = await db.vetVisits.where('synced').equals(0).count().catch(() => 0)
  const incidents = await db.healthIncidents.where('synced').equals(0).count().catch(() => 0)
  const treatments = await db.treatments.where('synced').equals(0).count().catch(() => 0)
  const lameness = await db.lamenessSessions.where('synced').equals(0).count().catch(() => 0)
  const vaccinations = await db.vaccinationRecords.where('synced').equals(0).count().catch(() => 0)
  return { cows, daily, vetVisits, incidents, treatments, lameness, vaccinations }
}
