import { db } from '../db/dexie'
import { syncCow, fetchCows, syncDailyRecord, fetchDailyRecordsFromTurso } from '../db/turso'
import { showToast, formatError } from '../composables/useToast'

export async function syncPendingRecords(): Promise<{ cows: number; daily: number }> {
  let cowsSynced = 0
  let dailySynced = 0

  try {
    const unsyncedCows = await db.cows.where('synced').equals(0).toArray()
    for (const cow of unsyncedCows) {
      const ok = await syncCow(cow)
      if (ok) {
        await db.cows.update(cow.id, { synced: 1 })
        cowsSynced++
      }
    }
  } catch (e) {
    showToast(formatError(e, 'Failed to sync cows. Data saved locally.'), 'error')
  }

  try {
    const unsyncedDaily = await db.dailyRecords.where('synced').equals(0).toArray()
    for (const record of unsyncedDaily) {
      const ok = await syncDailyRecord(record)
      if (ok) {
        await db.dailyRecords.update(record.id, { synced: 1 })
        dailySynced++
      }
    }
  } catch (e) {
    showToast(formatError(e, 'Failed to sync daily records. Data saved locally.'), 'error')
  }

  return { cows: cowsSynced, daily: dailySynced }
}

export async function pullFromTurso(): Promise<{ cows: number; daily: number }> {
  let cowsImported = 0
  let dailyImported = 0

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

  return { cows: cowsImported, daily: dailyImported }
}

export async function getPendingCount(): Promise<{ cows: number; daily: number }> {
  const cows = await db.cows.where('synced').equals(0).count()
  const daily = await db.dailyRecords.where('synced').equals(0).count()
  return { cows, daily }
}
