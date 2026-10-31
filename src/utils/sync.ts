import { db } from '../db/dexie'
import {
  syncCow, fetchCows, fetchCowById,
  syncDailyRecord, fetchDailyRecordsFromTurso,
  syncVetVisit, fetchVetVisitsFromTurso,
  syncHealthIncident, fetchHealthIncidentsFromTurso,
  syncTreatment, fetchTreatmentsFromTurso,
  syncLamenessSession, fetchLamenessSessionsFromTurso,
  syncVaccinationRecord, fetchVaccinationRecordsFromTurso,
} from '../db/turso'
import { showToast, formatError } from '../composables/useToast'
import { hasPendingDelete, pushPendingDeletes, type LocalTable } from './deletes'

export interface SyncCounts {
  cows: number
  daily: number
  vetVisits: number
  incidents: number
  treatments: number
  lameness: number
  vaccinations: number
  deletes: number
}

const emptyCounts = (): SyncCounts => ({
  cows: 0, daily: 0, vetVisits: 0, incidents: 0,
  treatments: 0, lameness: 0, vaccinations: 0, deletes: 0,
})

let syncPromise: Promise<SyncCounts> | null = null

async function pushRows<T extends { id: string }>(
  table: LocalTable,
  rows: T[],
  syncFn: (record: any) => Promise<boolean>,
): Promise<number> {
  let count = 0
  for (const row of rows) {
    const now = new Date().toISOString()
    const payload = { ...row, updated_at: now }
    const ok = await syncFn(payload)
    if (ok) {
      await (db as any)[table].update(row.id, { synced: 1, updated_at: now })
      count++
    }
  }
  return count
}

async function pushAll(): Promise<SyncCounts> {
  const counts = emptyCounts()

  try {
    const rows = await db.cows.where('synced').equals(0).toArray()
    counts.cows = await pushRows('cows', rows, syncCow)
  } catch (e) {
    showToast(formatError(e, 'Failed to sync cows. Data saved locally.'), 'error')
  }

  try {
    const rows = await db.dailyRecords.where('synced').equals(0).toArray()
    counts.daily = await pushRows('dailyRecords', rows, syncDailyRecord)
  } catch (e) {
    showToast(formatError(e, 'Failed to sync daily records. Data saved locally.'), 'error')
  }

  try {
    const rows = await db.vetVisits.where('synced').equals(0).toArray()
    counts.vetVisits = await pushRows('vetVisits', rows, syncVetVisit)
  } catch (e) {
    showToast(formatError(e, 'Failed to sync vet visits.'), 'error')
  }

  try {
    const rows = await db.healthIncidents.where('synced').equals(0).toArray()
    counts.incidents = await pushRows('healthIncidents', rows, syncHealthIncident)
  } catch (e) {
    showToast(formatError(e, 'Failed to sync health incidents.'), 'error')
  }

  try {
    const rows = await db.treatments.where('synced').equals(0).toArray()
    counts.treatments = await pushRows('treatments', rows, syncTreatment)
  } catch (e) {
    showToast(formatError(e, 'Failed to sync treatments.'), 'error')
  }

  try {
    const rows = await db.lamenessSessions.where('synced').equals(0).toArray()
    counts.lameness = await pushRows('lamenessSessions', rows, syncLamenessSession)
  } catch (e) {
    showToast(formatError(e, 'Failed to sync lameness sessions.'), 'error')
  }

  try {
    const rows = await db.vaccinationRecords.where('synced').equals(0).toArray()
    counts.vaccinations = await pushRows('vaccinationRecords', rows, syncVaccinationRecord)
  } catch (e) {
    showToast(formatError(e, 'Failed to sync vaccination records.'), 'error')
  }

  try {
    counts.deletes = await pushPendingDeletes()
  } catch (e) {
    showToast(formatError(e, 'Failed to push deletions.'), 'error')
  }

  return counts
}

export function syncPendingRecords(): Promise<SyncCounts> {
  if (!syncPromise) {
    syncPromise = pushAll().finally(() => { syncPromise = null })
  }
  return syncPromise
}

function isNewerThanLocal(local: any, remote: any): boolean {
  if (!local) return true
  if (local.synced === 0) return false
  if (local.updated_at && remote.updated_at) {
    return String(remote.updated_at) >= String(local.updated_at)
  }
  return true
}

async function mergeRemoteRows(
  table: LocalTable,
  rows: any[],
): Promise<number> {
  let imported = 0
  const tableRef = (db as any)[table]

  for (const remote of rows) {
    if (!remote?.id) continue

    if (remote.deleted_at) {
      const local = await tableRef.get(remote.id)
      // Do not destroy unsynced local edits; they will be pushed later.
      if (local && local.synced === 0) continue
      await tableRef.delete(remote.id)
      if (table === 'cows') {
        const children: LocalTable[] = [
          'dailyRecords', 'vetVisits', 'healthIncidents',
          'treatments', 'lamenessSessions', 'vaccinationRecords',
        ]
        for (const child of children) {
          await (db as any)[child].where('cow_id').equals(remote.id).delete()
        }
      }
      continue
    }

    if (await hasPendingDelete(table, remote.id)) continue

    const local = await tableRef.get(remote.id)
    if (!isNewerThanLocal(local, remote)) continue

    await tableRef.put({ ...remote, synced: 1 })
    if (!local) imported++
  }

  return imported
}

export async function pullFromTurso(): Promise<SyncCounts> {
  const counts = emptyCounts()

  try {
    counts.cows = await mergeRemoteRows('cows', await fetchCows())
  } catch (e) {
    showToast(formatError(e, 'Failed to pull cows from cloud.'), 'error')
  }

  try {
    counts.daily = await mergeRemoteRows('dailyRecords', await fetchDailyRecordsFromTurso())
  } catch (e) {
    showToast(formatError(e, 'Failed to pull daily records from cloud.'), 'error')
  }

  try {
    counts.vetVisits = await mergeRemoteRows('vetVisits', await fetchVetVisitsFromTurso())
  } catch (e) {
    showToast(formatError(e, 'Failed to pull vet visits.'), 'error')
  }

  try {
    counts.incidents = await mergeRemoteRows('healthIncidents', await fetchHealthIncidentsFromTurso())
  } catch (e) {
    showToast(formatError(e, 'Failed to pull health incidents.'), 'error')
  }

  try {
    counts.treatments = await mergeRemoteRows('treatments', await fetchTreatmentsFromTurso())
  } catch (e) {
    showToast(formatError(e, 'Failed to pull treatments.'), 'error')
  }

  try {
    counts.lameness = await mergeRemoteRows('lamenessSessions', await fetchLamenessSessionsFromTurso())
  } catch (e) {
    showToast(formatError(e, 'Failed to pull lameness sessions.'), 'error')
  }

  try {
    counts.vaccinations = await mergeRemoteRows('vaccinationRecords', await fetchVaccinationRecordsFromTurso())
  } catch (e) {
    showToast(formatError(e, 'Failed to pull vaccination records.'), 'error')
  }

  return counts
}

export async function pullCowData(cowId: string): Promise<SyncCounts> {
  const counts = emptyCounts()

  try {
    const cow = await fetchCowById(cowId)
    counts.cows = await mergeRemoteRows('cows', cow ? [cow] : [])
  } catch { /* offline or API unavailable */ }

  try {
    counts.daily = await mergeRemoteRows('dailyRecords', await fetchDailyRecordsFromTurso(cowId))
  } catch { /* offline */ }

  try {
    counts.vetVisits = await mergeRemoteRows('vetVisits', await fetchVetVisitsFromTurso(cowId))
  } catch { /* offline */ }

  try {
    counts.incidents = await mergeRemoteRows('healthIncidents', await fetchHealthIncidentsFromTurso(cowId))
  } catch { /* offline */ }

  try {
    counts.treatments = await mergeRemoteRows('treatments', await fetchTreatmentsFromTurso(cowId))
  } catch { /* offline */ }

  try {
    counts.lameness = await mergeRemoteRows('lamenessSessions', await fetchLamenessSessionsFromTurso(cowId))
  } catch { /* offline */ }

  try {
    counts.vaccinations = await mergeRemoteRows('vaccinationRecords', await fetchVaccinationRecordsFromTurso(cowId))
  } catch { /* offline */ }

  return counts
}

export async function getPendingCount(): Promise<{
  cows: number; daily: number; vetVisits: number; incidents: number
  treatments: number; lameness: number; vaccinations: number; deletes: number
}> {
  const cows = await db.cows.where('synced').equals(0).count()
  const daily = await db.dailyRecords.where('synced').equals(0).count()
  const vetVisits = await db.vetVisits.where('synced').equals(0).count().catch(() => 0)
  const incidents = await db.healthIncidents.where('synced').equals(0).count().catch(() => 0)
  const treatments = await db.treatments.where('synced').equals(0).count().catch(() => 0)
  const lameness = await db.lamenessSessions.where('synced').equals(0).count().catch(() => 0)
  const vaccinations = await db.vaccinationRecords.where('synced').equals(0).count().catch(() => 0)
  const deletes = await db.pendingDeletes.count().catch(() => 0)
  return { cows, daily, vetVisits, incidents, treatments, lameness, vaccinations, deletes }
}
